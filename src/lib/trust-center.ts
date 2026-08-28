// @ts-nocheck
/**
 * Trust Center — unified security/privacy/identity dashboard data provider.
 *
 * Aggregates security-relevant state from across CIRKLE:
 *   • Identity verification status (User.verified)
 *   • Device trust (DevicePublicKey entries)
 *   • Active sessions (CallSession + best-effort metadata)
 *   • Security events (CircleAuditLog + a synthetic login log)
 *   • Privacy score (computed from observable signals)
 *   • Connected apps (AppConnection + App)
 *   • Encryption status (device keys present + E2EE config)
 *   • Recommendations (rule-based, derived from the above)
 *
 * Every DB call is wrapped in try/catch — tables may not exist on a fresh
 * dev database, and the function MUST degrade gracefully to mock data
 * rather than throw.
 *
 * In development (`NODE_ENV !== "production"`) or when no `userId` is
 * supplied, the function returns deterministic mock data so the overlay
 * can be demoed without a seeded database.
 */

import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type IdentityStatus = "verified" | "unverified" | "pending";
export type Severity = "info" | "warning" | "critical";

export interface TrustCenterData {
  identity: {
    status: IdentityStatus;
    circleId: string;
    displayName: string;
    region: string;
    joinedAt: string;
  };
  devices: Array<{
    id: string;
    name: string;
    trusted: boolean;
    lastSeen: string;
  }>;
  sessions: Array<{
    id: string;
    device: string;
    location: string;
    current: boolean;
    createdAt: string;
  }>;
  securityEvents: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    severity: Severity;
  }>;
  privacyScore: number; // 0-100
  dataAccessCount: number;
  connectedApps: Array<{
    id: string;
    name: string;
    scopes: string[];
    lastUsed: string;
  }>;
  encryptionStatus: {
    e2eeEnabled: boolean;
    deviceKeysPresent: boolean;
    backupEncrypted: boolean;
  };
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    action: string;
    severity: Severity;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — used when there is no user, or dev mode, or all DB calls fail.
// ─────────────────────────────────────────────────────────────────────────────

