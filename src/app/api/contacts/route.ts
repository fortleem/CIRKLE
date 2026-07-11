// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  try { const connections = await db.appConnection.findMany({ where: { followerId: userId, status: "active" }, include: { following: true } }); return NextResponse.json({ contacts: connections.map(c => c.following) }); }
  catch { return NextResponse.json({ contacts: [] }); }
}
export async function POST(req: NextRequest) {
  try { const { followerId, followingId } = await req.json(); if (!followerId || !followingId) return NextResponse.json({ error: "followerId and followingId required" }, { status: 400 });
  const conn = await db.appConnection.upsert({ where: { followerId_followingId: { followerId, followingId } }, update: { status: "active" }, create: { followerId, followingId, status: "active" } });
  return NextResponse.json({ ok: true, connection: conn }); }
  catch { return NextResponse.json({ error: "failed to add contact" }, { status: 500 }); }
}
