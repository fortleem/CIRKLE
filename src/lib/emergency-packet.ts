// @ts-nocheck
/**
 * Emergency Packet — Chapter XXV (Emergency Packet).
 *
 * Constructs the minimum-necessary-information packet that CIRCLE sends to
 * the sovereign emergency responder. The packet is the SMALLEST set of
 * fields required for the responder to dispatch help — never the citizen's
 * full data profile, never their full media gallery, never their full
 * location history.
 *
 * Sovereign rules:
 *   • Minimum necessary information only (Chapter XXV §25.4). When
 *     minInfoOnly is true (the default), the packet omits media hashes,
 *     callback phone, and detailed hazards. The responder receives only:
 *       - incidentType
 *       - location (if available)
 *       - personsAffected (best estimate)
 *       - citizenDescription (truncated to 500 chars)
 *       - timestamp
 *   • Never the raw media. Media references are SHA-256 hashes; the media
 *     itself is stored on the citizen's device / sovereign storage and
 *     released only to the institution on explicit authorization.
 *   • Never the citizen's full identity. callbackInfo is optional and may
 *     be a trusted-contact handle rather than a phone number.
 *   • Silent emergency (Chapter XXVII): when location is unavailable or the
 *     citizen cannot speak, the packet may carry only the incidentType and
 *     the best available signal (e.g. a single GPS ping or a single tap).
 */

import type { EmergencyType } from "@/lib/smart-routing-engine";

/**
 * The emergency packet — sent to the sovereign emergency responder.
 *
 * Every field is optional EXCEPT `incidentType` and `timestamp`. When
 * `minInfoOnly` is true (default), the builder strips every field that is
 * not strictly necessary for dispatch.
 */
export interface EmergencyPacket {
  /** Incident type — police | medical | fire | traffic | other. */
  incidentType: EmergencyType;
  /** Location of the incident. */
  location?: {
    lat: number;
    lng: number;
    /** GPS accuracy in meters, if known. */
    accuracy?: number;
    /** Reverse-geocoded address, if known. */
    address?: string;
    /**
     * Whether route access has been confirmed — i.e. whether the responder
     * can actually reach this location by road.
     */
    routeAccess?: "confirmed" | "unconfirmed" | "unreachable";
  };
  /** Best estimate of the number of persons affected. */
  personsAffected?: number;
  /** Visible hazards at the scene. */
  hazards?: string[];
  /** Free-text description from the citizen (truncated to 500 chars). */
  citizenDescription?: string;
  /** Media references — SHA-256 hashes only, never the raw media. */
  media?: Array<{ kind: "image" | "audio" | "video"; hash: string }>;
  /** Callback information — phone or trusted-contact handle. */
  callbackInfo?: {
    phone?: string;
    trustedContact?: string;
    /** Whether the citizen consents to a return call. */
    consentToCallback?: boolean;
  };
  /** Stable ISO timestamp of packet construction. */
  timestamp: string;
  /**
   * Whether the packet carries minimum necessary information only.
   * Default: true. When false, the citizen has explicitly opted to send
   * additional fields (media hashes, callback phone, detailed hazards).
   */
  minInfoOnly: boolean;
}

export interface BuildPacketInput {
  incidentType: EmergencyType;
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
    routeAccess?: "confirmed" | "unconfirmed" | "unreachable";
  };
  personsAffected?: number;
  hazards?: string[];
  citizenDescription?: string;
  media?: Array<{ kind: "image" | "audio" | "video"; hash: string }>;
  callbackInfo?: { phone?: string; trustedContact?: string; consentToCallback?: boolean };
  /** Default true. Set false to send the full packet (with media / callback). */
  minInfoOnly?: boolean;
}

/**
 * Build an emergency packet from citizen input. Truncates, sanitizes, and
 * (when minInfoOnly is true) strips every field that is not strictly
 * necessary for dispatch.
 *
 * Sanitization rules:
 *   - citizenDescription is truncated to 500 chars and stripped of control
 *     characters.
 *   - hazards array is deduplicated and capped at 8 entries, each ≤ 60 chars.
 *   - media array is capped at 4 entries.
 *   - callbackInfo.phone is normalized (digits + leading +).
 *   - location.address is truncated to 200 chars.
 *   - location.accuracy is clamped to ≥ 0.
 */
