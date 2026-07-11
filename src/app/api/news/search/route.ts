// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  if (!q) return NextResponse.json({ articles: [] });
  try {
    const { generateNewsViaAI } = await import("@/lib/news-fallback");
    const articles = await generateNewsViaAI("EG", undefined, q);
    return NextResponse.json({ articles });
  } catch {
    return NextResponse.json({ articles: [] });
  }
}
