// @ts-nocheck
/**
 * Smart Citizen Routing — Part XXI of the Federated Sovereign Government
 * Architecture.
 *
 * Every citizen submission is classified into exactly one of three lanes:
 *
 *   HELP       — Immediate danger to life, limb, property, public safety or
 *                security requiring real-time intervention. Routed to Police,
 *                EMS / ambulance, Civil Protection, or traffic / road-safety
 *                authority. NEVER routed to ACA. (Rule 2, Chapter XXII.)
 *   SERVICE    — A non-emergency administrative or operational interaction
 *                with a government service. Routed to the responsible
 *                ministry service window / sectoral service desk / government
 *                complaints portal. (Chapter XXIX.)
 *   INTEGRITY  — A possible administrative, financial or operational
 *                integrity concern that may warrant oversight review —
 *                WITHOUT immediate emergency response. Routed to ACA Signal
 *                intake — NEVER an ACA Case. (Chapter XXXVIII.) Signal→Case
 *                conversion is performed only by the ACA under its own process.
 *
 * The classification is TRIAGE, not adjudication. Smart Citizen Routing does
 * not determine whether an integrity concern is well-founded; it determines
 * only whether the submission is shaped like an integrity concern and routes
 * it accordingly.
 *
 * Sovereign rules (non-negotiable — Chapter 1.4):
 *   1. No fabricated dispatch.
 *   2. No silent cross-institutional sharing — each institution receives only
 *      what it is authorized to receive, in its own case namespace.
 *   3. No autonomous Signal-to-Case conversion.
 *   4. No replacement of existing sovereign systems.
 */

/**
 * The three institutional lanes. The string values are stable identifiers
 * used in RoutingResult.pathway and in the smart-routing event payload.
 */
export type RoutingPathway = "emergency" | "service" | "integrity";

/**
 * Emergency sub-type when pathway === "emergency". Determines which sovereign
 * responder institution receives the packet. Police / medical / fire / traffic
 * only — ACA is intentionally absent from this list (Chapter XXII).
 */
export type EmergencyType = "police" | "medical" | "fire" | "traffic" | "other";

/**
 * Result of routing a citizen request. Returned by routeCitizenRequest() and
 * by POST /api/emergency/route. The fields together describe, for the citizen
 * and for the platform, exactly where the request will be sent, through which
 * official channel, what SLA the citizen may expect, what escalation path
 * exists, why this route was chosen, and what fallback channels exist if the
 * primary official channel is unavailable.
 */
export interface RoutingResult {
  /** The triage lane — emergency | service | integrity. */
  pathway: RoutingPathway;
  /** Sub-category within the lane (e.g. "police", "tax", "bribery"). */
  category: string;
  /** Sovereign institution responsible for the request. */
  targetInstitution: string;
  /** Specific department / desk / window inside the institution. */
  targetDepartment: string;
  /** The official, sovereign channel the request is sent through. */
  officialChannel: string;
  /** Expected service-level agreement the citizen may expect. */
  sla: string;
  /** Escalation path if the SLA is breached. */
  escalation: string;
  /** Human-readable reason the routing decision was made. */
  routingReason: string;
  /** Fallback channels if the primary official channel fails. */
  fallbackChannels: string[];
  /** When the classification was AI-assisted vs keyword-only. */
  classifiedBy: "keyword" | "ai" | "hybrid";
  /** Stable ISO timestamp for audit. */
  timestamp: string;
  /** Emergency sub-type when pathway === "emergency". */
  emergencyType?: EmergencyType;
  /** Whether routing was attempted via AI and AI failed (degraded to keyword). */
  degraded?: boolean;
}

/**
 * Input shape for routeCitizenRequest. The citizen-facing UI gathers free
 * text plus a small number of optional structured fields; nothing here is
 * required except `text`. Location is optional and only sent when the citizen
 * consents — Chapter XXVII (Silent Emergency) governs the case where location
 * is unavailable.
 */
