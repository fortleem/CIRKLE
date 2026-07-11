/**
 * Cirkle Brain AI — Personal Memory Brain (PMB)
 *
 * The permanent cognitive memory of Cirkle Brain AI.
 *
 * Architecture Principle:
 * - GCIE (Geo-Context Intelligence Engine) understands the WORLD
 * - PMB (Personal Memory Brain) understands the USER
 * - PMB never stores global geographic knowledge
 * - PMB stores only user-specific relationships with places
 * - When location context is needed, PMB requests from GCIE
 *
 * PMB owns:
 * - Identity, Relationships, Preferences, Routines, Goals, Projects
 * - Conversations, Shopping, Entertainment, Travel, Location Relationships
 * - Learning, Wellness
 *
 * PMB does NOT own:
 * - Maps, Places, Events, Traffic, Navigation, Weather, Nearby search
 *
 * Privacy: End-to-end encrypted, user-controlled, permission-based,
 * explainable, auditable, GDPR/CCPA compliant.
 */

// ── Memory Types (13 categories) ─────────────────────────────────────────
export type MemoryCategory =
  | "identity"        // name, language, timezone, currency, communication style
  | "relationship"    // family, friends, colleagues, pets, birthdays
  | "preference"      // restaurants, cuisine, coffee, brands, music, movies
  | "routine"         // wake-up, sleep, work hours, gym, shopping schedule
  | "goal"            // fitness, business, learning, career, travel, financial
  | "project"         // current/past projects, tasks, deadlines, ideas
  | "conversation"    // previous conversations, open questions, follow-ups
  | "shopping"        // wish lists, purchased items, stores, budget, subscriptions
  | "entertainment"   // movies, genres, games, books, sports teams, podcasts
  | "travel"          // visited countries, destinations, seat/hotel preferences
  | "location_relationship" // favorite café, preferred mall, usual grocery (links to GCIE IDs)
  | "learning"        // courses, skills, certificates, learning speed
  | "wellness";       // exercise, water, nutrition, sleep, mindfulness (opt-in only)

export const ALL_CATEGORIES: MemoryCategory[] = [
  "identity", "relationship", "preference", "routine", "goal", "project",
  "conversation", "shopping", "entertainment", "travel", "location_relationship",
  "learning", "wellness",
];

// ── Memory Lifecycle ─────────────────────────────────────────────────────
export type MemoryLifecycle =
  | "candidate"        // AI detected something, not yet confirmed
  | "suggested"        // AI suggests to user for confirmation
  | "user_confirmed"   // User confirmed this memory
  | "active"           // Actively used in personalization
  | "frequently_used"  // High access frequency — core memory
  | "archived"         // User archived (still retrievable)
  | "expired"          // Past expiration date
  | "deleted";         // Soft-deleted (within retention window)

// ── Privacy Levels ───────────────────────────────────────────────────────
export type PrivacyLevel = "public" | "personal" | "sensitive" | "encrypted";

// ── Memory Object ────────────────────────────────────────────────────────
export interface MemoryObject {
  uuid: string;
  userUuid: string;
  type: MemoryCategory;
  subcategory?: string;
  title: string;
  summary: string;
  content: string;              // detailed content
  importanceScore: number;      // 0-100
  confidenceScore: number;      // 0-1 (how sure the AI is)
  source: "user_explicit" | "ai_inferred" | "behavioral" | "conversation" | "imported";
  sourceTimestamp: string;
  createdTime: string;
  updatedTime: string;
  lastAccessed: string;
  accessFrequency: number;
  lifecycle: MemoryLifecycle;
  privacyLevel: PrivacyLevel;
  expirationPolicy?: "never" | "30d" | "90d" | "1y" | "custom";
  expirationDate?: string;
  tags: string[];
  relatedMemories: string[];     // UUIDs of related memories
  gcieReferenceIds?: string[];   // Links to GCIE place IDs (for location_relationship only)
  versionHistory: { version: number; timestamp: string; change: string }[];
  userConfirmationStatus: "pending" | "confirmed" | "rejected" | "ignored";
}

// ── Memory Intelligence Layer ────────────────────────────────────────────
export interface MemoryQuery {
  userUuid: string;
  intent: string;               // what the user is asking about
  category?: MemoryCategory;
  limit?: number;
  minImportance?: number;
  includeArchived?: boolean;
}

export interface MemorySearchResult {
  memory: MemoryObject;
  relevanceScore: number;       // 0-1 how relevant to the query
  reasons: string[];            // explainability
}

