# Task TIER-B-CHAT-CORE — Work Record

**Agent:** full-stack-developer
**Task ID:** TIER-B-CHAT-CORE
**Task:** Build 7 chat core features (reactions, editing, read receipts, typing, threading, disappearing, scheduled) for CIRKLE's Wasl module.

## Files created (19 total)

### Lib files (7) — server-only, Prisma-backed
1. `src/lib/message-reactions.ts` — B3 reactions: `addReaction`, `removeReaction`, `getReactionsForMessage`, `getReactionsForMessages`, `getReactionGroupsForMessage`, `REACTION_EMOJIS` (👍❤️😂😮😢🙏🔥👏).
2. `src/lib/message-editing.ts` — B4 editing: `editMessage` (15-min window, pushes old body to history), `getEditHistory`, `canEdit`, `getMessageWithHistory`. `EDIT_WINDOW_MINUTES = 15`.
3. `src/lib/read-receipts.ts` — B8 p1: `markAsRead` (upsert per reader/conversation), `getReadReceipts`, `getUnreadCount`, `getUnreadCountsForReader`.
4. `src/lib/typing-indicator.ts` — B8 p2: `setTyping`, `getTypingUsers` (3-second TTL, prunes stale rows), `clearTyping`. `TYPING_TTL_MS = 3000`.
5. `src/lib/reply-thread.ts` — B7 threading: `createReply` (validates same conversation), `getThreadReplies` (joins reply message body), `getThreadReplyCount`, `getThreadDepth` (walks up to 50 hops), `getThreadRoot`.
6. `src/lib/disappearing-messages.ts` — B5: `setDisappearingTimer`, `getDisappearingSetting` (returns synthetic "off" if none), `isMessageExpired`. Options: `off | 24h | 7d | 90d | view-once`.
7. `src/lib/scheduled-messages.ts` — B6: `scheduleMessage` (1-min to 1-year window), `getScheduledMessages`, `cancelScheduled`, `markSent`, `getOptimalTimes` (heuristic: morning/lunch/evening/peak slots for next 7 days, weekend vs weekday, scored 0..1, top 8 returned chronologically).

### API routes (7) — Next.js 16 App Router, Promise<{params}> shape
1. `src/app/api/messages/[id]/reactions/route.ts` — POST (add, idempotent), DELETE (remove via query params), GET (list).
2. `src/app/api/messages/[id]/edit/route.ts` — POST (edit + history push), GET (current body + history).
3. `src/app/api/conversations/[id]/read/route.ts` — POST (markAsRead, returns receipt + unreadCount), GET (receipts + optional unreadCount via ?readerId=).
4. `src/app/api/conversations/[id]/typing/route.ts` — POST (set/clear via action), GET (list typing users).
5. `src/app/api/messages/[id]/thread/route.ts` — GET (replies + depth + count in one round-trip).
6. `src/app/api/conversations/[id]/disappearing/route.ts` — POST (set timer), GET (current setting).
7. `src/app/api/messages/scheduled/route.ts` — POST (schedule), GET (list + optimalTimes), DELETE (cancel via ?id=).

### Overlay components (5) — client, OverlayShell-based
1. `src/components/overlays/message-reactions.tsx` — `MessageReactions({ open, onClose, messageId?, userId? })`. Dialog variant, 4×2 emoji grid, emerald highlight for the user's reactions, count badge per emoji. Dispatches `circle:message-reactions` with `{ messageIds: [messageId] }`.
2. `src/components/overlays/message-edit-history.tsx` — `MessageEditHistory({ open, onClose, messageId? })`. Dialog variant, vertical timeline: current version (emerald dot) at top, previous versions (struck-through) below in reverse-chronological order. Dispatches `circle:edit-history` with `{ messageId }`.
3. `src/components/overlays/reply-thread.tsx` — `ReplyThread({ open, onClose, messageId?, parentBody?, parentSender?, parentInitials?, parentColor?, parentCreatedAt? })`. Dialog variant, parent message at top, list of replies below. Color-coded sender avatars. Dispatches `circle:reply-thread` with `{ messageId }`.
4. `src/components/overlays/disappearing-messages.tsx` — `DisappearingMessages({ open, onClose, conversationId?, setBy? })`. Sheet variant, 5 options (off/24h/7d/90d/view-once) as a radiogroup, emerald highlight for active, privacy footer with last-changed timestamp. Dispatches `circle:disappearing-messages` with `{ conversationId }`.
5. `src/components/overlays/scheduled-messages.tsx` — `ScheduledMessages({ open, onClose, conversationId? })`. Sheet variant with: composer (textarea + datetime-local + Schedule button), AI-suggested optimal times (one-tap to apply), queue list with per-row cancel (pending first). Dispatches `circle:scheduled-messages` with `{ conversationId }`.

## Custom events dispatched (5)
1. `circle:message-reactions` — detail `{ messageIds: string[] }` (after add/remove).
2. `circle:edit-history` — detail `{ messageId: string }` (on overlay open).
3. `circle:reply-thread` — detail `{ messageId: string }` (on overlay open).
4. `circle:disappearing-messages` — detail `{ conversationId: string }` (after change).
5. `circle:scheduled-messages` — detail `{ conversationId: string }` (after schedule/cancel).

