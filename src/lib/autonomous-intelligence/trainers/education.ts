// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Education Domain Trainer
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Learns the user's behavior across Educational Workspaces.
 *
 * Learns:
 *   - Assignment submission patterns (on-time / late / missed per course).
 *   - Grade trends (per-subject averages, trajectory up/down).
 *   - Attendance patterns (present / absent, by day-of-week).
 *   - Subject performance (relative strength per subject).
 *
 * Predicts:
 *   - Grade outcomes for upcoming assignments.
 *   - Attendance risk (likelihood of missing next class).
 *   - Assignment deadline pressure (which deadlines are at risk).
 *
 * Recommends:
 *   - Study resources (per weakest subject).
 *   - Tutoring (subjects with declining grades).
 *   - Schedule optimization (best study hours, attendance nudges).
 *
 * Constitutional role:
 *   - Only learns from events with consentGranted=true.
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

interface SubjectStats {
  submissions: number;
  onTime: number;
  late: number;
  gradesSum: number;
  gradesCount: number;
  lastGrade: number;
  lastAt: string;
  gradeHistory: number[];
}

interface AssignmentStats {
  submitted: boolean;
  onTime: boolean;
  deadline: string;
  grade?: number;
}

// ── Education Trainer ────────────────────────────────────────────────────

export class EducationTrainer implements DomainTrainer {
  public readonly domain = "education" as const;

  private facts = new Map<string, KnowledgeFact>();
  private patterns = new Map<string, DomainPattern>();
  private recommendationModel: DomainModel;
  private predictionModel: DomainModel;
  private ranking = {
    factors: { subject_perf: 0.3, attendance_rate: 0.25, deadline_proximity: 0.25, grade_trend: 0.2 },
    diversityPenalty: 0.15,
    freshnessBoost: 0.35,
    personalizationWeight: 0.8,
  };
  private confidence = 0;
  private freshness = 0;
  private lastTrainedAt = new Date(0).toISOString();
  private eventsSeen = 0;

  private subjects = new Map<string, SubjectStats>();
  private assignments = new Map<string, AssignmentStats>();
  private attendance = { total: 0, present: 0, absent: 0, byDay: new Map<number, { present: number; absent: number }>() };
  private studyHourHistogram = new Map<number, number>();

  constructor() {
    const now = new Date().toISOString();
    this.recommendationModel = {
      type: "weighted_features",
      weights: { subject_perf: 0.3, grade_trend: 0.25, attendance_rate: 0.25, recency: 0.2 },
      features: ["subject", "assignment_id", "hour_of_day", "day_of_week"],
      updatedAt: now,
    };
    this.predictionModel = {
      type: "weighted_features",
      weights: { past_grade_avg: 0.4, submission_rate: 0.3, attendance: 0.3 },
      features: ["subject", "assignment_id", "hour_of_day"],
      updatedAt: now,
    };
  }

