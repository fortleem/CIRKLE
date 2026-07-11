import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";
describe("Rate Limiter", () => {
  it("allows first request", () => { expect(rateLimit("test1", 5).ok).toBe(true); });
  it("blocks after limit", () => { const k = "test2"; for (let i = 0; i < 5; i++) rateLimit(k, 5); expect(rateLimit(k, 5).ok).toBe(false); });
});
