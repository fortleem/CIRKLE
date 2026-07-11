# Task 5-c — Lamahat (Photos) + Mashahd (Video)

**Agent:** full-stack-developer
**Task ID:** 5-c
**Scope:** Implement the Lamahat (Photos) and Mashahd (Video) modules for Circle's Next.js 16 web app.

## Work Log

1. Read the master `worklog.md` and foundation files (`page.tsx` router, `ModuleHeader`, `CircleAvatar`, `modules.ts`, `types.ts`, `mock-data.ts`, `circle-store.ts`) to understand the established patterns and import paths.
2. Verified the shadcn/ui components available in `src/components/ui/*` (Dialog, Sheet, DropdownMenu, Tooltip, Select, ScrollArea, Badge, Button, Card, Input, Textarea, Label) so the new modules could reuse them instead of building from scratch.
3. **LamahatModule** (`src/components/modules/lamahat/lamahat-module.tsx`, ~1540 lines):
   - Module color: `rose`. Header tabs: Following · For You · Nearby · Trending (default For You).
   - `coverToGradient(cover)` helper maps the `mediaCover` field (`khan`, `nile`, `dawn`, `circle-tour`, `koshari`, `azhar`, `felucca`, `matrix-deep`) to rich CSS gradients (conic / radial / linear combos using only the brand palette — no external images, no blue/indigo).
   - **Stories rail**: 10 stories, first is "Your Story" with a `+` overlay; each story has a rose-gradient ring; tapping opens a right-side `Sheet` story viewer with per-slide progress bars, auto-advance after 5s via `requestAnimationFrame`, pause on pointer-down (hover/tap), "Reply via Wasl" + heart react buttons, prev/next tap zones.
   - **Photo masonry grid**: CSS `columns-2 sm:columns-3 lg:columns-4 xl:columns-5` with `break-inside-avoid` cards (no layout jank). Each card has a gradient cover, author row (avatar, name, handle, verified badge, timestamp, `...` DropdownMenu), 3-line clamped caption, location pin with a privacy Tooltip ("Coarse geohash only — precise location never shared"), and an action row with an animated heart (spring scale on like, increments count), comment, share, bookmark.
   - One mock post (`lp7_mature`) carries `mature: true` and is blurred by default with a "Reveal"/"Hide" toggle (simulated NSFW blur).
   - **Visual Search** FAB (bottom-right, above Capture): opens a Dialog titled "On-Device Visual Search" with an upload zone, a fake CLIP search progress animation (0→100%), then a 6-item results grid drawn from the public feed.
   - **Nearby tab**: larger cards in a 1/2/3-column grid with distance labels ("850m away", "842 km away") and a top privacy banner ("Showing posts within 10 km. Your precise location is never sent — only a coarse geohash (level 5)").
   - **Following tab**: chronological posts from followed users, each tagged "You follow".
   - **Trending tab**: posts sorted by engagement velocity (likes + comments·2 + shares·3, divided by hours ago), each with a flame "Hot" badge.
   - **Capture Glimpse FAB**: opens a composer Dialog with a photo upload zone, caption Textarea, location-precision Select (None / City / Neighborhood / Precise — default Neighborhood), visibility Select (Public / Followers / Friends / Anonymous), and a tags Input.
4. **MashahdModule** (`src/components/modules/mashahd/mashahd-module.tsx`, ~1100 lines):
   - Module color: `teal`. Header tabs: For You · Subscriptions · Trending · Live · Shorts (default For You).
   - **Hero featured video** (For You tab): 16:9 gradient thumbnail, play-button overlay, title, channel avatar + verified badge, views · upload date, duration badge, Watch Party / Save / Share buttons, "Seeded by 1,240 peers" footer.
   - **Category chips**: All, Travel, Food, Tech, Music, Live, Shorts, Educational, Gaming — filter the grid.
   - **Video grid**: 1/2/3-4 columns. Each card has a gradient thumbnail, duration badge (or LIVE badge + viewer count for live videos), category badge, watch-progress bar (rose) for partially-watched videos, channel avatar overlap at bottom-left, 2-line clamped title, channel + verified, views · relative upload date. Hover reveals a play preview, Watch Party button, Add-to-playlist button, and a three-dot DropdownMenu (Save to Watch Later, Add to playlist, Download for offline, Copy IPFS CID, Translate captions, Report).
   - **Shorts row**: horizontal scroll of vertical 9:16 cards with teal-gradient backgrounds, title, channel, like count.
   - **Live tab**: live-only videos, larger cards (col-span-2 on sm+), pulsing LIVE badge and viewer count.
   - **Shorts tab**: full vertical 9:16 short-form feed (max-width 420px, scrollable). Each short has a gradient bg, caption overlay (English + Arabic), channel row with Follow button, right-side action rail (heart/comment/share with counts), and a decorative progress bar.
   - **Watch Party**: clicking "Watch Party" on any video opens a Dialog with the video preview, an "Invite Circle members" search box, a scrollable invitee list (6 mock members, online/offline status, check-toggle), and a "Start Watch Party (N)" button. On start, a right-side Sheet takes over with: video player area, "Sync: ✓" indicator (toggleable), participant avatar strip, and a synced Wasl chat sidebar (E2EE badge, pre-seeded 5-message conversation, live send via Enter key, auto-scroll to bottom).
   - **Upload Video FAB**: opens a Dialog with a file drop zone, title Input, description Textarea, visibility Select (Public / Unlisted / Circle), category dropdown, and a "Publish to IPFS + PeerTube" button. Fake progress: "Uploading to IPFS… 0% → 100%" (spinner + bar), then "Pinning to community node…" (Server icon, 1.4s delay), then "Live! CID: Qm…" with a generated CID and "3 peers already seeding · 0% hosting cost" footer.
5. Both modules use only the brand palette (teal/gold/rose/steel/charcoal/cream) — no indigo, no blue, no external images (all "media" is CSS gradients). Animations use `framer-motion` for fade-in, hover, and story progress. All interactive elements have aria labels or Tooltips. All avatars use the shared `CircleAvatar` component. All API-free — fully client-side with local state (no `/api/...` calls, no ports).
6. Ran `bun run lint` — 0 errors and 0 warnings in my two files. (Two pre-existing warnings in `wasl-module.tsx` are not mine.)
7. Verified the dev server (`GET /` → 200) shows no new errors after my edits. The two modules import cleanly alongside the rest of the app.

## Stage Summary

**Files produced:**
- `src/components/modules/lamahat/lamahat-module.tsx` — full Lamahat (Photos) module (was a stub).
- `src/components/modules/mashahd/mashahd-module.tsx` — full Mashahd (Video) module (was a stub).

**Key features delivered:**
- Lamahat: stories rail + 5s-auto-advancing Sheet viewer, masonry photo grid with NSFW blur toggle, on-device visual search dialog, 4 tabs (Following / For You / Nearby / Trending with engagement-velocity sort), Capture Glimpse composer, location-privacy tooltips, heart/comment/share/bookmark with spring animations.
- Mashahd: hero featured video, category chips, responsive video grid with hover actions + watch-progress bars, horizontal Shorts row, full-screen Shorts feed with vertical 9:16 cards, Live tab with pulsing badges, Watch Party flow (invite dialog → synced Sheet with Wasl chat sidebar + Sync indicator), Upload dialog with simulated IPFS pinning + CID generation.

**Constraints honoured:** rose + teal module colors, brand palette only, CSS gradients for all media (no external images), relative paths only, shadcn/ui components reused, `framer-motion` for animation, `CircleAvatar` for all avatars, `ModuleHeader` at the top of each module.
