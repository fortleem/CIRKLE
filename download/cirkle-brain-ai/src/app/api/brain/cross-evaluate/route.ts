import { NextRequest, NextResponse } from "next/server";
import { crossEvaluate, recordLearning } from "@/lib/brain-cross-evaluation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await crossEvaluate({
      query: body.query,
      country: body.country || "EG",
      city: body.city,
      username: body.username,
      language: body.language || "en",
    });

    // Record for continuous learning
    if (body.username) {
      await recordLearning({
        username: body.username,
        query: body.query,
        response: result.finalAnswer,
        sources: result.sources.map(s => s.name),
        feedback: body.feedback,
      }).catch(() => {});
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Cross-evaluation failed", details: String(err) },
      { status: 500 }
    );
  }
}
