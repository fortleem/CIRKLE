// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Health Domain Trainer (Privacy-First)
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Learns health-related patterns: appointments, medication reminders, fitness
 * activity. This trainer is PRIVACY-FIRST by constitutional requirement.
 *
 * Learns:
 *   - Appointment patterns (specialty, frequency, no-show rate).
 *   - Medication reminder adherence (taken / snoozed / missed).
 *   - Fitness activity (steps, workouts, sleep — only aggregate patterns).
 *
 * Predicts:
 *   - Next health need (next likely appointment type or refill).
 *   - Appointment timing (best time-of-day for adherence).
 *
 * Recommends:
 *   - Health services (nearby clinics, telehealth options).
 *   - Reminders (refill due, appointment prep).
 *   - Wellness tips (general, non-personal, derived from aggregate patterns).
 *
 * Constitutional role — PRIVACY GUARANTEES:
 *   - This trainer ONLY learns from events where ALL of:
 *       1. ev.consentGranted === true
 *       2. ev.payload.healthConsent === true   (explicit health opt-in)
 *       3. ev.category === "event" or ev.type starts with "Health."
 *     Any event that fails any of these checks is REJECTED silently.
 *   - No raw medical data is persisted — only metadata (specialty id,
 *     reminder id, aggregate counts, time-of-day patterns).
 *   - Wellness tips are generic and non-personal — derived only from
 *     aggregate adherence patterns, never from diagnoses or conditions.
 *   - The trainer exposes a `purge()` method so the user can wipe ALL
 *     learned health state on demand.
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

interface AppointmentStats {
  count: number;
  lastAt: string;
  noShows: number;
  preferredHour: number;
  specialty: string;
}

interface ReminderAdherence {
  reminderId: string;
  shown: number;
  acted: number; // taken / acknowledged
  snoozed: number;
  missed: number;
  lastAt: string;
}

interface FitnessAggregate {
  totalSessions: number;
  totalSteps: number;
  preferredDay: string;
  preferredHour: number;
  lastAt: string;
}

// ── Health Trainer ───────────────────────────────────────────────────────

export class HealthTrainer implements DomainTrainer {
  public readonly domain = "health" as const;

  private facts = new Map<string, KnowledgeFact>();
  private patterns = new Map<string, DomainPattern>();
  private recommendationModel: DomainModel;
  private predictionModel: DomainModel;
  private ranking = {
    factors: { appointment_freq: 0.3, reminder_adherence: 0.35, fitness_pattern: 0.2, recency: 0.15 },
    diversityPenalty: 0.1,
    freshnessBoost: 0.3,
    personalizationWeight: 0.7,
  };
  private confidence = 0;
  private freshness = 0;
  private lastTrainedAt = new Date(0).toISOString();
  private eventsSeen = 0;
  private rejectedForPrivacy = 0;

  private appointments = new Map<string, AppointmentStats>(); // specialty → stats
  private reminders = new Map<string, ReminderAdherence>();
  private fitness: FitnessAggregate = { totalSessions: 0, totalSteps: 0, preferredDay: "mon", preferredHour: 7, lastAt: new Date(0).toISOString() };
  private hourHistogram = new Map<number, number>(); // for adherence timing

  constructor() {
    const now = new Date().toISOString();
    this.recommendationModel = {
      type: "weighted_features",
      weights: { appointment_freq: 0.3, adherence_rate: 0.35, fitness_pattern: 0.2, recency: 0.15 },
      features: ["specialty", "reminder_id", "hour_of_day", "day_of_week"],
      updatedAt: now,
    };
    this.predictionModel = {
      type: "weighted_features",
      weights: { recency: 0.35, frequency: 0.35, adherence: 0.3 },
      features: ["specialty", "reminder_id", "hour_of_day", "day_of_week"],
      updatedAt: now,
    };
  }

  /**
   * Privacy gate: returns true ONLY when the event passes all three checks.
   * 1. consentGranted === true
   * 2. payload.healthConsent === true (explicit health opt-in)
   * 3. category === "event" OR type starts with "Health."
   */
  private passesPrivacyGate(ev: PlatformEvent): boolean {
    if (!ev || !ev.consentGranted) return false;
    const p = ev.payload || {};
    if (p.healthConsent !== true) return false;
    if (ev.category !== "event" && !(ev.type || "").startsWith("Health.")) return false;
    return true;
  }

