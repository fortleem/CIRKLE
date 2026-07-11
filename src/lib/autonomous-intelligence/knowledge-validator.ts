// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Knowledge Validator
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Every fact the Brain learns passes through the Validator. A fact is only
 * "validated" once it has been corroborated by ≥2 independent trusted sources
 * AND has no unresolved contradictions.
 *
 * Per-fact metadata tracked:
 *   - confidence        (0-1, aggregated from sources)
 *   - trust             (0-100, weighted by source authority)
 *   - verificationCount (number of independent corroborations)
 *   - sourceAuthority   (max authority of contributing sources)
 *   - freshness         (0-1, decayed over time since lastCheckedAt)
 *   - contradictions    (list of conflicting claims + source ids)
 *   - lastCheckedAt     (ISO timestamp)
 *   - expiresAt         (ISO timestamp, drives freshness manager)
 *
 * Conflict resolution policy:
 *   - Conflicting facts stay "contradicted" until a higher-authority source
 *     breaks the tie. If the highest-authority source is ≥15 points above
 *     all contradictors, the conflict is resolved in its favor; otherwise
 *     the fact stays contradicted and is excluded from reasoning.
 * ============================================================================
 */

import "server-only";

import type { KnowledgeFact, KnowledgeSourceRef } from "./types";

// ── Validator ────────────────────────────────────────────────────────────

interface ContradictionRecord {
  /** The factId this record is about. */
  factId: string;
  /** The contradicting claim. */
  claim: string;
  /** Source that produced the contradiction. */
  sourceUrl: string;
  /** Authority of the contradicting source. */
  authority: number;
  /** When the contradiction was recorded. */
  detectedAt: string;
}

export class KnowledgeValidator {
  /** All facts known to the validator. */
  private facts = new Map<string, KnowledgeFact>();
  /** Per-fact contradiction ledger. */
  private contradictions = new Map<string, ContradictionRecord[]>();
  /** Max facts retained (LRU by lastCheckedAt). */
  private readonly maxFacts = 10000;
  /** Authority gap required to auto-resolve a contradiction. */
  private readonly RESOLUTION_GAP = 15;

  /**
   * Validate a fact. Merges with any existing fact on the same statement,
   * re-checks for contradictions, and recomputes the final confidence +
   * trust + status.
   */
  async validateFact(fact: KnowledgeFact): Promise<KnowledgeFact> {
    try {
      const existing = this.findByStatement(fact.statement);
      if (existing) {
        const merged = this.mergeInternal(existing, fact);
        const finalFact = this.scoreFact(merged);
        this.facts.set(existing.factId, finalFact);
        return finalFact;
      }
      const scored = this.scoreFact(fact);
      this.facts.set(scored.factId, scored);
      this.evictIfNeeded();
      return scored;
    } catch {
      return fact;
    }
  }

  /**
   * Check whether a fact contradicts any known fact in the same domain.
   * Returns the list of contradictions (empty if none). Also persists the
   * records in the contradiction ledger keyed by the input fact's id.
   */
  checkContradictions(fact: KnowledgeFact): ContradictionRecord[] {
    try {
      const records: ContradictionRecord[] = [];
      for (const existing of this.facts.values()) {
        if (existing.factId === fact.factId) continue;
        if (existing.domain !== fact.domain) continue;
        if (this.isContradiction(existing, fact)) {
          const topSource = fact.sources[0];
          records.push({
            factId: existing.factId,
            claim: existing.statement,
            sourceUrl: topSource?.sourceUrl || "unknown",
            authority: topSource?.authorityScore || 0,
            detectedAt: new Date().toISOString(),
          });
        }
      }
      const existing = this.contradictions.get(fact.factId) || [];
      this.contradictions.set(fact.factId, [...existing, ...records]);
      return records;
    } catch {
      return [];
    }
  }

  /**
   * Merge a list of sources into a fact. Aggregates sources (deduped by
   * source+url), recomputes verificationCount, and re-derives status. Used
   * when multiple independent sources corroborate the same fact statement.
   */
  mergeSources(sources: KnowledgeSourceRef[], base: KnowledgeFact): KnowledgeFact {
    try {
      const mergedSources = this.dedupeSources([...base.sources, ...sources]);
      const maxAuthority = Math.max(...mergedSources.map((s) => s.authorityScore), 0);
      const trust = this.aggregateTrust(mergedSources);
      const verificationCount = mergedSources.length;
      const freshness = this.freshness(base.lastCheckedAt, base.expiresAt);
      const confidence = this.aggregateConfidence(mergedSources, verificationCount, freshness);
      const status = this.deriveStatus(verificationCount, base.contradictions || [], maxAuthority);
      return {
        ...base,
        sources: mergedSources,
        trustScore: trust,
        verificationCount,
        confidence,
        lastCheckedAt: new Date().toISOString(),
        status,
      };
    } catch {
      return base;
    }
  }

  /**
   * Score a fact (recompute confidence, trust, freshness, status). Idempotent.
   */
  scoreFact(fact: KnowledgeFact): KnowledgeFact {
    try {
      const maxAuthority = Math.max(...(fact.sources.map((s) => s.authorityScore) || [0]), 0);
      const trust = this.aggregateTrust(fact.sources);
      const verificationCount = fact.verificationCount || fact.sources.length;
      const freshness = this.freshness(fact.lastCheckedAt, fact.expiresAt);
      const confidence = this.aggregateConfidence(fact.sources, verificationCount, freshness);
      const contradictions = this.checkContradictions(fact);
      const status = this.deriveStatus(verificationCount, contradictions, maxAuthority);
      return {
        ...fact,
        trustScore: trust,
        verificationCount,
        confidence,
        contradictions: contradictions.map((c) => c.claim),
        status,
      };
    } catch {
      return fact;
    }
  }

