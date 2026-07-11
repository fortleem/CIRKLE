/**
 * Cirkle Brain — Persistent Memory System
 * 
 * Layer 1 of the Cirkle Brain Architecture.
 * Stores user preferences, interaction history, feedback, and learned patterns
 * in IndexedDB — 100% on-device, never sent to any server.
 */

"use client";

const DB_NAME = "cirkle-brain";
const DB_VERSION = 1;

// Object stores
const STORES = {
  preferences: "preferences",       // user preferences (key-value)
  interactions: "interactions",     // interaction history (query → response → feedback)
  feedback: "feedback",             // 👍/👎 ratings
  knowledge: "knowledge",           // cached knowledge graph entries
  patterns: "patterns",             // learned behavioral patterns
  interestGraph: "interestGraph",   // user interest topics + weights
  reasoningCache: "reasoningCache", // cached reasoning chains
  modelWeights: "modelWeights",     // federated learning weights
} as const;

let dbInstance: IDBDatabase | null = null;

/** Open (or create) the Brain's IndexedDB database. */
export function openBrainDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { dbInstance = req.result; resolve(dbInstance); };
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.preferences)) {
        db.createObjectStore(STORES.preferences, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORES.interactions)) {
        const s = db.createObjectStore(STORES.interactions, { keyPath: "id", autoIncrement: true });
        s.createIndex("timestamp", "timestamp");
        s.createIndex("category", "category");
      }
      if (!db.objectStoreNames.contains(STORES.feedback)) {
        const s = db.createObjectStore(STORES.feedback, { keyPath: "id", autoIncrement: true });
        s.createIndex("interactionId", "interactionId");
        s.createIndex("rating", "rating");
      }
      if (!db.objectStoreNames.contains(STORES.knowledge)) {
        const s = db.createObjectStore(STORES.knowledge, { keyPath: "key" });
        s.createIndex("category", "category");
      }
      if (!db.objectStoreNames.contains(STORES.patterns)) {
        db.createObjectStore(STORES.patterns, { keyPath: "patternId" });
      }
      if (!db.objectStoreNames.contains(STORES.interestGraph)) {
        const s = db.createObjectStore(STORES.interestGraph, { keyPath: "topic" });
        s.createIndex("weight", "weight");
      }
      if (!db.objectStoreNames.contains(STORES.reasoningCache)) {
        db.createObjectStore(STORES.reasoningCache, { keyPath: "queryHash" });
      }
      if (!db.objectStoreNames.contains(STORES.modelWeights)) {
        db.createObjectStore(STORES.modelWeights, { keyPath: "layer" });
      }
    };
  });
}

// ── Preferences ──────────────────────────────────────────────────

export async function savePreference(key: string, value: unknown): Promise<void> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.preferences, "readwrite");
    tx.objectStore(STORES.preferences).put({ key, value, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPreference<T>(key: string): Promise<T | null> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.preferences, "readonly");
    const req = tx.objectStore(STORES.preferences).get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPreferences(): Promise<Record<string, unknown>> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.preferences, "readonly");
    const req = tx.objectStore(STORES.preferences).getAll();
    req.onsuccess = () => {
      const result: Record<string, unknown> = {};
      for (const item of req.result) result[item.key] = item.value;
      resolve(result);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Interaction History ──────────────────────────────────────────

export interface BrainInteraction {
  id?: number;
  query: string;
  response: string;
  provider: string;
  category: string;
  country: string;
  city?: string;
  language: string;
  latencyMs: number;
  confidence: number;
  timestamp: number;
  feedback?: "positive" | "negative" | null;
}

export async function logInteraction(interaction: Omit<BrainInteraction, "id">): Promise<number> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.interactions, "readwrite");
    const req = tx.objectStore(STORES.interactions).add(interaction);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getRecentInteractions(limit = 50): Promise<BrainInteraction[]> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.interactions, "readonly");
    const req = tx.objectStore(STORES.interactions).getAll();
    req.onsuccess = () => {
      const all = req.result as BrainInteraction[];
      resolve(all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit));
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Feedback ─────────────────────────────────────────────────────