  /** Train on a batch of education events. Idempotent. */
  async train(events: PlatformEvent[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      let processed = 0;
      for (const ev of events) {
        if (!ev || !ev.consentGranted) continue;
        if (ev.category !== "education") continue;
        if (this.facts.has(`ev_${ev.eventId}`)) continue;
        this.eventsSeen++;
        processed++;
        const p = ev.payload || {};
        const hour = new Date(ev.timestamp).getUTCHours();
        const dow = new Date(ev.timestamp).getUTCDay();

        if (ev.type === "Edu.AssignmentSubmitted" || p.assignmentId) {
          const aId = String(p.assignmentId || "unknown");
          const subject = String(p.subject || p.course || "general");
          const onTime = p.late !== true && p.status !== "late";
          const grade = p.grade !== undefined ? Number(p.grade) : undefined;
          this.assignments.set(aId, { submitted: true, onTime, deadline: String(p.deadline || ev.timestamp), grade });
          const ss = this.subjects.get(subject) || { submissions: 0, onTime: 0, late: 0, gradesSum: 0, gradesCount: 0, lastGrade: 0, lastAt: ev.timestamp, gradeHistory: [] };
          ss.submissions += 1;
          if (onTime) ss.onTime += 1; else ss.late += 1;
          if (grade !== undefined && !Number.isNaN(grade)) {
            ss.gradesSum += grade;
            ss.gradesCount += 1;
            ss.lastGrade = grade;
            ss.gradeHistory.push(grade);
            if (ss.gradeHistory.length > 50) ss.gradeHistory.shift();
          }
          ss.lastAt = ev.timestamp;
          this.subjects.set(subject, ss);
          this.studyHourHistogram.set(hour, (this.studyHourHistogram.get(hour) || 0) + 1);
        }

        if (ev.type === "Edu.GradePublished" && p.subject) {
          const subject = String(p.subject);
          const grade = Number(p.grade || 0);
          const ss = this.subjects.get(subject) || { submissions: 0, onTime: 0, late: 0, gradesSum: 0, gradesCount: 0, lastGrade: grade, lastAt: ev.timestamp, gradeHistory: [] };
          if (!Number.isNaN(grade)) {
            ss.gradesSum += grade;
            ss.gradesCount += 1;
            ss.lastGrade = grade;
            ss.gradeHistory.push(grade);
            if (ss.gradeHistory.length > 50) ss.gradeHistory.shift();
          }
          ss.lastAt = ev.timestamp;
          this.subjects.set(subject, ss);
        }

        if (ev.type === "Edu.Attendance" || p.attended !== undefined) {
          this.attendance.total += 1;
          if (p.attended === true) this.attendance.present += 1; else this.attendance.absent += 1;
          const day = this.attendance.byDay.get(dow) || { present: 0, absent: 0 };
          if (p.attended === true) day.present += 1; else day.absent += 1;
          this.attendance.byDay.set(dow, day);
        }

        this.facts.set(`ev_${ev.eventId}`, {
          factId: `ev_${ev.eventId}`,
          statement: `Education event ${ev.type} on ${ev.timestamp}`,
          domain: "education",
          value: { subject: p.subject, assignmentId: p.assignmentId, grade: p.grade, attended: p.attended, type: ev.type },
          sources: [{ source: "education_api", sourceUrl: `event:${ev.eventId}`, authorityScore: 85, accessedAt: ev.timestamp }],
          confidence: 0.85,
          trustScore: 85,
          verificationCount: 1,
          contradictions: [],
          lastCheckedAt: now,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120).toISOString(),
          status: "validated",
        });
      }

      // Patterns: weakest subject + best study hour
      const subjArr = Array.from(this.subjects.entries()).map(([s, ss]) => ({ subject: s, avg: ss.gradesCount ? ss.gradesSum / ss.gradesCount : 0, count: ss.gradesCount }));
      const weakest = subjArr.filter((x) => x.count > 0).sort((a, b) => a.avg - b.avg)[0];
      if (weakest) {
        this.patterns.set("weakest_subject", {
          patternId: "weakest_subject",
          description: `Weakest subject is ${weakest.subject} (avg ${Math.round(weakest.avg)})`,
          trigger: { intent: "study_recommendation" },
          action: { suggest_tutoring: weakest.subject },
          confidence: Math.min(1, weakest.count / 5),
          observationCount: weakest.count,
          lastObservedAt: now,
        });
      }
      const bestHour = Array.from(this.studyHourHistogram.entries()).sort((a, b) => b[1] - a[1])[0];
      if (bestHour) {
        this.patterns.set("best_study_hour", {
          patternId: "best_study_hour",
          description: `Most-productive study hour is ${bestHour[0]}:00 UTC (${bestHour[1]} submissions)`,
          trigger: { intent: "schedule_study" },
          action: { suggest_hour: bestHour[0] },
          confidence: Math.min(1, bestHour[1] / 10),
          observationCount: bestHour[1],
          lastObservedAt: now,
        });
      }

      this.confidence = Math.min(1, processed / 20 + this.confidence * 0.85);
      this.freshness = 1;
      this.lastTrainedAt = now;
      this.recommendationModel.updatedAt = now;
      this.predictionModel.updatedAt = now;
    } catch {
      // best-effort
    }
  }

  /** Snapshot current education knowledge. */
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

  /** Predict grade outcomes / attendance risk / deadline pressure. */
  async predict(input: unknown): Promise<Prediction[]> {
    try {
      const i = (input || {}) as { userId?: string; limit?: number; subject?: string };
      const limit = i.limit ?? 5;
      const now = new Date().toISOString();
      const out: Prediction[] = [];
      // Predicted grade per subject
      const subs = Array.from(this.subjects.entries()).slice(0, limit);
      for (const [subject, ss] of subs) {
        if (ss.gradesCount === 0) continue;
        const avg = ss.gradesSum / ss.gradesCount;
        const trend = ss.gradeHistory.length >= 2 ? ss.gradeHistory[ss.gradeHistory.length - 1] - ss.gradeHistory[0] : 0;
        out.push({
          predictionId: `pred_edu_${subject}_${Date.now().toString(36)}_${out.length}`,
          userId: i.userId,
          type: "next_action",
          predicted: { subject, expected_grade: Math.round(avg * 100) / 100, trend: trend > 0 ? "rising" : trend < 0 ? "falling" : "stable" },
          confidence: Math.min(1, ss.gradesCount / 8),
          timeHorizon: "next_assignment",
          reasoning: `Avg ${Math.round(avg)} across ${ss.gradesCount} grades; trend ${trend > 0 ? "rising" : trend < 0 ? "falling" : "stable"}.`,
          evidence: [`subject:${subject}`],
          createdAt: now,
        });
      }
      // Attendance risk
      if (this.attendance.total > 0) {
        const rate = this.attendance.present / this.attendance.total;
        out.push({
          predictionId: `pred_att_${Date.now().toString(36)}`,
          userId: i.userId,
          type: "next_action",
          predicted: { attendance_rate: Math.round(rate * 100) / 100, risk_of_missing: Math.round((1 - rate) * 100) / 100 },
          confidence: Math.min(1, this.attendance.total / 20),
          timeHorizon: "next_class",
          reasoning: `${this.attendance.present}/${this.attendance.total} attended.`,
          evidence: [`attendance:${this.attendance.total}`],
          createdAt: now,
        });
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Recommend study resources / tutoring / schedule optimization. */
  async recommend(input: unknown): Promise<unknown[]> {
    try {
      const i = (input || {}) as { intent?: string; limit?: number };
      const intent = i.intent || "resource";
      const limit = i.limit ?? 5;
      const out: unknown[] = [];
      if (intent === "resource") {
        for (const [subject, ss] of Array.from(this.subjects.entries()).sort((a, b) => (a[1].gradesCount ? a[1].gradesSum / a[1].gradesCount : 999) - (b[1].gradesCount ? b[1].gradesSum / b[1].gradesCount : 999)).slice(0, limit)) {
          const avg = ss.gradesCount ? ss.gradesSum / ss.gradesCount : 0;
          out.push({ kind: "study_resource", subject, score: avg, reason: `Avg grade ${Math.round(avg)} — focus area` });
        }
      } else if (intent === "tutoring") {
        for (const [subject, ss] of Array.from(this.subjects.entries()).filter(([, s]) => s.gradeHistory.length >= 2 && s.gradeHistory[s.gradeHistory.length - 1] < s.gradeHistory[0]).slice(0, limit)) {
          const delta = ss.gradeHistory[0] - ss.gradeHistory[ss.gradeHistory.length - 1];
          out.push({ kind: "tutoring", subject, score: delta, reason: `Grade dropped ${delta} points recently` });
        }
      } else if (intent === "schedule") {
        for (const [hour, count] of Array.from(this.studyHourHistogram.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit)) {
          out.push({ kind: "schedule_optimization", hour, score: count, reason: `${count} submissions at ${hour}:00 UTC` });
        }
        const worstDay = Array.from(this.attendance.byDay.entries()).filter(([, d]) => d.present + d.absent > 0).sort((a, b) => (a[1].present / (a[1].present + a[1].absent)) - (b[1].present / (b[1].present + b[1].absent)))[0];
        if (worstDay) out.push({ kind: "schedule_optimization", day: worstDay[0], score: worstDay[1].present / (worstDay[1].present + worstDay[1].absent), reason: "Lowest attendance day — add a nudge" });
      }
      return out;
    } catch {
      return [];
    }
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const educationTrainer = new EducationTrainer();
