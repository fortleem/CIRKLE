/**
 * CIRKLE Brain AI — CIE Knowledge Graph
 * ============================================================================
 * Graph representing relationships between: capabilities, modules, partners,
 * countries, government services, APIs, policies, workflows, dependencies,
 * compatibility, versions. Supports traversal, impact analysis, intelligent
 * discovery.
 * ============================================================================
 */

import type { KnowledgeGraph, KnowledgeGraphNode, KnowledgeGraphEdge, KnowledgeGraphEdgeType, KnowledgeGraphNodeType } from "./types";

export class KnowledgeGraphModel {
  private nodes = new Map<string, KnowledgeGraphNode>();
  private edges: KnowledgeGraphEdge[] = [];
  private adjacency = new Map<string, KnowledgeGraphEdge[]>();

  addNode(node: KnowledgeGraphNode): void {
    this.nodes.set(node.nodeId, node);
    if (!this.adjacency.has(node.nodeId)) this.adjacency.set(node.nodeId, []);
  }

  addEdge(edge: KnowledgeGraphEdge): void {
    this.edges.push(edge);
    const adj = this.adjacency.get(edge.fromNodeId) || [];
    adj.push(edge);
    this.adjacency.set(edge.fromNodeId, adj);
  }

  getNode(nodeId: string): KnowledgeGraphNode | null {
    return this.nodes.get(nodeId) || null;
  }

  getNodesByType(type: KnowledgeGraphNodeType): KnowledgeGraphNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.type === type);
  }

  getOutgoingEdges(nodeId: string): KnowledgeGraphEdge[] {
    return this.adjacency.get(nodeId) || [];
  }

  getEdgesByType(type: KnowledgeGraphEdgeType): KnowledgeGraphEdge[] {
    return this.edges.filter((e) => e.type === type);
  }

  /**
   * Traverse from a node following edges of a specific type (BFS).
   * Returns reachable node ids (excluding the start node).
   */
  traverse(fromNodeId: string, edgeType?: KnowledgeGraphEdgeType, maxDepth = 10): string[] {
    const visited = new Set<string>([fromNodeId]);
    const queue: { id: string; depth: number }[] = [{ id: fromNodeId, depth: 0 }];
    const result: string[] = [];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;
      const edges = this.getOutgoingEdges(id);
      for (const edge of edges) {
        if (edgeType && edge.type !== edgeType) continue;
        if (!visited.has(edge.toNodeId)) {
          visited.add(edge.toNodeId);
          result.push(edge.toNodeId);
          queue.push({ id: edge.toNodeId, depth: depth + 1 });
        }
      }
    }
    return result;
  }

  /**
   * Find all capabilities available in a country.
   */
  getCapabilitiesInCountry(countryCode: string): string[] {
    const countryNode = Array.from(this.nodes.values()).find(
      (n) => n.type === "country" && n.entityId === countryCode,
    );
    if (!countryNode) return [];
    return this.traverse(countryNode.nodeId, "available-in").map((nid) => {
      const n = this.nodes.get(nid);
      return n?.entityId || "";
    }).filter(Boolean);
  }

  /**
   * Find all dependencies of a capability (transitive).
   */
  getDependencies(capabilityId: string): string[] {
    const capNode = Array.from(this.nodes.values()).find(
      (n) => n.type === "capability" && n.entityId === capabilityId,
    );
    if (!capNode) return [];
    return this.traverse(capNode.nodeId, "depends-on").map((nid) => {
      const n = this.nodes.get(nid);
      return n?.entityId || "";
    }).filter(Boolean);
  }

  /**
   * Impact analysis: what capabilities are affected if a node changes?
   */
  getImpactedNodes(nodeId: string): string[] {
    // Reverse traversal: find all nodes that depend on this node.
    const impacted: string[] = [];
    for (const edge of this.edges) {
      if (edge.toNodeId === nodeId && !impacted.includes(edge.fromNodeId)) {
        impacted.push(edge.fromNodeId);
      }
    }
    return impacted;
  }

  getGraph(): KnowledgeGraph {
    return {
      nodes: new Map(this.nodes),
      edges: [...this.edges],
      adjacency: new Map(this.adjacency),
    };
  }

  getStats(): { nodes: number; edges: number; byNodeType: Record<string, number> } {
    const byNodeType: Record<string, number> = {};
    for (const n of this.nodes.values()) {
      byNodeType[n.type] = (byNodeType[n.type] || 0) + 1;
    }
    return { nodes: this.nodes.size, edges: this.edges.length, byNodeType };
  }
}

export const globalKnowledgeGraph = new KnowledgeGraphModel();