export async function saveFeedback(interactionId: number, rating: "positive" | "negative", comment?: string): Promise<void> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.feedback, STORES.interactions], "readwrite");
    tx.objectStore(STORES.feedback).add({ interactionId, rating, comment, timestamp: Date.now() });
    tx.objectStore(STORES.interactions).openCursor(interactionId).onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) { const val = cursor.value; val.feedback = rating; cursor.update(val); }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFeedbackStats(): Promise<{ positive: number; negative: number; total: number; satisfactionRate: number }> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.feedback, "readonly");
    const req = tx.objectStore(STORES.feedback).getAll();
    req.onsuccess = () => {
      const all = req.result as Array<{ rating: string }>;
      const positive = all.filter(f => f.rating === "positive").length;
      const negative = all.filter(f => f.rating === "negative").length;
      const total = all.length;
      resolve({ positive, negative, total, satisfactionRate: total > 0 ? positive / total : 0 });
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Knowledge Graph Cache ────────────────────────────────────────

export interface KnowledgeEntry {
  key: string;
  category: "visa" | "news" | "events" | "government" | "travel" | "weather" | "payment" | "transport" | "cultural";
  data: unknown;
  source: "ai" | "web-search" | "knowledge-graph" | "user";
  confidence: number;
  createdAt: number;
  expiresAt: number;
}

export async function cacheKnowledge(entry: Omit<KnowledgeEntry, "createdAt">): Promise<void> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.knowledge, "readwrite");
    tx.objectStore(STORES.knowledge).put({ ...entry, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedKnowledge(key: string): Promise<KnowledgeEntry | null> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.knowledge, "readonly");
    const req = tx.objectStore(STORES.knowledge).get(key);
    req.onsuccess = () => {
      const result = req.result as KnowledgeEntry | undefined;
      if (!result) return resolve(null);
      if (result.expiresAt < Date.now()) return resolve(null); // expired
      resolve(result);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getKnowledgeByCategory(category: string): Promise<KnowledgeEntry[]> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.knowledge, "readonly");
    const idx = tx.objectStore(STORES.knowledge).index("category");
    const req = idx.getAll(category);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ── Interest Graph ───────────────────────────────────────────────

export interface InterestNode {
  topic: string;
  weight: number;     // 0-100, higher = more interested
  category: string;
  lastInteracted: number;
  interactionCount: number;
}

export async function updateInterest(topic: string, category: string, weightDelta: number = 1): Promise<void> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.interestGraph, "readwrite");
    const store = tx.objectStore(STORES.interestGraph);
    const getReq = store.get(topic);
    getReq.onsuccess = () => {
      const existing = getReq.result as InterestNode | undefined;
      const node: InterestNode = existing
        ? { ...existing, weight: Math.min(100, existing.weight + weightDelta), lastInteracted: Date.now(), interactionCount: existing.interactionCount + 1 }
        : { topic, weight: Math.min(100, weightDelta), category, lastInteracted: Date.now(), interactionCount: 1 };
      store.put(node);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTopInterests(limit = 10): Promise<InterestNode[]> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.interestGraph, "readonly");
    const req = tx.objectStore(STORES.interestGraph).getAll();
    req.onsuccess = () => {
      const all = req.result as InterestNode[];
      resolve(all.sort((a, b) => b.weight - a.weight).slice(0, limit));
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Reasoning Cache ──────────────────────────────────────────────

export interface ReasoningChain {
  queryHash: string;
  query: string;
  steps: Array<{ step: number; action: string; result: string; provider: string; latencyMs: number }>;
  finalAnswer: string;
  createdAt: number;
}

export async function cacheReasoning(chain: Omit<ReasoningChain, "createdAt">): Promise<void> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.reasoningCache, "readwrite");
    tx.objectStore(STORES.reasoningCache).put({ ...chain, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedReasoning(queryHash: string): Promise<ReasoningChain | null> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.reasoningCache, "readonly");
    const req = tx.objectStore(STORES.reasoningCache).get(queryHash);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// ── Model Weights (Federated Learning) ───────────────────────────

export interface ModelWeight {
  layer: string;
  weights: number[];
  version: number;
  updatedAt: number;
}

export async function saveModelWeights(layer: string, weights: number[]): Promise<void> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.modelWeights, "readwrite");
    const store = tx.objectStore(STORES.modelWeights);
    const getReq = store.get(layer);
    getReq.onsuccess = () => {
      const existing = getReq.result as ModelWeight | undefined;
      const version = existing ? existing.version + 1 : 1;
      store.put({ layer, weights, version, updatedAt: Date.now() });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getModelWeights(layer: string): Promise<ModelWeight | null> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.modelWeights, "readonly");
    const req = tx.objectStore(STORES.modelWeights).get(layer);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllModelWeights(): Promise<ModelWeight[]> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.modelWeights, "readonly");
    const req = tx.objectStore(STORES.modelWeights).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ── Pattern Detection ────────────────────────────────────────────

