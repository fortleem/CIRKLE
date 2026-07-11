// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Knowledge Graph
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * The Knowledge Graph is the structural backbone of AIKE. It stores every
 * entity the Brain has ever reasoned about (users, places, businesses,
 * products, hotels, flights, roads, hospitals, schools, jobs, posts, creators,
 * videos, payments, events, countries, cities, companies, government services,
 * etc.) and every observed relationship between them (visited, liked,
 * purchased, works_at, located_in, travels_to, follows, created, joined,
 * reviewed, belongs_to, similar_to, frequently_used_with, etc.).
 *
 * Design goals:
 *   - O(1) node/edge lookup via Map storage.
 *   - O(degree) neighbor queries via per-node adjacency sets.
 *   - Bounded BFS/DFS traversal (max-hops guard prevents runaway walks).
 *   - Similarity via Jaccard over neighbor sets (cosine-like, sparse-friendly).
 *   - Pure in-memory; persistence is handled separately (nightly snapshot).
 *
 * Constitutional role:
 *   - The graph is FACTUAL, not inferential. AI may add `similar_to` edges,
 *     but they are tagged with low trust until validated.
 *   - Every mutation updates `updatedAt`/`lastObservedAt` and bumps the
 *     observation count — the graph is append-mostly and auditable.
 * ============================================================================
 */

import "server-only";

import type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeEdgeType,
} from "./types";

// ── Knowledge Graph ──────────────────────────────────────────────────────

export class KnowledgeGraph {
  /** Primary node store. */
  private nodes = new Map<string, KnowledgeNode>();
  /** Primary edge store. */
  private edges = new Map<string, KnowledgeEdge>();
  /** Forward adjacency: nodeId -> Set of edge ids. */
  private outAdj = new Map<string, Set<string>>();
  /** Reverse adjacency: nodeId -> Set of edge ids. */
  private inAdj = new Map<string, Set<string>>();
  /** Counter for stable edge id generation. */
  private seq = 0;

  /**
   * Add or upsert a node. If a node with the same id exists, merge source
   * ids + tags and bump updatedAt; trust/confidence are max-merged.
   */
  addNode(node: KnowledgeNode): KnowledgeNode {
    try {
      const existing = this.nodes.get(node.nodeId);
      const now = new Date().toISOString();
      if (existing) {
        const merged: KnowledgeNode = {
          ...existing,
          properties: { ...existing.properties, ...node.properties },
          trustScore: Math.max(existing.trustScore, node.trustScore),
          confidence: Math.max(existing.confidence, node.confidence),
          updatedAt: now,
          sourceIds: Array.from(new Set([...existing.sourceIds, ...node.sourceIds])),
          tags: Array.from(new Set([...existing.tags, ...node.tags])),
        };
        this.nodes.set(node.nodeId, merged);
        this.ensureAdj(node.nodeId);
        return merged;
      }
      this.nodes.set(node.nodeId, node);
      this.ensureAdj(node.nodeId);
      return node;
    } catch {
      return node;
    }
  }

  /**
   * Add an edge. Deduplicates by (from, to, type) — if the same edge already
   * exists, bumps observationCount + lastObservedAt and max-merges weight.
   * Stubs missing endpoints so the graph stays referentially consistent.
   */
  addEdge(edge: KnowledgeEdge): KnowledgeEdge {
    try {
      if (!this.nodes.has(edge.fromNodeId)) this.addNode(this.makeStub(edge.fromNodeId));
      if (!this.nodes.has(edge.toNodeId)) this.addNode(this.makeStub(edge.toNodeId));
      const existing = this.findEdge(edge.fromNodeId, edge.toNodeId, edge.type);
      const now = new Date().toISOString();
      if (existing) {
        const merged: KnowledgeEdge = {
          ...existing,
          weight: Math.max(existing.weight, edge.weight),
          properties: { ...existing.properties, ...edge.properties },
          lastObservedAt: now,
          observationCount: existing.observationCount + 1,
        };
        this.edges.set(existing.edgeId, merged);
        return merged;
      }
      const edgeId = edge.edgeId || `e_${(this.seq++).toString(36)}_${Date.now().toString(36)}`;
      const full: KnowledgeEdge = {
        ...edge,
        edgeId,
        firstObservedAt: edge.firstObservedAt || now,
        lastObservedAt: now,
        observationCount: edge.observationCount || 1,
      };
      this.edges.set(edgeId, full);
      this.outAdj.get(edge.fromNodeId)!.add(edgeId);
      this.inAdj.get(edge.toNodeId)!.add(edgeId);
      return full;
    } catch {
      return edge;
    }
  }

