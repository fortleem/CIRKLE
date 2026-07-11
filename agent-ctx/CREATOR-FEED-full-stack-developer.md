# CREATOR-FEED — full-stack-developer

## Scope
Built creator monetization (Commit micropayments + Mint verified badge + subscriptions + payouts) and an algorithmic Midan feed (follow graph + recency + engagement + trending + diversity + dwell tracking).

## Files
**Created (8):**
- `prisma/schema.prisma` — appended 5 models: `CreatorProfile`, `CreatorSupport`, `Subscription`, `Follow`, `PostInteraction`.
- `src/app/api/creator/profile/route.ts` — GET (public profile, default stub) + POST (upsert own profile, validated tier/payoutMethod).
- `src/app/api/creator/support/route.ts` — POST one-off Commit micropayment, bumps creator totals.
- `src/app/api/creator/subscribe/route.ts` — POST subscribe/cancel (upsert on @@unique([creator,subscriber])) + GET list.
- `src/app/api/creator/earnings/route.ts` — GET aggregated dashboard (all-time/this-month/30d, top supporters, monthly recurring, subscribers, recent activity).
- `src/app/api/follow/route.ts` — POST follow + DELETE unfollow + GET list (direction=following|follower). Idempotent.
- `src/lib/feed-algorithm.ts` — server-only. `rankFeedForUser()` (recency +30, social +40, engagement +50, trending +20, diversity 3/author) + `trackInteraction()` upsert helper.
- `src/components/overlays/creator-studio.tsx` — 4-tab fullscreen overlay (Overview / Monetization / Subscribers / Payouts) using OverlayShell.

**Modified (5):**
- `src/app/api/posts/route.ts` — added `?algo=true&username=…&limit=…` (calls rankFeedForUser), single-post tracking mode `?id=…&track=view|dwell&username=…` (beacon-friendly), and fixed 4 pre-existing TS errors in the POST handler body type.
- `src/screens/midan-screen.tsx` — Support button (opens SupportSheet), Follow/Following button (optimistic, synced with /api/follow), `algo=true&username=…` on "For you" filter, IntersectionObserver-based view + dwell tracking via navigator.sendBeacon. Fixed 3 pre-existing TS errors (`p.user` → `p.name`).
- `src/app/page.tsx` — dynamic import of CreatorStudio, state, Escape handler entry, event listener for `circle:creator-studio`, cleanup, render.
- `src/lib/overlay-registry.ts` — added creator-studio entry (finance category).
- `src/screens/home-screen.tsx` — added Creator Studio EXCLUSIVES card + Coins lucide import.

## Algorithm
`rankFeedForUser(username, posts, limit=20)`:
1. Loads user's follows → `followingSet`.
2. Loads last 100 interactions → `engaged` map.
3. Scores each post:
   - recency: `exp(-ageHours/72) * 30`
   - social: +40 if `followingSet.has(authorHandle)`
   - engagement: `min(likes*1 + comments*3 + shares*5, 50)`
   - trending: +0..+20 if last 6h AND engagement > 50
   - down-rank: ×0.85 if user already liked
4. Sorts by score desc.
5. Caps at 3 posts per author in final list.
6. Best-effort bulk tracks a "view" for each served post.

## Validation
- `bun run db:push` ✔ (schema applied, Prisma Client regenerated)
- `bunx tsc --noEmit` — 0 errors in my files (all 21 remaining errors are in pre-existing untouched files: contacts, shield/report, shield-engine, mashahd-screen, wasl-screen). Reduced total from 25 → 21 by fixing 4 pre-existing TS errors in /api/posts/route.ts POST + 3 in midan-screen.tsx.
- `bunx eslint <my 12 files>` — 0 errors, 0 warnings ✔
- `bun run lint` (whole project) — 5 pre-existing problems remain (4 in call-screen.tsx, 1 in cirkle-mint.tsx) — none in my files.

## Constraints honored
- No new npm deps.
- No edits outside the listed files (only prisma/schema.prisma exception, allowed by brief).
- All DB access via `import { db } from "@/lib/db"`. `feed-algorithm.ts` is `server-only`.
- Brand palette ONLY — no indigo, no blue.
- Mobile-first responsive, 44px touch targets, semantic HTML, max-h-[60vh] overflow-y-auto on long lists.
