import { NextRequest, NextResponse } from "next/server";
import { processEvidenceChunk } from "@/lib/shield-engine";
export async function POST(req: NextRequest) {
  try {
    const { caseId, chunkData, chunkIndex, totalChunks } = await req.json();
    if (!caseId || !chunkData) return NextResponse.json({ error: "caseId and chunkData required" }, { status: 400 });
    const chunk = Buffer.from(chunkData, "base64");
    const processed = await processEvidenceChunk(chunk.buffer, caseId, chunkIndex, totalChunks);
    return NextResponse.json({ ok: true, chunk: { index: processed.index, hash: processed.hash, total: processed.total } });
  } catch {
    return NextResponse.json({ error: "Evidence upload failed" }, { status: 500 });
  }
}