  /** Train on a batch of health events. Privacy-gated; idempotent. */
  async train(events: PlatformEvent[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      let processed = 0;
      for (const ev of events) {
        if (!this.passesPrivacyGate(ev)) {
          this.rejectedForPrivacy += 1;
          continue;
        }
        if (this.facts.has(`ev_${ev.eventId}`)) continue;
        this.eventsSeen++;
        processed++;
        const p = ev.payload || {};
        const hour = new Date(ev.timestamp).getUTCHours();
        this.hourHistogram.set(hour, (this.hourHistogram.get(hour) || 0) + 1);

        // Appointment events
        if (ev.type === "Health.Appointment.Booked" || p.specialty) {
          const specialty = String(p.specialty || "general");
          const noShow = p.status === "no_show" || p.noShow === true;
          const aps = this.appointments.get(specialty) || { count: 0, lastAt: ev.timestamp, noShows: 0, preferredHour: hour, specialty };
          aps.count += 1;
          aps.lastAt = ev.timestamp;
          if (noShow) aps.noShows += 1;
          aps.preferredHour = hour; // last-wins; would be mode in production
          this.appointments.set(specialty, aps);
        }
        // Reminder events
        if (ev.type === "Health.Reminder" || p.reminderId) {
          const id = String(p.reminderId || "default");
          const ra = this.reminders.get(id) || { reminderId: id, shown: 0, acted: 0, snoozed: 0, missed: 0, lastAt: ev.timestamp };
          ra.shown += 1;
          ra.lastAt = ev.timestamp;
          if (p.action === "taken" || p.action === "acknowledged") ra.acted += 1;
          else if (p.action === "snoozed") ra.snoozed += 1;
          else if (p.action === "missed") ra.missed += 1;
          this.reminders.set(id, ra);
        }
        // Fitness events
        if (ev.type === "Health.Fitness" || p.steps || p.workoutType) {
          this.fitness.totalSessions += 1;
          this.fitness.totalSteps += Number(p.steps || 0);
          this.fitness.preferredDay = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(ev.timestamp).getUTCDay()];
          this.fitness.preferredHour = hour;
          this.fitness.lastAt = ev.timestamp;
        }

        this.facts.set(`ev_${ev.eventId}`, {
          factId: `ev_${ev.eventId}`,
          statement: `Health event ${ev.type} on ${ev.timestamp}`,
          domain: "health",
          value: { specialty: p.specialty, reminderId: p.reminderId, action: p.action, hour, type: ev.type },
          sources: [{ source: "health_api", sourceUrl: `event:${ev.eventId}`, authorityScore: 88, accessedAt: ev.timestamp }],
          confidence: 0.8,
          trustScore: 88,
          verificationCount: 1,
          contradictions: [],
          lastCheckedAt: now,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
          status: "validated",
        });
      }

      // Patterns: most-attended specialty + best adherence hour
      const topAppt = Array.from(this.appointments.entries()).sort((a, b) => b[1].count - a[1].count)[0];
      if (topAppt) {
        this.patterns.set("frequent_specialty", {
          patternId: "frequent_specialty",
          description: `Most-booked specialty is ${topAppt[0]} (${topAppt[1].count} appointments)`,
          trigger: { intent: "book_appointment" },
          action: { suggest_specialty: topAppt[0], preferred_hour: topAppt[1].preferredHour },
          confidence: Math.min(1, topAppt[1].count / 5),
          observationCount: topAppt[1].count,
          lastObservedAt: now,
        });
      }
      const bestHour = Array.from(this.hourHistogram.entries()).sort((a, b) => b[1] - a[1])[0];
      if (bestHour) {
        this.patterns.set("best_adherence_hour", {
          patternId: "best_adherence_hour",
          description: `User is most active at ${bestHour[0]}:00 UTC (${bestHour[1]} events)`,
          trigger: { intent: "schedule_reminder" },
          action: { preferred_hour: bestHour[0] },
          confidence: Math.min(1, bestHour[1] / 10),
          observationCount: bestHour[1],
          lastObservedAt: now,
        });
      }

      this.confidence = Math.min(1, processed / 15 + this.confidence * 0.85);
      this.freshness = 1;
      this.lastTrainedAt = now;
      this.recommendationModel.updatedAt = now;
      this.predictionModel.updatedAt = now;
    } catch {
      // best-effort
    }
  }

  /** Snapshot current health knowledge. */
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

  /** Predict next health need + appointment timing for input. */
  async predict(input: unknown): Promise<Prediction[]> {
    try {
      const i = (input || {}) as { userId?: string; limit?: number };
      const limit = i.limit ?? 5;
      const now = new Date().toISOString();
      const out: Prediction[] = [];
      // Next appointment specialty
      const topAppts = Array.from(this.appointments.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, limit);
      for (const [specialty, aps] of topAppts) {
        const daysSince = (Date.now() - new Date(aps.lastAt).getTime()) / (1000 * 60 * 60 * 24);
        const dueBoost = daysSince > 90 ? 0.2 : 0;
        out.push({
          predictionId: `pred_health_${specialty}_${Date.now().toString(36)}_${out.length}`,
          userId: i.userId,
          type: "next_reminder",
          predicted: { next_specialty: specialty, preferred_hour: aps.preferredHour, no_show_rate: aps.count ? aps.noShows / aps.count : 0 },
          confidence: Math.min(1, aps.count / 6 + dueBoost),
          timeHorizon: "next_90_days",
          reasoning: `Booked ${specialty} ${aps.count} times; last ${Math.round(daysSince)}d ago.`,
          evidence: [`specialty:${specialty}`],
          createdAt: now,
        });
      }
      // Next reminder likely due (lowest adherence reminder id)
      const lowAdherence = Array.from(this.reminders.values()).filter((r) => r.shown > 0).sort((a, b) => (a.acted / a.shown) - (b.acted / b.shown)).slice(0, limit);
      for (const r of lowAdherence) {
        out.push({
          predictionId: `pred_rem_${r.reminderId}_${Date.now().toString(36)}`,
          userId: i.userId,
          type: "next_reminder",
          predicted: { reminder_id: r.reminderId, adherence_rate: r.shown ? r.acted / r.shown : 0, missed: r.missed },
          confidence: Math.min(1, r.shown / 5),
          timeHorizon: "next_24_hours",
          reasoning: `Reminder ${r.reminderId} has ${(r.shown ? r.acted / r.shown * 100 : 0).toFixed(0)}% adherence.`,
          evidence: [`reminder:${r.reminderId}`],
          createdAt: now,
        });
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Recommend health services / reminders / wellness tips for input. */
  async recommend(input: unknown): Promise<unknown[]> {
    try {
      const i = (input || {}) as { intent?: string; limit?: number };
      const intent = i.intent || "service";
      const limit = i.limit ?? 5;
      const out: unknown[] = [];
      if (intent === "service") {
        for (const [specialty, aps] of Array.from(this.appointments.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, limit)) {
          out.push({ kind: "health_service", specialty, score: aps.count, preferred_hour: aps.preferredHour, reason: `Booked ${aps.count} times` });
        }
      } else if (intent === "reminder") {
        // Reminders with low adherence — push a refill / re-engage
        for (const r of Array.from(this.reminders.values()).sort((a, b) => (a.acted / Math.max(1, a.shown)) - (b.acted / Math.max(1, b.shown))).slice(0, limit)) {
          out.push({ kind: "reminder", reminder_id: r.reminderId, adherence: r.shown ? r.acted / r.shown : 0, missed: r.missed, suggestion: "Refill or reschedule" });
        }
      } else if (intent === "wellness") {
        // Generic, non-personal wellness tips derived only from aggregate patterns.
        if (this.fitness.totalSessions > 0) {
          out.push({ kind: "wellness_tip", tip: `Stay consistent — you've logged ${this.fitness.totalSessions} sessions. Try ${this.fitness.preferredDay} ${this.fitness.preferredHour}:00.`, source: "aggregate_pattern" });
        }
        const bestHour = Array.from(this.hourHistogram.entries()).sort((a, b) => b[1] - a[1])[0];
        if (bestHour) out.push({ kind: "wellness_tip", tip: `Schedule reminders around ${bestHour[0]}:00 UTC — your most active hour.`, source: "aggregate_pattern" });
        out.push({ kind: "wellness_tip", tip: "Drink water, take short walks, and rest well.", source: "general" });
      }
      return out;
    } catch {
      return [];
    }
  }

  /** PRIVACY: Wipe ALL learned health state on user demand. */
  async purge(): Promise<void> {
    try {
      this.facts.clear();
      this.patterns.clear();
      this.appointments.clear();
      this.reminders.clear();
      this.hourHistogram.clear();
      this.fitness = { totalSessions: 0, totalSteps: 0, preferredDay: "mon", preferredHour: 7, lastAt: new Date(0).toISOString() };
      this.confidence = 0;
      this.freshness = 0;
      this.eventsSeen = 0;
      this.lastTrainedAt = new Date(0).toISOString();
    } catch {
      // best-effort
    }
  }

  /** Privacy audit stats — exposed for the AI Safety dashboard. */
  privacyAudit(): { eventsLearned: number; rejectedForPrivacy: number; factsStored: number; patternsStored: number } {
    return {
      eventsLearned: this.eventsSeen,
      rejectedForPrivacy: this.rejectedForPrivacy,
      factsStored: this.facts.size,
      patternsStored: this.patterns.size,
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const healthTrainer = new HealthTrainer();
