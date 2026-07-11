import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const apps = await db.app.findMany({ where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json({
      total: apps.length, open: true,
      message: "Cirkle Mini App Platform is open. Any developer can integrate freely.",
      apps: apps.map((a) => ({
        appId: a.appId, name: a.name, description: a.description, icon: a.logoEmoji,
        url: a.websiteUrl, developer: a.developer, category: a.category,
        permissions: a.scopes ? JSON.parse(a.scopes) : [], createdAt: a.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ total: 0, open: true, message: "Cirkle Mini App Platform is open.", apps: [] });
  }
}
