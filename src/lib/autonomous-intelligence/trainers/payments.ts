// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Payments Domain Trainer
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Learns the user's payment behavior across Circle Payments.
 *
 * Learns:
 *   - Payment method preferences (card, wallet, bank transfer, cash).
 *   - Spending patterns (recurring merchants, average ticket size).
 *   - Transfer frequency (P2P, recurring bills, subscriptions).
 *   - Merchant preferences (top merchants, categories).
 *   - Fraud indicators (off-pattern amounts, new payees, odd hours).
 *
 * Predicts:
 *   - next_payment — likely next merchant + amount.
 *   - Likely merchant the user will pay next.
 *   - Spending amount for the upcoming week/month.
 *
 * Recommends:
 *   - Payment methods (lowest cost / highest rewards for the merchant).
 *   - Splitting options (split a bill across contacts).
 *   - Budget tips (savings opportunities, recurring waste).
 *
 * Constitutional role:
 *   - Never learns from payment events without consentGranted=true.
 *   - Never persists raw card numbers / bank account numbers — only
 *     tokenized method ids provided in the event payload.
 *   - Never blocks; never throws.
 * ============================================================================
 */

import "server-only";

import type {
  DomainKnowledge,
  DomainPattern,
  KnowledgeFact,
  PlatformEvent,
  Prediction,
  DomainModel,
} from "../types";
import type { DomainTrainer } from "../domain-learning-engine";

// ── Internal state ───────────────────────────────────────────────────────

interface MerchantStats {
  count: number;
  totalSpend: number;
  lastPaid: string;
  categories: Map<string, number>;
}

interface MethodStats {
  count: number;
  totalSpend: number;
}

// ── Payments Trainer ─────────────────────────────────────────────────────

export class PaymentsTrainer implements DomainTrainer {
  public readonly domain = "payments" as const;

  private facts = new Map<string, KnowledgeFact>();
  private patterns = new Map<string, DomainPattern>();
  private recommendationModel: DomainModel;
  private predictionModel: DomainModel;
  private ranking = {
    factors: { merchant_freq: 0.35, amount_fit: 0.25, method_pref: 0.2, fraud_risk: 0.2 },
    diversityPenalty: 0.1,
    freshnessBoost: 0.15,
    personalizationWeight: 0.75,
  };
  private confidence = 0;
  private freshness = 0;
  private lastTrainedAt = new Date(0).toISOString();
  private eventsSeen = 0;

  private merchants = new Map<string, MerchantStats>();
  private methods = new Map<string, MethodStats>();
  private recurringAmounts = new Map<number, number>(); // rounded amount → count
  private fraudSignals: Array<{ eventId: string; reason: string; ts: string }> = [];

  constructor() {
    const now = new Date().toISOString();
    this.recommendationModel = {
      type: "weighted_features",
      weights: { merchant_freq: 0.35, method_pref: 0.3, rewards: 0.2, fee: 0.15 },
      features: ["merchant_id", "amount", "method", "category", "rewards_eligible"],
      updatedAt: now,
    };
    this.predictionModel = {
      type: "weighted_features",
      weights: { recency: 0.35, frequency: 0.4, periodicity: 0.25 },
      features: ["merchant_id", "amount_bucket", "method", "hour_of_day", "day_of_month"],
      updatedAt: now,
    };
  }

