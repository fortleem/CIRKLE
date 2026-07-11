// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Semantic Memory Builder
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Semantic Memory groups nodes in the knowledge graph into CONCEPTS,
 * creates ABSTRACTIONS (e.g., "Italian Restaurant" → "Restaurant" →
 * "Food Establishment" → "Place"), and builds simple EMBEDDINGS using
 * feature hashing (a count-min sketch style vector — not real vector
 * embeddings, which are deferred to a later phase).
 *
 * Each SemanticMemory entry holds:
 *   - concept: the abstract label (e.g., "Italian Restaurant")
 *   - embedding: a fixed-length number[] derived by hashing tags + type +
 *     property keys + name tokens into a 64-dim vector (double-hashing
 *     to reduce collisions; L2-normalized).
 *   - nodeIds: the concrete knowledge-graph nodes that map to this concept
 *   - relatedConcepts: parent/child/sibling concepts in the hierarchy
 *   - abstractionLevel: 0 (concrete) → 5 (highly abstract)
 *
 * Constitutional role:
 *   - NEVER overrides KnowledgeGraph data — semantic memory is a derived
 *     view, not a primary store.
 *   - All embeddings are deterministic (feature hashing) so identical
 *     inputs always produce identical vectors — no random init.
 * ============================================================================
 */

import "server-only";

import type { KnowledgeNode, SemanticMemory } from "./types";

import { globalKnowledgeGraph } from "./knowledge-graph";

// ── Abstraction hierarchy ────────────────────────────────────────────────

interface AbstractionRung {
  match: (n: KnowledgeNode) => boolean;
  concept: string;
  level: number;
}

const ABSTRACTION_LADDER: AbstractionRung[] = [
  // Level 5 — most abstract
  { match: () => true, concept: "Entity", level: 5 },
  // Level 4
  { match: (n) => ["place", "business", "restaurant", "cafe", "mall", "hotel", "hospital", "school", "city", "country", "road"].includes(n.type), concept: "Place", level: 4 },
  { match: (n) => ["post", "video", "article", "creator"].includes(n.type), concept: "Content", level: 4 },
  { match: (n) => ["product", "payment"].includes(n.type), concept: "Commerce", level: 4 },
  { match: (n) => ["user", "company"].includes(n.type), concept: "Actor", level: 4 },
  // Level 3
  { match: (n) => ["restaurant", "cafe", "mall"].includes(n.type), concept: "Food Establishment", level: 3 },
  { match: (n) => ["hotel", "flight"].includes(n.type), concept: "Travel Service", level: 3 },
  { match: (n) => ["post", "video", "article"].includes(n.type), concept: "Media Item", level: 3 },
  { match: (n) => ["hospital", "school"].includes(n.type), concept: "Public Service", level: 3 },
  // Level 2
  { match: (n) => n.type === "restaurant" && /italian|pizza|pasta/i.test(JSON.stringify(n.tags)), concept: "Italian Restaurant", level: 2 },
  { match: (n) => n.type === "restaurant" && /japanese|sushi|ramen/i.test(JSON.stringify(n.tags)), concept: "Japanese Restaurant", level: 2 },
  { match: (n) => n.type === "restaurant" && /fast|burger|fries/i.test(JSON.stringify(n.tags)), concept: "Fast Food Restaurant", level: 2 },
  { match: (n) => n.type === "restaurant", concept: "Restaurant", level: 2 },
  { match: (n) => n.type === "hotel", concept: "Hotel", level: 2 },
  { match: (n) => n.type === "flight", concept: "Flight", level: 2 },
  { match: (n) => n.type === "hospital", concept: "Hospital", level: 2 },
  { match: (n) => n.type === "school", concept: "School", level: 2 },
  // Level 1 — more specific sub-types
  { match: (n) => n.type === "restaurant" && /michelin|fine.dining/i.test(JSON.stringify(n.tags)), concept: "Fine Dining Restaurant", level: 1 },
  { match: (n) => n.type === "hotel" && /luxury|5.star/i.test(JSON.stringify(n.tags)), concept: "Luxury Hotel", level: 1 },
];

