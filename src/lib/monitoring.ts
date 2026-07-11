// @ts-nocheck
// Minimal monitoring — no Sentry, no broken code
const counters = new Map<string, number>();
const histograms = new Map<string, number[]>();

export const metrics = {
  incrementCounter(name: string, labels = {}) {
    const key = `${name}:${JSON.stringify(labels)}`;
    counters.set(key, (counters.get(key) || 0) + 1);
  },
  observeHistogram(name: string, value: number, labels = {}) {
    const key = `${name}:${JSON.stringify(labels)}`;
    const arr = histograms.get(key) || [];
    arr.push(value);
    if (arr.length > 1000) arr.shift();
    histograms.set(key, arr);
  },
  setGauge(name: string, value: number, labels = {}) {},
  getMetrics() {
    return { counters: Object.fromEntries(counters), histograms: {}, gauges: {} };
  },
  reset() { counters.clear(); histograms.clear(); },
};

export function captureError(error, context?) {
  console.error("[monitoring] Error:", String(error).slice(0, 200), context || "");
  metrics.incrementCounter("errors_total", { type: context?.type || "unknown" });
}

export interface Span { name: string; startTime: number; endTime?: number; attributes: Record<string, unknown>; children: Span[]; }
export function startSpan(name: string, attributes = {}): Span { return { name, startTime: Date.now(), attributes, children: [] }; }
export function endSpan(span: Span): void { span.endTime = Date.now(); }

export async function monitorPhase(phase: string, fn: () => Promise<unknown>) {
  metrics.incrementCounter("phase_invocations_total", { phase });
  try {
    const result = await fn();
    metrics.incrementCounter("phase_success_total", { phase });
    return result;
  } catch (err) {
    metrics.incrementCounter("phase_errors_total", { phase });
    captureError(err, { phase });
    throw err;
  }
}

export function monitorAPIRoute(route: string, method: string, status: number, durationMs: number) {
  metrics.incrementCounter("api_requests_total", { route, method, status: String(status) });
  metrics.observeHistogram("api_duration_ms", durationMs, { route, method });
}

export function getHealthStatus() {
  const mem = process.memoryUsage();
  return {
    status: "healthy" as const,
    uptime: process.uptime(),
    memory: { used: Math.round(mem.heapUsed / 1024 / 1024), total: Math.round(mem.heapTotal / 1024 / 1024) },
    metrics: { counters: counters.size, histograms: histograms.size, gauges: 0 },
  };
}