  /** Lookup node by id. */
  getNode(nodeId: string): KnowledgeNode | undefined {
    return this.nodes.get(nodeId);
  }

  /** Lookup edge by id. */
  getEdge(edgeId: string): KnowledgeEdge | undefined {
    return this.edges.get(edgeId);
  }

  /**
   * Query direct neighbors of a node, optionally filtered by edge type and
   * direction. Returns { nodes, edges }.
   */
  queryNeighbors(
    nodeId: string,
    opts: { type?: KnowledgeEdgeType; direction?: "out" | "in" | "both"; minWeight?: number } = {}
  ): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
    try {
      const { type, direction = "both", minWeight = 0 } = opts;
      const edgeIds = new Set<string>();
      if (direction !== "in") {
        const out = this.outAdj.get(nodeId);
        if (out) for (const id of out) edgeIds.add(id);
      }
      if (direction !== "out") {
        const inc = this.inAdj.get(nodeId);
        if (inc) for (const id of inc) edgeIds.add(id);
      }
      const edges: KnowledgeEdge[] = [];
      const nodeIds = new Set<string>();
      for (const id of edgeIds) {
        const e = this.edges.get(id);
        if (!e) continue;
        if (type && e.type !== type) continue;
        if (e.weight < minWeight) continue;
        edges.push(e);
        nodeIds.add(e.fromNodeId === nodeId ? e.toNodeId : e.fromNodeId);
      }
      const nodes: KnowledgeNode[] = [];
      for (const nid of nodeIds) {
        const n = this.nodes.get(nid);
        if (n) nodes.push(n);
      }
      return { nodes, edges };
    } catch {
      return { nodes: [], edges: [] };
    }
  }

  /**
   * Traverse the graph from a start node up to `maxHops` deep. Mode = BFS
   * (level-order) or DFS (depth-first). Returns visited nodes (excluding
   * the start node unless includeStart=true).
   */
  traverse(
    startNodeId: string,
    opts: { maxHops?: number; mode?: "bfs" | "dfs"; type?: KnowledgeEdgeType; maxVisited?: number } = {}
  ): KnowledgeNode[] {
    try {
      const { maxHops = 3, mode = "bfs", type, maxVisited = 500 } = opts;
      const visited = new Set<string>([startNodeId]);
      const result: KnowledgeNode[] = [];
      const frontier: Array<{ id: string; depth: number }> = [{ id: startNodeId, depth: 0 }];
      while (frontier.length > 0 && result.length < maxVisited) {
        const cur = mode === "bfs" ? frontier.shift()! : frontier.pop()!;
        if (cur.depth >= maxHops) continue;
        const { edges } = this.queryNeighbors(cur.id, { type, direction: "both" });
        for (const e of edges) {
          const nextId = e.fromNodeId === cur.id ? e.toNodeId : e.fromNodeId;
          if (visited.has(nextId)) continue;
          visited.add(nextId);
          const n = this.nodes.get(nextId);
          if (n) {
            result.push(n);
            frontier.push({ id: nextId, depth: cur.depth + 1 });
          }
          if (result.length >= maxVisited) break;
        }
      }
      return result;
    } catch {
      return [];
    }
  }

  /**
   * Find a shortest path between two nodes using BFS. Returns the sequence
   * of node ids (inclusive of both endpoints), or null if no path within
   * maxHops exists.
   */
  findPath(fromNodeId: string, toNodeId: string, maxHops = 6): string[] | null {
    try {
      if (fromNodeId === toNodeId) return [fromNodeId];
      const visited = new Set<string>([fromNodeId]);
      const parents = new Map<string, string | null>([[fromNodeId, null]]);
      const queue: Array<{ id: string; depth: number }> = [{ id: fromNodeId, depth: 0 }];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur.depth >= maxHops) continue;
        const { edges } = this.queryNeighbors(cur.id, { direction: "both" });
        for (const e of edges) {
          const nextId = e.fromNodeId === cur.id ? e.toNodeId : e.fromNodeId;
          if (visited.has(nextId)) continue;
          visited.add(nextId);
          parents.set(nextId, cur.id);
          if (nextId === toNodeId) {
            const path: string[] = [];
            let n: string | null = nextId;
            while (n) {
              path.unshift(n);
              n = parents.get(n) ?? null;
            }
            return path;
          }
          queue.push({ id: nextId, depth: cur.depth + 1 });
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Compute similarity between the seed node and all other nodes based on
   * shared neighbors (Jaccard over the union of neighbor sets). Returns the
   * top-K most similar nodes above minSimilarity. This is the cosine-like
   * similarity used to populate `similar_to` edges.
   */
  findSimilar(nodeId: string, opts: { topK?: number; minSimilarity?: number } = {}): Array<{ node: KnowledgeNode; similarity: number }> {
    try {
      const { topK = 10, minSimilarity = 0.05 } = opts;
      const target = this.neighborSet(nodeId);
      if (target.size === 0) return [];
      const scores: Array<{ node: KnowledgeNode; similarity: number }> = [];
      for (const [otherId, other] of this.nodes) {
        if (otherId === nodeId) continue;
        const otherSet = this.neighborSet(otherId);
        if (otherSet.size === 0) continue;
        let inter = 0;
        for (const id of target) if (otherSet.has(id)) inter++;
        const union = target.size + otherSet.size - inter;
        const sim = union === 0 ? 0 : inter / union;
        if (sim >= minSimilarity) scores.push({ node: other, similarity: sim });
      }
      scores.sort((a, b) => b.similarity - a.similarity);
      return scores.slice(0, topK);
    } catch {
      return [];
    }
  }

  /** Get a subgraph induced by a set of node ids (all edges among them). */
  getSubgraph(nodeIds: string[]): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
    try {
      const idSet = new Set(nodeIds);
      const nodes: KnowledgeNode[] = [];
      for (const id of idSet) {
        const n = this.nodes.get(id);
        if (n) nodes.push(n);
      }
      const edges: KnowledgeEdge[] = [];
      for (const e of this.edges.values()) {
        if (idSet.has(e.fromNodeId) && idSet.has(e.toNodeId)) edges.push(e);
      }
      return { nodes, edges };
    } catch {
      return { nodes: [], edges: [] };
    }
  }

  /** Serialize the graph to a plain JSON object (for snapshot/persistence). */
  serialize(): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[]; schema: number } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      schema: 1,
    };
  }

  /** Deserialize from a previously serialized snapshot. Rebuilds adjacency. */
  deserialize(data: { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }): void {
    try {
      this.clear();
      for (const n of data.nodes || []) this.addNode(n);
      for (const e of data.edges || []) this.addEdge(e);
    } catch {
      // best-effort
    }
  }

  /** Clear all nodes + edges (used by tests + deserialize). */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.outAdj.clear();
    this.inAdj.clear();
    this.seq = 0;
  }

  /** Stats for diagnostics. */
  stats(): { nodes: number; edges: number; density: number } {
    const n = this.nodes.size;
    const e = this.edges.size;
    const maxEdges = n * (n - 1);
    return { nodes: n, edges: e, density: maxEdges === 0 ? 0 : e / maxEdges };
  }

  // ── internals ──────────────────────────────────────────────────────────

  private ensureAdj(nodeId: string): void {
    if (!this.outAdj.has(nodeId)) this.outAdj.set(nodeId, new Set());
    if (!this.inAdj.has(nodeId)) this.inAdj.set(nodeId, new Set());
  }

  private neighborSet(nodeId: string): Set<string> {
    const out = new Set<string>();
    try {
      const outE = this.outAdj.get(nodeId);
      if (outE) for (const id of outE) {
        const e = this.edges.get(id);
        if (e) out.add(e.toNodeId);
      }
      const inE = this.inAdj.get(nodeId);
      if (inE) for (const id of inE) {
        const e = this.edges.get(id);
        if (e) out.add(e.fromNodeId);
      }
    } catch {}
    return out;
  }

  private findEdge(from: string, to: string, type: KnowledgeEdgeType): KnowledgeEdge | undefined {
    const out = this.outAdj.get(from);
    if (!out) return undefined;
    for (const id of out) {
      const e = this.edges.get(id);
      if (e && e.toNodeId === to && e.type === type) return e;
    }
    return undefined;
  }

  private makeStub(nodeId: string): KnowledgeNode {
    const now = new Date().toISOString();
    return {
      nodeId,
      type: "topic",
      name: nodeId,
      properties: {},
      trustScore: 0,
      confidence: 0,
      discoveredAt: now,
      updatedAt: now,
      sourceIds: [],
      tags: ["stub"],
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalKnowledgeGraph = new KnowledgeGraph();