// ── Personal Knowledge Graph ─────────────────────────────────────────────
export interface GraphNode {
  id: string;
  type: "person" | "project" | "goal" | "place" | "organization" | "preference"
    | "task" | "event" | "document" | "conversation" | "skill" | "purchase"
    | "relationship" | "routine" | "memory";
  label: string;
  memoryIds: string[];          // which memories reference this node
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: "favorite" | "frequent" | "related" | "part_of" | "owns" | "knows"
    | "prefers" | "visits" | "works_on" | "goal_of" | "connects_to";
  weight: number;               // 0-1 strength of relationship
  memoryIds: string[];
}

// ── Personal Memory Brain Engine ─────────────────────────────────────────
export class PersonalMemoryBrain {
  private memories: Map<string, MemoryObject> = new Map();
  private userMemories: Map<string, Set<string>> = new Map(); // userUuid → memory UUIDs
  private graphNodes: Map<string, GraphNode> = new Map();
  private graphEdges: GraphEdge[] = [];
  private memoryPaused: Map<string, boolean> = new Map();
  private auditLog: { userUuid: string; action: string; memoryUuid?: string; timestamp: string; details?: string }[] = [];

  // ── Store a memory ────────────────────────────────────────────────────
  store(memory: Omit<MemoryObject, "uuid" | "createdTime" | "updatedTime" | "lastAccessed" | "accessFrequency" | "versionHistory" | "userConfirmationStatus">): MemoryObject {
    const uuid = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const fullMemory: MemoryObject = {
      ...memory,
      uuid,
      createdTime: now,
      updatedTime: now,
      lastAccessed: now,
      accessFrequency: 0,
      versionHistory: [{ version: 1, timestamp: now, change: "Created" }],
      userConfirmationStatus: memory.source === "user_explicit" ? "confirmed" : "pending",
    };

    this.memories.set(uuid, fullMemory);
    if (!this.userMemories.has(fullMemory.userUuid)) {
      this.userMemories.set(fullMemory.userUuid, new Set());
    }
    this.userMemories.get(fullMemory.userUuid)!.add(uuid);

    // Add to knowledge graph
    this.addToGraph(fullMemory);

    // Audit log
    this.auditLog.push({ userUuid: fullMemory.userUuid, action: "store", memoryUuid: uuid, timestamp: now });

    return fullMemory;
  }

  // ── Retrieve memories ─────────────────────────────────────────────────
  retrieve(query: MemoryQuery): MemorySearchResult[] {
    const userMemoryIds = this.userMemories.get(query.userUuid);
    if (!userMemoryIds) return [];

    const candidates: MemorySearchResult[] = [];
    const intentLower = query.intent.toLowerCase();
    const minImportance = query.minImportance ?? 0;

    for (const memId of userMemoryIds) {
      const mem = this.memories.get(memId);
      if (!mem) continue;
      if (mem.lifecycle === "deleted" || mem.lifecycle === "expired") continue;
      if (!query.includeArchived && mem.lifecycle === "archived") continue;
      if (query.category && mem.type !== query.category) continue;
      if (mem.importanceScore < minImportance) continue;

      // Semantic relevance scoring (simplified — production would use embeddings)
      let relevance = 0;
      const reasons: string[] = [];

      // Title match
      if (mem.title.toLowerCase().includes(intentLower)) {
        relevance += 0.4;
        reasons.push("title matches your query");
      }
      // Summary match
      if (mem.summary.toLowerCase().includes(intentLower)) {
        relevance += 0.3;
        reasons.push("summary is relevant");
      }
      // Content match
      if (mem.content.toLowerCase().includes(intentLower)) {
        relevance += 0.2;
        reasons.push("content contains relevant information");
      }
      // Tag match
      if (mem.tags.some(t => intentLower.includes(t.toLowerCase()) || t.toLowerCase().includes(intentLower))) {
        relevance += 0.2;
        reasons.push("tagged with relevant keyword");
      }
      // Category match
      if (query.category && mem.type === query.category) {
        relevance += 0.15;
        reasons.push(`in your ${mem.type} memory`);
      }
      // Importance boost
      relevance += (mem.importanceScore / 100) * 0.15;
      if (mem.importanceScore >= 80) reasons.push("high importance");

      // Recency boost
      const daysSinceAccess = (Date.now() - new Date(mem.lastAccessed).getTime()) / 86400000;
      if (daysSinceAccess < 7) {
        relevance += 0.1;
        reasons.push("recently accessed");
      }

      // Confidence boost
      relevance += mem.confidenceScore * 0.1;

      // Only include if some relevance
      if (relevance > 0.05 || query.category === mem.type) {
        candidates.push({ memory: mem, relevanceScore: Math.min(relevance, 1), reasons });
      }
    }

    // Sort by relevance, apply limit
    const sorted = candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const limit = query.limit ?? 10;
    const results = sorted.slice(0, limit);

    // Update access frequency + last accessed
    for (const result of results) {
      const mem = this.memories.get(result.memory.uuid);
      if (mem) {
        mem.accessFrequency++;
        mem.lastAccessed = new Date().toISOString();
        if (mem.accessFrequency > 10 && mem.lifecycle === "active") {
          mem.lifecycle = "frequently_used";
        }
      }
    }

    return results;
  }

