# Task ID: P0-2-LAMAHAT
**Agent:** general-purpose
**Task:** Expand Lamahat (photos) screen to ≥8/10 audit score

## Context Read
- Read `/home/z/my-project/worklog.md` (last 100 lines) — codebase is a Next.js 16 PWA implementation of CIRKLE blueprint v12.0, with audit work showing ~12% full / 41% partial / 46% missing blueprint coverage.
- Read existing `/home/z/my-project/src/screens/lamahat-screen.tsx` (433 lines, 6/10 audit) — had: header with Brain AI button, basic stories bar with 6 hardcoded labels, AI memories banner (single button), 4 tabs (feed/reels/saved/tagged), Pinterest-style masonry grid with category gradients + author avatars + engagement metrics + hover overlays, LamahatViewer overlay.
- Read existing `/home/z/my-project/src/components/overlays/lamahat-viewer.tsx` (388 lines) — full-screen viewer with post + story modes, progress bars, reply input, comments, like/save/follow actions.

## Approach
Expanded the screen by adding **6 new feature modules** in-line within the same file (preserving existing features and the glass design system):

1. **Stories (ephemeral 24h)** — Added a proper `STORY_USERS` dataset (8 users incl. "Your story"), a reusable `StoryRing` component (gradient progress ring, count badge, seen vs un-seen styling, own-story dashed ring + add button), and a full-screen `StoryViewer` overlay with auto-advancing progress bars (one bar per story segment), tap-zones for prev/next, reply + react + share inputs, keyboard nav (Esc/arrows). Wired to open via "View all" button or ring click.
2. **Collections** — Added `COLLECTIONS` dataset (6 curated albums), horizontal scroll of cover cards with gradient cover + title + photo count + collaborator avatars + pinned star + Private/Shared indicator. "Create new" button triggers a toast + composer event.
3. **Memories (On this day)** — Added `MEMORIES` dataset (3 memories: 1y/2y/3y ago). Horizontal carousel of memory cards with gradient cover, year-ago badge, AI-sparkles icon, photo count, "Relive" CTA. Clicking opens LamahatViewer in story mode.
4. **Improved Discovery** — Added search bar (with clear button), sort dropdown (Recent/Popular/Most Liked with icons), category filter chips (All/Travel/Food/Nature/Friends/Art/Architecture) with active gold state, and a discovery summary line showing filter count.
5. **Improved Gallery** — Added varying card sizes (every 5th card flagged as "Featured" with `sm:column-span-2` + Featured badge on hover), kept existing hover overlays + category pills + engagement stats. Added infinite scroll via IntersectionObserver on a sentinel ref, "Load more" button as fallback, and "You're all caught up" end-of-feed state.
6. **Moments (permanent posts)** — Added `MOMENTS` dataset (3 permanent posts with full engagement: likes/comments/shares/views + location + pinned Crown badge). Each moment card has author row, photo (gradient cover + category pill), caption, full engagement action bar (Like/Comment/Share/Views + Save bookmark), opens LamahatViewer in post mode.

## Files Modified
- `/home/z/my-project/src/screens/lamahat-screen.tsx` — **433 → 1270 lines** (+837 lines, ~3× expansion)

## New Imports (lucide-react)
Added: `Search, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight, FolderPlus, Images, Clock, Calendar, Flame, TrendingUp, Star, X, History, MapPin, Volume2, Smile, ArrowUpDown, Crown, Gift, CircleUser, Send, Share2, MoreHorizontal`. Preserved: `Sparkles, Layers, Heart, Plus, Grid3x3, Bookmark, Film, Camera, Loader2, Brain, ShieldCheck, MessageCircle, Eye`.

## Preserved Features (no regressions)
- ✅ Masonry Pinterest-style grid (columns-2/3/4 responsive)
- ✅ Category-tinted gradients + texture sheen overlay
- ✅ Author avatars + initials (deterministic per photo id)
- ✅ Engagement metrics (likes/comments/views) on hover
- ✅ Hover overlays (top scrim, bottom gradient, zoom-on-hover)
- ✅ "No filters · No tracking · Your photos, your control" tagline
- ✅ Brain AI button (`onBrainRecommend` → `/api/brain/cross-evaluate`)
- ✅ Capture + Create buttons dispatching `circle:composer` events
- ✅ 4 tabs (Feed / Lamahat Reels / Saved / Tagged)
- ✅ Empty-state messaging
- ✅ LamahatViewer integration (post + story modes)
- ✅ `enrichPhoto` deterministic mock engagement
- ✅ useQuery(`/api/posts?module=lamahat`) fetch
- ✅ `useApp` country/city + `useAuth` user hooks
- ✅ `toast` from sonner for feedback

## Compliance with Remediation Rules
- ❌ Did NOT touch Matrix / IPFS / ONNX / CLIP / decentralized storage / local mesh
- ❌ Did NOT use line count as acceptance criterion (features drive expansion, not LOC padding)
- ✅ Used existing Tailwind classes + glass design system (`glass`, `glass-strong`, `bg-gradient-gold`, `bg-gradient-mesh`, `bg-gradient-hero`, `text-cream`, `text-brand-charcoal`, `font-display`, `scrollbar-hide`, `shadow-float`)
- ✅ Added only lucide-react icons (no new icon library)
- ✅ Used `IntersectionObserver` (native browser API) for infinite scroll — no new deps
- ✅ Followed existing `prevKey`/derived-state pattern from `LamahatViewer` to avoid `setState-in-effect` lint error

## Lint Status
`bun run lint` — ✅ **passes** (0 errors, 0 warnings) after fixing one initial `react-hooks/set-state-in-effect` violation by switching from `useEffect`-based reset to the derived-state-with-prevKey pattern that `LamahatViewer` already uses.

## Dev Server
File saved — hot reload will pick up changes. No new dependencies, no schema changes, no new API routes needed (all data is client-side mock + existing `/api/posts?module=lamahat` + existing `/api/brain/cross-evaluate`).
