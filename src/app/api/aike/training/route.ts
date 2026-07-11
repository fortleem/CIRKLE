// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { globalTrainingPipeline } from "@/lib/autonomous-intelligence";

export async function GET() {
  try {
    const lastRun = globalTrainingPipeline.getLastRun();
    const stats = globalTrainingPipeline.getStats();
    return NextResponse.json({ lastRun, stats });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { steps } = body;

    let result;
    if (steps && Array.isArray(steps)) {
      result = await globalTrainingPipeline.runPartialPipeline(steps);
    } else {
      result = await globalTrainingPipeline.runNightlyTraining();
    }

    return NextResponse.json({
      ok: true,
      result,
      message: "Training pipeline completed",
    });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}