// ── Semantic Memory Builder ──────────────────────────────────────────────

export class SemanticMemoryBuilder {
  /** Semantic memories keyed by concept name. */
  private memories = new Map<string, SemanticMemory>();
  /** Reverse lookup: nodeId → list of concept names. */
  private nodeToConcepts = new Map<string, string[]>();
  /** Embedding dimensionality. */
  private readonly dim = 64;

  /**
   * Build (or refresh) the semantic memory entry for the concept
   * represented by a knowledge-graph node. If a memory for the same
   * concept already exists, the node is added to it and the embedding
   * is averaged. Returns the created/updated memory, or null if the
   * node does not exist in the graph.
   */
  async buildSemanticMemory(nodeId: string): Promise<SemanticMemory | null> {
    try {
      const node = globalKnowledgeGraph.getNode(nodeId);
      if (!node) return null;
      const concept = this.deriveConcept(node);
      const embedding = this.hashEmbedding(node);
      const mem = this.memories.get(concept);
      const now = new Date().toISOString();
      if (mem) {
        if (!mem.nodeIds.includes(nodeId)) mem.nodeIds.push(nodeId);
        mem.embedding = this.mergeEmbeddings(mem.embedding, embedding);
        mem.lastAccessedAt = now;
        mem.accessCount += 1;
        this.memories.set(concept, mem);
        this.indexNodeToConcept(nodeId, concept);
        return mem;
      }
      const newMem: SemanticMemory = {
        memoryId: `sm_${concept.replace(/\s+/g, "_").toLowerCase()}_${Date.now().toString(36)}`,
        concept,
        embedding,
        nodeIds: [nodeId],
        relatedConcepts: this.findRelatedConceptNames(concept),
        abstractionLevel: this.getAbstractionLevel(nodeId) ?? 0,
        formedAt: now,
        lastAccessedAt: now,
        accessCount: 1,
      };
      this.memories.set(concept, newMem);
      this.indexNodeToConcept(nodeId, concept);
      return newMem;
    } catch {
      return null;
    }
  }

  /** Get the semantic memory for a concept (if built). Bumps access count. */
  getSemanticMemory(concept: string): SemanticMemory | undefined {
    try {
      const mem = this.memories.get(concept);
      if (mem) {
        mem.lastAccessedAt = new Date().toISOString();
        mem.accessCount += 1;
      }
      return mem;
    } catch {
      return undefined;
    }
  }

  /** Find related concepts (siblings in the hierarchy + parent). */
  findRelatedConcepts(concept: string, limit = 10): string[] {
    try {
      const mem = this.memories.get(concept);
      if (mem && mem.relatedConcepts.length > 0) {
        return mem.relatedConcepts.slice(0, limit);
      }
      return this.findRelatedConceptNames(concept).slice(0, limit);
    } catch {
      return [];
    }
  }

  /** Get the abstraction level (0-5) for a node. Lower = more specific. */
  getAbstractionLevel(nodeId: string): number | undefined {
    try {
      const node = globalKnowledgeGraph.getNode(nodeId);
      if (!node) return undefined;
      let bestLevel = 5;
      for (const rung of ABSTRACTION_LADDER) {
        try {
          if (rung.match(node) && rung.level < bestLevel) {
            bestLevel = rung.level;
          }
        } catch {
          continue;
        }
      }
      return bestLevel;
    } catch {
      return undefined;
    }
  }

