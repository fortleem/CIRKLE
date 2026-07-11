# news-frontend-02 — Frontend news features for the Cirkle home screen

**Agent:** frontend-developer
**Task ID:** news-frontend-02
**Scope:** Add offline caching, bookmarks, search/filter, social sharing, real-time WebSocket updates, multi-language toggle, and "For You" personalization to the Cirkle home screen news section (`src/screens/home-screen.tsx`). Plus a news socket.io mini-service on port 3004 and a `useNewsSocket` hook.

## Files produced / modified

### Modified
- **`src/app/api/news/categories/route.ts`** — added `?language=en|ar` query param; threaded through to `getNews(country, city, category, { perCategory, forceRefresh, language })`; response now echoes `"language": "en"|"ar"`. Backward-compatible (defaults to `"en"`).

### Created
- **`mini-services/news-service/index.ts`** (~370 lines) — socket.io server on port 3004. Polls `web_search` for breaking news every 60s per `(country, language)` tuple, emits `news:breaking` and `news:emergency` events to subscribed sockets. Mirrors the publisher map + `NON_PUBLISHER_HOSTS` filter + `isLikelyArticleUrl` + `sanitize` helpers from `src/lib/news-service.ts` so the mini-service stays self-contained. Detects emergency keywords (English + Arabic) and routes them through a separate `news:emergency` event so the client can surface a red toast. 3-retry backoff on `pending state` / `PreconditionFailed` / `429`. Graceful SIGTERM/SIGINT shutdown.
- **`src/hooks/use-news-socket.ts`** (~210 lines) — `useNewsSocket({ country, language, enabled, maxBreaking, onEmergency })` React hook. Connects via `io("/", { query: { XTransformPort: 3004 } })` per the Caddy gateway pattern. Auto-subscribes on connect, re-subscribes when country/language change (no reconnect). Maintains a deduped `breaking: NewsArticle[]` state. Exposes `{ socket, isConnected, breaking, clearBreaking, subscribe }`. The `onEmergency` callback is stored in a ref so it never re-triggers the connect effect.

### Modified (the main work)
- **`src/screens/home-screen.tsx`** — rewrote the entire News section (~280 → ~440 lines) plus added supporting state, hooks, and effects. Seven features wired in:

## Seven features delivered

