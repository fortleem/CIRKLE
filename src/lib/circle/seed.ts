// @ts-nocheck
/**
 * Circle (دواير) — Database seed & lazy-seed helpers.
 *
 * Used by `POST /api/seed` (explicit reset) and lazily by read endpoints
 * (`ensureSeeded()` is called at the top of GET routes that need data).
 *
 * Mock data lives in `./mock-data.ts`. We persist a subset that the schema
 * can hold; aggregated UI fields (pinned, muted, isCircle, presence, mock
 * participant counts for channels) are stored in an in-memory lookup map
 * so `GET /api/conversations` can still return the exact mock shape.
 */
import { db } from "@/lib/db";
import {
  CURRENT_USER,
  SEED_CONVERSATIONS,
  SEED_MESSAGES,
  SEED_POSTS,
  SEED_TRANSACTIONS,
  SEED_VERIFY_CLAIMS,
} from "@/lib/circle/mock-data";
import { type Conversation as ConversationType } from "@/lib/circle/types";

export interface SeedCounts {
  users: number;
  conversations: number;
  messages: number;
  posts: number;
  transactions: number;
  verifyClaims: number;
  skipped?: boolean;
}

/** Filler display names for synthetic conversation members. */
const FILLER_NAMES = [
  "Mom", "Mariam", "Yara", "Karim", "Ahmed", "Omar", "Salma", "Hassan",
  "Nadia", "Tarek", "Sara", "Khaled", "Mona", "Adel", "Reem", "Yousef",
];

