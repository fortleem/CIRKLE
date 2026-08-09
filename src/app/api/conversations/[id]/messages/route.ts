import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/circle/seed";
import type { ChatMessage } from "@/lib/circle/types";

interface MessageRow {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderName: string;
  senderInitials: string;
  senderColor: string;
  body: string | null;
  ciphertext: string | null;
  status: string;
  encrypted: boolean;
  replyToId: string | null;
  attachmentKind: string | null;
  attachmentName: string | null;
  attachmentUrl: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
  systemEvent: string | null;
  editedAt: Date | null;
  deletedAt: Date | null;
  isDeleted: boolean;
  forwardedFromId: string | null;
  isStarred: boolean;
  isPinned: boolean;
  ttlSeconds: number | null;
  expiresAt: Date | null;
  createdAt: Date;
  reactions?: { emoji: string; displayName: string }[];
}

function toChatShape(
  m: MessageRow,
  replySnapshot?: { senderName: string; body: string } | null,
): ChatMessage {
  // Build reaction counts grouped by emoji.
  const reactions: Record<string, number> = {};
  if (m.reactions && m.reactions.length > 0) {
    for (const r of m.reactions) {
      reactions[r.emoji] = (reactions[r.emoji] ?? 0) + 1;
    }
  }

  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId ?? "",
    senderName: m.senderName,
    senderInitials: m.senderInitials,
    senderColor: m.senderColor,
    body: m.body ?? m.ciphertext ?? "",
    timestamp: m.createdAt.toISOString(),
    status: m.status as ChatMessage["status"],
    encrypted: m.encrypted,
    reactions: Object.keys(reactions).length > 0 ? reactions : undefined,
    replyTo: replySnapshot ? { id: m.replyToId ?? "", ...replySnapshot } : null,
    attachment: m.attachmentKind
      ? {
          kind: m.attachmentKind as ChatMessage["attachment"] extends { kind: infer K } ? K : never,
          name: m.attachmentName ?? "",
          meta: m.attachmentMime ?? undefined,
          url: m.attachmentUrl ?? undefined,
          size: m.attachmentSize ?? undefined,
        }
      : null,
    edited: !!m.editedAt,
    editedAt: m.editedAt?.toISOString(),
    deletedAt: m.deletedAt?.toISOString(),
    isDeleted: m.isDeleted,
    forwardedFrom: null,
    isStarred: m.isStarred,
    isPinned: m.isPinned,
    ttlSeconds: m.ttlSeconds,
    expiresAt: m.expiresAt?.toISOString() ?? null,
    systemEvent: (m.systemEvent as ChatMessage["systemEvent"]) ?? null,
  };
}

/**
 * GET /api/conversations/:id/messages
 * Returns messages for a conversation ordered by createdAt ASC.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    // ensureSeeded removed — no mock data();
    const { id } = await ctx.params;

    const exists = await db.conversation.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json(
        { error: "conversation not found" },
        { status: 404 },
      );
    }

    const messages = await db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      include: { reactions: { select: { emoji: true, displayName: true } } },
    });

    // Resolve replyTo snapshots + forwardedFrom snapshots in one pass.
    const replyIds = new Set<string>();
    const fwdIds = new Set<string>();
    for (const m of messages) {
      if (m.replyToId) replyIds.add(m.replyToId);
      if (m.forwardedFromId) fwdIds.add(m.forwardedFromId);
    }
    const refIds = new Set<string>([...replyIds, ...fwdIds]);
    const refs =
      refIds.size > 0
        ? await db.message.findMany({
            where: { id: { in: Array.from(refIds) } },
            // For E2EE messages the server only stores ciphertext — we surface
            // it as the "body" so the recipient's client can decrypt locally.
            select: { id: true, senderName: true, body: true, ciphertext: true },
          })
        : [];
    const refMap = new Map<string, { senderName: string; body: string }>();
    for (const r of refs) {
      refMap.set(r.id, { senderName: r.senderName, body: r.body ?? r.ciphertext ?? "" });
    }

    const out = messages.map((m) => {
      const base = toChatShape(m as unknown as MessageRow, m.replyToId ? refMap.get(m.replyToId) ?? null : null);
      if (m.forwardedFromId) {
        const fwd = refMap.get(m.forwardedFromId);
        if (fwd) (base as { forwardedFrom?: { senderName: string; body: string } | null }).forwardedFrom = fwd;
      }
      return base;
    });

    return NextResponse.json(out);
  } catch (err) {
    logger.error("[/api/conversations/:id/messages GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load messages" },
      { status: 500 },
    );
  }
}

interface PostBody {
  /** Plaintext body. Optional — used ONLY for non-encrypted / system messages.
   *  When `ciphertext` is provided, `body` is ignored so the server never
   *  stores plaintext. */
  body?: string;
  /** Opaque E2EE ciphertext blob (JSON envelope from src/lib/e2ee-service.ts).
   *  When present, the server stores ONLY this field and sets `encrypted=true`.
   *  The server never parses, logs, or decrypts this blob. */
  ciphertext?: string;
  senderId?: string;
  senderName?: string;
  senderInitials?: string;
  senderColor?: string;
  replyToId?: string;
  attachmentKind?: "image" | "audio" | "file" | "location" | "payment" | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
  forwardedFromId?: string | null;
  ttlSeconds?: number | null;
  systemEvent?: string | null;
}

