// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q || q.length < 2) return NextResponse.json({ users: [] });
  try { const users = await db.user.findMany({ where: { OR: [{ circleId: { contains: q, mode: "insensitive" } }, { displayName: { contains: q, mode: "insensitive" } }] }, take: 10 }); return NextResponse.json({ users }); }
  catch { return NextResponse.json({ users: [] }); }
}
