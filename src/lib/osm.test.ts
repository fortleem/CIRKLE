import { describe, it, expect } from "vitest";
import { haversineDistance, formatDistance, formatDuration } from "@/lib/osm";
describe("OSM Utilities", () => {
  it("returns 0 for same point", () => { expect(haversineDistance(24.7, 46.6, 24.7, 46.6)).toBe(0); });
  it("calculates Riyadh-Jeddah distance", () => { const d = haversineDistance(24.7136, 46.6753, 21.4858, 39.1925); expect(d).toBeGreaterThan(800000); expect(d).toBeLessThan(900000); });
  it("formats distance", () => { expect(formatDistance(500)).toBe("500m"); expect(formatDistance(2500)).toBe("2.5 km"); });
  it("formats duration", () => { expect(formatDuration(30)).toBe("30s"); expect(formatDuration(120)).toBe("2 min"); expect(formatDuration(3600)).toBe("1h 0m"); });
});
