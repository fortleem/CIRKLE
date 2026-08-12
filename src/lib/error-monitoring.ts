/**
 * CIRKLE — Lightweight Error Monitoring (Production Recommendation #3)
 * ============================================================================
 * A minimal, dependency-free error tracking service that the rest of the
 * platform can call from both server and client code. It keeps the last
 * 100 captured errors in memory and mirrors everything to the console so
 * developers see issues immediately during development.
 *
 * The surface mirrors Sentry's `captureError` / `captureMessage` so that
 * swapping to a real Sentry (or any other vendor) later only requires
 * editing this single file — every call site stays the same.
 *
 * Public API:
 *   - captureError(error, context?)           → Capture an Error (or any value)
 *   - captureMessage(message, level?, ctx?)   → Capture a string message
 *   - getErrorHistory()                       → Snapshot of last 100 entries
 *   - clearErrorHistory()                     → Wipe the buffer (admin only)
 *   - getErrorStats()                         → Aggregate counts by level/type
 *
 * Each captured entry has the shape:
 *   {
 *     id: string,                // uuid-ish, sortable
 *     timestamp: string,         // ISO
 *     kind: "error" | "message",
 *     level: "fatal" | "error" | "warning" | "info" | "debug",
 *     message: string,
 *     name?: string,             // Error.name when available
 *     stack?: string,            // Error.stack when available
 *     context?: Record<string, unknown>,
 *     url?: string,              // window.location.href (client) / req.url (server)
 *     userAgent?: string,        // client only
 *   }
 * ============================================================================
 */

export type ErrorLevel = "fatal" | "error" | "warning" | "info" | "debug";

export interface CapturedError {
  id: string;
  timestamp: string;
  kind: "error" | "message";
  level: ErrorLevel;
  message: string;
  name?: string;
  stack?: string;
  context?: Record<string, unknown>;
  url?: string;
  userAgent?: string;
}

const MAX_HISTORY = 100;
const buffer: CapturedError[] = [];

/** Generate a sortable, unique-ish id (timestamp + counter + random). */
let counter = 0;
function makeId(): string {
  counter = (counter + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Best-effort capture of the current environment's URL + UA. */
function envContext(): { url?: string; userAgent?: string } {
  // Browser
  if (typeof window !== "undefined" && typeof window.location !== "undefined") {
    return {
      url: window.location.href,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
  }
  return {};
}

/** Normalise any thrown value into { message, name, stack }. */
function normaliseError(value: unknown): {
  message: string;
  name?: string;
  stack?: string;
} {
  if (value instanceof Error) {
    return {
      message: value.message || String(value),
      name: value.name,
      stack: value.stack,
    };
  }
  if (typeof value === "string") return { message: value };
  if (value && typeof value === "object") {
    const v = value as { message?: unknown; name?: unknown; stack?: unknown };
    return {
      message: typeof v.message === "string" ? v.message : JSON.stringify(value),
      name: typeof v.name === "string" ? v.name : undefined,
      stack: typeof v.stack === "string" ? v.stack : undefined,
    };
  }
  return { message: String(value) };
}

/** Mirror the capture to the console so developers see it live. */
function logToConsole(entry: CapturedError): void {
  const prefix = `[error-monitoring:${entry.level}]`;
  const ctx = entry.context ? entry.context : "";
  if (entry.level === "fatal" || entry.level === "error") {
    console.error(prefix, entry.message, ctx, entry.stack || "");
  } else if (entry.level === "warning") {
    console.warn(prefix, entry.message, ctx);
  } else {
    console.log(prefix, entry.message, ctx);
  }
}

/** Push an entry into the ring buffer (cap at MAX_HISTORY). */
function push(entry: CapturedError): void {
  buffer.push(entry);
  if (buffer.length > MAX_HISTORY) {
    buffer.splice(0, buffer.length - MAX_HISTORY);
  }
}

/**
 * Capture an error (or any thrown value) with optional context. Safe to
 * call from React components, API routes, and library code.
 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
): CapturedError {
  const info = normaliseError(error);
  const entry: CapturedError = {
    id: makeId(),
    timestamp: new Date().toISOString(),
    kind: "error",
    level: "error",
    message: info.message,
    name: info.name,
    stack: info.stack,
    context,
    ...envContext(),
  };
  push(entry);
  logToConsole(entry);
  return entry;
}

/**
 * Capture a free-form message with a severity level. Useful for tracking
 * non-throwable events (e.g. "user hit paywall", "feature flag evaluated
 * to off in production").
 */
export function captureMessage(
  message: string,
  level: ErrorLevel = "info",
  context?: Record<string, unknown>,
): CapturedError {
  const entry: CapturedError = {
    id: makeId(),
    timestamp: new Date().toISOString(),
    kind: "message",
    level,
    message,
    context,
    ...envContext(),
  };
  push(entry);
  logToConsole(entry);
  return entry;
}

/** Return a defensive copy of the last 100 captured entries (newest last). */
export function getErrorHistory(): CapturedError[] {
  return buffer.slice();
}

/** Clear the in-memory buffer (admin/debug only). */
export function clearErrorHistory(): void {
  buffer.length = 0;
}

/** Return aggregate stats for the monitoring dashboard. */
export function getErrorStats(): {
  total: number;
  byLevel: Record<ErrorLevel, number>;
  byKind: { error: number; message: number };
  oldest?: string;
  newest?: string;
} {
  const byLevel: Record<ErrorLevel, number> = {
    fatal: 0,
    error: 0,
    warning: 0,
    info: 0,
    debug: 0,
  };
  const byKind = { error: 0, message: 0 };
  for (const e of buffer) {
    byLevel[e.level]++;
    byKind[e.kind]++;
  }
  return {
    total: buffer.length,
    byLevel,
    byKind,
    oldest: buffer[0]?.timestamp,
    newest: buffer[buffer.length - 1]?.timestamp,
  };
}

/**
 * Wrap an async function so any thrown error is captured before being
 * re-thrown. The capture includes the supplied `label` so the dashboard
 * can group failures by call site.
 */
export async function withCapture<T>(
  label: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    captureError(err, { label, ...context });
    throw err;
  }
}