export interface BehavioralPattern {
  patternId: string;
  type: "time" | "location" | "content" | "social" | "payment";
  pattern: string;
  frequency: number;
  confidence: number;
  lastSeen: number;
}

export async function recordPattern(pattern: Omit<BehavioralPattern, "lastSeen">): Promise<void> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.patterns, "readwrite");
    const store = tx.objectStore(STORES.patterns);
    const getReq = store.get(pattern.patternId);
    getReq.onsuccess = () => {
      const existing = getReq.result as BehavioralPattern | undefined;
      if (existing) {
        store.put({ ...existing, frequency: existing.frequency + 1, confidence: Math.min(1, existing.confidence + 0.05), lastSeen: Date.now() });
      } else {
        store.put({ ...pattern, frequency: 1, confidence: 0.1, lastSeen: Date.now() });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPatterns(): Promise<BehavioralPattern[]> {
  const db = await openBrainDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.patterns, "readonly");
    const req = tx.objectStore(STORES.patterns).getAll();
    req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.confidence - a.confidence));
    req.onerror = () => reject(req.error);
  });
}

// ── Brain State Summary ──────────────────────────────────────────

export async function getBrainState(): Promise<{
  interactionsCount: number;
  feedbackRate: number;
  satisfactionRate: number;
  knowledgeEntries: number;
  interestsCount: number;
  patternsCount: number;
  modelWeightLayers: number;
}> {
  const db = await openBrainDB();
  const feedback = await getFeedbackStats();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.interactions, STORES.knowledge, STORES.interestGraph, STORES.patterns, STORES.modelWeights], "readonly");
    let interactions = 0, knowledge = 0, interests = 0, patterns = 0, weights = 0;
    const check = () => {
      if (interactions >= 0 && knowledge >= 0 && interests >= 0 && patterns >= 0 && weights >= 0) {
        resolve({
          interactionsCount: interactions,
          feedbackRate: feedback.total / Math.max(1, interactions),
          satisfactionRate: feedback.satisfactionRate,
          knowledgeEntries: knowledge,
          interestsCount: interests,
          patternsCount: patterns,
          modelWeightLayers: weights,
        });
      }
    };
    tx.objectStore(STORES.interactions).count().onsuccess = (e) => { interactions = (e.target as IDBRequest).result; check(); };
    tx.objectStore(STORES.knowledge).count().onsuccess = (e) => { knowledge = (e.target as IDBRequest).result; check(); };
    tx.objectStore(STORES.interestGraph).count().onsuccess = (e) => { interests = (e.target as IDBRequest).result; check(); };
    tx.objectStore(STORES.patterns).count().onsuccess = (e) => { patterns = (e.target as IDBRequest).result; check(); };
    tx.objectStore(STORES.modelWeights).count().onsuccess = (e) => { weights = (e.target as IDBRequest).result; check(); };
  });
}