### 1. Offline caching (localStorage)
- Cache key: `cirkle-news-cache-{category}-{lang}` (language-segmented so AR/EN don't collide).
- Entry shape: `{ articles: NewsArticle[], timestamp: number, expiry: 3_600_000 }` (1-hour TTL).
- On category fetch: cache is read first and shown immediately (with `servingFromCache=true`). A fresh fetch happens in the background; on success the cache is overwritten and the badge clears. On failure (network error or non-2xx), cached articles stay visible and an "Offline" badge renders next to the Live indicator.
- Same pattern for the "For You" recommendations (`cirkle-news-cache-for-you-{lang}`).

### 2. Bookmarks (localStorage)
- Cache key: `cirkle-news-bookmarks` — stores the **full** `NewsArticle[]` (not just IDs) so the Saved tab can render fully without re-fetching.
- Each article card has a `Bookmark` / `BookmarkCheck` icon (lucide-react) on the right side; click toggles state via `toggleBookmark(article, e)` which prevents propagation to the parent link.
- Dedupes by `sourceUrl`; new saves are prepended.
- Fires sonner `toast.success("Saved to your library")` or `"Removed from Saved"`.
- A new **"Saved" tab** appears at the end of the category tabs row, with a count badge when bookmarks exist. The saved-tab view re-syncs from the bookmarks array whenever bookmarks change.
- Bookmarks persist across sessions via localStorage.

### 3. News search/filter
- A small search input above the category tabs (with a `Search` icon and an `X` clear button).
- Typing into it:
  - **In category view** (non-empty query, not yet submitted): filters the current category's articles by title/summary keyword (instant, render-time `useMemo`).
  - **Cross-category**: triggers a debounced (350ms) `GET /api/news/search?q=...&country=...&language=...&limit=10` call. Server results are merged with locally-filtered current-category matches (deduped by `sourceUrl`).
- Shows a `Search results for: "<query>"` header with a "Clear" button.
- Clearing the input returns to category view.
- Category tabs are hidden while searching (to maximize result space).

### 4. Social sharing
- Each article card has a `Share2` icon (lucide-react) that opens a `DropdownMenu` (existing shadcn/ui component) with three items:
  - **"Share to Wasl"** → `window.dispatchEvent(new CustomEvent("share-to-wasl", { detail: { title, url, source } }))` + sonner `toast.success("Shared "…" to Wasl")`.
  - **"Share to Midan"** → `window.dispatchEvent(new CustomEvent("share-to-midan", { detail: { title, url, source } }))` + sonner `toast.success("Shared "…" to Midan")`.
  - **"Copy link"** → `navigator.clipboard.writeText(article.sourceUrl)` + sonner `toast.success("Link copied to clipboard")` (with a fallback error toast if the clipboard API is unavailable).
- Uses `Send`, `Users`, `Link as LinkIcon` icons for the three dropdown items.

### 5. Real-time WebSocket updates
- Wired `useNewsSocket({ country, language: newsLang, enabled: true, maxBreaking: 12, onEmergency })`.
- The `onEmergency` callback fires a `toast.error("⚠️ " + title, { description: summary || source, duration: 8000 })` so emergency alerts surface immediately.
- The Live indicator next to the News section header is now driven by the actual socket connection state:
  - **Connected**: pulsing emerald dot (`animate-ping` overlay) + `Wifi` icon + "Live" text.
  - **Disconnected / connecting**: muted dot + `WifiOff` icon + "Connecting…" text.
- New breaking items emitted by the server are merged into the breaking category view (deduped by `sourceUrl`, capped at 12).
- Items originating from the socket are tagged with a tiny "Live" badge + a pulsing dot inside the "Breaking" pill.
- The article list is wrapped in `<AnimatePresence initial={false}>` with a spring slide-in (`initial={{ opacity: 0, x: -24, y: 8 }}, animate={{ opacity: 1, x: 0, y: 0 }}, transition={{ type: "spring", stiffness: 320, damping: 30 }}`) for live-pushed items so they slide in from the left.

### 6. Multi-language toggle
- A small `Languages` icon button next to the Live indicator, showing "EN" or "AR".
- Toggling flips `newsLang` state (`"en" | "ar"`), persisted to `cirkle-news-lang` localStorage.
- The state change triggers a re-fetch of the current category with `language=en|ar` appended to the API URL — Arabic queries hit Arabic-language web_search results and Arabic AI fallbacks.
- The search input's `dir` attribute flips to `rtl` when `newsLang === "ar"`, and the placeholder text switches to Arabic ("ابحث في الأخبار…").
- The socket re-subscribes with the new language so live breaking news comes in Arabic too.

### 7. News personalization (reading history)
- `recordRead(article)` is called whenever the user clicks an article (both the title `<a>` and the icon `<a>` wire it).
- The article title is prepended to a `cirkle-reading-history` localStorage array (capped at 50 unique entries).
- A new **"For You" tab** appears as the **first** tab (before Breaking); selecting it triggers `GET /api/news/recommend?country=...&language=...&limit=8&history=<titles>` which uses the existing `getRecommendedNews()` server-side (LLM-driven topic suggestions → web_search resolution → 2-worker concurrency-limited resolution).
- The For You view shows a "Personalized for you" subtitle (with a "· based on N reads" tail when reading history is non-empty).
- Default landing tab is "For You" so users see personalized content immediately on app launch.

## Imports touched
- Added `useMemo, useRef` to the React import.
- Added `AnimatePresence` to the framer-motion import.
- Added `Bookmark, BookmarkCheck, Share2, Search, Wifi, WifiOff, X, Link as LinkIcon, Send` to the lucide-react import.
- Added `DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger` from `@/components/ui/dropdown-menu`.
- Added `useNewsSocket` + `NewsArticle as NewsArticleWS` from `@/hooks/use-news-socket`.

## Verification
- `bun run lint` → **0 errors, 0 warnings** (the 8 pre-existing `tsc` errors in `src/lib/ai.ts`, `src/lib/news-service.ts:134` duplicate-key, and `src/screens/home-screen.tsx:254` emergency-category concat were all there before this task and are unrelated to the news frontend feature work — confirmed via `git stash` + `tsc`).
- curl matrix against the running dev server:
  - `GET /api/news/categories?country=SA&category=breaking&perCategory=3&language=ar&forceRefresh=1` → **200**, 3 items with Arabic titles ("السعودية تطلق مبادرة وطنية لدعم المشاريع الصغيرة والمتوسطة") attributed to Al Jazeera / Reuters.
  - `GET /api/news/recommend?country=SA&language=ar&limit=3` → **200**, 3 items.
  - `GET /api/news/search?q=Riyadh&country=SA&language=en&limit=3` → **200**, 3 items from Al Arabiya English, Arab News, etc.
  - `GET /` (home page) → **200**, compiles in ~80–300ms.
- News mini-service running on port 3004 (verified via `ss -tlnp` — `bun` PID listening on `*:3004`).

## Notes for downstream agents
- The mini-service uses **dynamic** `import("z-ai-web-dev-sdk")` inside `getZAI()` so the SDK is only loaded on the first poll, not at startup. This keeps cold-start fast and means the service can boot even if the SDK is mid-install.
- The mini-service polls every 60s. The initial poll fires 8s after startup so subscribers see something quickly. To increase/decrease frequency, change `POLL_INTERVAL_MS`.
- The socket hook's `onEmergency` callback is stored in a ref so it never re-triggers the connect effect — consumers can pass an inline arrow function without worrying about reconnects. The home screen passes a `useCallback`-wrapped callback with empty deps for clarity.
- Bookmarks are stored as full `NewsArticle[]` in localStorage (not just IDs). This means the Saved tab can render fully offline. The trade-off is localStorage size — at ~500 bytes per article and a 200-article cap (enforced server-side by `addBookmark`), the worst case is ~100KB which is well within the 5MB localStorage quota.
- Reading history is capped at 50 unique titles. Only the most recent 30 are sent to `/api/news/recommend` to keep the LLM prompt bounded.
- The "For You" tab is the default landing tab (`useState<NewsCat>("for-you")`). To change this, edit the `useState` initializer.
- The Offline badge only renders when `servingFromCache === true`. The flag is set to `true` whenever cached articles are shown and the fresh fetch hasn't yet succeeded; it's cleared on successful fetch or when there's no cache to fall back to.