  // ── Search memories semantically ──────────────────────────────────────
  search(userUuid: string, query: string, limit: number = 20): MemorySearchResult[] {
    return this.retrieve({ userUuid, intent: query, limit, includeArchived: true });
  }

  // ── Update a memory ───────────────────────────────────────────────────
  update(uuid: string, updates: Partial<MemoryObject>, userUuid: string): MemoryObject | null {
    const mem = this.memories.get(uuid);
    if (!mem || mem.userUuid !== userUuid) return null;

    const oldVersion = mem.versionHistory.length;
    const updated = {
      ...mem,
      ...updates,
      updatedTime: new Date().toISOString(),
      versionHistory: [...mem.versionHistory, { version: oldVersion + 1, timestamp: new Date().toISOString(), change: JSON.stringify(updates).slice(0, 200) }],
    };
    this.memories.set(uuid, updated);
    this.auditLog.push({ userUuid, action: "update", memoryUuid: uuid, timestamp: new Date().toISOString() });
    return updated;
  }

  // ── Delete a memory (soft delete) ─────────────────────────────────────
  delete(uuid: string, userUuid: string): boolean {
    const mem = this.memories.get(uuid);
    if (!mem || mem.userUuid !== userUuid) return false;
    mem.lifecycle = "deleted";
    mem.updatedTime = new Date().toISOString();
    this.auditLog.push({ userUuid, action: "delete", memoryUuid: uuid, timestamp: new Date().toISOString() });
    return true;
  }

  // ── Restore a deleted memory ──────────────────────────────────────────
  restore(uuid: string, userUuid: string): boolean {
    const mem = this.memories.get(uuid);
    if (!mem || mem.userUuid !== userUuid || mem.lifecycle !== "deleted") return false;
    mem.lifecycle = "active";
    mem.updatedTime = new Date().toISOString();
    this.auditLog.push({ userUuid, action: "restore", memoryUuid: uuid, timestamp: new Date().toISOString() });
    return true;
  }

  // ── Archive a memory ──────────────────────────────────────────────────
  archive(uuid: string, userUuid: string): boolean {
    const mem = this.memories.get(uuid);
    if (!mem || mem.userUuid !== userUuid) return false;
    mem.lifecycle = "archived";
    this.auditLog.push({ userUuid, action: "archive", memoryUuid: uuid, timestamp: new Date().toISOString() });
    return true;
  }

  // ── Confirm a candidate/suggested memory ──────────────────────────────
  confirm(uuid: string, userUuid: string): boolean {
    const mem = this.memories.get(uuid);
    if (!mem || mem.userUuid !== userUuid) return false;
    mem.lifecycle = "user_confirmed";
    mem.userConfirmationStatus = "confirmed";
    mem.confidenceScore = 1.0; // user confirmed = 100% confidence
    mem.updatedTime = new Date().toISOString();
    this.auditLog.push({ userUuid, action: "confirm", memoryUuid: uuid, timestamp: new Date().toISOString() });
    return true;
  }

