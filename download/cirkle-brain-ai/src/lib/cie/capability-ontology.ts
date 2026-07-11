/**
 * CIRKLE Brain AI — CIE Capability Ontology
 * ============================================================================
 * Hierarchical taxonomy: domain → category → subcategory → capability →
 * action → variant. Supports efficient discovery + future expansion.
 * ============================================================================
 */

import type { OntologyNode, CapabilityOntology, OntologyLevel } from "./types";

export class CapabilityOntologyModel {
  private nodes = new Map<string, OntologyNode>();
  private rootIds: string[] = [];

  addNode(node: OntologyNode): void {
    this.nodes.set(node.nodeId, node);
    if (node.level === "domain" && node.parentId === null) {
      if (!this.rootIds.includes(node.nodeId)) this.rootIds.push(node.nodeId);
    }
    if (node.parentId) {
      const parent = this.nodes.get(node.parentId);
      if (parent && !parent.childIds.includes(node.nodeId)) {
        parent.childIds.push(node.nodeId);
      }
    }
  }

  getNode(nodeId: string): OntologyNode | null {
    return this.nodes.get(nodeId) || null;
  }

  getChildren(nodeId: string): OntologyNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    return node.childIds.map((id) => this.nodes.get(id)).filter(Boolean) as OntologyNode[];
  }

  getAncestors(nodeId: string): OntologyNode[] {
    const ancestors: OntologyNode[] = [];
    let node = this.nodes.get(nodeId);
    while (node?.parentId) {
      const parent = this.nodes.get(node.parentId);
      if (!parent) break;
      ancestors.push(parent);
      node = parent;
    }
    return ancestors;
  }

  getDescendants(nodeId: string): OntologyNode[] {
    const result: OntologyNode[] = [];
    const collect = (id: string) => {
      const node = this.nodes.get(id);
      if (!node) return;
      for (const childId of node.childIds) {
        const child = this.nodes.get(childId);
        if (child) {
          result.push(child);
          collect(childId);
        }
      }
    };
    collect(nodeId);
    return result;
  }

  findByCapability(capabilityId: string): OntologyNode | null {
    for (const node of this.nodes.values()) {
      if (node.capabilityId === capabilityId) return node;
    }
    return null;
  }

  findByLevel(level: OntologyLevel): OntologyNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.level === level);
  }

  getDomains(): OntologyNode[] {
    return this.findByLevel("domain");
  }

  getOntology(): CapabilityOntology {
    return { nodes: new Map(this.nodes), rootIds: [...this.rootIds] };
  }

  getStats(): { nodes: number; domains: number; categories: number; capabilities: number } {
    return {
      nodes: this.nodes.size,
      domains: this.findByLevel("domain").length,
      categories: this.findByLevel("category").length,
      capabilities: this.findByLevel("capability").length,
    };
  }
}

export const globalCapabilityOntology = new CapabilityOntologyModel();
