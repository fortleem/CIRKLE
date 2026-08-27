// @ts-nocheck
/**
 * Emergency Fallback Hierarchy — Chapter XXIV (Emergency Fallback Hierarchy).
 *
 * Defines the ordered fallback chain used when the primary official channel
 * fails to deliver an emergency packet. The hierarchy is:
 *
 *   1. DIGITAL_CHANNEL        — primary official digital channel (e.g. police API)
 *   2. ALTERNATIVE_DIGITAL    — alternative official digital channel (e.g. portal)
 *   3. SMS_DATA               — SMS data to the institution's emergency gateway
 *   4. TELEPHONE              — voice call to the emergency line (122, 123, etc.)
 *   5. OFFLINE_QUEUE          — packet recorded locally and retransmitted when
 *                               the network is restored
 *
 * Rule 1 (No fabricated dispatch):
 *   The fallback chain NEVER fabricates a successful dispatch. If a fallback
 *   method cannot confirm delivery, it returns STATUS_UNAVAILABLE or FAILED —
 *   never TRANSMITTED or ACKNOWLEDGED. The OFFLINE_QUEUE level is the only
 *   fallback that may legitimately "succeed" without a live responder
 *   confirmation: it records the packet for later retransmission and returns
 *   FALLBACK_USED (not TRANSMITTED) — the citizen sees that their report is
 *   recorded, NOT that it has been delivered.
 *
 * If all electronic methods fail, the packet is recorded in the offline queue
 * (the report is never silently lost).
 */

import type { EmergencyPacket } from "@/lib/emergency-packet";

/**
 * The fallback hierarchy levels, in order of preference.
 */
export enum FallbackLevel {
  DIGITAL_CHANNEL = "DIGITAL_CHANNEL",
  ALTERNATIVE_DIGITAL = "ALTERNATIVE_DIGITAL",
  SMS_DATA = "SMS_DATA",
  TELEPHONE = "TELEPHONE",
  OFFLINE_QUEUE = "OFFLINE_QUEUE",
}

/**
 * The ordered fallback chain. Index 0 is the primary; index 4 is the last
 * resort (offline queue). Used by getFallback() to return the next method.
 */
export const FALLBACK_CHAIN: FallbackLevel[] = [
  FallbackLevel.DIGITAL_CHANNEL,
  FallbackLevel.ALTERNATIVE_DIGITAL,
  FallbackLevel.SMS_DATA,
  FallbackLevel.TELEPHONE,
  FallbackLevel.OFFLINE_QUEUE,
];

/**
 * Delivery status — reflects ONLY what the responder has actually returned.
 *
 *   TRANSMITTED        — the responder confirmed receipt of the packet.
 *   ACKNOWLEDGED       — the responder confirmed receipt AND that a unit
 *                        has been dispatched (or queued for dispatch).
 *   STATUS_UNAVAILABLE — delivery was attempted but the responder did not
 *                        return a status (network error, integration
 *                        Pending verification, timeout). NEVER fabricated.
 *   FAILED             — delivery could not be attempted (validation error,
 *                        adapter exception, no network). NEVER fabricated.
 *   FALLBACK_USED      — a fallback method was used; see `fallbackUsed` on
 *                        the parent result for which method. Used by the
 *                        OFFLINE_QUEUE level to indicate the packet was
 *                        recorded without claiming dispatch.
 */
export enum DeliveryStatus {
  TRANSMITTED = "TRANSMITTED",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  STATUS_UNAVAILABLE = "STATUS_UNAVAILABLE",
  FAILED = "FAILED",
  FALLBACK_USED = "FALLBACK_USED",
}

/**
 * Result of a single delivery attempt.
 */
export interface DeliveryAttemptResult {
  status: DeliveryStatus;
  fallbackUsed: FallbackLevel | null;
  note: string;
}

/**
 * Return the next fallback method after the given level.
 * Returns null when at the end of the chain (OFFLINE_QUEUE has no next).
 */
export function getFallback(current: FallbackLevel): FallbackLevel | null {
  const idx = FALLBACK_CHAIN.indexOf(current);
  if (idx === -1 || idx >= FALLBACK_CHAIN.length - 1) return null;
  return FALLBACK_CHAIN[idx + 1];
}

/**
 * Returns the full ordered fallback chain starting from the given level.
 * If no level is given, returns the full chain.
 */
export function getFallbackChain(from?: FallbackLevel): FallbackLevel[] {
  if (!from) return [...FALLBACK_CHAIN];
  const idx = FALLBACK_CHAIN.indexOf(from);
  if (idx === -1) return [...FALLBACK_CHAIN];
  return FALLBACK_CHAIN.slice(idx + 1);
}

/**
 * Human-readable label for each fallback level — used by the UI to explain
 * to the citizen which fallback method was used.
 */
export const FallbackLabel: Record<FallbackLevel, string> = {
  [FallbackLevel.DIGITAL_CHANNEL]: "Primary official digital channel",
  [FallbackLevel.ALTERNATIVE_DIGITAL]: "Alternative official digital channel",
  [FallbackLevel.SMS_DATA]: "SMS data to emergency gateway",
  [FallbackLevel.TELEPHONE]: "Telephone — voice call",
  [FallbackLevel.OFFLINE_QUEUE]: "Offline queue — recorded for retransmission",
};