export interface CitizenRequestInput {
  /** Free-text description from the citizen — the "I need help" sentence. */
  text: string;
  /** Optional ISO country code (defaults to "EG"). */
  country?: string;
  /** Optional city name. */
  city?: string;
  /** Optional GPS coordinates — only sent when citizen consents. */
  location?: { lat: number; lng: number; accuracy?: number };
  /** Optional citizen-selected emergency type hint. */
  emergencyTypeHint?: EmergencyType;
  /** Whether the citizen explicitly requested the integrity lane. */
  integrityRequested?: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// Keyword tables — deterministic first-pass classification.
//
// Keyword matching is the deterministic floor: it always runs first, and if it
// produces a high-confidence lane, that lane is used. AI is consulted only as
// a tiebreaker for ambiguous cases. This guarantees that even when AI providers
// are unavailable, routing still works (degraded mode), per Rule 1.
// ───────────────────────────────────────────────────────────────────────────

interface KeywordSet {
  emergency: { type: EmergencyType; terms: RegExp[] };
  service: { category: string; terms: RegExp[] };
  integrity: { category: string; terms: RegExp[] };
}

const KEYWORDS: KeywordSet[] = [
  // ── EMERGENCY ──────────────────────────────────────────────────────────
  {
    emergency: {
      type: "police",
      terms: [
        /\b(robbery|robbed|mugged|assault|attacked|stabbed|shot|shooting|gun|kidnap|kidnapped|burglar|break-?in|intruder|threat|threatened|danger|stranger following|following me|harassed|being chased|chased)\b/i,
        /\b(police|call police|emergency|call 122)\b/i,
      ],
    },
    service: { category: "", terms: [] },
    integrity: { category: "", terms: [] },
  },
  {
    emergency: {
      type: "medical",
      terms: [
        /\b(heart attack|stroke|bleeding|bleeding heavily|unconscious|not breathing|choking|drowning|severe(ly)? (hurt|injured|burned)|overdose|seizure|collapsed|fainted|allergic reaction|anaphylaxis|chest pain|difficulty breathing|ambulance|call ambulance)\b/i,
      ],
    },
    service: { category: "", terms: [] },
    integrity: { category: "", terms: [] },
  },
  {
    emergency: {
      type: "fire",
      terms: [
        /\b(fire|burning|smoke|explosion|exploded|gas leak|smell gas|trapped in fire|building on fire|car on fire|wildfire|civil protection|civil defense)\b/i,
      ],
    },
    service: { category: "", terms: [] },
    integrity: { category: "", terms: [] },
  },
  {
    emergency: {
      type: "traffic",
      terms: [
        /\b(car crash|car accident|traffic accident|hit and run|pedestrian hit|road accident|vehicle collision|truck overturned|multi-?vehicle|serious accident|road hazard|wrong-?way driver|drunk driver)\b/i,
      ],
    },
    service: { category: "", terms: [] },
    integrity: { category: "", terms: [] },
  },
  // ── INTEGRITY ──────────────────────────────────────────────────────────
  // Integrity keywords MUST be checked before service keywords so that a
  // bribe request made in a service context is correctly triaged as INTEGRITY
  // and not as SERVICE. Chapter XXXVII (Citizen Shield → ACA Signal).
  {
    emergency: { type: "other", terms: [] },
    service: { category: "", terms: [] },
    integrity: {
      category: "bribery",
      terms: [
        /\b(bribe|bribery|asked me for money|solicited|kickback|extort|hush money|payoff|wasta for money|paid under the table)\b/i,
      ],
    },
  },
  {
    emergency: { type: "other", terms: [] },
    service: { category: "", terms: [] },
    integrity: {
      category: "administrative_corruption",
      terms: [
        /\b(corruption|embezzlement|favoritism|nepotism|misuse of (public )?funds|forgery|forged document|fake stamp|fake signature|ghost employee|ghost beneficiaries|procurement fraud|bid rigging)\b/i,
      ],
    },
  },
  {
    emergency: { type: "other", terms: [] },
    service: { category: "", terms: [] },
    integrity: {
      category: "abuse_of_authority",
      terms: [
        /\b(abuse of (power|authority)|misconduct|officer refused to|threatened me with arrest unless|detained without cause|harassment by official|intimidation by official)\b/i,
      ],
    },
  },
  // ── SERVICE ─────────────────────────────────────────────────────────────
  {
    emergency: { type: "other", terms: [] },
    service: {
      category: "tax",
      terms: [
        /\b(tax|vat|e-?invoice|eta|e-?receipt|tax return|tax filing|tax declaration|sales tax|income tax)\b/i,
      ],
    },
    integrity: { category: "", terms: [] },
  },
  {
    emergency: { type: "other", terms: [] },
    service: {
      category: "customs",
      terms: [
        /\b(customs|nafeza|cargo|manifest|clearance|import duty|export declaration|port|aci)\b/i,
      ],
    },
    integrity: { category: "", terms: [] },
  },
  {
    emergency: { type: "other", terms: [] },
    service: {
      category: "civil_registry",
      terms: [
        /\b(birth certificate|death certificate|national id|national id card|civil registry|civil affairs|family record|marriage certificate|divorce certificate)\b/i,
      ],
    },
    integrity: { category: "", terms: [] },
  },
  {
    emergency: { type: "other", terms: [] },
    service: {
      category: "passports",
      terms: [
        /\b(passport|travel document|visa|exit visa|renewal of (passport|id))\b/i,
      ],
    },
    integrity: { category: "", terms: [] },
  },
  {
    emergency: { type: "other", terms: [] },
    service: {
      category: "traffic_services",
      terms: [
        /\b(license|driving licence|vehicle registration|traffic ticket|traffic fine|renew license|car registration)\b/i,
      ],
    },
    integrity: { category: "", terms: [] },
  },
  {
    emergency: { type: "other", terms: [] },
    service: {
      category: "municipal",
      terms: [
        /\b(municipality|municipal|building permit|zoning|streetlight|garbage|sewage|water|electricity|property tax|land registration)\b/i,
      ],
    },
    integrity: { category: "", terms: [] },
  },
  {
    emergency: { type: "other", terms: [] },
    service: {
      category: "health_services",
      terms: [
        /\b(hospital|clinic|health insurance|appointment|medical insurance|prescription|referral|treatment delayed)\b/i,
      ],
    },
    integrity: { category: "", terms: [] },
  },
  {
    emergency: { type: "other", terms: [] },
    service: {
      category: "education",
      terms: [
        /\b(school|university|exam|transcript|enrollment|graduation certificate|diploma|ministry of education)\b/i,
      ],
    },
    integrity: { category: "", terms: [] },
  },
  {
    emergency: { type: "other", terms: [] },
    service: {
      category: "labor",
      terms: [
        /\b(labor|labour|workplace|salary delay|wages|labor dispute|labor office|ministry of labor|employment contract|wrongful termination)\b/i,
      ],
    },
    integrity: { category: "", terms: [] },
  },
  {
    emergency: { type: "other", terms: [] },
    service: {
      category: "courts",
      terms: [
        /\b(court|lawsuit|case filing|hearing|verdict|appeal|judiciary|notary|notarization)\b/i,
      ],
    },
    integrity: { category: "", terms: [] },
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Routing target table — Maps (pathway, category) to a sovereign institution,
// department, official channel, SLA, escalation, and fallback channels.
//
// Per Rule 4 (no replacement of sovereign systems), every officialChannel is
// a real sovereign channel that the platform INTEGRATES WITH, not replaces.
// Per Chapter LXXXIX (no hard-coded assumptions), specific integration URLs
// and identifiers are marked "Pending verification" until the institution's
// registry entry is confirmed. The fallbackChannels list exists precisely
// because the primary channel may not yet be reachable.
// ───────────────────────────────────────────────────────────────────────────

interface RoutingTarget {
  targetInstitution: string;
  targetDepartment: string;
  officialChannel: string;
  sla: string;
  escalation: string;
  fallbackChannels: string[];
}

const EMERGENCY_TARGETS: Record<EmergencyType, RoutingTarget> = {
  police: {
    targetInstitution: "Egyptian National Police",
    targetDepartment: "Public Emergency Operations Centre",
    officialChannel: "122 emergency line — Public Safety Operations Centre",
    sla: "Immediate response — first acknowledgment within seconds",
    escalation:
      "If no acknowledgment within 60 seconds, escalate to General Directorate of Public Security duty officer.",
    fallbackChannels: [
      "Alternative digital channel — official police portal",
      "SMS data to police emergency gateway",
      "Telephone 122",
      "Offline queue — recorded and retransmitted when network restored",
    ],
  },
  medical: {
    targetInstitution: "Egyptian Ambulance Organization (EMS)",
    targetDepartment: "National Ambulance Dispatch",
    officialChannel: "123 emergency line — Ambulance Dispatch",
    sla: "Immediate response — dispatch within minutes",
    escalation:
      "If no dispatch within 5 minutes, escalate to Ministry of Health emergency duty room.",
    fallbackChannels: [
      "Alternative digital channel — Ministry of Health portal",
      "SMS data to EMS gateway",
      "Telephone 123",
      "Offline queue — recorded and retransmitted",
    ],
  },
  fire: {
    targetInstitution: "Civil Protection Authority",
    targetDepartment: "Civil Protection Dispatch",
    officialChannel: "Civil Protection emergency dispatch line",
    sla: "Immediate response — first unit dispatched within minutes",
    escalation:
      "If no dispatch within 5 minutes, escalate to Civil Protection operations director.",
    fallbackChannels: [
      "Alternative digital channel — Civil Protection portal",
      "SMS data to Civil Protection gateway",
      "Telephone civil protection line",
      "Offline queue — recorded and retransmitted",
    ],
  },
  traffic: {
    targetInstitution: "General Directorate of Traffic",
    targetDepartment: "Traffic Operations & Road Safety",
    officialChannel: "Traffic authority emergency dispatch",
    sla: "Immediate response — first unit dispatched within minutes",
    escalation:
      "If no dispatch within 5 minutes, escalate to traffic operations supervisor.",
    fallbackChannels: [
      "Alternative digital channel — Traffic authority portal",
      "SMS data to traffic authority gateway",
      "Telephone traffic emergency line",
      "Offline queue — recorded and retransmitted",
    ],
  },
  other: {
    targetInstitution: "Public Safety Operations Centre",
    targetDepartment: "General Emergency Triage",
    officialChannel: "Public Safety Operations Centre — general emergency intake",
    sla: "Immediate triage — re-routed to specific emergency service within seconds",
    escalation:
      "If triage cannot identify the correct service, escalate to public safety duty officer.",
    fallbackChannels: [
      "Alternative digital channel — public safety portal",
      "SMS data to public safety gateway",
      "Telephone general emergency line",
      "Offline queue — recorded and retransmitted",
    ],
  },
};

const SERVICE_TARGETS: Record<string, RoutingTarget> = {
  tax: {
    targetInstitution: "Egyptian Tax Authority (ETA)",
    targetDepartment: "Taxpayer Service Centre",
    officialChannel: "ETA e-invoice / taxpayer portal (integration target — Pending verification)",
    sla: "Service ticket acknowledgment within 1 business day",
    escalation:
      "If no acknowledgment within 1 business day, escalate to ETA taxpayer complaints desk.",
    fallbackChannels: [
      "Government complaints portal",
      "Telephone ETA call centre",
      "In-person service window",
    ],
  },
  customs: {
    targetInstitution: "Customs Authority (NAFEZA)",
    targetDepartment: "Customs Operations & Clearance",
    officialChannel: "NAFEZA single-window platform (integration target — Pending verification)",
    sla: "Cargo/clearance transaction status within 1 business day",
    escalation:
      "If no status within 1 business day, escalate to NAFEZA operations supervisor.",
    fallbackChannels: [
      "Government complaints portal",
      "Telephone NAFEZA call centre",
      "In-person customs office",
    ],
  },
  civil_registry: {
    targetInstitution: "Civil Registry Authority",
    targetDepartment: "Civil Affairs Service Window",
    officialChannel: "Civil registry service portal (integration target — Pending verification)",
    sla: "Document request acknowledgment within 1 business day",
    escalation:
      "If no acknowledgment within 1 business day, escalate to Civil Affairs regional director.",
    fallbackChannels: [
      "Government complaints portal",
      "Telephone civil registry call centre",
      "In-person civil affairs office",
    ],
  },
  passports: {
    targetInstitution: "Passport, Immigration & Nationality Authority",
    targetDepartment: "Passport & Travel Document Services",
    officialChannel: "Passport services portal (integration target — Pending verification)",
    sla: "Application status within 1 business day",
    escalation:
      "If no status within 1 business day, escalate to Passport services regional director.",
    fallbackChannels: [
      "Government complaints portal",
      "Telephone passport services call centre",
      "In-person passport office",
    ],
  },
  traffic_services: {
    targetInstitution: "General Directorate of Traffic",
    targetDepartment: "Licensing & Vehicle Services",
    officialChannel: "Traffic services portal (integration target — Pending verification)",
    sla: "Service ticket acknowledgment within 1 business day",
    escalation:
      "If no acknowledgment within 1 business day, escalate to Traffic licensing supervisor.",
    fallbackChannels: [
      "Government complaints portal",
      "Telephone traffic services call centre",
      "In-person traffic licensing office",
    ],
  },
  municipal: {
    targetInstitution: "Municipality (regional)",
    targetDepartment: "Citizen Service Desk",
    officialChannel: "Municipal service portal (integration target — Pending verification)",
    sla: "Service ticket acknowledgment within 1 business day",
    escalation:
      "If no acknowledgment within 1 business day, escalate to Municipal citizen services manager.",
    fallbackChannels: [
      "Government complaints portal",
      "Telephone municipal call centre",
      "In-person municipal office",
    ],
  },
  health_services: {
    targetInstitution: "Ministry of Health",
    targetDepartment: "Citizen Health Service Desk",
    officialChannel: "Ministry of Health portal (integration target — Pending verification)",
    sla: "Service ticket acknowledgment within 1 business day",
    escalation:
      "If no acknowledgment within 1 business day, escalate to Ministry of Health citizen services manager.",
    fallbackChannels: [
      "Government complaints portal",
      "Telephone Ministry of Health call centre",
      "In-person health affairs directorate",
    ],
  },
  education: {
    targetInstitution: "Ministry of Education",
    targetDepartment: "Education Services Desk",
    officialChannel: "Ministry of Education portal (integration target — Pending verification)",
    sla: "Service ticket acknowledgment within 2 business days",
    escalation:
      "If no acknowledgment within 2 business days, escalate to Education services regional director.",
    fallbackChannels: [
      "Government complaints portal",
      "Telephone Ministry of Education call centre",
      "In-person education directorate",
    ],
  },
  labor: {
    targetInstitution: "Ministry of Labour",
    targetDepartment: "Labour Disputes Office",
    officialChannel: "Ministry of Labour portal (integration target — Pending verification)",
    sla: "Dispute acknowledgment within 2 business days",
    escalation:
      "If no acknowledgment within 2 business days, escalate to Labour disputes supervisor.",
    fallbackChannels: [
      "Government complaints portal",
      "Telephone Ministry of Labour call centre",
      "In-person labour office",
    ],
  },
  courts: {
    targetInstitution: "Judiciary — Courts Administration",
    targetDepartment: "Court Services & Notary",
    officialChannel: "Court services portal (integration target — Pending verification)",
    sla: "Filing acknowledgment within 2 business days",
    escalation:
      "If no acknowledgment within 2 business days, escalate to Courts administration office.",
    fallbackChannels: [
      "Government complaints portal",
      "Telephone courts administration call centre",
      "In-person court registry office",
    ],
  },
};

const INTEGRITY_TARGETS: Record<string, RoutingTarget> = {
  bribery: {
    targetInstitution: "Administrative Control Authority (ACA) — Signal Intake",
    targetDepartment: "ACA Signal Review Desk",
    // CRITICAL (Chapter XXXVIII): An ACA Signal is a reviewable intelligence
    // object. It is NEVER automatically converted into an ACA Case. Only the
    // ACA, under its own institutional process, may convert a Signal into a
    // formal Case.
    officialChannel: "ACA Signal intake (reviewable intelligence object — NOT a case)",
    sla: "Signal triage within 5 business days (institutional process)",
    escalation:
      "If no triage within 5 business days, citizen may follow up via the integrity follow-up channel; the Signal remains reviewable, not a Case.",
    fallbackChannels: [
      "Sectoral oversight desk of the receiving institution",
      "Internal audit of the receiving institution",
      "Government complaints portal (parallel channel — does not replace ACA Signal)",
    ],
  },
  administrative_corruption: {
    targetInstitution: "ACA — Signal Intake",
    targetDepartment: "ACA Signal Review Desk",
    officialChannel: "ACA Signal intake (reviewable intelligence object — NOT a case)",
    sla: "Signal triage within 5 business days (institutional process)",
    escalation:
      "If no triage within 5 business days, citizen may follow up via the integrity follow-up channel.",
    fallbackChannels: [
      "Sectoral oversight desk of the receiving institution",
      "Internal audit of the receiving institution",
      "Government complaints portal (parallel channel)",
    ],
  },
  abuse_of_authority: {
    targetInstitution: "ACA — Signal Intake",
    targetDepartment: "ACA Signal Review Desk",
    officialChannel: "ACA Signal intake (reviewable intelligence object — NOT a case)",
    sla: "Signal triage within 5 business days (institutional process)",
    escalation:
      "If no triage within 5 business days, citizen may follow up via the integrity follow-up channel.",
    fallbackChannels: [
      "Sectoral oversight desk of the receiving institution",
      "Internal audit of the receiving institution",
      "Government complaints portal (parallel channel)",
    ],
  },
};

// Default fallbacks when no keyword matches.
const DEFAULT_SERVICE_TARGET: RoutingTarget = {
  targetInstitution: "Government Complaints Portal",
  targetDepartment: "General Citizen Service Triage",
  officialChannel: "Government complaints portal (integration target — Pending verification)",
  sla: "Service ticket acknowledgment within 2 business days",
  escalation:
    "If no acknowledgment within 2 business days, escalate to the portal citizen services manager.",
  fallbackChannels: [
    "Telephone government call centre",
    "In-person government service office",
  ],
};

const DEFAULT_INTEGRITY_TARGET: RoutingTarget = {
  targetInstitution: "ACA — Signal Intake",
  targetDepartment: "ACA Signal Review Desk",
  officialChannel: "ACA Signal intake (reviewable intelligence object — NOT a case)",
  sla: "Signal triage within 5 business days (institutional process)",
  escalation:
    "If no triage within 5 business days, citizen may follow up via the integrity follow-up channel.",
  fallbackChannels: [
    "Sectoral oversight desk of the receiving institution",
    "Internal audit of the receiving institution",
    "Government complaints portal (parallel channel)",
  ],
};

// ───────────────────────────────────────────────────────────────────────────
// AI classification — used as a tiebreaker when keyword matching is
// ambiguous or low-confidence. AI NEVER overrides an emergency keyword match
// to a non-emergency lane (Rule 1: when in doubt, route to emergency).
// ───────────────────────────────────────────────────────────────────────────

/**
 * Injected AI dependency. Imported lazily inside the API route to keep this
 * module usable from contexts where the AI provider chain is unavailable.
 * The signature mirrors `aiComplete` in src/lib/ai.ts.
 */
export type AiCompleteFn = (
  sys: string,
  usr: string,
  max?: number,
  useReasoning?: boolean,
) => Promise<string | null>;

interface AiClassification {
  pathway: RoutingPathway;
  category: string;
  emergencyType?: EmergencyType;
  reason: string;
}

function keywordClassify(text: string): {
  pathway: RoutingPathway;
  category: string;
  emergencyType?: EmergencyType;
  reason: string;
  confidence: number;
} {
  // Emergency keywords take priority over service keywords (Rule 1).
  // Integrity keywords are checked AFTER emergency but BEFORE service, so a
  // bribe in a tax office context is triaged as INTEGRITY, not SERVICE.
  let bestEmergency: { type: EmergencyType; matches: number } | null = null;
  let bestIntegrity: { category: string; matches: number } | null = null;
  let bestService: { category: string; matches: number } | null = null;

  for (const set of KEYWORDS) {
    if (set.emergency.terms.length > 0) {
      let m = 0;
      for (const re of set.emergency.terms) if (re.test(text)) m++;
      if (m > 0 && (!bestEmergency || m > bestEmergency.matches)) {
        bestEmergency = { type: set.emergency.type, matches: m };
      }
    }
    if (set.integrity.terms.length > 0) {
      let m = 0;
      for (const re of set.integrity.terms) if (re.test(text)) m++;
      if (m > 0 && (!bestIntegrity || m > bestIntegrity.matches)) {
        bestIntegrity = { category: set.integrity.category, matches: m };
      }
    }
    if (set.service.terms.length > 0) {
      let m = 0;
      for (const re of set.service.terms) if (re.test(text)) m++;
      if (m > 0 && (!bestService || m > bestService.matches)) {
        bestService = { category: set.service.category, matches: m };
      }
    }
  }

  if (bestEmergency) {
    return {
      pathway: "emergency",
      category: `emergency:${bestEmergency.type}`,
      emergencyType: bestEmergency.type,
      reason: `Emergency keyword match (${bestEmergency.matches} signal${bestEmergency.matches === 1 ? "" : "s"}: ${bestEmergency.type}). Routed to ${EMERGENCY_TARGETS[bestEmergency.type].targetInstitution}.`,
      confidence: 0.9,
    };
  }
  if (bestIntegrity) {
    return {
      pathway: "integrity",
      category: bestIntegrity.category,
      reason: `Integrity keyword match (${bestIntegrity.matches} signal${bestIntegrity.matches === 1 ? "" : "s"}: ${bestIntegrity.category}). Routed to ACA Signal intake — NOT an ACA Case.`,
      confidence: 0.85,
    };
  }
  if (bestService) {
    return {
      pathway: "service",
      category: bestService.category,
      reason: `Service keyword match (${bestService.matches} signal${bestService.matches === 1 ? "" : "s"}: ${bestService.category}). Routed to ${SERVICE_TARGETS[bestService.category]?.targetInstitution || "government service"}.`,
      confidence: 0.8,
    };
  }

  return {
    pathway: "service",
    category: "general",
    reason: "No keyword match — defaulted to government service triage lane.",
    confidence: 0.2,
  };
}

async function aiClassify(
  text: string,
  aiComplete: AiCompleteFn,
): Promise<AiClassification | null> {
  const sys = `You are the CIRCLE Smart Citizen Routing classifier. You classify a citizen's free-text "I need help" submission into exactly one of three lanes:

- EMERGENCY: immediate danger to life, limb, property, public safety or security requiring real-time intervention. Sub-types: police, medical, fire, traffic.
- SERVICE: a non-emergency administrative or operational interaction with a government service (tax, customs, civil registry, passports, traffic services, municipal, health services, education, labor, courts).
- INTEGRITY: a possible administrative, financial or operational integrity concern that may warrant oversight review (bribery, administrative_corruption, abuse_of_authority) — WITHOUT immediate emergency response. Routed to ACA Signal intake, NEVER an ACA Case.

RULES:
1. When in doubt between emergency and any other lane, choose EMERGENCY.
2. Bribery / corruption / abuse of authority are always INTEGRITY, even if they occurred inside a service interaction.
3. NEVER classify an emergency as INTEGRITY — emergencies go to Police / EMS / Civil Protection / Traffic, NOT ACA.
4. Integrity lane produces a reviewable ACA Signal — never an ACA Case.

Return STRICT JSON ONLY: {"pathway":"emergency|service|integrity","category":"...","emergencyType":"police|medical|fire|traffic|other|null","reason":"one short sentence"}`;

  const usr = `Classify this citizen submission:\n\n"""${text.slice(0, 1500)}"""`;

  let raw: string | null = null;
  try {
    raw = await aiComplete(sys, usr, 400, true);
  } catch {
    raw = null;
  }
  if (!raw) return null;

  // Extract the JSON object — tolerate markdown fences.
  let json: any = null;
  try {
    const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const f = trimmed.indexOf("{");
    const l = trimmed.lastIndexOf("}");
    if (f !== -1 && l !== -1) json = JSON.parse(trimmed.slice(f, l + 1));
    else json = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!json || typeof json !== "object") return null;

  const p = String(json.pathway || "").toLowerCase();
  if (p !== "emergency" && p !== "service" && p !== "integrity") return null;
  const cat = String(json.category || "general");
  let et: EmergencyType | undefined;
  if (p === "emergency") {
    const rawEt = String(json.emergencyType || "other").toLowerCase();
    et = ["police", "medical", "fire", "traffic", "other"].includes(rawEt)
      ? (rawEt as EmergencyType)
      : "other";
  }
  return {
    pathway: p,
    category: cat,
    emergencyType: et,
    reason: String(json.reason || "AI-classified.").slice(0, 300),
  };
}

/**
 * Route a citizen request to the correct sovereign institution.
 *
 * Algorithm:
 *   1. Run deterministic keyword classification.
 *   2. If keyword confidence is high (≥0.8), use it.
 *   3. Otherwise, consult AI (if provided). AI is a TIEBREAKER ONLY — it may
 *      never downgrade an emergency keyword match.
 *   4. If AI fails or is not provided, fall back to keyword classification
 *      (degraded mode).
 *
 * The result ALWAYS contains the full RoutingResult, including
 * fallbackChannels — never fabricated dispatch (Rule 1).
 */
export async function routeCitizenRequest(
  input: CitizenRequestInput,
  aiComplete?: AiCompleteFn,
): Promise<RoutingResult> {
  const text = (input.text || "").trim();
  const timestamp = new Date().toISOString();

  if (!text) {
    // Empty input — never route. Return a degenerate service result so the
    // caller can surface an error; we never fabricate a routing decision.
    const target = DEFAULT_SERVICE_TARGET;
    return {
      pathway: "service",
      category: "empty",
      targetInstitution: target.targetInstitution,
      targetDepartment: target.targetDepartment,
      officialChannel: target.officialChannel,
      sla: target.sla,
      escalation: target.escalation,
      routingReason:
        "Empty submission — no routing performed. Citizen must provide a description.",
      fallbackChannels: target.fallbackChannels,
      classifiedBy: "keyword",
      timestamp,
      degraded: true,
    };
  }

  const kw = keywordClassify(text);
  let pathway: RoutingPathway = kw.pathway;
  let category: string = kw.category;
  let emergencyType: EmergencyType | undefined = kw.emergencyType;
  let reason: string = kw.reason;
  let classifiedBy: "keyword" | "ai" | "hybrid" = "keyword";
  let degraded = false;

  // High-confidence emergency keywords are NEVER overridden by AI.
  const emergencyOverride = kw.pathway === "emergency" && kw.confidence >= 0.8;

  // Allow citizen to explicitly request the integrity lane (e.g. via a "this
  // is an integrity concern" toggle in the UI).
  if (input.integrityRequested && pathway !== "emergency") {
    pathway = "integrity";
    if (category === "general" || category.startsWith("emergency:")) {
      category = "abuse_of_authority";
    }
    reason = `Citizen explicitly requested the integrity lane. ${reason}`;
    classifiedBy = "hybrid";
  }

  // If keyword confidence is low (ambiguous text) and AI is available, use AI
  // as a tiebreaker — except when an emergency keyword matched.
  if (!emergencyOverride && kw.confidence < 0.8 && aiComplete) {
    const ai = await aiClassify(text, aiComplete);
    if (ai) {
      // AI may upgrade service→emergency or service→integrity, but never
      // downgrade an emergency keyword to a non-emergency lane.
      if (kw.pathway === "emergency" && ai.pathway !== "emergency") {
        // Keep keyword emergency routing.
      } else {
        pathway = ai.pathway;
        category = ai.category;
        emergencyType = ai.emergencyType;
        reason = `AI classification: ${ai.reason}`;
        classifiedBy = "ai";
      }
    } else {
      degraded = true;
    }
  } else if (!emergencyOverride && kw.confidence < 0.8 && !aiComplete) {
    degraded = true;
  }

  // Hint override: if citizen selected an emergency type hint and the
  // pathway came out as service / integrity, honor the hint when it is
  // plausibly an emergency.
  if (input.emergencyTypeHint && pathway !== "emergency") {
    pathway = "emergency";
    emergencyType = input.emergencyTypeHint;
    category = `emergency:${emergencyType}`;
    reason = `Citizen-selected emergency type hint (${emergencyType}) overrode keyword classification. ${reason}`;
    classifiedBy = "hybrid";
  }

  // Resolve the routing target.
  let target: RoutingTarget;
  if (pathway === "emergency") {
    const et = emergencyType || "other";
    target = EMERGENCY_TARGETS[et];
    category = `emergency:${et}`;
  } else if (pathway === "integrity") {
    target = INTEGRITY_TARGETS[category] || DEFAULT_INTEGRITY_TARGET;
  } else {
    target = SERVICE_TARGETS[category] || DEFAULT_SERVICE_TARGET;
  }

  return {
    pathway,
    category,
    targetInstitution: target.targetInstitution,
    targetDepartment: target.targetDepartment,
    officialChannel: target.officialChannel,
    sla: target.sla,
    escalation: target.escalation,
    routingReason: reason,
    fallbackChannels: target.fallbackChannels,
    classifiedBy,
    timestamp,
    emergencyType: pathway === "emergency" ? emergencyType : undefined,
    degraded,
  };
}

/**
 * Synchronous keyword-only classifier — used by client components and by
 * tests where AI is unavailable. Mirrors the deterministic floor of
 * routeCitizenRequest.
 */
export function quickClassify(text: string): {
  pathway: RoutingPathway;
  category: string;
  emergencyType?: EmergencyType;
} {
  return keywordClassify(text);
}
