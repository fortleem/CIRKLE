// @ts-nocheck
/**
 * Federation Router — Smart Citizen Routing Engine
 * ============================================================================
 * Source architectural authority:
 *   • docs/CIRCLE-EMERGENCY-SERVICE-ROUTING.md — PART XXI (Smart Citizen
 *     Routing), PART XXII (Emergency Path Must Not Be the ACA Path),
 *     PART XL (Emergency / Service / Integrity Separation), PART XXIX
 *     (Service Routing).
 *   • docs/CIRCLE-FEDERATED-GOVERNMENT-ARCHITECTURE.md — PART XX (Public
 *     Citizen Shield).
 *
 * Non-negotiable routing rules (PART XL):
 *   1. EMERGENCY pathway → Police / EMS / Fire / Traffic (the four
 *      emergency responder types). NEVER auto-routes to ACA.
 *   2. SERVICE pathway → the responsible government service institution.
 *      Never routed to ACA unless ACA explicitly owns that service.
 *   3. INTEGRITY pathway → ACA, as a *Signal* (reviewable intelligence
 *      object). NEVER as a Case. See PART XXXVIII (ACA Signal ≠ ACA Case).
 *
 * The router NEVER:
 *   • Fabricates a dispatch acknowledgement (Rule 1 — No fabricated dispatch).
 *   • Auto-converts an integrity signal into an ACA Case (Rule 3).
 *   • Promotes an emergency pathway into ACA under any condition.
 *
 * The router is a *decision* layer. The actual dispatch / referral /
 * signal submission is performed by the receiving institution's adapter
 * (or, in the absence of an active adapter, by surfacing the official
 * channel to the citizen for direct contact — the Level 0 fallback).
 * ============================================================================
 */

import {
  getInstitution,
  listByTypes,
  type GovernmentInstitution,
  type InstitutionType,
  type OfficialChannel,
} from "@/lib/institution-registry";

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

export type RoutingPathway = "emergency" | "service" | "integrity";

export type EscalationLevel = "none" | "advisory" | "urgent" | "critical";

export interface RoutingDecision {
  /** The chosen pathway. */
  pathway: RoutingPathway;
  /** The institution the request is routed to (Level 0 directory entry). */
  targetInstitution: GovernmentInstitution | null;
  /** Department / service line within the institution (free-text). */
  targetDepartment: string | null;
  /** The official channel the citizen should use to reach the institution. */
  officialChannel: OfficialChannel | null;
  /** Service-level agreement: the dispatch / response window we *target*. */
  sla: {
    acknowledgementSeconds: number | null;
    responseSeconds: number | null;
    /** Whether the SLA is enforced (active integration) or advisory (Level 0). */
    enforced: boolean;
  };
  /** Recommended escalation tier if the SLA is missed. */
  escalation: EscalationLevel;
  /** Human-readable explanation of why this pathway was chosen. */
  routingReason: string;
  /** Other institutions that may be relevant (cross-agency coordination). */
  alternates: GovernmentInstitution[];
  /** True if the router fell back to "show the citizen the official phone number". */
  fallbackToCitizenDirectContact: boolean;
  /** ISO timestamp of the decision. */
  decidedAt: string;
  /** Stable decision id (for audit). */
  decisionId: string;
}