  /** Train on a batch of payment events. Idempotent. */
  async train(events: PlatformEvent[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      let processed = 0;
      for (const ev of events) {
        if (!ev || !ev.consentGranted) continue;
        if (ev.category !== "payment") continue;
        if (this.facts.has(`ev_${ev.eventId}`)) continue;
        this.eventsSeen++;
        processed++;
        const p = ev.payload || {};
        const merchant = String(p.merchantId || p.merchant || p.payee || "unknown");
        const amount = Number(p.amount || 0);
        const method = String(p.method || p.methodId || "card");
        const category = String(p.category || "general");
        const success = p.status !== "failed";

        const ms = this.merchants.get(merchant) || { count: 0, totalSpend: 0, lastPaid: ev.timestamp, categories: new Map() };
        ms.count += 1;
        if (success) ms.totalSpend += amount;
        ms.lastPaid = ev.timestamp;
        ms.categories.set(category, (ms.categories.get(category) || 0) + 1);
        this.merchants.set(merchant, ms);

        const mm = this.methods.get(method) || { count: 0, totalSpend: 0 };
        mm.count += 1;
        mm.totalSpend += amount;
        this.methods.set(method, mm);

        // Recurring-amount signal: round to nearest 10 to detect subscriptions.
        const bucket = Math.round(amount / 10) * 10;
        if (bucket > 0) this.recurringAmounts.set(bucket, (this.recurringAmounts.get(bucket) || 0) + 1);

        // Fraud heuristic: large amount at unusual hour for a new merchant.
        const hour = new Date(ev.timestamp).getUTCHours();
        if (amount > 500 && (hour < 5 || hour > 23) && ms.count === 1) {
          this.fraudSignals.push({ eventId: ev.eventId, reason: `Large off-hours payment to new merchant ${merchant}`, ts: ev.timestamp });
        }

        this.facts.set(`ev_${ev.eventId}`, {
          factId: `ev_${ev.eventId}`,
          statement: `Paid ${amount} to ${merchant} via ${method} on ${ev.timestamp}`,
          domain: "payments",
          value: { merchant, amount, method, category, success, type: ev.type },
          sources: [{ source: "platform_event", sourceUrl: `event:${ev.eventId}`, authorityScore: 60, accessedAt: ev.timestamp }],
          confidence: 0.7,
          trustScore: 60,
          verificationCount: 1,
          contradictions: [],
          lastCheckedAt: now,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
          status: "validated",
        });
      }

      // Patterns
      const topMerchant = this.topMerchants(1)[0];
      if (topMerchant) {
        this.patterns.set("top_merchant", {
          patternId: "top_merchant",
          description: `Top merchant is ${topMerchant.merchant} (${topMerchant.count} payments, total ${Math.round(topMerchant.total)})`,
          trigger: { intent: "pay", category: topMerchant.topCategory },
          action: { suggest_merchant: topMerchant.merchant, suggest_amount: topMerchant.avg },
          confidence: Math.min(1, topMerchant.count / 10),
          observationCount: topMerchant.count,
          lastObservedAt: now,
        });
      }
      const topMethod = Array.from(this.methods.entries()).sort((a, b) => b[1].count - a[1].count)[0];
      if (topMethod) {
        this.patterns.set("preferred_method", {
          patternId: "preferred_method",
          description: `Preferred payment method is ${topMethod[0]} (${topMethod[1].count} uses)`,
          trigger: { intent: "pay" },
          action: { default_method: topMethod[0] },
          confidence: Math.min(1, topMethod[1].count / 15),
          observationCount: topMethod[1].count,
          lastObservedAt: now,
        });
      }

      this.confidence = Math.min(1, processed / 25 + this.confidence * 0.85);
      this.freshness = 1;
      this.lastTrainedAt = now;
      this.recommendationModel.updatedAt = now;
      this.predictionModel.updatedAt = now;
    } catch {
      // best-effort
    }
  }

  /** Snapshot current payments knowledge. */
  async getKnowledge(): Promise<DomainKnowledge> {
    return {
      domain: this.domain,
      facts: Array.from(this.facts.values()),
      patterns: Array.from(this.patterns.values()),
      recommendationModel: this.recommendationModel,
      predictionModel: this.predictionModel,
      ranking: this.ranking,
      confidence: this.confidence,
      lastTrainedAt: this.lastTrainedAt,
      freshness: this.freshness,
    };
  }