export function buildPacket(input: BuildPacketInput): EmergencyPacket {
  const minInfoOnly = input.minInfoOnly !== false;

  const packet: EmergencyPacket = {
    incidentType: input.incidentType || "other",
    timestamp: new Date().toISOString(),
    minInfoOnly,
  };

  // Location is always sent when available — it is the single most
  // important field for emergency dispatch.
  if (input.location && typeof input.location.lat === "number" && typeof input.location.lng === "number") {
    packet.location = {
      lat: round(input.location.lat, 6),
      lng: round(input.location.lng, 6),
      accuracy: input.location.accuracy != null ? Math.max(0, Math.round(input.location.accuracy)) : undefined,
      address: input.location.address ? String(input.location.address).slice(0, 200) : undefined,
      routeAccess: input.location.routeAccess,
    };
  }

  if (input.personsAffected != null && Number.isFinite(input.personsAffected)) {
    packet.personsAffected = Math.max(1, Math.min(9999, Math.round(input.personsAffected)));
  }

  // Description is sent in minInfoOnly mode (truncated) — the responder
  // needs to know what is happening.
  if (input.citizenDescription) {
    packet.citizenDescription = sanitizeText(input.citizenDescription, 500);
  }

  if (!minInfoOnly) {
    // Full packet — include hazards, media, callback info.
    if (Array.isArray(input.hazards) && input.hazards.length > 0) {
      const seen = new Set<string>();
      const hazards: string[] = [];
      for (const h of input.hazards) {
        const s = sanitizeText(h, 60);
        const key = s.toLowerCase();
        if (s && !seen.has(key)) {
          seen.add(key);
          hazards.push(s);
          if (hazards.length >= 8) break;
        }
      }
      if (hazards.length > 0) packet.hazards = hazards;
    }

    if (Array.isArray(input.media) && input.media.length > 0) {
      const media: EmergencyPacket["media"] = [];
      for (const m of input.media.slice(0, 4)) {
        if (!m || typeof m.hash !== "string") continue;
        const kind = m.kind === "image" || m.kind === "audio" || m.kind === "video" ? m.kind : "image";
        // Hash must be a SHA-256 (64 hex chars). Truncate defensively if
        // a malformed hash slips through — never send raw media bytes.
        const hash = String(m.hash).replace(/[^a-f0-9]/gi, "").slice(0, 64);
        if (hash.length >= 8) media.push({ kind, hash });
      }
      if (media.length > 0) packet.media = media;
    }

    if (input.callbackInfo) {
      const cb: EmergencyPacket["callbackInfo"] = {};
      if (input.callbackInfo.phone) {
        const phone = String(input.callbackInfo.phone).replace(/[^\d+]/g, "").slice(0, 20);
        if (phone.length >= 6) cb.phone = phone;
      }
      if (input.callbackInfo.trustedContact) {
        cb.trustedContact = sanitizeText(input.callbackInfo.trustedContact, 80);
      }
      cb.consentToCallback = Boolean(input.callbackInfo.consentToCallback);
      if (cb.phone || cb.trustedContact) packet.callbackInfo = cb;
    }
  }

  return packet;
}

/**
 * Validate a packet. Returns { ok, errors }.
 *
 * The ONLY hard-required field is `incidentType`. Everything else is best-
 * effort: location may be unavailable (silent emergency, Chapter XXVII),
 * description may be impossible to give (citizen cannot speak), media may be
 * omitted (SAFE-EVIDENCE MODE). We NEVER reject a packet solely because
 * location is missing — that would be a failure of public safety.
 *
 * Validation does check:
 *   - incidentType is one of the known emergency types.
 *   - timestamp is a parseable ISO date.
 *   - minInfoOnly is a boolean.
 *   - if location is present, lat/lng are finite numbers.
 *   - if media is present, every entry has a kind and a hash.
 *   - if callbackInfo is present, at least one of phone/trustedContact is set.
 */
