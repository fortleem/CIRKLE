/**
 * CIRKLE Brain AI — Context Manager
 * ============================================================================
 *
 * Phase 4.5 — Shared Cognitive Foundation
 *
 * The Context Manager is the **owner of the Shared Context lifecycle**. It is
 * the ONLY component permitted to create, version, freeze, or serialize a
 * Shared Context Object.
 *
 * What the Context Manager IS:
 *   - The lifecycle owner for the Shared Context Object.
 *   - An ownership enforcer (only the declared owner may enrich a section).
 *   - An immutability guarantor (every enrich returns a new versioned snapshot).
 *   - A provenance recorder (every mutation is audited).
 *   - A correlation-id generator (for distributed tracing + replay).
 *
 * What the Context Manager is NOT:
 *   - It is NOT intelligent. It never reasons.
 *   - It never stores long-term memory (contexts are request-scoped).
 *   - It never makes recommendations.
 *   - It never performs orchestration.
 *   - It never calls AI providers.
 *
 * Constitutional alignment:
 *   - Ch.2 §2.6 Single Ownership → the manager owns ONLY context lifecycle.
 *   - Ch.4 §4.6 Shared Context Model → every phase enriches its own section.
 *   - Ch.4 §4.8 Communication → context is passed forward, never mutated
 *     in place; interactions are observable via provenance.
 *
 * Lifecycle APIs (Part 1 spec):
 *   create · read · enrich · validate · freeze · clone ·
 *   serialize · deserialize · trace · debug
 *
 * Immutability model:
 *   `enrich()` and `freeze()` return NEW SharedContext objects. The input
 *   context is never mutated. This makes contexts safe to share across
 *   phases and enables replay for diagnostics.
 * ============================================================================
 */

import {
  type SharedContext,
  type ContextSectionKey,
  type ContextSectionOwner,
  type ContextValidationResult,
  type ProvenanceEntry,
  type RequestContext,
  type SessionContext,
  type CorrelationIds,
  SECTION_OWNERSHIP,
  SHARED_CONTEXT_SCHEMA_VERSION,
  validateContext,
} from "./shared-context";

// ── Helpers ──────────────────────────────────────────────────────────────

