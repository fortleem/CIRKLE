import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appId, name, description, icon, url, developer, category, permissions, webhookUrl } = body;
    if (!appId || !name || !url) {
      return NextResponse.json({ error: "appId, name, and url are required" }, { status: 400 });
    }
    const app = await db.app.create({
      data: {
        appId,
        name,
        description: description || "",
        logoEmoji: icon || "📱",
        websiteUrl: url,
        developer: developer || "unknown",
        category: category || "utilities",
        scopes: permissions ? JSON.stringify(permissions) : "[]",
        webhookUrl: webhookUrl || null,
        status: "active",
      },
    });
    return NextResponse.json({ ok: true, appId: app.appId, registeredAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: "Registration failed", detail: String(err).slice(0, 200) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const apps = await db.app.findMany({ where: { status: "active" }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({
      count: apps.length,
      apps: apps.map((a) => ({
        appId: a.appId, name: a.name, description: a.description, icon: a.logoEmoji,
        url: a.websiteUrl, developer: a.developer, category: a.category,
        permissions: a.scopes ? JSON.parse(a.scopes) : [], createdAt: a.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ count: 0, apps: [] });
  }
}
