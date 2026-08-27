// @ts-nocheck
/**
 * Premium AI Features (D7).
 *
 * Cirkle Brain has a free tier (basic Q&A + simple summarization) and a
 * premium tier ($3/mo) that unlocks advanced features:
 *   - Advanced Summarization (multi-document)
 *   - Meeting Notes (transcribe + structure)
 *   - AI Assistant in every chat
 *   - Voice Cloning
 *   - Priority AI (faster inference)
 *
 * Storage: in-memory store (Prisma schema is frozen for this task).
 */
import "server-only";
import { get, put, find, update, nowISO } from "@/lib/feature-store";

export type PremiumPlan = "monthly" | "yearly";
export type PremiumStatus = "active" | "cancelled" | "expired";

export interface PremiumSubscription {
  id: string;
  userId: string;
  plan: PremiumPlan;
  price: number;
  currency: string;
  status: PremiumStatus;
  startedAt: string;
  expiresAt: string | null;
}

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  emoji: string;
  premiumOnly: boolean;
}

export const PREMIUM_PRICE_MONTHLY = 3;
export const PREMIUM_PRICE_YEARLY = 30;

export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: "advanced_summarization",
    name: "Advanced Summarization",
    description: "Multi-document summarization with cross-references and citation links.",
    emoji: "📚",
    premiumOnly: true,
  },
  {
    id: "meeting_notes",
    name: "Meeting Notes",
    description: "Transcribe meetings and auto-structure into action items + decisions.",
    emoji: "🗒️",
    premiumOnly: true,
  },
  {
    id: "ai_assistant_in_chat",
    name: "AI Assistant in Every Chat",
    description: "Personal AI assistant available in every 1:1 and group chat.",
    emoji: "🤖",
    premiumOnly: true,
  },
  {
    id: "voice_cloning",
    name: "Voice Cloning",
    description: "Clone your voice for personalized TTS across all Cirkle surfaces.",
    emoji: "🎙️",
    premiumOnly: true,
  },
  {
    id: "priority_ai",
    name: "Priority AI",
    description: "Faster inference, larger context window, and dedicated capacity.",
    emoji: "⚡",
    premiumOnly: true,
  },
  {
    id: "basic_qa",
    name: "Basic Q&A",
    description: "Standard Cirkle Brain Q&A — available to everyone.",
    emoji: "💬",
    premiumOnly: false,
  },
];

const STORE = "premiumSubscription";

export async function isPremiumUser(userId: string): Promise<boolean> {
  const sub = await getActiveSubscription(userId);
  return sub !== null;
}

export async function getActiveSubscription(userId: string): Promise<PremiumSubscription | null> {
  const id = (userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!id) return null;
  const records = find<PremiumSubscription>(STORE, (s) => s.userId === id);
  records.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  const latest = records[0];
  if (!latest || latest.status !== "active") return null;
  if (latest.expiresAt && new Date(latest.expiresAt).getTime() <= Date.now()) {
    return null;
  }
  return latest;
}

export function getPremiumFeatures(): PremiumFeature[] {
  return PREMIUM_FEATURES;
}

export async function checkPremiumAccess(
  userId: string,
  featureId: string,
): Promise<{ allowed: boolean; reason?: string; feature?: PremiumFeature }> {
  const feat = PREMIUM_FEATURES.find((f) => f.id === featureId);
  if (!feat) return { allowed: false, reason: "feature not found" };
  if (!feat.premiumOnly) return { allowed: true, feature: feat };
  const isPrem = await isPremiumUser(userId);
  if (!isPrem) {
    return { allowed: false, reason: "premium subscription required", feature: feat };
  }
  return { allowed: true, feature: feat };
}

export interface SubscribeInput {
  userId: string;
  plan: PremiumPlan;
  months?: number;
}

export async function subscribeToPremium(input: SubscribeInput): Promise<PremiumSubscription> {
  const userId = (input.userId || "").trim().toLowerCase().replace(/^@/, "");
  if (!userId) throw new Error("userId is required");
  if (!["monthly", "yearly"].includes(input.plan)) {
    throw new Error("plan must be 'monthly' or 'yearly'");
  }
  const existing = await getActiveSubscription(userId);
  if (existing) {
    throw new Error("user already has an active premium subscription");
  }
  const price = input.plan === "yearly" ? PREMIUM_PRICE_YEARLY : PREMIUM_PRICE_MONTHLY;
  const months = input.plan === "yearly" ? 12 : Math.max(1, Math.min(input.months ?? 1, 12));
  const sub: PremiumSubscription = {
    id: `prem_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    userId,
    plan: input.plan,
    price,
    currency: "USD",
    status: "active",
    startedAt: nowISO(),
    expiresAt: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  put(STORE, sub);
  return sub;
}

export async function cancelPremium(userId: string): Promise<PremiumSubscription | null> {
  const active = await getActiveSubscription(userId);
  if (!active) return null;
  return update<PremiumSubscription>(STORE, active.id, { status: "cancelled" });
}
