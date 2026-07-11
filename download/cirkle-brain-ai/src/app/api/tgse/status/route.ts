/** GET /api/tgse/status — TGSE health + observability (lazy-loaded, cacheable). */
import { NextResponse } from "next/server";

export async function GET() {
  const { globalTGSEEngine } = await import("@/lib/tgse");
  const status = globalTGSEEngine.status();
  return NextResponse.json(
    {
      ...status,
      role: "Constitutional guardian of CIRKLE Brain AI",
      mission: "Validate, govern, authorize, monitor, and audit every AI action",
      governanceDomains: ["CRIE", "IRDE", "UOB", "TEE", "LIEE", "CIE"],
      capabilities: [
        "Policy evaluation (8 domains)", "Trust scoring", "Compliance verification",
        "AI safety (8 check types)", "Risk assessment (7 risk types)",
        "Human approval workflows", "Explainability", "Immutable audit trails",
      ],
      neverDoes: ["reason (CRIE)", "recommend (IRDE)", "orchestrate (UOB)", "execute (TEE)", "learn (LIEE)"],
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
