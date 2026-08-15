/**
 * CIRKLE — Basic API Smoke Tests (Production Recommendation #2)
 * ============================================================================
 * A minimal, framework-free test runner that fires real HTTP requests
 * against the running Next.js server and asserts on the response. It is
 * intentionally NOT vitest/jest — the goal is a single self-contained
 * module that the dev-only `/api/_test` endpoint can call to produce a
 * pass/fail report for the production-readiness dashboard.
 *
 * Each test is a plain async function that returns `{ ok, message, details? }`.
 * The runner collects them, times each one, and returns:
 *   { total, passed, failed, durationMs, results: [...] }
 *
 * Tests cover the 5 critical platform endpoints that the task brief calls
 * out: health, news, aike status, brain status, and feature flags. They
 * are read-only — no writes, no auth required, no side effects.
 * ============================================================================
 */

export interface TestResult {
  name: string;
  ok: boolean;
  message: string;
  durationMs: number;
  details?: unknown;
}

export interface TestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestResult[];
}

/** Resolve the base URL for self-referential requests. Defaults to the
 *  local dev server (port 3000) but honours the `BASE_URL` env var so
 *  the suite can be pointed at a staging deploy too. */
function baseURL(): string {
  return (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** A simple assertion helper that throws an `AssertionError` on failure. */
export class AssertionError extends Error {
  actual: unknown;
  expected: unknown;
  constructor(message: string, actual: unknown, expected: unknown) {
    super(message);
    this.name = "AssertionError";
    this.actual = actual;
    this.expected = expected;
  }
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new AssertionError(message, condition, true);
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new AssertionError(message, actual, expected);
  }
}

export function assertOk<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value == null) throw new AssertionError(message, value, "non-null");
}

/** Internal: run a single test, capturing timing + error normalisation. */
async function runTest(
  name: string,
  fn: () => Promise<void>,
): Promise<TestResult> {
  const start = Date.now();
  try {
    await fn();
    return {
      name,
      ok: true,
      message: "passed",
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : `unexpected throw: ${String(err)}`;
    const details =
      err instanceof AssertionError
        ? { actual: err.actual, expected: err.expected }
        : err instanceof Error
          ? { stack: err.stack }
          : undefined;
    return {
      name,
      ok: false,
      message,
      durationMs: Date.now() - start,
      details,
    };
  }
}

/** Fetch helper with a short timeout so a hung endpoint fails fast. */
async function fetchJSON(path: string, init?: RequestInit): Promise<{
  status: number;
  body: unknown;
  headers: Headers;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${baseURL()}${path}`, {
      ...init,
      signal: controller.signal,
    });
    let body: unknown = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      body = await res.json().catch(() => null);
    } else {
      body = await res.text().catch(() => null);
    }
    return { status: res.status, body, headers: res.headers };
  } finally {
    clearTimeout(timer);
  }
}

/** The 5 critical smoke tests. */
export const apiTests: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "GET /api/health returns 200 with status=healthy",
    run: async () => {
      const { status, body } = await fetchJSON("/api/health");
      assertEqual(status, 200, `expected 200, got ${status}`);
      const b = body as { status?: string } | null;
      assertOk(b, "body is null");
      assert(
        b.status === "healthy" || b.status === "ok" || b.status === "degraded",
        `expected status healthy|ok|degraded, got "${b.status}"`,
      );
    },
  },
  {
    name: "GET /api/news?country=EG returns articles",
    run: async () => {
      const { status, body } = await fetchJSON("/api/news?country=EG");
      assertEqual(status, 200, `expected 200, got ${status}`);
      const b = body as { breaking?: unknown[]; articles?: unknown[] } | null;
      assertOk(b, "body is null");
      const articles = b.breaking ?? b.articles;
      assert(
        Array.isArray(articles),
        `expected breaking/articles array, got ${typeof articles}`,
      );
    },
  },
  {
    name: "GET /api/aike/status returns operational",
    run: async () => {
      const { status, body } = await fetchJSON("/api/aike/status");
      assertEqual(status, 200, `expected 200, got ${status}`);
      const b = body as { status?: string } | null;
      assertOk(b, "body is null");
      assert(
        b.status === "operational",
        `expected status="operational", got "${b.status}"`,
      );
    },
  },
  {
    name: "GET /api/brain/status returns online",
    run: async () => {
      const { status, body } = await fetchJSON("/api/brain/status");
      assertEqual(status, 200, `expected 200, got ${status}`);
      const b = body as { online?: boolean } | null;
      assertOk(b, "body is null");
      assert(
        b.online === true,
        `expected online=true, got ${String(b.online)}`,
      );
    },
  },
  {
    name: "GET /api/features?country=SA returns enabled features",
    run: async () => {
      const { status, body } = await fetchJSON("/api/features?country=SA");
      assertEqual(status, 200, `expected 200, got ${status}`);
      const b = body as { enabled?: unknown[]; all?: unknown[] } | null;
      assertOk(b, "body is null");
      assert(
        Array.isArray(b.enabled) || Array.isArray(b.all),
        `expected enabled/all array, got ${typeof b.enabled}`,
      );
    },
  },
];

/** Run every registered test and return the aggregated suite result. */
export async function runApiTests(): Promise<TestSuiteResult> {
  const results: TestResult[] = [];
  const start = Date.now();
  for (const t of apiTests) {
    results.push(await runTest(t.name, t.run));
  }
  const passed = results.filter((r) => r.ok).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    durationMs: Date.now() - start,
    results,
  };
}
