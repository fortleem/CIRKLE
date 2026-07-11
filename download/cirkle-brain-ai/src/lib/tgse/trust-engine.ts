/**
 * CIRKLE Brain AI — TGSE Trust Engine
 * ============================================================================
 * Maintains trust scores for partners, government services, external APIs,
 * capability packs, providers, enterprise connectors. Trust scores influence
 * orchestration + execution decisions but do NOT replace reasoning.
 * ============================================================================
 */

import type { TrustScore, TrustEntityType } from "./types";

export class TrustEngine {
  private scores = new Map<string, TrustScore>();

  set(score: TrustScore): void {
    this.scores.set(`${score.entityType}:${score.entityId}`, score);
  }

  get(entityType: TrustEntityType, entityId: string): TrustScore | null {
    return this.scores.get(`${entityType}:${entityId}`) || null;
  }

  list(): TrustScore[] {
    return Array.from(this.scores.values());
  }

  listByType(entityType: TrustEntityType): TrustScore[] {
    return this.list().filter((s) => s.entityType === entityType);
  }

  isTrusted(entityType: TrustEntityType, entityId: string, minScore = 50): boolean {
    const s = this.get(entityType, entityId);
    return s ? s.score >= minScore : false;
  }

  isCertified(entityType: TrustEntityType, entityId: string): boolean {
    const s = this.get(entityType, entityId);
    if (!s || !s.certified) return false;
    if (s.certificationExpiry && new Date(s.certificationExpiry) < new Date()) return false;
    return true;
  }

  /**
   * Update a trust score by adjusting factor values.
   */
  updateScore(entityType: TrustEntityType, entityId: string, factorAdjustments: { factor: string; delta: number }[]): void {
    const existing = this.get(entityType, entityId);
    if (!existing) return;
    const factors = [...existing.factors];
    for (const adj of factorAdjustments) {
      const f = factors.find((x) => x.factor === adj.factor);
      if (f) {
        f.value = Math.max(0, Math.min(100, f.value + adj.delta));
      } else {
        factors.push({ factor: adj.factor, weight: 1, value: Math.max(0, Math.min(100, adj.delta)) });
      }
    }
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    const weighted = factors.reduce((sum, f) => sum + f.value * f.weight, 0);
    existing.score = Math.round(weighted / totalWeight);
    existing.factors = factors;
    existing.lastUpdated = new Date().toISOString();
  }

  getStats(): { total: number; certified: number; byType: Record<string, number>; averageScore: number } {
    const byType: Record<string, number> = {};
    let certified = 0;
    let totalScore = 0;
    for (const s of this.scores.values()) {
      byType[s.entityType] = (byType[s.entityType] || 0) + 1;
      if (s.certified) certified++;
      totalScore += s.score;
    }
    return {
      total: this.scores.size,
      certified,
      byType,
      averageScore: this.scores.size > 0 ? Math.round(totalScore / this.scores.size) : 0,
    };
  }
}

export const globalTrustEngine = new TrustEngine();