/**
 * Attempt delivery via the given fallback level.
 *
 * This is a SIMULATED attempt: real production deployment injects an
 * actual delivery adapter for each level. The simulator NEVER fabricates
 * success on levels that require live responder confirmation (DIGITAL,
 * ALTERNATIVE_DIGITAL, SMS_DATA, TELEPHONE). Only OFFLINE_QUEUE "succeeds"
 * — by recording the packet locally — and even then it returns
 * FALLBACK_USED (not TRANSMITTED), so the citizen is told their report is
 * recorded, NOT that it has been dispatched.
 *
 * Rule 1 (No fabricated dispatch) is enforced by this asymmetry.
 */
export async function attemptDelivery(
  level: FallbackLevel,
  primaryChannel: string,
  packet: EmergencyPacket,
  // Optional injected delivery adapter — production wires real adapters here.
  realAdapter?: (
    level: FallbackLevel,
    channel: string,
    packet: EmergencyPacket,
  ) => Promise<DeliveryAttemptResult>,
): Promise<DeliveryAttemptResult> {
  if (realAdapter) {
    try {
      const result = await realAdapter(level, primaryChannel, packet);
      // The real adapter is trusted to return an honest status. We do NOT
      // override TRANSMITTED/ACKNOWLEDGED unless the adapter is for an
      // integration that is "Pending verification" — in which case the
      // adapter is responsible for returning STATUS_UNAVAILABLE itself.
      return result;
    } catch {
      return {
        status: DeliveryStatus.FAILED,
        fallbackUsed: null,
        note: `${FallbackLabel[level]} adapter threw an exception.`,
      };
    }
  }

  // Simulator — no live integration. Per Chapter LXXXIX (no hard-coded
  // assumptions), every electronic channel returns STATUS_UNAVAILABLE
  // because no live responder integration is asserted.
  switch (level) {
    case FallbackLevel.DIGITAL_CHANNEL:
      return {
        status: DeliveryStatus.STATUS_UNAVAILABLE,
        fallbackUsed: null,
        note: `Primary official digital channel "${primaryChannel}" integration is Pending verification — no status returned.`,
      };

    case FallbackLevel.ALTERNATIVE_DIGITAL:
      return {
        status: DeliveryStatus.STATUS_UNAVAILABLE,
        fallbackUsed: null,
        note: "Alternative official digital channel integration is Pending verification — no status returned.",
      };

    case FallbackLevel.SMS_DATA:
      return {
        status: DeliveryStatus.STATUS_UNAVAILABLE,
        fallbackUsed: null,
        note: "SMS data gateway integration is Pending verification — no carrier handshake returned.",
      };

    case FallbackLevel.TELEPHONE:
      return {
        status: DeliveryStatus.STATUS_UNAVAILABLE,
        fallbackUsed: null,
        note: "Telephone voice channel cannot confirm delivery programmatically — citizen is advised to also call the official emergency line directly.",
      };

    case FallbackLevel.OFFLINE_QUEUE: {
      // The OFFLINE_QUEUE is the safety net — it ALWAYS records the packet
      // (locally, never fabricating dispatch). Returns FALLBACK_USED to
      // signal "your report is recorded, NOT yet delivered".
      // In production, the offline queue persists to a local store and a
      // background worker retransmits when the network is restored.
      const recorded = await offlineQueueRecord(packet);
      if (recorded) {
        return {
          status: DeliveryStatus.FALLBACK_USED,
          fallbackUsed: FallbackLevel.OFFLINE_QUEUE,
          note: "Packet recorded in offline queue. Will be retransmitted to the official channel when the network is restored. This is NOT a confirmed dispatch.",
        };
      }
      return {
        status: DeliveryStatus.FAILED,
        fallbackUsed: null,
        note: "Offline queue write failed — packet could not be recorded.",
      };
    }

    default:
      return {
        status: DeliveryStatus.FAILED,
        fallbackUsed: null,
        note: `Unknown fallback level: ${String(level)}`,
      };
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Offline queue — local-only record of the packet. Used by the OFFLINE_QUEUE
// fallback level. In production this persists to a local store (e.g. IndexedDB
// on the citizen client, or a local file in the mini-service) and a background
// worker retransmits when the network is restored.
//
// The function here is a no-op shim that returns true (simulating a
// successful local write). It NEVER claims to have delivered the packet —
// the caller (attemptDelivery) returns FALLBACK_USED, not TRANSMITTED.
// ───────────────────────────────────────────────────────────────────────────

const OFFLINE_QUEUE: EmergencyPacket[] = [];

async function offlineQueueRecord(packet: EmergencyPacket): Promise<boolean> {
  try {
    OFFLINE_QUEUE.push(packet);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the offline queue (used by tests and by the admin panel to inspect
 * packets that are awaiting retransmission).
 */
export function readOfflineQueue(): EmergencyPacket[] {
  return [...OFFLINE_QUEUE];
}

/**
 * Clear the offline queue. Used by tests; in production this is performed by
 * the background retransmission worker once a queued packet is successfully
 * delivered.
 */
export function clearOfflineQueue(): void {
  OFFLINE_QUEUE.length = 0;
}

/**
 * Whether a given DeliveryStatus represents a successful dispatch.
 * Used by the UI to color-code the result.
 */
export function isSuccessfulDispatch(status: DeliveryStatus): boolean {
  return status === DeliveryStatus.TRANSMITTED || status === DeliveryStatus.ACKNOWLEDGED;
}

/**
 * Whether a given DeliveryStatus means "your report was recorded even though
 * dispatch could not be confirmed". This is the OFFLINE_QUEUE outcome.
 */
export function isRecordedOnly(status: DeliveryStatus): boolean {
  return status === DeliveryStatus.FALLBACK_USED;
}

/**
 * Whether a given DeliveryStatus represents a hard failure.
 */
export function isFailed(status: DeliveryStatus): boolean {
  return status === DeliveryStatus.FAILED;
}