export function validatePacket(packet: EmergencyPacket): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const validTypes: EmergencyType[] = ["police", "medical", "fire", "traffic", "other"];
  if (!validTypes.includes(packet.incidentType)) {
    errors.push("incidentType must be one of: police, medical, fire, traffic, other");
  }

  if (!packet.timestamp || Number.isNaN(Date.parse(packet.timestamp))) {
    errors.push("timestamp must be a valid ISO date");
  }

  if (typeof packet.minInfoOnly !== "boolean") {
    errors.push("minInfoOnly must be a boolean");
  }

  if (packet.location) {
    if (
      typeof packet.location.lat !== "number" ||
      typeof packet.location.lng !== "number" ||
      !Number.isFinite(packet.location.lat) ||
      !Number.isFinite(packet.location.lng) ||
      packet.location.lat < -90 ||
      packet.location.lat > 90 ||
      packet.location.lng < -180 ||
      packet.location.lng > 180
    ) {
      errors.push("location.lat and location.lng must be finite valid coordinates");
    }
  }

  if (packet.media) {
    if (!Array.isArray(packet.media)) {
      errors.push("media must be an array");
    } else {
      packet.media.forEach((m, i) => {
        if (!m || typeof m !== "object") {
          errors.push(`media[${i}] must be an object`);
        } else {
          if (!["image", "audio", "video"].includes(m.kind)) {
            errors.push(`media[${i}].kind must be image|audio|video`);
          }
          if (typeof m.hash !== "string" || m.hash.length < 8) {
            errors.push(`media[${i}].hash must be a string of at least 8 characters`);
          }
        }
      });
    }
  }

  if (packet.callbackInfo) {
    if (
      !packet.callbackInfo.phone &&
      !packet.callbackInfo.trustedContact
    ) {
      errors.push("callbackInfo requires at least one of phone or trustedContact");
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Return a redacted, human-readable summary of the packet — used by the
 * UI to show the citizen EXACTLY what will be sent before they press Send.
 * Never includes the raw media bytes (only hashes), never includes the
 * full phone number (only the last 4 digits).
 */
export function summarizePacket(packet: EmergencyPacket): string {
  const parts: string[] = [];
  parts.push(`Type: ${packet.incidentType}`);
  if (packet.location) {
    parts.push(
      `Location: ${packet.location.lat.toFixed(5)}, ${packet.location.lng.toFixed(5)}` +
        (packet.location.accuracy != null ? ` (±${packet.location.accuracy}m)` : "") +
        (packet.location.address ? ` — ${packet.location.address}` : ""),
    );
  } else {
    parts.push("Location: not available (silent emergency)");
  }
  if (packet.personsAffected != null) {
    parts.push(`Persons affected: ${packet.personsAffected}`);
  }
  if (packet.citizenDescription) {
    parts.push(`Description: "${packet.citizenDescription}"`);
  }
  if (packet.hazards && packet.hazards.length > 0) {
    parts.push(`Hazards: ${packet.hazards.join(", ")}`);
  }
  if (packet.media && packet.media.length > 0) {
    parts.push(`Media: ${packet.media.length} reference${packet.media.length === 1 ? "" : "s"} (hashes only)`);
  }
  if (packet.callbackInfo) {
    if (packet.callbackInfo.phone) {
      const p = packet.callbackInfo.phone;
      const masked = p.length >= 4 ? `***${p.slice(-4)}` : p;
      parts.push(`Callback: ${masked}`);
    }
    if (packet.callbackInfo.trustedContact) {
      parts.push(`Trusted contact: ${packet.callbackInfo.trustedContact}`);
    }
  }
  parts.push(`Mode: ${packet.minInfoOnly ? "minimum necessary info" : "full packet (citizen-opted)"}`);
  parts.push(`Timestamp: ${packet.timestamp}`);
  return parts.join("\n");
}

// ── helpers ──────────────────────────────────────────────────────────────

function sanitizeText(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  // Strip control characters (except common whitespace) and truncate.
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