/**
 * POST /api/conversations/:id/messages
 * Body: PostBody
 *
 * Creates a Message with status "sent". Supports E2EE ciphertext, plaintext
 * body (non-encrypted only), reply, attachment, forwarding, and TTL.
 *
 * CRITICAL (ADR-002): when `ciphertext` is provided the server stores ONLY
 * the ciphertext blob — `body` is left null so the server never persists
 * plaintext. The `encrypted` flag is set true. Decryption happens entirely
 * client-side using the recipient's private key (never sent to the server).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    // ensureSeeded removed — no mock data();
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => null)) as PostBody | null;

    const ciphertext = body?.ciphertext?.trim() ?? "";
    const text = body?.body?.trim() ?? "";
    const hasAttachment = !!body?.attachmentKind;
    const hasForward = !!body?.forwardedFromId;
    const hasSystemEvent = !!body?.systemEvent;

    // E2EE ciphertext takes precedence — when present, no plaintext is
    // accepted on this request (defence in depth: callers should omit `body`
    // when sending ciphertext, but we enforce it server-side too).
    const isEncrypted = ciphertext.length > 0;
    const effectiveBody = isEncrypted ? null : text || (body?.attachmentName ?? "");

    if (!ciphertext && !effectiveBody && !hasAttachment && !hasForward && !hasSystemEvent) {
      return NextResponse.json(
        { error: "ciphertext or body or attachment is required" },
        { status: 400 },
      );
    }

    // Cap ciphertext size to protect the SQLite DB (matches Family Vault bound).
    if (ciphertext.length > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ciphertext too large (max 8 MB)" },
        { status: 413 },
      );
    }

    const exists = await db.conversation.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json(
        { error: "conversation not found" },
        { status: 404 },
      );
    }

    // Validate replyToId if provided.
    if (body?.replyToId) {
      const ref = await db.message.findUnique({ where: { id: body.replyToId } });
      if (!ref) {
        return NextResponse.json(
          { error: "replyTo message not found" },
          { status: 400 },
        );
      }
    }

    const now = new Date();
    const ttl = body?.ttlSeconds && body.ttlSeconds > 0 ? body.ttlSeconds : null;
    const expiresAt = ttl ? new Date(now.getTime() + ttl * 1000) : null;

    const created = await db.message.create({
      data: {
        conversationId: id,
        senderId: body?.senderId ?? null,
        senderName: body?.senderName ?? "You",
        senderInitials: body?.senderInitials ?? "ME",
        senderColor: body?.senderColor ?? "rose",
        // Store ONLY ciphertext when encrypted; plaintext body otherwise.
        body: effectiveBody,
        ciphertext: isEncrypted ? ciphertext : null,
        status: "sent",
        encrypted: isEncrypted ? true : (effectiveBody ? false : true),
        replyToId: body?.replyToId ?? null,
        attachmentKind: body?.attachmentKind ?? null,
        attachmentName: body?.attachmentName ?? null,
        attachmentUrl: body?.attachmentUrl ?? null,
        attachmentMime: body?.attachmentMime ?? null,
        attachmentSize: body?.attachmentSize ?? null,
        forwardedFromId: body?.forwardedFromId ?? null,
        ttlSeconds: ttl,
        expiresAt,
        systemEvent: body?.systemEvent ?? null,
      },
      include: { reactions: { select: { emoji: true, displayName: true } } },
    });

    // Bump the conversation's updatedAt so it floats to the top.
    await db.conversation.update({
      where: { id },
      data: { updatedAt: created.createdAt },
    });

    // Resolve reply + forward snapshots for the response shape. We surface
    // ciphertext as the body for E2EE messages so the recipient's client can
    // decrypt locally — the server never decrypts.
    const refIds = new Set<string>();
    if (created.replyToId) refIds.add(created.replyToId);
    if (created.forwardedFromId) refIds.add(created.forwardedFromId);
    const refs =
      refIds.size > 0
        ? await db.message.findMany({
            where: { id: { in: Array.from(refIds) } },
            select: { id: true, senderName: true, body: true, ciphertext: true },
          })
        : [];
    const refMap = new Map<string, { senderName: string; body: string }>();
    for (const r of refs) {
      refMap.set(r.id, { senderName: r.senderName, body: r.body ?? r.ciphertext ?? "" });
    }

    const out = toChatShape(
      created as unknown as MessageRow,
      created.replyToId ? refMap.get(created.replyToId) ?? null : null,
    );
    if (created.forwardedFromId) {
      const fwd = refMap.get(created.forwardedFromId);
      if (fwd) (out as { forwardedFrom?: { senderName: string; body: string } | null }).forwardedFrom = fwd;
    }

    return NextResponse.json(out, { status: 201 });
  } catch (err) {
    logger.error("[/api/conversations/:id/messages POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to send message" },
      { status: 500 },
    );
  }
}
