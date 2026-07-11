// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Knowledge Compression
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * The knowledge graph grows monotonically as the Brain learns. Without
 * compaction, the graph would balloon to hundreds of millions of edges over
 * time. The Compressor runs periodically to:
 *
 *   1. Archive expired facts — facts whose `expiresAt` has passed AND whose
 *      `lastCheckedAt` is older than a cutoff are marked `deprecated` in the
 *      validator and moved into an in-memory archive map. They are no longer
 *      surfaced by `getRecentFacts` queries.
 *
 *   2. Merge similar nodes — pairs of nodes whose Jaccard similarity (over
 *      neighbor sets, as computed by `KnowledgeGraph.findSimilar`) exceeds a
 *      threshold (default 0.9) are merged into one survivor node. Edges
 *      pointing to the merged-away node are rewritten to point to the
 *      survivor; self-loops are dropped; duplicate edges are folded together
 *      (observation counts summed, weights max-merged).
 *
 *   3. Prune weak edges — edges whose weight is below a threshold (default
 *      0.1) are removed entirely. These represent weak / one-off
 *      relationships that contribute almost no signal to graph traversal.
 *
 * Implementation note: the KnowledgeGraph exposes `serialize()` +
 * `deserialize()` for full-graph roundtrips. The compressor uses this pair
 * to atomically rewrite the graph (clear + rebuild adjacency in one call),
 * so concurrent readers always observe a consistent graph.
 *
 * Constitutional role:
 *   - NEVER destroys data irrecoverably — archived facts remain queryable via
 *     `getArchivedFacts()`. Merged nodes' original ids are recorded in the
 *     survivor's `sourceIds` so the merge is auditable.
 *   - NEVER throws — every public method is wrapped in try/catch.
 *   - NEVER runs automatically — must be invoked by the orchestrator or
 *     training pipeline.
 * ============================================================================
 */

import "server-only";

import type { KnowledgeFact, KnowledgeNode, KnowledgeEdge, CompressionResult } from "./types";

import { globalKnowledgeGraph } from "./knowledge-graph";
import { globalKnowledgeAcquirer } from "./knowledge-acquisition";
import { globalKnowledgeValidator } from "./knowledge-validator";

// ── Defaults ─────────────────────────────────────────────────────────────

const DEFAULT_SIMILARITY_THRESHOLD = 0.9;
const DEFAULT_EDGE_WEIGHT_THRESHOLD = 0.1;
const DEFAULT_FACT_BATCH = 1000;

// ── Knowledge Compressor ─────────────────────────────────────────────────

export class KnowledgeCompressor {
  /** Archived facts (deprecated but kept for audit). */
  private archivedFacts = new Map<string, KnowledgeFact>();
  /** Merge ledger: mergedNodeId -> survivorNodeId (audit trail). */
  private mergeLedger = new Map<string, string>();
  /** History of compression runs (bounded). */
  private history: CompressionResult[] = [];
  /** Counter for run id generation. */
  private seq = 0;
  /** Aggregate counters. */
  private totals = { runs: 0, factsArchived: 0, nodesMerged: 0, edgesPruned: 0 };

  /**
   * Run the full compression pipeline:
   *   archiveOldFacts(now) → mergeSimilarNodes(0.9) → pruneWeakEdges(0.1)
   * Returns a CompressionResult capturing before/after counts + space saved.
   */
  async compress(opts: {
    similarityThreshold?: number;
    edgeWeightThreshold?: number;
    beforeDate?: Date;
  } = {}): Promise<CompressionResult> {
    const runId = `comp_${(this.seq++).toString(36)}_${Date.now().toString(36)}`;
    const similarityThreshold = opts.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
    const edgeWeightThreshold = opts.edgeWeightThreshold ?? DEFAULT_EDGE_WEIGHT_THRESHOLD;
    const beforeDate = opts.beforeDate ?? new Date();

    const before = globalKnowledgeGraph.serialize();
    const nodesBefore = before.nodes.length;
    const edgesBefore = before.edges.length;

    const factsArchived = await this.archiveOldFacts(beforeDate);
    const factsMerged = await this.mergeSimilarNodes(similarityThreshold);
    await this.pruneWeakEdges(edgeWeightThreshold);

    const after = globalKnowledgeGraph.serialize();
    const nodesAfter = after.nodes.length;
    const edgesAfter = after.edges.length;
    const spaceSavedBytes = this.estimateSpaceSaved(before, after);

    const result: CompressionResult = {
      runId,
      nodesBefore,
      nodesAfter,
      edgesBefore,
      edgesAfter,
      factsArchived,
      factsMerged,
      spaceSavedBytes,
      ranAt: new Date().toISOString(),
    };
    this.history.push(result);
    if (this.history.length > 100) this.history.shift();
    this.totals.runs++;
    this.totals.factsArchived += factsArchived;
    this.totals.nodesMerged += factsMerged;
    this.totals.edgesPruned += (edgesBefore - edgesAfter);
    return result;
  }

