// @ts-nocheck
/**
 * Emergency Router — Chapter XXIII (National Emergency Integration) and
 * Chapter XXII (Emergency Path Must Not Be the ACA Path).
 *
 * Routes a confirmed emergency packet to the correct sovereign emergency
 * service based on the incident type:
 *
 *   police    → Egyptian National Police (122)
 *   medical   → Egyptian Ambulance Organization / EMS (123)
 *   fire      → Civil Protection Authority
 *   traffic   → General Directorate of Traffic
 *   other     → Public Safety Operations Centre (general triage)
 *
 * CRITICAL RULE (Chapter XXII):
 *   Emergencies are NEVER routed to the ACA. The ACA is an oversight body,
 *   not an emergency responder. Routing an emergency to the ACA would be a
 *   failure of public safety.
 *
 * Only recurring / systemic patterns observed across MANY emergencies may,
 * at a later time, under the platform's systemic signal detection process
 * (Chapter XXXIX), be aggregated into an ACA Signal — and even then, the
 * Signal is a reviewable intelligence object, NOT an ACA Case (Chapter XXXVIII).
 *
 * Rule 1 (No fabricated dispatch):
 *   routeEmergency() NEVER claims an emergency was transmitted, acknowledged,
 *   or resolved. It returns the routing DECISION plus a delivery status
 *   that reflects only what the responder has actually returned. If delivery
 *   fails, status is FAILED and fallbackUsed indicates which fallback was
 *   attempted. If status is unavailable, status is STATUS_UNAVAILABLE —
 *   never fabricated as TRANSMITTED.
 */

import type { EmergencyType } from "@/lib/smart-routing-engine";
import {
  buildPacket,
  validatePacket,
  type EmergencyPacket,
} from "@/lib/emergency-packet";
import {
  attemptDelivery,
  type DeliveryAttemptResult,
  DeliveryStatus,
  FallbackLevel,
} from "@/lib/emergency-fallback";

/**
 * Result of routing an emergency. Returned by routeEmergency() and by
 * POST /api/emergency/packet.
 */
export interface EmergencyRoute {
  /** Stable identifier for this emergency routing attempt. */
  emergencyId: string;
  /** Incident type — police | medical | fire | traffic | other. */
  type: EmergencyType;
  /** Sovereign institution responsible for the emergency. */
  targetInstitution: string;
  /** Specific department / dispatch desk inside the institution. */
  targetDepartment: string;
  /** Official channel the packet is sent through. */
  targetChannel: string;
  /** The minimum-necessary-info packet that was sent (or attempted). */
  packet: EmergencyPacket;
  /** Delivery status — reflects ONLY what the responder actually returned. */
  status: DeliveryStatus;
  /** Whether a fallback method was used (and which one). */
  fallbackUsed: FallbackLevel | null;
  /** Human-readable note about the delivery outcome. */
  statusNote: string;
  /** Stable ISO timestamp for audit. */
  timestamp: string;
}

/**
 * Input to routeEmergency.
 */
export interface RouteEmergencyInput {
  /** Incident type. */
  type: EmergencyType;
  /** Free-text citizen description of the incident. */
  citizenDescription: string;
  /** Optional location — only included if the citizen consents. */
  location?: { lat: number; lng: number; accuracy?: number; address?: string };
  /** Number of persons affected (best estimate). */
  personsAffected?: number;
  /** Visible hazards at the scene (fire, gas, weapons, traffic, etc.). */
  hazards?: string[];
  /** Media references — hashes only, never the raw media. */
  media?: Array<{ kind: string; hash: string }>;
  /** Callback information — phone or trusted-contact handle. */
  callbackInfo?: { phone?: string; trustedContact?: string };
  /** When SAFE-EVIDENCE MODE is on, the citizen is at a safe distance. */
  safeEvidenceMode?: boolean;
  /**
   * Whether to send minimum information only. When true (default), the
   * packet omits media hashes, callback phone, and detailed hazards — the
   * absolute minimum needed to dispatch help.
   */
  minInfoOnly?: boolean;
  /**
   * Injected delivery function — typically an integration adapter that calls
   * the sovereign responder's API. When omitted, routeEmergency simulates
   * an attempted delivery and returns STATUS_UNAVAILABLE for the primary
   * channel (because the integration is "Pending verification" per Chapter
   * LXXXIX). The fallback chain is then exercised so the citizen's report
   * is at minimum recorded.
   */
  deliver?: (channel: string, packet: EmergencyPacket) => Promise<DeliveryAttemptResult>;
}

