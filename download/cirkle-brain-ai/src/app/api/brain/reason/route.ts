import { NextRequest, NextResponse } from "next/server";
import { globalCRIE } from "@/lib/crie-engine";

/**
 * POST /api/brain/reason
 *
 * The cognitive reasoning endpoint. CRIE (Context & Reasoning Intelligence Engine)
 * is the executive reasoning core that combines GCIE (world) + PMB (user) into
 * intelligent decisions.
 *
 * Body: { query, userId, country, city?, conversationHistory? }
 * Returns: Decision with type, explanation, confidence, response, memoryCandidate
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, userId, country, city, conversationHistory } = body;

    if (!query) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    const decision = await globalCRIE.reason({
      query,
      userId: userId || "anonymous",
      country: country || "EG",
      city,
      conversationHistory: conversationHistory || [],
    });

    return NextResponse.json(decision);
  } catch {
    return NextResponse.json({
      type: "no_action",
      response: "I'm here — could you rephrase?",
      explanation: "An error occurred during reasoning.",
      confidence: 0.2,
      modulesConsulted: [],
    }, { status: 200 });
  }
}
