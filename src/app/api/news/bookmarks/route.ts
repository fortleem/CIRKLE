// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ bookmarks: [] }); }
export async function POST(req: NextRequest) { return NextResponse.json({ ok: true }); }
export async function DELETE(req: NextRequest) { return NextResponse.json({ ok: true }); }
