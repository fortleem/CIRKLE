/**
 * CIRKLE Brain AI — UOB Execution Graph Generator
 * ============================================================================
 *
 * Phase 5 — Universal Orchestration Brain — Pipeline Stage 14
 *
 * Produces a directed execution graph representing:
 *   - Capability nodes (one per plan step)
 *   - Dependencies (depends-on edges)
 *   - Ordering (sequential edges)
 *   - Branches (conditional edges)
 *   - Synchronization points (where parallel branches converge)
 *   - Completion conditions (terminal nodes)
 *
 * The graph is DETERMINISTIC and SERIALIZABLE. It is a pure data structure
 * consumed by the future Trusted Execution Engine (Phase 6).
 * ============================================================================
 */

import type { PlanStep, ConditionalBranch, ExecutionGraph, GraphNode, GraphEdge, SyncPoint } from "./types";

// ── Execution Graph Generator ─────────────────────────────────────────────

export class ExecutionGraphGenerator {
  /**
   * Build the execution graph from planned steps + conditional branches.
   *
   * Node id = stepId (1:1 mapping).
   * Edge types:
   *   - "depends-on": from a step's dependency to the step (sequential).
   *   - "parallel": between steps in the same parallel group (concurrent).
   *   - "conditional": from a branch's condition step to its target steps.
   */
  generate(steps: PlanStep[], conditionalBranches: ConditionalBranch[]): ExecutionGraph {
    const nodes: GraphNode[] = steps.map((step) => ({
      nodeId: step.stepId,
      stepId: step.stepId,
      capabilityId: step.capabilityId,
      module: step.module,
    }));

    const edges: GraphEdge[] = [];
    const syncPointWaiters = new Map<string, Set<string>>(); // nextNodeId → waitForNodeIds

    // ── depends-on edges ────────────────────────────────────────────────
    for (const step of steps) {
      for (const depId of step.dependsOn) {
        edges.push({
          fromNodeId: depId,
          toNodeId: step.stepId,
          type: "depends-on",
        });
      }
    }

    // ── parallel edges (between steps in the same parallel group) ───────
    // Parallel edges are advisory — they indicate "these steps may run
    // concurrently." The Execution Engine decides actual concurrency.
    const groupsByParallelGroup = new Map<string, string[]>();
    for (const step of steps) {
      if (step.parallelGroupId) {
        const group = groupsByParallelGroup.get(step.parallelGroupId) || [];
        group.push(step.stepId);
        groupsByParallelGroup.set(step.parallelGroupId, group);
      }
    }
    for (const [, stepIds] of groupsByParallelGroup) {
      for (let i = 0; i < stepIds.length; i++) {
        for (let j = i + 1; j < stepIds.length; j++) {
          edges.push({
            fromNodeId: stepIds[i],
            toNodeId: stepIds[j],
            type: "parallel",
          });
        }
      }
    }

    // ── conditional edges + sync points ────────────────────────────────
    for (const branch of conditionalBranches) {
      // The condition references a step; edges go from that step to branch targets.
      // We extract the step id from the condition string (heuristic).
      const conditionStepId = this.extractStepIdFromCondition(branch.condition);
      if (conditionStepId) {
        for (const targetStepId of [...branch.trueSteps, ...branch.falseSteps]) {
          edges.push({
            fromNodeId: conditionStepId,
            toNodeId: targetStepId,
            type: "conditional",
            branchId: branch.branchId,
          });
        }
        // Sync point: after the branch, wait for both possible targets.
        const allTargets = [...branch.trueSteps, ...branch.falseSteps];
        if (allTargets.length > 1) {
          const syncId = `sync-${branch.branchId}`;
          syncPointWaiters.set(syncId, new Set(allTargets));
        }
      }
    }

    // ── sync points (where parallel branches converge) ─────────────────
    // A sync point is any step whose dependencies include 2+ steps that
    // are themselves parallel siblings.
    const syncPoints: SyncPoint[] = [];
    for (const step of steps) {
      if (step.dependsOn.length >= 2) {
        // Check if the deps are all in parallel groups (convergence).
        const depsInGroups = step.dependsOn.filter((depId) => {
          const depStep = steps.find((s) => s.stepId === depId);
          return depStep?.parallelGroupId;
        });
        if (depsInGroups.length >= 2) {
          syncPoints.push({
            syncPointId: `sync-before-${step.stepId}`,
            waitForNodeIds: step.dependsOn,
            nextNodeId: step.stepId,
          });
        }
      }
    }
    // Add branch sync points.
    for (const [syncId, waitSet] of syncPointWaiters) {
      syncPoints.push({
        syncPointId: syncId,
        waitForNodeIds: Array.from(waitSet),
      });
    }

    // ── entry node (first step, no incoming depends-on edges) ──────────
    const incomingEdges = new Set<string>();
    for (const edge of edges) {
      if (edge.type === "depends-on") incomingEdges.add(edge.toNodeId);
    }
    const entryCandidates = nodes.filter((n) => !incomingEdges.has(n.nodeId));
    const entryNodeId = entryCandidates[0]?.nodeId || nodes[0]?.nodeId || "";

    // ── terminal nodes (no outgoing depends-on edges) ──────────────────
    const outgoingEdges = new Set<string>();
    for (const edge of edges) {
      if (edge.type === "depends-on") outgoingEdges.add(edge.fromNodeId);
    }
    const terminalNodeIds = nodes.filter((n) => !outgoingEdges.has(n.nodeId)).map((n) => n.nodeId);

    return {
      nodes,
      edges,
      syncPoints,
      entryNodeId,
      terminalNodeIds,
    };
  }

  /**
   * Extract a step id from a condition string like "step-3.status === 'failed'".
   */
  private extractStepIdFromCondition(condition: string): string | null {
    const match = condition.match(/(step-\d+)/);
    return match ? match[1] : null;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalExecutionGraphGenerator = new ExecutionGraphGenerator();
