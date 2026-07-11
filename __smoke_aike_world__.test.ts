import { describe, it, expect } from "vitest";
import { globalWorldStateEngine } from "./src/lib/autonomous-intelligence/world-state-engine";
import { globalResearchScheduler } from "./src/lib/autonomous-intelligence/research-scheduler";
import { globalCapabilityLearningEngine } from "./src/lib/autonomous-intelligence/capability-learning";
import { globalProviderLearningEngine } from "./src/lib/autonomous-intelligence/provider-learning";

describe("world-state-engine", () => {
  it("refreshes, gets, getsAll, checks stale, reports stats", async () => {
    const stub = await globalWorldStateEngine.refresh("weather", "SA");
    expect(stub).not.toBeNull();
    globalWorldStateEngine.registerMetric("weather", 60_000);
    expect(globalWorldStateEngine.get("weather", "SA")).not.toBeNull();
    await new Promise((r) => setTimeout(r, 80));
    const active = globalWorldStateEngine.get("weather", "SA");
    expect(active).not.toBeNull();
    expect(active?.source).toBe("weather_api");
    await globalWorldStateEngine.refresh("currency", "SA");
    await globalWorldStateEngine.refresh("flights", "global");
    await new Promise((r) => setTimeout(r, 50));
    const all = globalWorldStateEngine.getAll("SA");
    expect(all.length).toBeGreaterThan(0);
    expect(globalWorldStateEngine.checkStale()).toEqual([]);
    const stats = globalWorldStateEngine.stats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.queueDepth).toBe(0);
  });
});

describe("research-scheduler", () => {
  it("schedules, dedupes, prioritizes, pops, completes, fails, stats", async () => {
    await globalResearchScheduler.scheduleTask({ taskId: "", query: "weather jeddah", domain: "weather", priority: "high", targetSources: ["weather_api"], status: "pending", scheduledFor: new Date().toISOString(), retryCount: 0 });
    await globalResearchScheduler.scheduleTask({ taskId: "", query: "SAR rate", domain: "finance", priority: "high", targetSources: ["banking_api"], status: "pending", scheduledFor: new Date(Date.now() - 86400000).toISOString(), retryCount: 0 });
    await globalResearchScheduler.scheduleTask({ taskId: "", query: "visa rules", domain: "government", priority: "critical", targetSources: ["government_api"], status: "pending", scheduledFor: new Date().toISOString(), retryCount: 0 });
    // Duplicate — should bump request count, not create new task.
    const beforeStats = globalResearchScheduler.getStats();
    await globalResearchScheduler.scheduleTask({ taskId: "", query: "weather jeddah", domain: "weather", priority: "high", targetSources: ["weather_api"], status: "pending", scheduledFor: new Date().toISOString(), retryCount: 0 });
    const afterStats = globalResearchScheduler.getStats();
    expect(afterStats.pending).toBe(beforeStats.pending); // not doubled

    const next = globalResearchScheduler.getNextTask();
    expect(next).not.toBeNull();
    expect(next?.status).toBe("in_progress");
    if (next) {
      const ok = globalResearchScheduler.completeTask(next.taskId, [{ factId: "f1", statement: "x" } as never]);
      expect(ok).toBe(true);
    }
    const next2 = globalResearchScheduler.getNextTask();
    if (next2) globalResearchScheduler.failTask(next2.taskId, "simulated");
    const stats = globalResearchScheduler.getStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.completed).toBeGreaterThan(0);
  });
});

describe("capability-learning", () => {
  it("discovers, evaluates, approves, rejects, ranks integratable", async () => {
    const d1 = await globalCapabilityLearningEngine.discover("payment");
    expect(d1.length).toBeGreaterThan(0);
    const d2 = await globalCapabilityLearningEngine.discover("travel");
    expect(d2.length).toBeGreaterThan(0);
    const dup = await globalCapabilityLearningEngine.discover("payment");
    expect(dup.length).toBe(0); // idempotent
    const ev = await globalCapabilityLearningEngine.evaluate("pay_mada");
    expect(ev?.status).toBe("evaluating");
    const app = await globalCapabilityLearningEngine.approve("pay_mada");
    expect(app?.status).toBe("approved");
    const rej = await globalCapabilityLearningEngine.reject("plugin_calendar_caldav");
    expect(rej?.status).toBe("rejected");
    const integ = globalCapabilityLearningEngine.getIntegratable();
    expect(integ.length).toBeGreaterThan(0);
    expect(integ[0].status).toBe("approved");
    const stats = globalCapabilityLearningEngine.stats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.domainsScanned).toBe(2);
  });
});