export interface RouteRequestInput {
  /** Free-text citizen request, e.g. "I need help", "fire in my building". */
  text: string;
  /** Optional structured tags supplied by the Citizen Shield. */
  tags?: string[];
  /** Optional geographic hint (governorate / city / lat-lng string). */
  locationHint?: string;
  /** Optional citizen-declared urgency. */
  urgency?: "low" | "medium" | "high" | "critical";
  /** Optional pre-selected institution id (forces a single target). */
  preselectedInstitutionId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Lexicons — emergency / service / integrity keywords
// ─────────────────────────────────────────────────────────────────────────────
//
// These lexicons are intentionally conservative. The router is biased
// toward the EMERGENCY pathway whenever an emergency keyword is present —
// "when in doubt, route to a responder, not to a service desk." (PART XXII)
// Integrity keywords are detected ONLY when no emergency keyword is
// present, to prevent a citizen reporting a fire from being misrouted to
// an ACA Signal intake.
// ─────────────────────────────────────────────────────────────────────────────

const EMERGENCY_LEXICON: Record<InstitutionType, string[]> = {
  police: [
    "police",
    "robbery",
    "robbed",
    "assault",
    "attack",
    "stabbed",
    "shot",
    "shooting",
    "kidnap",
    "kidnapping",
    "burglary",
    "theft",
    "mugging",
    "armed",
    "weapon",
    "danger",
    "threat",
    "violence",
    "harassment",
    "fight",
    "riot",
  ],
  ems: [
    "ambulance",
    "medical",
    "injury",
    "injured",
    "bleeding",
    "unconscious",
    "fainted",
    "fainting",
    "heart",
    "stroke",
    "choking",
    "breathing",
    "allergic",
    "allergy",
    "poison",
    "seizure",
    "drowned",
    "drowning",
    "pregnant",
    "labor",
  ],
  fire: [
    "fire",
    "smoke",
    "burning",
    "burns",
    "burned",
    "explosion",
    "explode",
    "gas leak",
    "trapped",
    "rescue",
    "hazmat",
    "chemical",
    "collapsed",
    "collapse",
  ],
  traffic: [
    "accident",
    "car crash",
    "crash",
    "traffic",
    "road",
    "vehicle",
    "stuck",
    "stranded",
    "hit and run",
    "run over",
  ],
  // These are NOT emergency responders — listed only so the lexicon type-map is complete.
  aca: [],
  health: [],
  local_gov: [],
  regulator: [],
  financial: [],
  other: [],
};

const INTEGRITY_LEXICON: string[] = [
  "corruption",
  "bribe",
  "bribery",
  "embezzle",
  "embezzlement",
  "fraud",
  "misconduct",
  "abuse of power",
  "conflict of interest",
  "nepotism",
  "whistleblower",
  "audit",
  "integrity",
  "misuse of public funds",
  "kickback",
];

const SERVICE_LEXICON: Record<string, string> = {
  // service keyword -> InstitutionType
  "civil registry": "local_gov",
  "national id": "local_gov",
  "passport": "local_gov",
  "birth certificate": "local_gov",
  "permit": "local_gov",
  "license": "local_gov",
  "complaint": "local_gov",
  "tax": "financial",
  "vat": "financial",
  "invoice": "financial",
  "customs": "regulator",
  "court": "regulator",
  "health inspection": "health",
  "food safety": "health",
};

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function lower(s: string): string {
  return (s || "").toLowerCase();
}

function pickFirstChannel(
  inst: GovernmentInstitution,
): OfficialChannel | null {
  if (!inst.officialChannels || inst.officialChannels.length === 0) return null;
  // Prefer 24/7 phone for emergencies.
  const phone247 = inst.officialChannels.find(
    (c) => c.kind === "phone" && c.twentyFourSeven,
  );
  if (phone247) return phone247;
  const phone = inst.officialChannels.find((c) => c.kind === "phone");
  if (phone) return phone;
  return inst.officialChannels[0]!;
}

/**
 * Default SLA targets by pathway + integration level. These are
 * *targets*, not guarantees. The `enforced` flag is only true when the
 * target institution has an active integration ≥ Level 2 (Transaction);
 * otherwise the SLA is advisory and the citizen is told to use the
 * official channel directly.
 */
function computeSla(
  pathway: RoutingPathway,
  enforced: boolean,
  urgency: EscalationLevel,
): RoutingDecision["sla"] {
  if (pathway === "emergency") {
    return {
      acknowledgementSeconds: enforced ? 15 : null,
      responseSeconds: enforced ? (urgency === "critical" ? 300 : 900) : null,
      enforced,
    };
  }
  if (pathway === "service") {
    return {
      acknowledgementSeconds: enforced ? 3600 : null,
      responseSeconds: enforced ? 86400 : null,
      enforced,
    };
  }
  // integrity
  return {
    acknowledgementSeconds: enforced ? 3600 : null,
    responseSeconds: null,
    enforced,
  };
}

function emergencyEscalation(urgency?: string): EscalationLevel {
  if (urgency === "critical") return "critical";
  if (urgency === "high") return "urgent";
  return "advisory";
}

// ─────────────────────────────────────────────────────────────────────────────
//  Detection
// ─────────────────────────────────────────────────────────────────────────────

interface EmergencyMatch {
  type: InstitutionType;
  matchedKeyword: string;
}

function detectEmergency(text: string): EmergencyMatch | null {
  const t = lower(text);
  // Order matters: police first because "I was robbed and assaulted" should
  // route to police even if "fire" appears later in the same sentence.
  for (const type of ["police", "ems", "fire", "traffic"] as InstitutionType[]) {
    const lex = EMERGENCY_LEXICON[type] || [];
    for (const kw of lex) {
      if (t.includes(kw)) return { type, matchedKeyword: kw };
    }
  }
  return null;
}

function detectIntegrity(text: string): string | null {
  const t = lower(text);
  for (const kw of INTEGRITY_LEXICON) {
    if (t.includes(kw)) return kw;
  }
  return null;
}

function detectService(text: string): { type: InstitutionType; kw: string } | null {
  const t = lower(text);
  for (const [kw, type] of Object.entries(SERVICE_LEXICON)) {
    if (t.includes(kw)) return { type: type as InstitutionType, kw };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Route a citizen request. This is the single entry point used by:
 *   • The Citizen Shield ("I need help" surface)
 *   • The federation API endpoint /api/federation/route
 *
 * The function is deterministic for a given input — it produces a
 * RoutingDecision, never performs an actual dispatch. Dispatch is the
 * responsibility of the receiving institution's adapter, surfaced via
 * the officialChannel field when no adapter is active (Level 0 fallback).
 */
export async function routeRequest(
  input: RouteRequestInput,
): Promise<RoutingDecision> {
  const decidedAt = new Date().toISOString();
  const decisionId = uid("RTE");
  const text = (input.text || "").trim();
  const alternates: GovernmentInstitution[] = [];

  // 1) Pre-selected institution — used when the citizen has explicitly
  //    chosen a service from the directory. We still classify the pathway
  //    so that an emergency-tagged request cannot be quietly demoted to a
  //    service request by a preselection.
  if (input.preselectedInstitutionId) {
    const inst = await getInstitution(input.preselectedInstitutionId);
    if (inst) {
      // If the text contains emergency keywords, the pathway MUST be
      // emergency, regardless of preselection — and the target MUST be a
      // police/ems/fire/traffic institution. If the preselected institution
      // is not an emergency responder, we override the target but keep the
      // preselected as an alternate.
      const emer = detectEmergency(text);
      if (emer) {
        const responders = await listByTypes([emer.type]);
        const target = responders[0] || inst;
        const channel = pickFirstChannel(target);
        if (inst.institutionId !== target.institutionId) alternates.push(inst);
        return {
          pathway: "emergency",
          targetInstitution: target,
          targetDepartment: emer.type,
          officialChannel: channel,
          sla: computeSla("emergency", false, emergencyEscalation(input.urgency)),
          escalation: emergencyEscalation(input.urgency),
          routingReason: `Emergency keyword "${emer.matchedKeyword}" detected — overrode preselection to ${emer.type} responder.`,
          alternates,
          fallbackToCitizenDirectContact: !channel ? false : channel.kind === "phone" || channel.kind === "online_portal",
          decidedAt,
          decisionId,
        };
      }
      // Service pathway with explicit preselection.
      const channel = pickFirstChannel(inst);
      return {
        pathway: "service",
        targetInstitution: inst,
        targetDepartment: inst.services[0] || null,
        officialChannel: channel,
        sla: computeSla("service", false, "advisory"),
        escalation: "none",
        routingReason: "Citizen pre-selected this institution from the directory.",
        alternates,
        fallbackToCitizenDirectContact: !!channel,
        decidedAt,
        decisionId,
      };
    }
    // fall through to detection if preselected id is unknown.
  }

  // 2) Emergency detection — highest priority.
  const emer = detectEmergency(text);
  if (emer) {
    const responders = await listByTypes([emer.type]);
    const target = responders[0] || null;
    const channel = target ? pickFirstChannel(target) : null;
    // Compute alternates: other emergency responder types whose keywords
    // are NOT present — these are candidates for federated-incident
    // coordination (e.g. a fire with injuries may also need EMS).
    const otherTypes: InstitutionType[] = ["police", "ems", "fire", "traffic"]
      .filter((t) => t !== emer.type) as InstitutionType[];
    const others = await listByTypes(otherTypes);
    alternates.push(...others.slice(0, 3));

    return {
      pathway: "emergency",
      targetInstitution: target,
      targetDepartment: emer.type,
      officialChannel: channel,
      sla: computeSla("emergency", false, emergencyEscalation(input.urgency)),
      escalation: emergencyEscalation(input.urgency),
      routingReason: `Emergency keyword "${emer.matchedKeyword}" detected; routed to ${emer.type} responder. ACA was NOT considered — emergency pathway excludes ACA by design.`,
      alternates,
      fallbackToCitizenDirectContact: !!channel,
      decidedAt,
      decisionId,
    };
  }

  // 3) Integrity detection — ONLY when no emergency keyword was matched.
  const integ = detectIntegrity(text);
  if (integ) {
    const aca = await listByTypes(["aca"]);
    const target = aca[0] || null;
    const channel = target ? pickFirstChannel(target) : null;
    return {
      pathway: "integrity",
      targetInstitution: target,
      targetDepartment: "integrity_signal_intake",
      officialChannel: channel,
      sla: computeSla("integrity", false, "advisory"),
      escalation: "none",
      routingReason: `Integrity keyword "${integ}" detected; routed to ACA as a Signal. This is NOT an ACA Case — only the ACA may convert a Signal into a Case under its own institutional process (PART XXXVIII).`,
      alternates: [],
      fallbackToCitizenDirectContact: !!channel,
      decidedAt,
      decisionId,
    };
  }

  // 4) Service detection.
  const svc = detectService(text);
  if (svc) {
    const candidates = await listByTypes([svc.type]);
    const target = candidates[0] || null;
    const channel = target ? pickFirstChannel(target) : null;
    return {
      pathway: "service",
      targetInstitution: target,
      targetDepartment: target?.services[0] || svc.kw,
      officialChannel: channel,
      sla: computeSla("service", false, "advisory"),
      escalation: "none",
      routingReason: `Service keyword "${svc.kw}" detected; routed to ${svc.type} institution.`,
      alternates: candidates.slice(1, 3),
      fallbackToCitizenDirectContact: !!channel,
      decidedAt,
      decisionId,
    };
  }

  // 5) Default — undetermined. Surface a directory lookup with no
  //    fabricated dispatch target. The Citizen Shield will prompt the
  //    citizen for clarification.
  const localGov = await listByTypes(["local_gov"]);
  const target = localGov[0] || null;
  const channel = target ? pickFirstChannel(target) : null;
  return {
    pathway: "service",
    targetInstitution: target,
    targetDepartment: null,
    officialChannel: channel,
    sla: computeSla("service", false, "none"),
    escalation: "none",
    routingReason:
      "No emergency, integrity, or service keyword detected. Surfacing the local-government directory entry as a fallback. The citizen should clarify the request — the router never fabricates a target.",
    alternates: [],
    fallbackToCitizenDirectContact: !!channel,
    decidedAt,
    decisionId,
  };
}

/**
 * Helper used by tests + the API: classify a citizen text into a pathway
 * WITHOUT producing a full RoutingDecision. Returns the pathway only.
 */
export function classifyPathway(text: string): RoutingPathway {
  if (detectEmergency(text)) return "emergency";
  if (detectIntegrity(text)) return "integrity";
  if (detectService(text)) return "service";
  return "service";
}
