import { NextRequest, NextResponse } from "next/server";
import { globalPMB, ALL_CATEGORIES, type MemoryCategory } from "@/lib/personal-memory-brain";

// GET: retrieve/search memories
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userUuid = searchParams.get("userId") || "anonymous";
  const action = searchParams.get("action") || "all";

  if (action === "stats") {
    return NextResponse.json(globalPMB.getStats(userUuid));
  }

  if (action === "export") {
    return NextResponse.json({ memories: globalPMB.exportAll(userUuid) });
  }

  if (action === "audit") {
    return NextResponse.json({ auditLog: globalPMB.getAuditLog(userUuid) });
  }

  if (action === "graph") {
    return NextResponse.json(globalPMB.getGraph(userUuid));
  }

  if (action === "context") {
    return NextResponse.json({ context: globalPMB.getPersonalizationContext(userUuid) });
  }

  const category = searchParams.get("category") as MemoryCategory | null;
  const query = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "20");

  if (query) {
    const results = globalPMB.search(userUuid, query, limit);
    return NextResponse.json({ results, count: results.length });
  }

  const memories = globalPMB.getAll(userUuid, category || undefined);
  return NextResponse.json({ memories, count: memories.length });
}

// POST: store a new memory
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { userId, type, title, summary, content, source, privacyLevel, tags, subcategory, gcieReferenceIds } = body;

  if (!userId || !type || !title) {
    return NextResponse.json({ error: "userId, type, and title required" }, { status: 400 });
  }

  if (globalPMB.isPaused(userId)) {
    return NextResponse.json({ error: "Memory collection is paused" }, { status: 403 });
  }

  const mem = globalPMB.store({
    userUuid: userId,
    type: type as MemoryCategory,
    subcategory,
    title,
    summary: summary || title,
    content: content || summary || title,
    importanceScore: globalPMB.calculateImportance({ source }),
    confidenceScore: source === "user_explicit" ? 1.0 : 0.6,
    source: source || "ai_inferred",
    sourceTimestamp: new Date().toISOString(),
    lifecycle: source === "user_explicit" ? "user_confirmed" : "candidate",
    privacyLevel: privacyLevel || "personal",
    expirationPolicy: "never",
    tags: tags || [],
    relatedMemories: [],
    gcieReferenceIds,
  });

  return NextResponse.json({ memory: mem, ok: true }, { status: 201 });
}

// PATCH: update, confirm, archive, delete, restore
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { userId, action, memoryId, updates } = body;

  if (!userId || !action || !memoryId) {
    return NextResponse.json({ error: "userId, action, memoryId required" }, { status: 400 });
  }

  switch (action) {
    case "confirm":
      return NextResponse.json({ ok: globalPMB.confirm(memoryId, userId) });
    case "archive":
      return NextResponse.json({ ok: globalPMB.archive(memoryId, userId) });
    case "delete":
      return NextResponse.json({ ok: globalPMB.delete(memoryId, userId) });
    case "restore":
      return NextResponse.json({ ok: globalPMB.restore(memoryId, userId) });
    case "update":
      return NextResponse.json({ memory: globalPMB.update(memoryId, updates || {}, userId) });
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

// DELETE: delete all memories (GDPR right to erasure)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const count = globalPMB.deleteAll(userId);
  return NextResponse.json({ ok: true, deleted: count });
}
