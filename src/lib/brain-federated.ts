/**
 * Cirkle Brain — Federated Learning Engine
 *
 * Layer 5: Privacy-preserving collective intelligence.
 * Users train the Brain locally; only model weights are shared.
 */

import "server-only";
import { hasConsent } from "@/lib/consent";

export interface FederatedWeightUpdate {
  userId: string; // anonymized
  layer: string;  // which model layer (e.g., "news-preference", "response-style")
  weights: number[];
  gradient: number[];
  version: number;
  timestamp: number;
}

export interface AggregatedModel {
  layer: string;
  globalWeights: number[];
  version: number;
  participantCount: number;
  updatedAt: string;
}

// In-memory store for aggregated weights (would be DB in production)
const globalModels = new Map<string, AggregatedModel>();
const pendingUpdates: FederatedWeightUpdate[] = [];

/**
 * Submit a local weight update from a user's device.
 * The weights are mathematical — no personal data is included.
 *
 * Privacy gate: silently drops the submission when the user has not granted
 * `federated_learning` consent. This is defense-in-depth — the client should
 * also check consent before calling — but we double-check here so a
 * server-side caller cannot bypass the user's choice.
 */
export async function submitWeightUpdate(update: Omit<FederatedWeightUpdate, "timestamp">): Promise<void> {
  if (!hasConsent("federated_learning")) {
    // User has not opted in to federated learning — silently drop.
    // (We don't throw so client-side callers can fire-and-forget.)
    console.debug("[brain-federated] dropping weight update — federated_learning consent not granted");
    return;
  }
  pendingUpdates.push({ ...update, timestamp: Date.now() });

  // Auto-aggregate if we have enough updates
  if (pendingUpdates.filter(u => u.layer === update.layer).length >= 10) {
    await aggregateWeights(update.layer);
  }
}

/**
 * Aggregate pending weight updates into a global model.
 * Uses federated averaging: simply averages all submitted weights.
 */
export async function aggregateWeights(layer: string): Promise<AggregatedModel> {
  const updates = pendingUpdates.filter(u => u.layer === layer);
  const existing = globalModels.get(layer);

  if (updates.length === 0 && existing) return existing;

  // Federated averaging: average all weight vectors
  const weightLength = updates[0]?.weights.length || 0;
  const globalWeights = new Array(weightLength).fill(0);

  for (const update of updates) {
    for (let i = 0; i < weightLength; i++) {
      globalWeights[i] += update.weights[i] / updates.length;
    }
  }

  // Apply gradient descent (simplified)
  const learningRate = 0.01;
  for (const update of updates) {
    for (let i = 0; i < weightLength; i++) {
      globalWeights[i] -= learningRate * (update.gradient[i] || 0) / updates.length;
    }
  }

  const aggregated: AggregatedModel = {
    layer,
    globalWeights,
    version: (existing?.version || 0) + 1,
    participantCount: (existing?.participantCount || 0) + updates.length,
    updatedAt: new Date().toISOString(),
  };

  globalModels.set(layer, aggregated);

  // Clear processed updates
  const remaining = pendingUpdates.filter(u => u.layer !== layer);
  pendingUpdates.length = 0;
  pendingUpdates.push(...remaining);

  return aggregated;
}

/**
 * Get the current global model for a layer.
 */
export async function getGlobalModel(layer: string): Promise<AggregatedModel | null> {
  return globalModels.get(layer) || null;
}

/**
 * Get all global models (for the federated learning dashboard).
 */
export async function getAllGlobalModels(): Promise<AggregatedModel[]> {
  return Array.from(globalModels.values());
}

/**
 * Get federated learning statistics.
 */
export async function getFederatedStats(): Promise<{
  totalLayers: number;
  totalParticipants: number;
  totalUpdates: number;
  layers: Array<{ layer: string; version: number; participants: number }>;
}> {
  const models = Array.from(globalModels.values());
  return {
    totalLayers: models.length,
    totalParticipants: models.reduce((sum, m) => sum + m.participantCount, 0),
    totalUpdates: pendingUpdates.length,
    layers: models.map(m => ({ layer: m.layer, version: m.version, participants: m.participantCount })),
  };
}

/**
 * Train a local model on user feedback.
 * This generates weight updates that can be submitted to the federated system.
 */
export function trainOnFeedback(
  feedback: Array<{ query: string; response: string; rating: "positive" | "negative" }>,
  layer: string = "response-quality"
): FederatedWeightUpdate {
  // Simple weight update: positive feedback → reinforce, negative → suppress
  // In a real system, this would use gradient descent on a neural network
  const positive = feedback.filter(f => f.rating === "positive").length;
  const negative = feedback.filter(f => f.rating === "negative").length;
  const total = feedback.length;

  // Generate simplified weights (in production, these would be real model weights)
  const weights = [
    positive / Math.max(1, total),        // positive response rate
    negative / Math.max(1, total),        // negative response rate
    total / 100,                           // volume factor
    (positive - negative) / Math.max(1, total), // net satisfaction
  ];

  const gradient = weights.map(w => -w * 0.1); // negative gradient (descent)

  return {
    userId: "anonymous", // anonymized
    layer,
    weights,
    gradient,
    version: 1,
    timestamp: Date.now(),
  };
}