const AVATAR_COLORS = ["teal", "rose", "gold", "steel", "charcoal"];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * Mock-only metadata that doesn't have a schema column. Looked up by
 * conversation id when shaping GET /api/conversations responses so the
 * UI still sees `pinned`, `muted`, `isCircle`, `presence`, the canonical
 * `avatarInitials`, and the channel-level participant counts (which we
 * obviously can't persist as 184k rows).
 */
const MOCK_CONV_META: Record<
  string,
  Pick<ConversationType, "pinned" | "muted" | "isCircle" | "presence" | "avatarInitials" | "participants">
> = Object.fromEntries(
  SEED_CONVERSATIONS.map((c) => [
    c.id,
    {
      pinned: c.pinned,
      muted: c.muted,
      isCircle: c.isCircle,
      presence: c.presence,
      avatarInitials: c.avatarInitials,
      participants: c.participants,
    },
  ]),
);

export function getMockConversationMeta(id: string) {
  return MOCK_CONV_META[id];
}

let seedPromise: Promise<SeedCounts> | null = null;

/**
 * Lazy-seed: if the DB is empty, seed it from mock-data. Idempotent —
 * concurrent callers share a single in-flight promise.
 */
export function ensureSeeded(): Promise<SeedCounts> {
  if (!seedPromise) {
    seedPromise = doSeed(false).catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

/**
 * Wipe every table and re-seed from mock-data. Used by the "Reset demo"
 * button (POST /api/seed).
 */
export async function reseedAll(): Promise<SeedCounts> {
  seedPromise = null;
  return doSeed(true);
}

async function doSeed(wipe: boolean): Promise<SeedCounts> {
  if (wipe) {
    // Wipe in dependency order to respect FK constraints.
    await db.message.deleteMany();
    await db.conversationMember.deleteMany();
    await db.conversation.deleteMany();
    await db.post.deleteMany();
    await db.transaction.deleteMany();
    await db.verifyClaim.deleteMany();
    await db.user.deleteMany();
  } else {
    const convCount = await db.conversation.count();
    if (convCount > 0) {
      return { ...emptyCounts(), skipped: true };
    }
  }

  // 1. Users (current user + a handful derived from mock data).
  const usersData = [
    { id: "u_current", circleId: CURRENT_USER.circleId, displayName: CURRENT_USER.displayName, arabicName: CURRENT_USER.arabicName ?? null, avatarColor: CURRENT_USER.avatarColor, verified: true, region: CURRENT_USER.region },
    { id: "u_ahmed", circleId: "@ahmed:circle.app", displayName: "Ahmed Hassan", arabicName: "أحمد حسن", avatarColor: "teal", verified: true, region: "EG" },
    { id: "u_mom", circleId: "@mom:circle.app", displayName: "Mom", arabicName: "ماما", avatarColor: "gold", verified: false, region: "EG" },
    { id: "u_sis", circleId: "@mariam:circle.app", displayName: "Mariam", arabicName: "مريم", avatarColor: "rose", verified: false, region: "EG" },
    { id: "u_yara", circleId: "@yara:circle.app", displayName: "Yara Mostafa", arabicName: "يارا مصطفى", avatarColor: "rose", verified: false, region: "EG" },
    { id: "u_karim", circleId: "@karim:circle.app", displayName: "Karim Nabil", arabicName: "كريم نبيل", avatarColor: "steel", verified: true, region: "EG" },
    { id: "u_nadia", circleId: "@nadia:circle.app", displayName: "Nadia Adel", arabicName: "نادية عادل", avatarColor: "rose", verified: false, region: "EG" },
    { id: "u_circle", circleId: "@circle:circle.app", displayName: "Circle Foundation", arabicName: "مؤسسة دواير", avatarColor: "gold", verified: true, region: "EG" },
  ];
  await db.user.createMany({ data: usersData });

  // 2. Conversations + members.
  for (const c of SEED_CONVERSATIONS) {
    const baseTs = c.lastTimestamp ? new Date(c.lastTimestamp) : new Date();
    await db.conversation.create({
      data: {
        id: c.id,
        type: c.type,
        name: c.name,
        arabicName: c.arabicName ?? null,
        avatarColor: c.avatarColor,
        encrypted: c.encrypted,
        createdAt: baseTs,
        updatedAt: baseTs,
      },
    });

    const targetMembers =
      c.type === "channel" ? 1 : c.type === "direct" ? 2 : Math.min(c.participants, 8);

    const members: Array<{
      conversationId: string;
      displayName: string;
      avatarColor: string;
      initials: string;
      presence: string;
    }> = [];

    if (c.lastSender) {
      members.push({
        conversationId: c.id,
        displayName: c.lastSender,
        avatarColor: c.avatarColor,
        initials: c.avatarInitials,
        presence: c.presence ?? "offline",
      });
    }
    if (c.type === "direct") {
      members.push({
        conversationId: c.id,
        displayName: CURRENT_USER.displayName,
        avatarColor: CURRENT_USER.avatarColor,
        initials: CURRENT_USER.avatarInitials,
        presence: "online",
      });
    }
    for (let i = members.length; i < targetMembers; i++) {
      const baseName = FILLER_NAMES[i % FILLER_NAMES.length];
      const suffix = Math.floor(i / FILLER_NAMES.length);
      const name = suffix > 0 ? `${baseName} ${suffix + 1}` : baseName;
      members.push({
        conversationId: c.id,
        displayName: name,
        avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
        initials: initialsFromName(name),
        presence: i % 3 === 0 ? "away" : "offline",
      });
    }
    if (members.length > 0) {
      // Dedupe by displayName — the lastSender may collide with a filler
      // name from the pool, and ConversationMember has a unique constraint
      // on (conversationId, displayName).
      const seen = new Set<string>();
      const deduped = members.filter((m) => {
        const key = `${m.conversationId}::${m.displayName}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      await db.conversationMember.createMany({ data: deduped });
    }
  }

  // 3. Messages (flatten SEED_MESSAGES).
  let messageCount = 0;
  for (const [convId, msgs] of Object.entries(SEED_MESSAGES)) {
    for (const m of msgs) {
      await db.message.create({
        data: {
          id: m.id,
          conversationId: convId,
          senderId: m.senderId,
          senderName: m.senderName,
          senderInitials: m.senderInitials,
          senderColor: m.senderColor,
          body: m.body,
          status: m.status,
          encrypted: m.encrypted,
          attachmentKind: m.attachment?.kind ?? null,
          attachmentName: m.attachment?.name ?? null,
          systemEvent: m.systemEvent ?? null,
          createdAt: new Date(m.timestamp),
        },
      });
      messageCount++;
    }
  }

  // 4. Posts.
  for (const p of SEED_POSTS) {
    await db.post.create({
      data: {
        id: p.id,
        authorId: p.authorId,
        authorName: p.authorName,
        authorHandle: p.authorHandle,
        authorInitials: p.authorInitials,
        authorColor: p.authorColor,
        authorVerified: p.authorVerified ?? false,
        body: p.body,
        arabicBody: p.arabicBody ?? null,
        module: p.module,
        visibility: p.visibility,
        location: p.location ?? null,
        language: p.language ?? "en",
        likes: p.stats.likes,
        comments: p.stats.comments,
        shares: p.stats.shares,
        views: p.stats.views ?? 0,
        tags: p.tags?.join(",") ?? null,
        mediaKind: p.media?.kind ?? null,
        mediaCount: p.media?.count ?? null,
        mediaCover: p.media?.cover ?? null,
        createdAt: new Date(p.timestamp),
      },
    });
  }

  // 5. Transactions.
  for (const t of SEED_TRANSACTIONS) {
    await db.transaction.create({
      data: {
        id: t.id,
        userLabel: CURRENT_USER.displayName,
        direction: t.direction,
        counterparty: t.counterparty,
        counterpartyInitials: t.counterpartyInitials,
        counterpartyColor: t.counterpartyColor,
        amount: t.amount,
        currency: t.currency,
        method: t.method,
        memo: t.memo,
        status: t.status,
        fee: t.fee,
        createdAt: new Date(t.timestamp),
      },
    });
  }

  // 6. Verify claims.
  for (const vc of SEED_VERIFY_CLAIMS) {
    await db.verifyClaim.create({
      data: {
        id: vc.id,
        userLabel: CURRENT_USER.displayName,
        type: vc.type,
        label: vc.label,
        status: vc.status,
        attestor: vc.attestor,
        issuedAt: new Date(vc.issuedAt),
      },
    });
  }

  return {
    users: usersData.length,
    conversations: SEED_CONVERSATIONS.length,
    messages: messageCount,
    posts: SEED_POSTS.length,
    transactions: SEED_TRANSACTIONS.length,
    verifyClaims: SEED_VERIFY_CLAIMS.length,
  };
}

function emptyCounts(): SeedCounts {
  return {
    users: 0,
    conversations: 0,
    messages: 0,
    posts: 0,
    transactions: 0,
    verifyClaims: 0,
  };
}