/** Generate a request-scoped id (compact, sortable, collision-resistant). */
function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}${rand}`;
}

/** Deep-clone a value using structuredClone when available, else JSON. */
function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      /* fall through to JSON */
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Compute an overall context confidence from populated section confidences. */
function deriveConfidence(ctx: SharedContext): number {
  const confidences: number[] = [];
  if (ctx.reasoning?.confidence !== undefined) confidences.push(ctx.reasoning.confidence);
  if (ctx.validation?.validationConfidence !== undefined) confidences.push(ctx.validation.validationConfidence);
  if (ctx.recommendation?.rankedCandidates?.length) {
    const top = ctx.recommendation.rankedCandidates[0];
    if (typeof top.confidence === "number") confidences.push(top.confidence);
  }
  if (confidences.length === 0) return 0.5;
  return confidences.reduce((a, b) => a + b, 0) / confidences.length;
}

// ── Context Manager ──────────────────────────────────────────────────────

export class ContextManager {
  /**
   * Create a new Shared Context for a cognitive request.
   *
   * This is the ONLY entry point for starting a context lifecycle. The
   * manager generates a fresh requestId and records the first provenance
   * entry ("create").
   */
  create(params: {
    request: string;
    language?: string;
    surface?: string;
    featureTag?: string;
    correlationId?: string;
    sessionId?: string;
    parentRequestId?: string;
    session?: Partial<SessionContext>;
  }): SharedContext {
    const now = new Date().toISOString();
    const requestId = generateId("req");
    const language = params.language || "en";
    const normalized = params.request.trim().toLowerCase();

    const correlation: CorrelationIds = {
      requestId,
      correlationId: params.correlationId,
      sessionId: params.sessionId,
      parentRequestId: params.parentRequestId,
    };

    const requestSection: RequestContext = {
      originalRequest: params.request,
      normalizedRequest: normalized,
      language,
      receivedAt: now,
      surface: params.surface,
      featureTag: params.featureTag,
    };

    const sessionSection: SessionContext | undefined = params.session
      ? { sessionId: params.session.sessionId || params.sessionId || requestId, ...params.session }
      : params.sessionId
        ? { sessionId: params.sessionId }
        : undefined;

    const provenance: ProvenanceEntry[] = [
      {
        source: "system",
        timestamp: now,
        version: 1,
        operation: "create",
        reason: `Request received via ${params.surface || "unknown"} surface`,
      },
    ];

    return {
      metadata: {
        schemaVersion: SHARED_CONTEXT_SCHEMA_VERSION,
        version: 1,
        correlation,
        provenance,
        confidence: 0.5,
        createdAt: now,
        updatedAt: now,
        frozen: false,
      },
      request: requestSection,
      ...(sessionSection ? { session: sessionSection } : {}),
    };
  }

  /**
   * Read a section (or the whole context) as a deep-read-only snapshot.
   * Callers MUST NOT mutate the returned object.
   */
  read<T extends ContextSectionKey>(ctx: SharedContext, section?: T): unknown {
    if (section) {
      return deepClone(ctx[section]);
    }
    return deepClone(ctx);
  }

  /**
   * Enrich a section. ONLY the declared constitutional owner may enrich its
   * section. This is the ownership-enforcement gate (Ch.2 §2.6).
   *
   * The enrichment is a MERGE for object sections (shallow merge by default;
   * callers may pass `mode: "replace"` to replace the whole section).
   *
   * Returns a NEW versioned SharedContext. The input is never mutated.
   *
   * @throws if `claimedOwner` does not match `SECTION_OWNERSHIP[section]`.
   * @throws if the context is frozen.
   */
  enrich<K extends ContextSectionKey>(
    ctx: SharedContext,
    section: K,
    contribution: NonNullable<SharedContext[K]>,
    claimedOwner: ContextSectionOwner,
    opts?: { mode?: "merge" | "replace"; reason?: string },
  ): SharedContext {
    if (ctx.metadata.frozen) {
      throw new Error(`[ContextManager] Cannot enrich frozen context ${ctx.metadata.correlation.requestId}`);
    }

    const expectedOwner = SECTION_OWNERSHIP[section];
    if (expectedOwner !== claimedOwner) {
      throw new Error(
        `[ContextManager] Ownership violation: section "${section}" is owned by "${expectedOwner}", but "${claimedOwner}" attempted to enrich it.`,
      );
    }

    const now = new Date().toISOString();
    const mode = opts?.mode ?? "merge";
    const current = ctx[section];
    const merged =
      mode === "replace" || current === undefined
        ? deepClone(contribution)
        : ({ ...deepClone(current), ...deepClone(contribution) } as NonNullable<SharedContext[K]>);

    const next: SharedContext = {
      ...deepClone(ctx),
      [section]: merged,
      metadata: {
        ...deepClone(ctx.metadata),
        version: ctx.metadata.version + 1,
        updatedAt: now,
        provenance: [
          ...ctx.metadata.provenance,
          {
            source: claimedOwner,
            timestamp: now,
            version: ctx.metadata.version + 1,
            operation: "enrich",
            reason: opts?.reason || `Enriched section "${section}"`,
          },
        ],
      },
    };
    next.metadata.confidence = deriveConfidence(next);
    return next;
  }

  /**
   * Validate a context structurally. Does NOT reason about content.
   * Returns a result with errors/warnings; does not throw.
   */
  validate(ctx: SharedContext): ContextValidationResult {
    return validateContext(ctx);
  }

  /**
   * Freeze a context — terminal read-only state. Returns a NEW frozen copy.
   * A frozen context can never be enriched again (enrich throws).
   */
  freeze(ctx: SharedContext): SharedContext {
    if (ctx.metadata.frozen) return ctx;
    const now = new Date().toISOString();
    const frozen: SharedContext = {
      ...deepClone(ctx),
      metadata: {
        ...deepClone(ctx.metadata),
        version: ctx.metadata.version + 1,
        updatedAt: now,
        frozen: true,
        provenance: [
          ...ctx.metadata.provenance,
          {
            source: "system",
            timestamp: now,
            version: ctx.metadata.version + 1,
            operation: "freeze",
            reason: "Context frozen (terminal state)",
          },
        ],
      },
    };
    return frozen;
  }

  /**
   * Clone a context (deep). Useful for branching a request into parallel
   * sub-pipelines (future distributed execution).
   */
  clone(ctx: SharedContext): SharedContext {
    return deepClone(ctx);
  }

  /**
   * Serialize a context to a portable string (JSON). Includes the full
   * provenance trail so the context can be replayed.
   */
  serialize(ctx: SharedContext): string {
    return JSON.stringify(ctx);
  }

  /**
   * Deserialize a context from a string. Validates schema compatibility.
   * @throws if the schema version is incompatible.
   */
  deserialize(str: string): SharedContext {
    const parsed = JSON.parse(str) as SharedContext;
    if (!parsed.metadata) {
      throw new Error("[ContextManager] Deserialized payload missing metadata");
    }
    if (parsed.metadata.schemaVersion > SHARED_CONTEXT_SCHEMA_VERSION) {
      throw new Error(
        `[ContextManager] Schema version ${parsed.metadata.schemaVersion} is newer than supported ${SHARED_CONTEXT_SCHEMA_VERSION}`,
      );
    }
    return parsed;
  }

  /**
   * Produce a trace of the context — the ordered list of provenance entries.
   * This is the "what happened to this context" audit view.
   */
  trace(ctx: SharedContext): {
    requestId: string;
    versions: number;
    frozen: boolean;
    trail: ProvenanceEntry[];
  } {
    return {
      requestId: ctx.metadata.correlation.requestId,
      versions: ctx.metadata.version,
      frozen: ctx.metadata.frozen,
      trail: ctx.metadata.provenance.map((p) => ({ ...p })),
    };
  }

  /**
   * Produce a debug view — a compact summary suitable for logging/dashboards.
   */
  debug(ctx: SharedContext): {
    requestId: string;
    version: number;
    confidence: number;
    sections: string[];
    provenanceCount: number;
    frozen: boolean;
    createdAt: string;
    updatedAt: string;
  } {
    const sections: string[] = [];
    if (ctx.session) sections.push("session");
    if (ctx.geographic) sections.push("geographic");
    if (ctx.user) sections.push("user");
    if (ctx.reasoning) sections.push("reasoning");
    if (ctx.validation) sections.push("validation");
    if (ctx.recommendation) sections.push("recommendation");
    if (ctx.platform) sections.push("platform");
    if (ctx.execution) sections.push("execution");
    if (ctx.learning) sections.push("learning");
    if (ctx.extensions && Object.keys(ctx.extensions).length) sections.push("extensions");
    return {
      requestId: ctx.metadata.correlation.requestId,
      version: ctx.metadata.version,
      confidence: ctx.metadata.confidence,
      sections,
      provenanceCount: ctx.metadata.provenance.length,
      frozen: ctx.metadata.frozen,
      createdAt: ctx.metadata.createdAt,
      updatedAt: ctx.metadata.updatedAt,
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────
//
// A single Context Manager instance serves the whole platform. It holds NO
// request-scoped state (all state lives in the SharedContext objects it
// produces), so it is safe to share across requests and workers.

export const globalContextManager = new ContextManager();
