import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleSentinel — AI Safety Guardian.
// Mock-backed route: GET returns dashboard stats + alerts + protection settings,
// POST scans an inbound message and returns a verdict (clean / blocked / flagged).
// ─────────────────────────────────────────────────────────────────────────────

export type SentinelSeverity = "blocked" | "removed" | "warning" | "info" | "monitoring";
export type SentinelAlertType = "scam" | "phishing" | "fraud" | "predatory" | "harassment" | "malware";

export interface SentinelAlert {
  id: string;
  type: SentinelAlertType;
  typeEmoji: string;
  severity: SentinelSeverity;
  title: string;
  description: string;
  source: string;
  timestamp: string;
  actionTaken: string;
  patterns?: string[];
}

export interface SentinelStats {
  messagesScanned: number;
  threatsBlocked: number;
  scamsDetected: number;
  phishingLinksRemoved: number;
}

export interface SentinelProtectionSettings {
  scamDetection: boolean;
  phishingBlocker: boolean;
  fraudAlert: boolean;
  mentalHealthCheck: boolean;
  screenshotProtection: boolean;
}

const SAMPLE_ALERTS: SentinelAlert[] = [
  {
    id: "sa-1",
    type: "scam",
    typeEmoji: "🚫",
    severity: "blocked",
    title: "Message from @unknown matches 4 scam patterns",
    description: "Unsolicited investment pitch using 'guaranteed returns' language + pressure tactics + unverified sender + request to move conversation off-platform.",
    source: "Wasl · @unknown_user_8472",
    timestamp: "2 min ago",
    actionTaken: "Message blocked · Sender reported · Conversation quarantined",
    patterns: ["guaranteed returns", "act now or lose out", "off-platform request", "unverified sender"],
  },
  {
    id: "sa-2",
    type: "phishing",
    typeEmoji: "🔗",
    severity: "removed",
    title: "Suspicious link detected in Wasl message",
    description: "Link 'cirklе-verify.com' uses a Cyrillic 'е' (homoglyph) to impersonate cirkle-verify.com. Domain registered 3 days ago. No HTTPS certificate transparency record.",
    source: "Wasl · group: Cairo Tech Circle",
    timestamp: "18 min ago",
    actionTaken: "Link stripped from message · Warning banner added · Original sender notified",
    patterns: ["homoglyph domain", "newly registered domain (3d)", "impersonates cirkle brand"],
  },
  {
    id: "sa-3",
    type: "fraud",
    typeEmoji: "💸",
    severity: "warning",
    title: "Large payment to new contact flagged",
    description: "Outgoing payment of 1,200 SAR to a contact added 6 minutes ago. No prior transaction history. Pattern matches 87% of romance-scam escalation sequences.",
    source: "Cirkle Pay · new contact @sara_8842",
    timestamp: "1 hour ago",
    actionTaken: "Payment held in escrow · Confirmation required · 24h cooling-off window",
    patterns: ["large first payment", "new contact (<10 min)", "no shared circles"],
  },
  {
    id: "sa-4",
    type: "predatory",
    typeEmoji: "⚠️",
    severity: "monitoring",
    title: "Conversation pattern flagged for review",
    description: "Thread with @new_friend_22 shows escalating intimacy timeline + repeated requests for photos + isolation from existing circles. Pattern consistent with grooming behavior.",
    source: "Wasl · @new_friend_22",
    timestamp: "3 hours ago",
    actionTaken: "Monitoring active · No action taken yet · Mental health resources surfaced to you",
    patterns: ["rapid intimacy escalation", "photo requests", "isolation language", "age-gap signals"],
  },
];

const DEFAULT_SETTINGS: SentinelProtectionSettings = {
  scamDetection: true,
  phishingBlocker: true,
  fraudAlert: true,
  mentalHealthCheck: true,
  screenshotProtection: false,
};

const SCAN_PATTERNS: { pattern: RegExp; type: SentinelAlertType; reason: string }[] = [
  { pattern: /guaranteed.{0,12}returns?|risk[- ]?free|double your/i, type: "scam", reason: "guaranteed-returns language" },
  { pattern: /act now|urgent.{0,12}(action|reply)|last chance/i, type: "scam", reason: "high-pressure tactic" },
  { pattern: /(bitcoin|crypto|usdt|usdc).{0,30}(invest|wallet|seed|recovery)/i, type: "scam", reason: "crypto recovery pitch" },
  { pattern: /https?:\/\/[^\s]+/i, type: "phishing", reason: "outbound link" },
  { pattern: /(verify|login|update).{0,20}(account|password|card|bank)/i, type: "phishing", reason: "credential-harvest phrasing" },
  { pattern: /send.{0,15}(money|payment|wire|transfer).{0,30}(immediately|now|today)/i, type: "fraud", reason: "urgent payment request" },
  { pattern: /gift card|steam card|itunes card|google play card/i, type: "fraud", reason: "gift-card payment request" },
  { pattern: /meet.{0,15}(alone|secret|don't tell)/i, type: "predatory", reason: "isolation language" },
];

export async function GET() {
  const stats: SentinelStats = {
    messagesScanned: 4_287,
    threatsBlocked: 23,
    scamsDetected: 11,
    phishingLinksRemoved: 8,
  };

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    stats,
    alerts: SAMPLE_ALERTS,
    protection: DEFAULT_SETTINGS,
    modelInfo: {
      engine: "On-device sentinel (4.2 MB)",
      updateChannel: "Community threat-intel mesh",
      lastSync: "6 min ago",
      privacy: "100% local — no message content leaves your device",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message : "";
    const sender = typeof body?.sender === "string" ? body.sender : "unknown";

    if (!message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Tiny deterministic on-device-style scan.
    const matched = SCAN_PATTERNS.filter((p) => p.pattern.test(message));
    const isClean = matched.length === 0;

    // Extract any URLs found.
    const urlMatches = message.match(/https?:\/\/[^\s]+/gi) || [];
    const urls = urlMatches.slice(0, 5);

    if (isClean) {
      return NextResponse.json({
        ok: true,
        verdict: "clean",
        confidence: 98,
        message: "No threats detected. Message passed all on-device checks.",
        patterns: [],
        urls,
        actionTaken: "None — message delivered normally.",
      });
    }

    // Pick the most severe match.
    const severityRank: Record<SentinelAlertType, number> = {
      malware: 5,
      scam: 4,
      phishing: 3,
      fraud: 3,
      predatory: 2,
      harassment: 1,
    };
    const top = [...matched].sort(
      (a, b) => severityRank[b.type] - severityRank[a.type],
    )[0];

    const verdict: SentinelSeverity =
      top.type === "scam" || top.type === "malware"
        ? "blocked"
        : top.type === "phishing"
          ? "removed"
          : top.type === "fraud"
            ? "warning"
            : "monitoring";

    const actionTaken =
      verdict === "blocked"
        ? "Message blocked · Sender quarantined · You were not notified of the original message"
        : verdict === "removed"
          ? "Link stripped · Warning banner added · Sender notified"
          : verdict === "warning"
            ? "Action held · Confirmation required from you"
            : "Monitoring active · Resources surfaced";

    return NextResponse.json({
      ok: true,
      verdict,
      confidence: 80 + Math.min(matched.length * 6, 18),
      message: `Flagged: ${matched.map((m) => m.reason).join(" · ")}`,
      patterns: matched.map((m) => m.reason),
      urls,
      actionTaken,
      sender,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to scan message", details: String(err) },
      { status: 500 },
    );
  }
}