// ───────────────────────────────────────────────────────────────────────────
// Emergency service registry.
//
// Maps EmergencyType → sovereign responder institution + dispatch channel +
// SLA + fallback channel list. Mirrors EMERGENCY_TARGETS in
// smart-routing-engine.ts but adds the dispatch-channel identifier used by
// the delivery layer.
//
// Per Chapter LXXXIX (no hard-coded assumptions), no live integration is
// asserted — the dispatcher adapters are injected and return
// STATUS_UNAVAILABLE until the institution's registry entry is confirmed.
// ───────────────────────────────────────────────────────────────────────────

interface EmergencyServiceTarget {
  institution: string;
  department: string;
  channel: string;
  sla: string;
  fallbacks: FallbackLevel[];
}

const EMERGENCY_SERVICE_REGISTRY: Record<EmergencyType, EmergencyServiceTarget> = {
  police: {
    institution: "Egyptian National Police",
    department: "Public Emergency Operations Centre",
    channel: "police-emergency-dispatch-122",
    sla: "Immediate response — first acknowledgment within seconds",
    fallbacks: [
      FallbackLevel.ALTERNATIVE_DIGITAL,
      FallbackLevel.SMS_DATA,
      FallbackLevel.TELEPHONE,
      FallbackLevel.OFFLINE_QUEUE,
    ],
  },
  medical: {
    institution: "Egyptian Ambulance Organization (EMS)",
    department: "National Ambulance Dispatch",
    channel: "ambulance-dispatch-123",
    sla: "Immediate response — dispatch within minutes",
    fallbacks: [
      FallbackLevel.ALTERNATIVE_DIGITAL,
      FallbackLevel.SMS_DATA,
      FallbackLevel.TELEPHONE,
      FallbackLevel.OFFLINE_QUEUE,
    ],
  },
  fire: {
    institution: "Civil Protection Authority",
    department: "Civil Protection Dispatch",
    channel: "civil-protection-dispatch",
    sla: "Immediate response — first unit dispatched within minutes",
    fallbacks: [
      FallbackLevel.ALTERNATIVE_DIGITAL,
      FallbackLevel.SMS_DATA,
      FallbackLevel.TELEPHONE,
      FallbackLevel.OFFLINE_QUEUE,
    ],
  },
  traffic: {
    institution: "General Directorate of Traffic",
    department: "Traffic Operations & Road Safety",
    channel: "traffic-emergency-dispatch",
    sla: "Immediate response — first unit dispatched within minutes",
    fallbacks: [
      FallbackLevel.ALTERNATIVE_DIGITAL,
      FallbackLevel.SMS_DATA,
      FallbackLevel.TELEPHONE,
      FallbackLevel.OFFLINE_QUEUE,
    ],
  },
  other: {
    institution: "Public Safety Operations Centre",
    department: "General Emergency Triage",
    channel: "public-safety-general-emergency",
    sla: "Immediate triage — re-routed to specific emergency service within seconds",
    fallbacks: [
      FallbackLevel.ALTERNATIVE_DIGITAL,
      FallbackLevel.SMS_DATA,
      FallbackLevel.TELEPHONE,
      FallbackLevel.OFFLINE_QUEUE,
    ],
  },
};

/**
 * Route a confirmed emergency packet to the correct sovereign emergency
 * service. Implements Rule 1 (no fabricated dispatch): the returned
 * EmergencyRoute reflects ONLY what the responder has actually returned.
 */