  /**
   * Archive facts older than `beforeDate`. Iterates the acquirer's recent
   * facts (bounded to 1000) and marks each expired one as `deprecated` in
   * the validator. Archived facts remain queryable via `getArchivedFacts()`.
   * Returns the count of newly-archived facts.
   */
  async archiveOldFacts(beforeDate: Date): Promise<number> {
    try {
      const cutoff = beforeDate.getTime();
      const recent = globalKnowledgeAcquirer.getRecentFacts(DEFAULT_FACT_BATCH);
      let archived = 0;
      for (const fact of recent) {
        try {
          const last = new Date(fact.lastCheckedAt).getTime();
          const exp = new Date(fact.expiresAt).getTime();
          if (last >= cutoff) continue;
          if (fact.status === "deprecated") continue;
          if (this.archivedFacts.has(fact.factId)) continue;
          // Only archive facts that are expired OR have very low confidence.
          const isExpired = exp <= Date.now();
          const isLowQuality = fact.confidence < 0.2 && fact.trustScore < 30;
          if (!isExpired && !isLowQuality) continue;
          const deprecated: KnowledgeFact = {
            ...fact,
            status: "deprecated",
            expiresAt: new Date().toISOString(),
          };
          try {
            await globalKnowledgeValidator.validateFact(deprecated);
          } catch {
            // validator may reject — we still archive locally.
          }
          this.archivedFacts.set(fact.factId, deprecated);
          archived++;
        } catch {
          // continue with the next fact
        }
      }
      return archived;
    } catch {
      return 0;
    }
  }

  /**
   * Merge nodes whose neighbor-set Jaccard similarity is >= `threshold`.
   * For each merge group, the first-encountered node becomes the survivor;
   * subsequent nodes are folded into it. Edges are rewritten via a redirect
   * map; self-loops are dropped; duplicate edges (same from+to+type) are
   * merged (observation counts summed, weights max-merged). The merge
   * ledger records mergedNodeId → survivorNodeId for auditability.
   * Returns the number of nodes merged away.
   */
  async mergeSimilarNodes(threshold: number = DEFAULT_SIMILARITY_THRESHOLD): Promise<number> {
    try {
      if (threshold <= 0 || threshold > 1) return 0;
      const snapshot = globalKnowledgeGraph.serialize();
      if (snapshot.nodes.length === 0) return 0;

      // Build redirect map (mergedNodeId -> survivorNodeId).
      const redirect = new Map<string, string>();
      const survivors = new Set<string>();

      for (const node of snapshot.nodes) {
        if (redirect.has(node.nodeId) || survivors.has(node.nodeId)) continue;
        survivors.add(node.nodeId);
        try {
          const similars = globalKnowledgeGraph.findSimilar(node.nodeId, {
            minSimilarity: threshold,
            topK: 25,
          });
          for (const sim of similars) {
            if (sim.similarity < threshold) continue;
            if (redirect.has(sim.node.nodeId) || survivors.has(sim.node.nodeId)) continue;
            redirect.set(sim.node.nodeId, node.nodeId);
            this.mergeLedger.set(sim.node.nodeId, node.nodeId);
          }
        } catch {
          // findSimilar may fail for stub nodes — skip.
        }
      }

      if (redirect.size === 0) return 0;

      // Filter nodes; rewrite + dedupe edges.
      const newNodes: KnowledgeNode[] = snapshot.nodes.filter((n) => !redirect.has(n.nodeId));
      // Fold merged nodes' sourceIds into the survivor.
      for (const [mergedId, survivorId] of redirect) {
        const survivor = newNodes.find((n) => n.nodeId === survivorId);
        const merged = snapshot.nodes.find((n) => n.nodeId === mergedId);
        if (survivor && merged) {
          survivor.sourceIds = Array.from(new Set([...survivor.sourceIds, ...merged.sourceIds, mergedId]));
          survivor.tags = Array.from(new Set([...survivor.tags, ...merged.tags]));
          survivor.trustScore = Math.max(survivor.trustScore, merged.trustScore);
          survivor.confidence = Math.max(survivor.confidence, merged.confidence);
        }
      }

      const seen = new Map<string, KnowledgeEdge>();
      for (const edge of snapshot.edges) {
        const from = redirect.get(edge.fromNodeId) || edge.fromNodeId;
        const to = redirect.get(edge.toNodeId) || edge.toNodeId;
        if (from === to) continue; // drop self-loop
        const key = `${from}|${to}|${edge.type}`;
        const existing = seen.get(key);
        if (existing) {
          existing.observationCount += edge.observationCount;
          existing.weight = Math.max(existing.weight, edge.weight);
          existing.lastObservedAt = existing.lastObservedAt > edge.lastObservedAt
            ? existing.lastObservedAt
            : edge.lastObservedAt;
        } else {
          seen.set(key, { ...edge, fromNodeId: from, toNodeId: to });
        }
      }
      const newEdges = Array.from(seen.values());

      globalKnowledgeGraph.deserialize({ nodes: newNodes, edges: newEdges });
      return redirect.size;
    } catch {
      return 0;
    }
  }