  /** Predict next payments for input { userId, limit? }. */
  async predict(input: unknown): Promise<Prediction[]> {
    try {
      const i = (input || {}) as { limit?: number; userId?: string };
      const limit = i.limit ?? 5;
      const now = new Date().toISOString();
      const tops = this.topMerchants(limit);
      const out: Prediction[] = [];
      for (const t of tops) {
        out.push({
          predictionId: `pred_pay_${t.merchant}_${Date.now().toString(36)}_${out.length}`,
          userId: i.userId,
          type: "next_payment",
          predicted: { merchant: t.merchant, amount: Math.round(t.avg), category: t.topCategory, likely_method: this.preferredMethod() },
          confidence: Math.min(1, t.count / 12),
          timeHorizon: "next_14_days",
          reasoning: `Paid ${t.merchant} ${t.count} times before, avg ${Math.round(t.avg)}.`,
          evidence: [`merchant:${t.merchant}`, `pattern:top_merchant`],
          createdAt: now,
        });
      }
      // Spending forecast: avg weekly spend
      const totalSpend = Array.from(this.merchants.values()).reduce((s, m) => s + m.totalSpend, 0);
      const weeksTracked = Math.max(1, this.eventsSeen / 5);
      const weeklyForecast = totalSpend / weeksTracked;
      out.push({
        predictionId: `pred_spend_${Date.now().toString(36)}`,
        userId: i.userId,
        type: "next_action",
        predicted: { weekly_spend: Math.round(weeklyForecast), trend: "stable" },
        confidence: Math.min(1, this.eventsSeen / 30),
        timeHorizon: "next_7_days",
        reasoning: `Based on ${this.eventsSeen} payment events across ${this.merchants.size} merchants.`,
        evidence: [`total_spend:${Math.round(totalSpend)}`],
        createdAt: now,
      });
      return out;
    } catch {
      return [];
    }
  }

  /** Recommend payment methods / split options / budget tips. */
  async recommend(input: unknown): Promise<unknown[]> {
    try {
      const i = (input || {}) as { intent?: string; merchant?: string; amount?: number; limit?: number };
      const intent = i.intent || "method";
      const limit = i.limit ?? 5;
      const out: unknown[] = [];
      if (intent === "method") {
        for (const [method, ms] of Array.from(this.methods.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, limit)) {
          out.push({ kind: "payment_method", method, score: ms.count, reason: `Used ${ms.count} times, total ${Math.round(ms.totalSpend)}` });
        }
      } else if (intent === "split") {
        const amt = Number(i.amount || 0);
        if (amt > 0) {
          out.push({ kind: "split", suggestion: "split_evenly", amount: amt, parts: [amt / 2, amt / 2] });
          out.push({ kind: "split", suggestion: "split_60_40", amount: amt, parts: [amt * 0.6, amt * 0.4] });
        }
      } else if (intent === "budget") {
        const recurring = Array.from(this.recurringAmounts.entries()).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]);
        for (const [amt, count] of recurring.slice(0, limit)) {
          out.push({ kind: "budget_tip", tip: `Recurring ~${amt} detected ${count} times — review for unused subscriptions`, amount: amt, occurrences: count });
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  private topMerchants(limit: number): Array<{ merchant: string; count: number; total: number; avg: number; topCategory: string }> {
    return Array.from(this.merchants.entries()).map(([merchant, ms]) => {
      const topCategory = ms.categories.size ? Array.from(ms.categories.entries()).sort((a, b) => b[1] - a[1])[0][0] : "general";
      return { merchant, count: ms.count, total: ms.totalSpend, avg: ms.count ? ms.totalSpend / ms.count : 0, topCategory };
    }).sort((a, b) => b.count - a.count).slice(0, limit);
  }

  private preferredMethod(): string {
    const top = Array.from(this.methods.entries()).sort((a, b) => b[1].count - a[1].count)[0];
    return top ? top[0] : "card";
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const paymentsTrainer = new PaymentsTrainer();