describe("provider-learning", () => {
  it("records calls, aggregates metrics, ranks + routes by task type", async () => {
    await globalProviderLearningEngine.recordCall("groq", { accuracy: 0.85, latencyMs: 480, arabicQuality: 0.92, codeScore: 0.8, reasoningScore: 0.7, reliability: 0.95, available: 1 });
    await globalProviderLearningEngine.recordCall("groq", { accuracy: 0.88, latencyMs: 510, arabicQuality: 0.9, codeScore: 0.82, reasoningScore: 0.72, reliability: 0.97, available: 1 });
    await globalProviderLearningEngine.recordCall("gemini", { accuracy: 0.9, latencyMs: 1500, visionScore: 0.95, reasoningScore: 0.88, codeScore: 0.85, reliability: 0.96, available: 1 });
    await globalProviderLearningEngine.recordCall("gemini", { accuracy: 0.91, latencyMs: 1450, visionScore: 0.93, reasoningScore: 0.86, codeScore: 0.83, reliability: 0.97, available: 1 });
    await globalProviderLearningEngine.recordCall("gemini", { accuracy: 0.89, latencyMs: 1600, visionScore: 0.94, reasoningScore: 0.87, codeScore: 0.84, reliability: 0.95, available: 1 });
    await globalProviderLearningEngine.recordCall("openai", { accuracy: 0.92, latencyMs: 2800, reasoningScore: 0.95, codeScore: 0.95, reliability: 0.95, available: 1, costPer1k: 0.01 });
    await globalProviderLearningEngine.recordCall("openai", { accuracy: 0.93, latencyMs: 2900, reasoningScore: 0.96, codeScore: 0.94, reliability: 0.96, available: 1, costPer1k: 0.01 });
    await globalProviderLearningEngine.recordCall("openai", { accuracy: 0.94, latencyMs: 2750, reasoningScore: 0.94, codeScore: 0.96, reliability: 0.97, available: 1, costPer1k: 0.01 });
    await globalProviderLearningEngine.recordCall("openai", { accuracy: 0.91, latencyMs: 2850, reasoningScore: 0.95, codeScore: 0.93, reliability: 0.95, available: 1, costPer1k: 0.01 });
    await globalProviderLearningEngine.recordCall("openai", { accuracy: 0.92, latencyMs: 2800, reasoningScore: 0.96, codeScore: 0.95, reliability: 0.96, available: 1, costPer1k: 0.01 });
    for (let i = 0; i < 6; i++) {
      await globalProviderLearningEngine.recordCall("openrouter", { accuracy: 0.86, latencyMs: 2000, reasoningScore: 0.8, codeScore: 0.82, arabicQuality: 0.85, reliability: 0.94, available: 1 });
      await globalProviderLearningEngine.recordCall("huggingface", { accuracy: 0.75, latencyMs: 3000, reliability: 0.85, available: 1 });
    }
    const m = globalProviderLearningEngine.getMetrics("groq");
    expect(m).not.toBeNull();
    expect(m!.totalCalls).toBe(2);
    expect(m!.accuracy).toBeGreaterThan(0.8);
    const reasoning = globalProviderLearningEngine.rankProviders("reasoning");
    expect(reasoning.length).toBeGreaterThan(0);
    expect(reasoning[0]).toBe("openai"); // openai has best reasoning score
    const arabic = globalProviderLearningEngine.rankProviders("arabic");
    expect(arabic[0]).toBe("groq"); // groq has best arabic quality
    const vision = globalProviderLearningEngine.rankProviders("vision");
    expect(vision[0]).toBe("gemini"); // gemini has best vision score
    const bestCode = globalProviderLearningEngine.getBestProvider("code");
    expect(bestCode).toBe("openai");
    const cmp = globalProviderLearningEngine.compareProviders();
    expect(cmp.length).toBe(5);
    const pri = globalProviderLearningEngine.getRecommendedPriority("text");
    expect(Array.isArray(pri)).toBe(true);
    const stats = globalProviderLearningEngine.stats();
    expect(stats.providers).toBe(5);
    expect(stats.totalCalls).toBeGreaterThan(0);
  });
});