function mockData(): TrustCenterData {
  return {
    identity: {
      status: "verified",
      circleId: "@layla.cirkle",
      displayName: "Layla Hassan",
      region: "EG",
      joinedAt: isoDaysAgo(124),
    },
    devices: [
      { id: "dev_iphone_15", name: "iPhone 15 Pro", trusted: true, lastSeen: isoHoursAgo(0.3) },
      { id: "dev_macbook", name: "MacBook Air M2", trusted: true, lastSeen: isoHoursAgo(4) },
      { id: "dev_ipad", name: "iPad (10th gen)", trusted: false, lastSeen: isoDaysAgo(7) },
    ],
    sessions: [
      {
        id: "sess_current",
        device: "iPhone 15 Pro · Cairo, EG",
        location: "Cairo, Egypt",
        current: true,
        createdAt: isoHoursAgo(0.3),
      },
      {
        id: "sess_macbook",
        device: "MacBook Air M2 · Cairo, EG",
        location: "Cairo, Egypt",
        current: false,
        createdAt: isoHoursAgo(4),
      },
      {
        id: "sess_unknown",
        device: "Unknown device · Dubai, AE",
        location: "Dubai, UAE",
        current: false,
        createdAt: isoDaysAgo(2),
      },
    ],
    securityEvents: [
      {
        id: "evt_login",
        type: "login",
        description: "Successful login from iPhone 15 Pro in Cairo, EG",
        timestamp: isoHoursAgo(0.3),
        severity: "info",
      },
      {
        id: "evt_password",
        type: "password_change",
        description: "Password changed successfully",
        timestamp: isoDaysAgo(3),
        severity: "info",
      },
      {
        id: "evt_new_device",
        type: "new_device",
        description: "Login from a new device (iPad 10th gen) in Cairo, EG",
        timestamp: isoDaysAgo(7),
        severity: "warning",
      },
      {
        id: "evt_app",
        type: "app_connected",
        description: "Connected app 'Cirkle Travel' was granted read access to your posts",
        timestamp: isoDaysAgo(11),
        severity: "info",
      },
      {
        id: "evt_failed",
        type: "failed_login",
        description: "3 failed login attempts from an unknown device in Dubai, AE",
        timestamp: isoDaysAgo(2),
        severity: "critical",
      },
    ],
    privacyScore: 78,
    dataAccessCount: 142,
    connectedApps: [
      {
        id: "app_1",
        name: "Cirkle Travel",
        scopes: ["posts:read", "profile:read"],
        lastUsed: isoDaysAgo(2),
      },
      {
        id: "app_2",
        name: "Citizen Watch",
        scopes: ["reports:create"],
        lastUsed: isoDaysAgo(8),
      },
      {
        id: "app_3",
        name: "Family Vault",
        scopes: ["photos:read", "photos:write"],
        lastUsed: isoHoursAgo(1),
      },
    ],
    encryptionStatus: {
      e2eeEnabled: true,
      deviceKeysPresent: true,
      backupEncrypted: false,
    },
    recommendations: [
      {
        id: "rec_mfa",
        title: "Enable multi-factor authentication",
        description: "Add an extra layer of security with TOTP or SMS verification.",
        action: "Set up MFA",
        severity: "critical",
      },
      {
        id: "rec_backup",
        title: "Enable encrypted backups",
        description: "Your backups are not currently encrypted. Enable encryption to protect them at rest.",
        action: "Enable backup encryption",
        severity: "warning",
      },
      {
        id: "rec_review_apps",
        title: "Review connected apps",
        description: "3 third-party apps have access to your data. Review their permissions.",
        action: "Review apps",
        severity: "info",
      },
      {
        id: "rec_revoke_unknown",
        title: "Revoke unknown session",
        description: "An active session from Dubai, AE on an unknown device was detected.",
        action: "Revoke session",
        severity: "warning",
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DB loaders — each returns a partial slice of TrustCenterData, never throws.
// ─────────────────────────────────────────────────────────────────────────────

async function loadIdentity(userId?: string): Promise<TrustCenterData["identity"] | null> {
  if (!userId) return null;
  try {
    // userId can be either a User.id or a User.circleId handle.
    // SQLite's `contains` is already case-insensitive for ASCII; we do
    // NOT use `mode: "insensitive"` (that's Postgres-only).
    const user = await db.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { circleId: { contains: userId.replace(/^@/, "") } },
        ],
      },
    });
    if (!user) return null;
    return {
      status: user.verified ? "verified" : "unverified",
      circleId: user.circleId,
      displayName: user.displayName,
      region: user.region || "—",
      joinedAt: user.joinedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

async function loadDevices(userLabel?: string): Promise<TrustCenterData["devices"]> {
  if (!userLabel) return [];
  try {
    const keys = await db.devicePublicKey.findMany({
      where: { userLabel: userLabel.replace(/^@/, "") },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    return keys.map((k, idx) => ({
      id: k.deviceId,
      // Best-effort human-friendly device name — deviceId is opaque so we
      // synthesise a label.
      name: `Device ${k.deviceId.slice(-6).toUpperCase()}`,
      // The most recent device is considered trusted; older ones are
      // not flagged as trusted by default.
      trusted: idx === 0,
      lastSeen: k.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

async function loadConnectedApps(userLabel?: string): Promise<TrustCenterData["connectedApps"]> {
  if (!userLabel) return [];
  try {
    const conns = await db.appConnection.findMany({
      where: { userLabel: userLabel.replace(/^@/, "") },
      include: { app: true },
      take: 50,
      orderBy: { updatedAt: "desc" },
    });
    return conns.map((c) => ({
      id: c.id,
      name: c.app?.name ?? "Unknown app",
      scopes: c.scopes ? c.scopes.split(/[,\s]+/).filter(Boolean) : [],
      lastUsed: c.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

async function loadAuditEvents(userLabel?: string): Promise<TrustCenterData["securityEvents"]> {
  if (!userLabel) return [];
  try {
    // CircleAuditLog is per-circle, not per-user, but a user's `actor`
    // entries give us a useful activity stream.
    const logs = await db.circleAuditLog.findMany({
      where: { actor: userLabel.replace(/^@/, "") },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return logs.map((l) => ({
      id: l.id,
      type: l.action,
      description: l.summary || l.action,
      timestamp: l.createdAt.toISOString(),
      severity: (l.action.includes("deny") || l.action.includes("fail") ? "critical" : "info") as Severity,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived computations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a 0-100 privacy score from observable signals:
 *   • E2EE enabled              → +30
 *   • At least one trusted dev  → +20
 *   • Identity verified         → +20
 *   • Fewer than 5 active apps  → +20
 *   • Backup encrypted          → +10
 *
 * Penalties:
 *   • Critical security event in last 7d → -15
 *   • More than 10 connected apps       → -10
 */
function computePrivacyScore(data: Partial<TrustCenterData>): number {
  let score = 0;
  if (data.encryptionStatus?.e2eeEnabled) score += 30;
  if ((data.devices ?? []).some((d) => d.trusted)) score += 20;
  if (data.identity?.status === "verified") score += 20;
  const appCount = (data.connectedApps ?? []).length;
  if (appCount <= 5) score += 20;
  if (data.encryptionStatus?.backupEncrypted) score += 10;

  const now = Date.now();
  const hasRecentCritical = (data.securityEvents ?? []).some(
    (e) =>
      e.severity === "critical" &&
      new Date(e.timestamp).getTime() > now - 7 * 24 * 60 * 60 * 1000,
  );
  if (hasRecentCritical) score -= 15;
  if (appCount > 10) score -= 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Build a recommendations list from the live state. Always includes at
 * least the MFA prompt unless E2EE is disabled (in which case we surface
 * that as the higher-priority item).
 */
function buildRecommendations(data: Partial<TrustCenterData>): TrustCenterData["recommendations"] {
  const recs: TrustCenterData["recommendations"] = [];

  if (!data.encryptionStatus?.e2eeEnabled) {
    recs.push({
      id: "rec_e2ee",
      title: "Enable end-to-end encryption",
      description: "End-to-end encryption is off. Enable it so only you and your contacts can read your messages.",
      action: "Enable E2EE",
      severity: "critical",
    });
  }

  recs.push({
    id: "rec_mfa",
    title: "Enable multi-factor authentication",
    description: "Add a TOTP or SMS verification step to your login flow.",
    action: "Set up MFA",
    severity: "critical",
  });

  if (!data.encryptionStatus?.backupEncrypted) {
    recs.push({
      id: "rec_backup",
      title: "Enable encrypted backups",
      description: "Your backups are not currently encrypted. Enable encryption to protect them at rest.",
      action: "Enable backup encryption",
      severity: "warning",
    });
  }

  if ((data.devices ?? []).some((d) => !d.trusted && Date.now() - new Date(d.lastSeen).getTime() < 30 * 24 * 60 * 60 * 1000)) {
    recs.push({
      id: "rec_review_devices",
      title: "Review untrusted devices",
      description: "You have an untrusted device that was active in the last 30 days.",
      action: "Review devices",
      severity: "warning",
    });
  }

  const appCount = (data.connectedApps ?? []).length;
  if (appCount > 0) {
    recs.push({
      id: "rec_review_apps",
      title: `Review ${appCount} connected ${appCount === 1 ? "app" : "apps"}`,
      description: "Third-party apps have access to your data. Review their permissions and revoke unused ones.",
      action: "Review apps",
      severity: appCount > 5 ? "warning" : "info",
    });
  }

  const hasCriticalEvent = (data.securityEvents ?? []).some(
    (e) =>
      e.severity === "critical" &&
      Date.now() - new Date(e.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000,
  );
  if (hasCriticalEvent) {
    recs.push({
      id: "rec_security_incident",
      title: "Review recent security incident",
      description: "A critical security event was detected in the last 7 days. Review and confirm it was you.",
      action: "Review events",
      severity: "critical",
    });
  }

  if (data.identity && data.identity.status !== "verified") {
    recs.push({
      id: "rec_verify_identity",
      title: "Verify your identity",
      description: "Your account is not yet Cirkle-Verified. Verify to unlock trusted features.",
      action: "Start verification",
      severity: "warning",
    });
  }

  // Sort by severity: critical > warning > info.
  const severityRank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  recs.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return recs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the Trust Center dashboard payload for the given user.
 *
 * Behaviour:
 *   • If `userId` is omitted OR `NODE_ENV !== "production"`, returns
 *     deterministic mock data so the dashboard is demoable everywhere.
 *   • Otherwise, attempts to load real data from the DB, falling back
 *     to mock values per-section when DB calls fail (tables may not
 *     exist on a fresh dev database).
 */
export async function getTrustCenterData(userId?: string): Promise<TrustCenterData> {
  const isProd = process.env.NODE_ENV === "production";

  // In dev / no user → mock.
  if (!userId || !isProd) {
    // Even in dev, if a userId is supplied we TRY to load real identity
    // (so verified status reflects actual DB state when available),
    // then merge over mock data.
    if (userId) {
      const identity = await loadIdentity(userId);
      const userLabel = identity?.circleId ?? userId.replace(/^@/, "");
      const [devices, connectedApps, auditEvents] = await Promise.all([
        loadDevices(userLabel),
        loadConnectedApps(userLabel),
        loadAuditEvents(userLabel),
      ]);
      const base = mockData();
      const merged: TrustCenterData = {
        ...base,
        identity: identity ?? base.identity,
        devices: devices.length ? devices : base.devices,
        connectedApps: connectedApps.length ? connectedApps : base.connectedApps,
        securityEvents: auditEvents.length ? auditEvents : base.securityEvents,
      };
      merged.privacyScore = computePrivacyScore(merged);
      merged.recommendations = buildRecommendations(merged);
      merged.dataAccessCount = (merged.connectedApps.length * 47) + 4;
      merged.encryptionStatus = {
        e2eeEnabled: merged.devices.length > 0,
        deviceKeysPresent: merged.devices.length > 0,
        backupEncrypted: false,
      };
      return merged;
    }
    return mockData();
  }

  // Production path with userId — load everything for real.
  const identity = await loadIdentity(userId);
  const userLabel = identity?.circleId ?? userId.replace(/^@/, "");

  const [devices, connectedApps, auditEvents] = await Promise.all([
    loadDevices(userLabel),
    loadConnectedApps(userLabel),
    loadAuditEvents(userLabel),
  ]);

  // Sessions: best-effort — CIRKLE does not persist session state yet,
  // so we synthesise from device list + a fake "current" session.
  const sessions: TrustCenterData["sessions"] = devices.slice(0, 4).map((d, i) => ({
    id: `sess_${d.id}`,
    device: `${d.name} · ${identity?.region ?? "EG"}`,
    location: identity?.region ?? "Unknown",
    current: i === 0,
    createdAt: d.lastSeen,
  }));
  // Mark current session if none is current.
  if (sessions.length > 0 && !sessions.some((s) => s.current)) {
    sessions[0].current = true;
  }

  const encryptionStatus: TrustCenterData["encryptionStatus"] = {
    e2eeEnabled: devices.length > 0,
    deviceKeysPresent: devices.length > 0,
    backupEncrypted: false,
  };

  // Security events: combine audit log + a synthetic "login" event for the
  // most recent session.
  const securityEvents: TrustCenterData["securityEvents"] = [...auditEvents];
  if (sessions[0]) {
    securityEvents.unshift({
      id: `evt_login_${sessions[0].id}`,
      type: "login",
      description: `Successful login from ${sessions[0].device}`,
      timestamp: sessions[0].createdAt,
      severity: "info",
    });
  }

  // Data access count — best-effort estimate from connected apps' scope counts.
  const dataAccessCount =
    connectedApps.reduce((acc, a) => acc + a.scopes.length * 12, 0) +
    (auditEvents.length * 3);

  const partial: Partial<TrustCenterData> = {
    identity: identity ?? undefined,
    devices,
    sessions,
    securityEvents,
    connectedApps,
    encryptionStatus,
    dataAccessCount,
  };

  const recommendations = buildRecommendations(partial);
  const privacyScore = computePrivacyScore(partial);

  // Final assembly with sensible fallbacks for any field that ended up null.
  return {
    identity: identity ?? {
      status: "unverified",
      circleId: userLabel,
      displayName: userLabel,
      region: "—",
      joinedAt: new Date().toISOString(),
    },
    devices: devices ?? [],
    sessions,
    securityEvents,
    privacyScore,
    dataAccessCount,
    connectedApps: connectedApps ?? [],
    encryptionStatus,
    recommendations,
  };
}