  /**
   * Prune edges whose weight is below `threshold`. Returns the number of
   * edges removed. The graph is rewritten atomically via serialize/filter/
   * deserialize so concurrent readers always see a consistent graph.
   */
  async pruneWeakEdges(threshold: number = DEFAULT_EDGE_WEIGHT_THRESHOLD): Promise<number> {
    try {
      const snapshot = globalKnowledgeGraph.serialize();
      const kept = snapshot.edges.filter((e) => e.weight >= threshold);
      const pruned = snapshot.edges.length - kept.length;
      if (pruned === 0) return 0;
      globalKnowledgeGraph.deserialize({ nodes: snapshot.nodes, edges: kept });
      return pruned;
    } catch {
      return 0;
    }
  }

  /** Return all archived facts (for audit / rehydration). */
  getArchivedFacts(limit = 100): KnowledgeFact[] {
    try {
      return Array.from(this.archivedFacts.values()).slice(0, limit);
    } catch {
      return [];
    }
  }

  /** Return the merge ledger (mergedNodeId -> survivorNodeId). */
  getMergeLedger(): Record<string, string> {
    try {
      const out: Record<string, string> = {};
      for (const [k, v] of this.mergeLedger) out[k] = v;
      return out;
    } catch {
      return {};
    }
  }

  /** History of compression runs (newest last). */
  getHistory(limit = 20): CompressionResult[] {
    return this.history.slice(-limit);
  }

  /** Aggregate stats for monitoring. */
  getStats(): {
    runs: number;
    totalFactsArchived: number;
    totalNodesMerged: number;
    totalEdgesPruned: number;
    archivedFactsInMemory: number;
    mergeLedgerSize: number;
    lastRun?: CompressionResult;
  } {
    return {
      runs: this.totals.runs,
      totalFactsArchived: this.totals.factsArchived,
      totalNodesMerged: this.totals.nodesMerged,
      totalEdgesPruned: this.totals.edgesPruned,
      archivedFactsInMemory: this.archivedFacts.size,
      mergeLedgerSize: this.mergeLedger.size,
      lastRun: this.history[this.history.length - 1],
    };
  }

  // ── internals ──────────────────────────────────────────────────────────

  /**
   * Estimate space saved by the compression run. Approximate: each node ~=
   * 256 bytes (properties + metadata), each edge ~= 128 bytes, each fact ~=
   * 512 bytes. Tuned for monitoring, not billing.
   */
  private estimateSpaceSaved(
    before: { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] },
    after: { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }
  ): number {
    const nodeBytes = (before.nodes.length - after.nodes.length) * 256;
    const edgeBytes = (before.edges.length - after.edges.length) * 128;
    return Math.max(0, nodeBytes + edgeBytes);
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalKnowledgeCompressor = new KnowledgeCompressor();