  /** Get a fact by id. */
  getFact(factId: string): KnowledgeFact | undefined {
    return this.facts.get(factId);
  }

  /** Get all facts for a domain. */
  getFactsByDomain(domain: string): KnowledgeFact[] {
    try {
      return Array.from(this.facts.values()).filter((f) => f.domain === domain);
    } catch {
      return [];
    }
  }

  /** Stats for diagnostics. */
  stats(): { total: number; validated: number; contradicted: number; expired: number } {
    let validated = 0, contradicted = 0, expired = 0;
    for (const f of this.facts.values()) {
      if (f.status === "validated") validated++;
      else if (f.status === "contradicted") contradicted++;
      else if (f.status === "expired") expired++;
    }
    return { total: this.facts.size, validated, contradicted, expired };
  }

  // ── internals ──────────────────────────────────────────────────────────

  private mergeInternal(a: KnowledgeFact, b: KnowledgeFact): KnowledgeFact {
    const sources = this.dedupeSources([...a.sources, ...b.sources]);
    return {
      ...a,
      sources,
      value: { ...a.value, ...b.value },
      contradictions: Array.from(new Set([...(a.contradictions || []), ...(b.contradictions || [])])),
      lastCheckedAt: new Date().toISOString(),
      expiresAt: a.expiresAt < b.expiresAt ? b.expiresAt : a.expiresAt,
    };
  }

  private dedupeSources(sources: KnowledgeSourceRef[]): KnowledgeSourceRef[] {
    const map = new Map<string, KnowledgeSourceRef>();
    for (const s of sources) {
      const key = `${s.source}|${s.sourceUrl}`;
      const existing = map.get(key);
      if (!existing || s.authorityScore > existing.authorityScore) {
        map.set(key, { ...s, accessedAt: s.accessedAt || existing?.accessedAt || new Date().toISOString() });
      }
    }
    return Array.from(map.values());
  }

  private aggregateTrust(sources: KnowledgeSourceRef[]): number {
    if (sources.length === 0) return 0;
    const total = sources.reduce((sum, s) => sum + s.authorityScore, 0);
    return Math.round(total / sources.length);
  }

  private aggregateConfidence(sources: KnowledgeSourceRef[], verificationCount: number, freshness: number): number {
    if (sources.length === 0) return 0;
    const avgAuthority = sources.reduce((sum, s) => sum + s.authorityScore, 0) / sources.length;
    const authorityFactor = Math.min(1, avgAuthority / 100);
    // Diminishing returns on verification count.
    const verificationFactor = 1 - Math.exp(-verificationCount / 3);
    return Math.max(0, Math.min(1, authorityFactor * (0.5 + 0.3 * verificationFactor + 0.2 * freshness)));
  }

  private freshness(lastCheckedAt: string, expiresAt: string): number {
    try {
      const now = Date.now();
      const last = new Date(lastCheckedAt).getTime();
      const exp = new Date(expiresAt).getTime();
      if (exp <= now) return 0;
      const total = exp - last;
      const remaining = exp - now;
      if (total <= 0) return 0;
      return Math.max(0, Math.min(1, remaining / total));
    } catch {
      return 0;
    }
  }

  private deriveStatus(
    verificationCount: number,
    contradictions: ContradictionRecord[] | string[],
    maxAuthority: number
  ): KnowledgeFact["status"] {
    const contraArr = contradictions || [];
    if (contraArr.length > 0) {
      const maxContraAuthority = contraArr.reduce((m, c) => {
        const auth = typeof c === "string" ? 0 : c.authority;
        return Math.max(m, auth);
      }, 0);
      if (maxAuthority >= maxContraAuthority + this.RESOLUTION_GAP) {
        return "validated"; // higher-authority source breaks the tie
      }
      return "contradicted";
    }
    if (verificationCount >= 2) return "validated";
    return "unvalidated";
  }

  private isContradiction(a: KnowledgeFact, b: KnowledgeFact): boolean {
    try {
      const aVal = a.value || {};
      const bVal = b.value || {};
      const keys = new Set([...Object.keys(aVal), ...Object.keys(bVal)]);
      let diffs = 0;
      for (const k of keys) {
        if (JSON.stringify(aVal[k]) !== JSON.stringify(bVal[k])) diffs++;
      }
      if (diffs === 0) return false;
      const overlap = this.tokenOverlap(a.statement, b.statement);
      return overlap >= 0.3 && diffs / Math.max(1, keys.size) >= 0.5;
    } catch {
      return false;
    }
  }

  private tokenOverlap(a: string, b: string): number {
    const ta = new Set(a.toLowerCase().split(/\W+/).filter((t) => t.length > 3));
    const tb = new Set(b.toLowerCase().split(/\W+/).filter((t) => t.length > 3));
    if (ta.size === 0 || tb.size === 0) return 0;
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter++;
    return inter / Math.max(ta.size, tb.size);
  }

  private findByStatement(statement: string): KnowledgeFact | undefined {
    const norm = statement.toLowerCase().trim();
    for (const f of this.facts.values()) {
      if (f.statement.toLowerCase().trim() === norm) return f;
    }
    return undefined;
  }

  private evictIfNeeded(): void {
    if (this.facts.size <= this.maxFacts) return;
    const arr = Array.from(this.facts.values())
      .sort((a, b) => new Date(a.lastCheckedAt).getTime() - new Date(b.lastCheckedAt).getTime());
    const toRemove = arr.slice(0, this.facts.size - this.maxFacts);
    for (const f of toRemove) this.facts.delete(f.factId);
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalKnowledgeValidator = new KnowledgeValidator();
