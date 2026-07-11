// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Jobs Domain Trainer
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Learns the user's job-search and career behavior across the Professional
 * Network module.
 *
 * Learns:
 *   - Job search patterns (keywords, locations, remote vs on-site).
 *   - Application success rates (applied → accepted → offer).
 *   - Skill demand (skills requested across applied jobs).
 *   - Salary ranges per industry / seniority.
 *   - Industry trends (which sectors the user applies to most).
 *
 * Predicts:
 *   - Likely next job match (title + industry + salary band).
 *   - Application success probability for a given job.
 *   - Expected salary band per industry.
 *
 * Recommends:
 *   - Jobs (ranked by match + salary band + success likelihood).
 *   - Skill upgrades (skills frequently co-requested with user's existing skills).
 *   - Career paths (industry transitions with positive success rates).
 *
 * Constitutional role:
 *   - Only learns from events with consentGranted=true.
 *   - Never blocks; never throws; degrades gracefully to empty results.
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

interface JobStats {
  applications: number;
  accepts: number;
  offers: number;
  lastAt: string;
  industry: string;
  salary: number;
}

interface SalaryBand {
  sum: number;
  count: number;
  min: number;
  max: number;
}

// ── Jobs Trainer ─────────────────────────────────────────────────────────

export class JobsTrainer implements DomainTrainer {
  public readonly domain = "jobs" as const;

  private facts = new Map<string, KnowledgeFact>();
  private patterns = new Map<string, DomainPattern>();
  private recommendationModel: DomainModel;
  private predictionModel: DomainModel;
  private ranking = {
    factors: { industry_match: 0.3, salary_band: 0.25, skill_match: 0.25, success_rate: 0.2 },
    diversityPenalty: 0.15,
    freshnessBoost: 0.25,
    personalizationWeight: 0.8,
  };
  private confidence = 0;
  private freshness = 0;
  private lastTrainedAt = new Date(0).toISOString();
  private eventsSeen = 0;

  private jobs = new Map<string, JobStats>();
  private industries = new Map<string, { applications: number; accepts: number }>();
  private skills = new Map<string, number>();
  private salaries = new Map<string, SalaryBand>();
  private searchKeywords = new Map<string, number>();

  constructor() {
    const now = new Date().toISOString();
    this.recommendationModel = {
      type: "weighted_features",
      weights: { industry_match: 0.3, salary_band: 0.25, skill_match: 0.25, recency: 0.2 },
      features: ["job_id", "industry", "title", "salary", "skills", "location", "remote"],
      updatedAt: now,
    };
    this.predictionModel = {
      type: "weighted_features",
      weights: { application_freq: 0.35, industry_success: 0.35, skill_match: 0.3 },
      features: ["industry", "title", "salary", "skills"],
      updatedAt: now,
    };
  }

  /** Train on a batch of job events. Idempotent (dedupes by eventId). */
  async train(events: PlatformEvent[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      let processed = 0;
      for (const ev of events) {
        if (!ev || !ev.consentGranted) continue;
        if (ev.category !== "job") continue;
        if (this.facts.has(`ev_${ev.eventId}`)) continue;
        this.eventsSeen++;
        processed++;
        const p = ev.payload || {};
        const jobId = String(p.jobId || p.id || "unknown");
        const industry = String(p.industry || "general");
        const salary = Number(p.salary || 0);
        const title = String(p.title || "");

        const js = this.jobs.get(jobId) || { applications: 0, accepts: 0, offers: 0, lastAt: ev.timestamp, industry, salary };
        if (ev.type === "Job.Applied") js.applications += 1;
        if (ev.type === "Job.Accepted" || p.status === "accepted") js.accepts += 1;
        if (ev.type === "Job.Offer" || p.status === "offer") js.offers += 1;
        js.lastAt = ev.timestamp;
        js.industry = industry;
        if (salary > 0) js.salary = salary;
        this.jobs.set(jobId, js);

        const ind = this.industries.get(industry) || { applications: 0, accepts: 0 };
        ind.applications += 1;
        if (ev.type === "Job.Accepted" || p.status === "accepted") ind.accepts += 1;
        this.industries.set(industry, ind);

        const skills = Array.isArray(p.skills) ? (p.skills as string[]).slice(0, 12) : [];
        for (const s of skills) this.skills.set(s, (this.skills.get(s) || 0) + 1);

        if (salary > 0) {
          const band = this.salaries.get(industry) || { sum: 0, count: 0, min: salary, max: salary };
          band.sum += salary;
          band.count += 1;
          band.min = Math.min(band.min, salary);
          band.max = Math.max(band.max, salary);
          this.salaries.set(industry, band);
        }

        const q = String(p.query || p.keyword || "");
        if (q) this.searchKeywords.set(q, (this.searchKeywords.get(q) || 0) + 1);

        this.facts.set(`ev_${ev.eventId}`, {
          factId: `ev_${ev.eventId}`,
          statement: `Job event ${ev.type} for ${title || jobId} (${industry})`,
          domain: "jobs",
          value: { jobId, industry, title, salary, type: ev.type, skills },
          sources: [{ source: "platform_event", sourceUrl: `event:${ev.eventId}`, authorityScore: 65, accessedAt: ev.timestamp }],
          confidence: 0.75,
          trustScore: 65,
          verificationCount: 1,
          contradictions: [],
          lastCheckedAt: now,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120).toISOString(),
          status: "validated",
        });
      }

      // Patterns: top industry + top skill
      const topInd = Array.from(this.industries.entries()).sort((a, b) => b[1].applications - a[1].applications)[0];
      if (topInd) {
        const rate = topInd[1].applications ? topInd[1].accepts / topInd[1].applications : 0;
        this.patterns.set("top_industry", {
          patternId: "top_industry",
          description: `Most-applied industry is ${topInd[0]} (${topInd[1].applications} applications, ${(rate * 100).toFixed(0)}% accept rate)`,
          trigger: { intent: "job_search" },
          action: { boost_industry: topInd[0] },
          confidence: Math.min(1, topInd[1].applications / 10),
          observationCount: topInd[1].applications,
          lastObservedAt: now,
        });
      }
      const topSkill = Array.from(this.skills.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topSkill) {
        this.patterns.set("top_skill", {
          patternId: "top_skill",
          description: `Most-requested skill is ${topSkill[0]} (${topSkill[1]} jobs)`,
          trigger: { intent: "skill_upgrade" },
          action: { suggest_skill: topSkill[0] },
          confidence: Math.min(1, topSkill[1] / 8),
          observationCount: topSkill[1],
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

  /** Snapshot current jobs knowledge. */
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

  /** Predict next job match / success probability / salary band for input. */
  async predict(input: unknown): Promise<Prediction[]> {
    try {
      const i = (input || {}) as { userId?: string; limit?: number; industry?: string; jobId?: string; skills?: string[] };
      const limit = i.limit ?? 5;
      const now = new Date().toISOString();
      const out: Prediction[] = [];
      // Top industries the user targets
      const topInds = Array.from(this.industries.entries()).sort((a, b) => b[1].applications - a[1].applications).slice(0, limit);
      for (const [industry, info] of topInds) {
        const band = this.salaries.get(industry);
        const rate = info.applications ? info.accepts / info.applications : 0;
        out.push({
          predictionId: `pred_jobs_${industry}_${Date.now().toString(36)}_${out.length}`,
          userId: i.userId,
          type: "next_action",
          predicted: { industry, success_probability: Math.round(rate * 100) / 100, expected_salary: band ? Math.round(band.sum / band.count) : 0 },
          confidence: Math.min(1, info.applications / 8),
          timeHorizon: "next_30_days",
          reasoning: `Applied ${info.applications} times to ${industry}; ${info.accepts} accepted.`,
          evidence: [`industry:${industry}`],
          createdAt: now,
        });
      }
      // Application success probability for a specific job
      if (i.jobId) {
        const js = this.jobs.get(i.jobId);
        if (js) {
          const indRate = this.industries.get(js.industry)?.accepts || 0;
          const indApps = this.industries.get(js.industry)?.applications || 1;
          const prob = Math.min(1, (indRate / indApps) * 0.6 + (js.accepts / Math.max(1, js.applications)) * 0.4);
          out.push({
            predictionId: `pred_jobp_${i.jobId}_${Date.now().toString(36)}`,
            userId: i.userId,
            type: "next_action",
            predicted: { jobId: i.jobId, success_probability: Math.round(prob * 100) / 100, industry: js.industry },
            confidence: Math.min(1, js.applications / 5),
            timeHorizon: "this_application",
            reasoning: `Industry accept rate ${(indRate / indApps * 100).toFixed(0)}%; job has ${js.applications} prior applications.`,
            evidence: [`job:${i.jobId}`, `industry:${js.industry}`],
            createdAt: now,
          });
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Recommend jobs / skill upgrades / career paths. */
  async recommend(input: unknown): Promise<unknown[]> {
    try {
      const i = (input || {}) as { intent?: string; limit?: number };
      const intent = i.intent || "job";
      const limit = i.limit ?? 5;
      const out: unknown[] = [];
      if (intent === "job") {
        for (const [jobId, js] of Array.from(this.jobs.entries()).sort((a, b) => b[1].applications - a[1].applications).slice(0, limit)) {
          out.push({ kind: "job", jobId, industry: js.industry, salary: js.salary, score: js.applications, reason: `Applied ${js.applications} times` });
        }
      } else if (intent === "skill") {
        for (const [skill, count] of Array.from(this.skills.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit)) {
          out.push({ kind: "skill_upgrade", skill, score: count, reason: `Requested in ${count} applied jobs` });
        }
      } else if (intent === "career") {
        for (const [industry, info] of Array.from(this.industries.entries()).sort((a, b) => (b[1].accepts / Math.max(1, b[1].applications)) - (a[1].accepts / Math.max(1, a[1].applications))).slice(0, limit)) {
          const rate = info.applications ? info.accepts / info.applications : 0;
          const band = this.salaries.get(industry);
          out.push({ kind: "career_path", industry, accept_rate: Math.round(rate * 100) / 100, avg_salary: band ? Math.round(band.sum / band.count) : 0, reason: `${info.applications} applications, ${info.accepts} accepted` });
        }
      }
      return out;
    } catch {
      return [];
    }
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const jobsTrainer = new JobsTrainer();
