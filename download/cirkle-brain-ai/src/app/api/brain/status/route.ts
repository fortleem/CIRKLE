import { NextResponse } from "next/server";
import { getBrainStatus } from "@/lib/brain-universal";

/**
 * GET /api/brain/status
 * ----------------------------------------------------------------------------
 * Returns a snapshot of the Cirkle Brain AI universal layer:
 *   - Which providers the router considers available
 *   - The full feature + action vocabulary the universal layer accepts
 *   - Knowledge-graph size (countries / payment methods / transport / news)
 *   - Universal-layer version + timestamp
 *
 * This endpoint is read-only and safe to poll from the Brain Orchestrator
 * overlay, the Profile screen, or any "Brain health" widget. It does NOT
 * issue any AI calls — it only inspects the router's static provider table
 * and the orchestrator's cached stats, so it returns in single-digit
 * milliseconds.
 *
 * Example response:
 * {
 *   "online": true,
 *   "providers": [
 *     { "name": "groq", "available": true, "strengths": ["text","arabic","code"] },
 *     …
 *   ],
 *   "features": ["news","feed","chat","travel","pay","video","photos",
 *                 "social","profile","commit","maps","mail","health","safety"],
 *   "actions":  ["search","summarize","translate","predict",
 *                "recommend","analyze","generate","mediate"],
 *   "knowledgeGraph": { "countries": 246, "paymentMethods": 300,
 *                       "transportOptions": 800, "newsSources": 5000 },
 *   "universalLayerVersion": "1.0.0",
 *   "updatedAt": "2025-04-29T12:00:00.000Z"
 * }
 */
export async function GET() {
  try {
    const status = await getBrainStatus();
    return NextResponse.json(status, {
      headers: {
        // Status changes infrequently — let the browser cache for 30s and
        // revalidate in the background so polling stays cheap.
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        online: false,
        error: "Brain status unavailable",
        details: String(err).slice(0, 200),
        updatedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