  /** Build semantic memory for ALL nodes in the graph (batch, bounded). */
  async buildAll(limit = 5000): Promise<{ built: number; skipped: number }> {
    try {
      const snapshot = globalKnowledgeGraph.serialize();
      let built = 0;
      let skipped = 0;
      for (const node of snapshot.nodes.slice(0, limit)) {
        const mem = await this.buildSemanticMemory(node.nodeId);
        if (mem) built++;
        else skipped++;
      }
      return { built, skipped };
    } catch {
      return { built: 0, skipped: 0 };
    }
  }

  /** Stats for monitoring. */
  stats(): Record<string, unknown> {
    return {
      totalConcepts: this.memories.size,
      totalNodesMapped: this.nodeToConcepts.size,
      byLevel: this.tallyByLevel(),
    };
  }

  // ── internals ──────────────────────────────────────────────────────────

  private deriveConcept(node: KnowledgeNode): string {
    let bestConcept = "Entity";
    let bestLevel = 5;
    for (const rung of ABSTRACTION_LADDER) {
      try {
        if (rung.match(node) && rung.level < bestLevel) {
          bestLevel = rung.level;
          bestConcept = rung.concept;
        }
      } catch {
        continue;
      }
    }
    return bestConcept;
  }

  private hashEmbedding(node: KnowledgeNode): number[] {
    const vec = new Array(this.dim).fill(0);
    for (const tag of node.tags || []) this.addToVec(vec, `tag:${tag}`);
    this.addToVec(vec, `type:${node.type}`);
    for (const key of Object.keys(node.properties || {})) this.addToVec(vec, `prop:${key}`);
    for (const tok of (node.name || "").toLowerCase().split(/\s+/)) {
      if (tok.length > 1) this.addToVec(vec, `tok:${tok}`);
    }
    // L2 normalize.
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    return vec.map((v) => v / norm);
  }

  private addToVec(vec: number[], feature: string): void {
    // Double hashing to reduce collisions.
    const h1 = this.hashStr(feature, 0);
    const h2 = this.hashStr(feature, 7);
    const idx = h1 % this.dim;
    const sign = h2 % 2 === 0 ? 1 : -1;
    vec[idx] += sign * 1;
  }

  private hashStr(s: string, seed: number): number {
    let h = seed | 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  private mergeEmbeddings(a: number[], b: number[]): number[] {
    const out: number[] = new Array(a.length);
    let norm = 0;
    for (let i = 0; i < a.length; i++) {
      out[i] = (a[i] + b[i]) / 2;
      norm += out[i] * out[i];
    }
    norm = Math.sqrt(norm) || 1;
    return out.map((v) => v / norm);
  }

  private findRelatedConceptNames(concept: string): string[] {
    const related: string[] = [];
    const rungIdx = ABSTRACTION_LADDER.findIndex((r) => r.concept === concept);
    if (rungIdx >= 0) {
      const myLevel = ABSTRACTION_LADDER[rungIdx].level;
      // Parent: next higher level (more abstract).
      for (let i = rungIdx + 1; i < ABSTRACTION_LADDER.length; i++) {
        const r = ABSTRACTION_LADDER[i];
        if (r.level > myLevel) {
          related.push(r.concept);
          break;
        }
      }
      // Siblings: same level, different concept.
      for (let i = 0; i < ABSTRACTION_LADDER.length; i++) {
        const r = ABSTRACTION_LADDER[i];
        if (i !== rungIdx && r.level === myLevel) related.push(r.concept);
      }
    }
    return Array.from(new Set(related)).slice(0, 8);
  }

  private indexNodeToConcept(nodeId: string, concept: string): void {
    const list = this.nodeToConcepts.get(nodeId) || [];
    if (!list.includes(concept)) list.push(concept);
    this.nodeToConcepts.set(nodeId, list);
  }

  private tallyByLevel(): Record<number, number> {
    const tally: Record<number, number> = {};
    for (const mem of this.memories.values()) {
      tally[mem.abstractionLevel] = (tally[mem.abstractionLevel] || 0) + 1;
    }
    return tally;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalSemanticMemoryBuilder = new SemanticMemoryBuilder();
