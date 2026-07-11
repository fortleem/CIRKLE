import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const minFrequency = parseInt(searchParams.get("minFrequency") || "1", 10);

  const { globalFeedbackCollector } = await import("@/lib/liee/feedback-collector");
  const { globalPatternDetector } = await import("@/lib/liee/pattern-detector");

  const signals = await globalFeedbackCollector.getSignals();
  let patterns = globalPatternDetector.detect(signals);

  if (type) patterns = patterns.filter((p) => p.type === type);
  patterns = patterns.filter((p) => p.frequency >= minFrequency);

  return NextResponse.json({
    count: patterns.length,
    patterns: patterns.map((p) => ({
      patternId: p.patternId,
      type: p.type,
      description: p.description,
      frequency: p.frequency,
      confidence: p.confidence,
      firstObserved: p.firstObserved,
      lastObserved: p.lastObserved,
      supportingSignalCount: p.supportingSignals.length,
      data: p.data,
    })),
  });
}