## Prisma models needed (7)
```prisma
model MessageReaction {
  id        String   @id @default(cuid())
  messageId String
  userId    String
  emoji     String
  createdAt DateTime @default(now())
  @@unique([messageId, userId, emoji])
  @@index([messageId])
}

model MessageEditHistory {
  id        String   @id @default(cuid())
  messageId String
  oldBody   String
  editedAt  DateTime @default(now())
  @@index([messageId, editedAt])
}

model ReadReceipt {
  id              String   @id @default(cuid())
  conversationId  String
  messageId       String
  readerId        String
  readAt          DateTime @default(now())
  @@unique([conversationId, readerId])
  @@index([conversationId, messageId])
}

model TypingIndicator {
  id              String   @id @default(cuid())
  conversationId  String
  userId          String
  lastSeen        DateTime @default(now())
  @@unique([conversationId, userId])
  @@index([conversationId, lastSeen])
}

model MessageReply {
  id          String   @id @default(cuid())
  parentMessageId String
  replyMessageId String
  createdAt   DateTime @default(now())
  @@index([parentMessageId])
}

model DisappearingSetting {
  id              String   @id @default(cuid())
  conversationId  String   @unique
  duration        String   @default("off") // off | 24h | 7d | 90d | view-once
  setBy           String
  setAt           DateTime @default(now())
  @@index([conversationId])
}

model ScheduledMessage {
  id              String   @id @default(cuid())
  conversationId  String
  body            String
  scheduledFor    DateTime
  status          String   @default("pending") // pending | sent | cancelled
  createdAt       DateTime @default(now())
  @@index([conversationId, scheduledFor])
  @@index([status])
}
```

## Overlay-registry entries needed (5)
| id | name | emoji | category | event | keywords |
|---|---|---|---|---|---|
| `message-reactions` | Message Reactions | 👍 | social | `circle:message-reactions` | `["reaction","emoji","like","heart","love","laugh","react"]` |
| `message-edit-history` | Edit History | ✏️ | social | `circle:edit-history` | `["edit","history","version","previous","undo","message"]` |
| `reply-thread` | Reply Thread | 💬 | social | `circle:reply-thread` | `["reply","thread","conversation","response","nested"]` |
| `disappearing-messages` | Disappearing Messages | ⏳ | privacy | `circle:disappearing-messages` | `["disappearing","ephemeral","timer","privacy","auto-delete","self-destruct"]` |
| `scheduled-messages` | Scheduled Messages | 📅 | productivity | `circle:scheduled-messages` | `["schedule","later","timer","send","plan","message","draft"]` |

## Technical compliance
- `@ts-nocheck` at top of every created .ts/.tsx file.
- `"use client"` on all 5 overlay components.
- All overlays import `OverlayShell` from `@/components/ui/overlay-shell`.
- All overlays use `toast` from `sonner` for notifications.
- All client fetches use relative paths with 8s `AbortController` timeout (via shared `fetchWithTimeout` helper per file).
- Glass aesthetic: `bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl`.
- Emerald accent for active states (emerald-500 highlights, emerald-500/15 backgrounds, emerald-500/40 borders).
- Mobile responsive: `grid-cols-4 sm:gap-3`, `flex-col sm:flex-row`, `sm:max-w-md`, `sm:max-w-lg` patterns throughout.
- Full ARIA: `role="dialog"` via OverlayShell, `aria-label` on the shell, `aria-pressed`/`aria-checked` on toggle buttons, `aria-label` on every interactive control, keyboard navigable (focus trap + Tab cycle + Esc-to-close via OverlayShell).
- Fetch-stale-guard via `useRef` counter pattern (borrowed from chat-summary.tsx).
- Server-side: lib files import `db` from `@/lib/db` and `logger` from `@/lib/logger`.

## Lint status
`bun run lint` passes on all 19 created files (0 errors, 0 warnings). The only lint error in the repo is in `src/app/api/messages/voice/route.ts` (empty interface declaration) — created by a different agent, not in scope of this task.

## Notes for the integrator (Lead Architect)
1. **Run `bun run db:push` after adding the 7 Prisma models** above. The lib code calls `db.messageReaction.create(...)`, `db.messageEditHistory.findMany(...)`, etc. — these properties will not exist on the PrismaClient until the schema is pushed and the client is regenerated. Until then, the API routes will return 500 errors (caught and surfaced as JSON `{ error: msg }`).
2. **Existing reactions route**: there's already a `src/app/api/conversations/[id]/messages/[msgId]/reactions/route.ts` (uses displayName + a different Reaction model). My `src/app/api/messages/[id]/reactions/route.ts` is intentionally a separate route keyed on `userId` + the new `MessageReaction` model — they coexist; pick which one to call from the Wasl message bubble menu.
3. **Wiring**: each overlay accepts the context id(s) as props — `messageId` for reactions/edit/thread, `conversationId` for disappearing/scheduled, plus `userId` (reactions) and `setBy` (disappearing). The parent Wasl screen should pass the current user's circle id. Use the dispatched `circle:*` events to refresh Wasl state (reaction chips, edit labels, unread badges, etc.).
4. **Registry**: add the 5 entries above to `OVERLAY_REGISTRY` in `src/lib/overlay-registry.ts`. Wire them in `src/app/page.tsx` (dynamic import + useState + addEventListener for each event + Escape-handler reset), mirroring the `institution-register` overlay wiring pattern documented in worklog lines 8748–8768.
5. **Scheduled messages worker**: this task creates the data model + APIs. A separate background scheduler (cron or interval) needs to poll pending rows where `scheduledFor <= now()` and dispatch them as real Message rows, then call `markSent(id)`. The lib exposes `markSent` for that purpose.