  // ── Get all memories for a user ───────────────────────────────────────
  getAll(userUuid: string, category?: MemoryCategory): MemoryObject[] {
    const ids = this.userMemories.get(userUuid);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.memories.get(id))
      .filter((m): m is MemoryObject => !!m && m.lifecycle !== "deleted")
      .filter(m => !category || m.type === category)
      .sort((a, b) => b.importanceScore - a.importanceScore);
  }

  // ── Get memory statistics ─────────────────────────────────────────────
  getStats(userUuid: string) {
    const ids = this.userMemories.get(userUuid);
    if (!ids) return { total: 0, byCategory: {}, byLifecycle: {}, byPrivacy: {} };
    const mems = Array.from(ids).map(id => this.memories.get(id)).filter((m): m is MemoryObject => !!m && m.lifecycle !== "deleted");
    const byCategory: Record<string, number> = {};
    const byLifecycle: Record<string, number> = {};
    const byPrivacy: Record<string, number> = {};
    for (const m of mems) {
      byCategory[m.type] = (byCategory[m.type] || 0) + 1;
      byLifecycle[m.lifecycle] = (byLifecycle[m.lifecycle] || 0) + 1;
      byPrivacy[m.privacyLevel] = (byPrivacy[m.privacyLevel] || 0) + 1;
    }
    return { total: mems.length, byCategory, byLifecycle, byPrivacy };
  }

  // ── Pause/resume memory collection ────────────────────────────────────
  pauseCollection(userUuid: string) { this.memoryPaused.set(userUuid, true); }
  resumeCollection(userUuid: string) { this.memoryPaused.set(userUuid, false); }
  isPaused(userUuid: string): boolean { return this.memoryPaused.get(userUuid) || false; }

  // ── Export all memories (GDPR portability) ────────────────────────────
  exportAll(userUuid: string): MemoryObject[] {
    return this.getAll(userUuid, undefined);
  }

  // ── Delete all memories (GDPR right to erasure) ───────────────────────
  deleteAll(userUuid: string): number {
    const ids = this.userMemories.get(userUuid);
    if (!ids) return 0;
    let count = 0;
    for (const id of ids) {
      const mem = this.memories.get(id);
      if (mem) { mem.lifecycle = "deleted"; count++; }
    }
    this.auditLog.push({ userUuid, action: "delete_all", timestamp: new Date().toISOString(), details: `${count} memories deleted` });
    return count;
  }

  // ── Get audit log ─────────────────────────────────────────────────────
  getAuditLog(userUuid: string, limit: number = 50) {
    return this.auditLog.filter(l => l.userUuid === userUuid).slice(-limit);
  }

  // ── Importance scoring ────────────────────────────────────────────────
  calculateImportance(mem: Partial<MemoryObject>): number {
    let score = 50; // base
    if (mem.source === "user_explicit") score += 30; // user said it directly
    if (mem.userConfirmationStatus === "confirmed") score += 20;
    if (mem.accessFrequency && mem.accessFrequency > 5) score += 10;
    if (mem.privacyLevel === "sensitive" || mem.privacyLevel === "encrypted") score += 5;
    return Math.min(score, 100);
  }

  // ── Get personalization context for AI prompts ────────────────────────
  getPersonalizationContext(userUuid: string): string {
    const all = this.getAll(userUuid);
    if (all.length === 0) return "";

    const parts: string[] = [];
    const identity = all.filter(m => m.type === "identity");
    const preferences = all.filter(m => m.type === "preference");
    const routines = all.filter(m => m.type === "routine");
    const goals = all.filter(m => m.type === "goal");
    const relationships = all.filter(m => m.type === "relationship");

    if (identity.length > 0) {
      parts.push(`User identity: ${identity.map(m => m.summary).join("; ")}`);
    }
    if (preferences.length > 0) {
      parts.push(`Preferences: ${preferences.slice(0, 10).map(m => m.summary).join("; ")}`);
    }
    if (routines.length > 0) {
      parts.push(`Routines: ${routines.slice(0, 5).map(m => m.summary).join("; ")}`);
    }
    if (goals.length > 0) {
      parts.push(`Goals: ${goals.slice(0, 5).map(m => m.summary).join("; ")}`);
    }
    if (relationships.length > 0) {
      parts.push(`Important people: ${relationships.slice(0, 5).map(m => m.summary).join("; ")}`);
    }

    return parts.join(". ");
  }

  // ── Knowledge Graph operations ────────────────────────────────────────
  private addToGraph(mem: MemoryObject) {
    const nodeId = `node-${mem.type}-${mem.uuid.slice(-6)}`;
    const node: GraphNode = {
      id: nodeId,
      type: mem.type as any,
      label: mem.title,
      memoryIds: [mem.uuid],
      metadata: { category: mem.type, importance: mem.importanceScore },
    };
    this.graphNodes.set(nodeId, node);

    // Link to related memories
    for (const relatedId of mem.relatedMemories) {
      const relatedMem = this.memories.get(relatedId);
      if (relatedMem) {
        this.graphEdges.push({
          from: nodeId,
          to: `node-${relatedMem.type}-${relatedMem.uuid.slice(-6)}`,
          type: "related",
          weight: 0.5,
          memoryIds: [mem.uuid, relatedId],
        });
      }
    }

    // Link GCIE references
    if (mem.gcieReferenceIds) {
      for (const gcieId of mem.gcieReferenceIds) {
        this.graphEdges.push({
          from: nodeId,
          to: `gcie-${gcieId}`,
          type: "visits",
          weight: 0.8,
          memoryIds: [mem.uuid],
        });
      }
    }
  }

  getGraph(userUuid: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const userMemoryIds = this.userMemories.get(userUuid) || new Set();
    const userNodes = Array.from(this.graphNodes.values()).filter(n =>
      n.memoryIds.some(id => userMemoryIds.has(id))
    );
    const userNodeIds = new Set(userNodes.map(n => n.id));
    const userEdges = this.graphEdges.filter(e =>
      userNodeIds.has(e.from) || userNodeIds.has(e.to)
    );
    return { nodes: userNodes, edges: userEdges };
  }
}

// ── Global PMB Instance ───────────────────────────────────────────────────
export const globalPMB = new PersonalMemoryBrain();