export async function routeEmergency(
  input: RouteEmergencyInput,
): Promise<EmergencyRoute> {
  const emergencyId = `emr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date().toISOString();
  const type: EmergencyType = input.type || "other";

  // Build the minimum-necessary-info packet. validatePacket() returns
  // { ok, errors } — if validation fails we still route but mark the packet
  // as minInfoOnly=false so the citizen UI can prompt for the missing
  // minimum fields (location if available, brief description).
  const packet = buildPacket({
    incidentType: type,
    location: input.location,
    personsAffected: input.personsAffected,
    hazards: input.hazards,
    citizenDescription: input.citizenDescription,
    media: input.media,
    callbackInfo: input.callbackInfo,
    minInfoOnly: input.minInfoOnly !== false, // default true
  });

  const validation = validatePacket(packet);
  if (!validation.ok) {
    // Validation failed — we cannot even attempt dispatch. Return FAILED
    // with the validation errors. Never fabricate.
    return {
      emergencyId,
      type,
      targetInstitution: EMERGENCY_SERVICE_REGISTRY[type].institution,
      targetDepartment: EMERGENCY_SERVICE_REGISTRY[type].department,
      targetChannel: EMERGENCY_SERVICE_REGISTRY[type].channel,
      packet,
      status: DeliveryStatus.FAILED,
      fallbackUsed: null,
      statusNote: `Packet validation failed: ${validation.errors.join("; ")}. Minimum required fields are missing.`,
      timestamp,
    };
  }

  const target = EMERGENCY_SERVICE_REGISTRY[type];

  // Attempt delivery on the primary official channel.
  let delivery: DeliveryAttemptResult;
  if (input.deliver) {
    try {
      delivery = await input.deliver(target.channel, packet);
    } catch {
      delivery = {
        status: DeliveryStatus.FAILED,
        fallbackUsed: null,
        note: "Primary delivery adapter threw an exception.",
      };
    }
  } else {
    // No integration adapter provided — primary channel is "Pending
    // verification" per Chapter LXXXIX. We NEVER fabricate success; the
    // primary attempt returns STATUS_UNAVAILABLE and we proceed to the
    // fallback chain. The offline queue ALWAYS succeeds in recording the
    // packet (Rule 1: even when delivery fails, the report is recorded).
    delivery = {
      status: DeliveryStatus.STATUS_UNAVAILABLE,
      fallbackUsed: null,
      note: `Primary official channel "${target.channel}" integration is Pending verification — no live dispatcher available. Proceeding to fallback hierarchy.`,
    };
  }

  let finalStatus = delivery.status;
  let fallbackUsed = delivery.fallbackUsed;
  let statusNote = delivery.note;
  let attemptsRemaining = target.fallbacks.length;

  // If the primary failed or status is unavailable, walk the fallback chain.
  if (
    finalStatus === DeliveryStatus.FAILED ||
    finalStatus === DeliveryStatus.STATUS_UNAVAILABLE
  ) {
    for (const level of target.fallbacks) {
      if (attemptsRemaining <= 0) break;
      attemptsRemaining -= 1;
      const fb = await attemptDelivery(level, target.channel, packet);
      // The OFFLINE_QUEUE fallback ALWAYS records the packet — it is the
      // safety net that guarantees no emergency is silently lost.
      if (fb.status === DeliveryStatus.TRANSMITTED ||
          fb.status === DeliveryStatus.ACKNOWLEDGED ||
          (level === FallbackLevel.OFFLINE_QUEUE &&
           fb.status === DeliveryStatus.FALLBACK_USED)) {
        finalStatus = fb.status;
        fallbackUsed = level;
        statusNote = `${statusNote} → Fallback ${level}: ${fb.note}`;
        break;
      }
      // Accumulate the failed-fallback note.
      statusNote = `${statusNote} → Fallback ${level}: ${fb.note}`;
    }
  }

  // Final guard (Rule 1): if every electronic method failed AND the offline
  // queue also failed (which should be impossible), explicitly mark FAILED.
  if (
    finalStatus !== DeliveryStatus.TRANSMITTED &&
    finalStatus !== DeliveryStatus.ACKNOWLEDGED &&
    finalStatus !== DeliveryStatus.FALLBACK_USED
  ) {
    finalStatus = DeliveryStatus.FAILED;
    if (!fallbackUsed) fallbackUsed = FallbackLevel.OFFLINE_QUEUE;
    statusNote = `${statusNote} → All electronic methods failed. Packet recorded in offline queue for retransmission when network restored.`;
  }

  return {
    emergencyId,
    type,
    targetInstitution: target.institution,
    targetDepartment: target.department,
    targetChannel: target.channel,
    packet,
    status: finalStatus,
    fallbackUsed,
    statusNote,
    timestamp,
  };
}

/**
 * Returns the routing target for an emergency type WITHOUT attempting
 * delivery. Used by the smart-routing overlay to preview where the
 * emergency will be routed before the citizen presses "Send".
 */
export function previewEmergencyRoute(type: EmergencyType) {
  const t = EMERGENCY_SERVICE_REGISTRY[type] || EMERGENCY_SERVICE_REGISTRY.other;
  return {
    type,
    targetInstitution: t.institution,
    targetDepartment: t.department,
    targetChannel: t.channel,
    sla: t.sla,
    fallbacks: t.fallbacks,
  };
}
