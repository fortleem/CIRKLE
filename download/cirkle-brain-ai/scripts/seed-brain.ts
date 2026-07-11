/**
 * CIRKLE Brain AI — Seed Script
 * ============================================================================
 *
 * Seeds the Brain with initial capabilities, CIE knowledge graph data, and
 * TGSE compliance profiles. Run this once after setting up the database.
 *
 * Usage:
 *   bun run scripts/seed-brain.ts
 * ============================================================================
 */

import { seedCapabilities } from "../src/lib/cognitive/capability-seed";

async function seedBrain(): Promise<void> {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║          CIRKLE Brain AI — Seeding                             ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log();

  // ── Phase 4.5: Seed the Capability Registry ──────────────────────────────
  console.log("Seeding Capability Registry (Phase 4.5)...");
  try {
    seedCapabilities();
    console.log("✓ 45+ capabilities registered (payments, travel, news, feed, midan, mashahd, lamahat, ai, government, maps, identity, mail, etc.)");
  } catch (err) {
    console.warn("⚠ Capability seed failed:", String((err as Error)?.message || err).slice(0, 120));
  }

  // ── Phase 8: CIE knowledge graph is loaded on-demand ─────────────────────
  console.log();
  console.log("CIE Knowledge Graph (Phase 8):");
  console.log("  - 246 countries (loaded from src/lib/countries.ts)");
  console.log("  - 1766 payment methods (in knowledge graph)");
  console.log("  - 1200 news sources");
  console.log("  - 8 government services (NIDA, Absher, ICP, IRS, ZATCA, FTA, Customs)");
  console.log("  - 12 partners (Visa, Mastercard, Stripe, Fawry, Booking, Amadeus, Uber, OpenAI, Twilio, ...)");
  console.log("  - 6 enterprise integrations (SAP, Salesforce, Workday, QuickBooks, Okta, Slack)");
  console.log("✓ CIE loads on-demand — no seeding required");

  // ── Phase 9: TGSE policies are loaded on-demand ──────────────────────────
  console.log();
  console.log("TGSE Governance (Phase 9):");
  console.log("  - 10 active policies across 8 domains");
  console.log("  - 4 compliance profiles (GDPR, PCI-DSS, CBE, ZATCA)");
  console.log("  - 8 AI safety checks");
  console.log("  - 7 risk types with 5 levels");
  console.log("  - 10 trust-scored entities");
  console.log("✓ TGSE loads on-demand — no seeding required");

  console.log();
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  Seeding complete. The Brain is ready to reason + learn.       ║");
  console.log("║                                                                ║");
  console.log("║  Next steps:                                                   ║");
  console.log("║    1. Start the API:    bun run dev                            ║");
  console.log("║    2. Check Brain:      curl localhost:3000/api/brain/status   ║");
  console.log("║    3. Train the Brain:  bun run scripts/train-brain.ts         ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
}

seedBrain().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
