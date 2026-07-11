// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { globalPredictionEngine } from "@/lib/autonomous-intelligence";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required query param: userId" },
        { status: 400 },
      );
    }

    if (type) {
      const predictions = await globalPredictionEngine.predict(userId, type);
      return NextResponse.json({ predictions, count: predictions.length });
    }

    const predictions = await globalPredictionEngine.predictNextAction(userId);
    return NextResponse.json({ predictions, count: predictions.length });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { predictionId, correct } = body;

    if (!predictionId || correct === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: predictionId, correct" },
        { status: 400 },
      );
    }

    await globalPredictionEngine.evaluatePrediction(predictionId, correct);
    return NextResponse.json({ ok: true, message: "Prediction evaluated" });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}
