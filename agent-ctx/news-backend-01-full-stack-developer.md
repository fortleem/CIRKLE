# news-backend-01 — Real-time news, multi-language, search, personalization, bookmarks (backend)

**Agent:** full-stack-developer (backend)
**Task ID:** news-backend-01
**Scope:** Backend features for the Cirkle news system: real-time WebSocket push, Arabic/English multi-language support, cross-category keyword search, AI-driven recommendations, and in-memory bookmark CRUD. Created/modified files in `src/lib/`, `src/app/api/news/`, and `mini-services/news-service/`.

> **Note on parallel work:** The frontend agent (news-frontend-02) had already created `mini-services/news-service/index.ts` (with `[news-ws]` log prefix, `pollBreakingNews` loop, emergency keyword detection) and wired `?language=` into `src/app/api/news/categories/route.ts`. I preserved their work and added the spec-required pieces I was missing (room join, immediate-fetch-on-subscribe, English country name map) — see the **News-service enhancements** section below.

## Files created / modified

### Modified
- `src/lib/news-service.ts` — 709 → 1110 lines. Added `NewsLanguage` type, threaded `language` through `buildQuery` / `cacheKey` / `getCached` / `setCached` / `fetchCategory` / `getNews` / `aiGenerateFallback`; added Arabic query + Arabic AI-prompt variants; appended `searchNews()`, `getRecommendedNews()`, and bookmark CRUD functions at the bottom.
- `mini-services/news-service/index.ts` — added `socket.join("news")` on connect, an immediate breaking-news fetch in the `subscribe` handler, an `ENGLISH_COUNTRY_NAMES` map + `buildBreakingQuery()` helper, and debug logging in the initial-fetch path. Updated both `pollBreakingNews()` and the initial fetch to use `buildBreakingQuery()`.

### Created
- `src/app/api/news/search/route.ts` — `GET /api/news/search?q=&country=&category=&limit=&language=`
- `src/app/api/news/recommend/route.ts` — `GET /api/news/recommend?country=&history=t1,t2&limit=&language=`
- `src/app/api/news/bookmarks/route.ts` — `GET` / `POST` / `DELETE` on one route file

## What I built

### 1. `src/lib/news-service.ts` extensions

#### Multi-language (`NewsLanguage = "en" | "ar"`)
- `buildQuery(category, country, city, language)` emits Arabic queries when `language === "ar"`:
  - `breaking` → `أخبار عاجلة السعودية اليوم`
  - `local` → `السعودية الرياض أخبار محلية اليوم` (with city)
  - `international` → `أخبار العالم اليوم`
  - `sports` → `السعودية أخبار رياضية اليوم`
  - `economy` → `السعودية أخبار الاقتصاد والأعمال اليوم`
  - `technology` → `أخبار التكنولوجيا اليوم`
  - `health` → `أخبار الصحة اليوم`
  - `entertainment` → `أخبار الترفيه اليوم`
  - Uses `country.arabicName` with English fallback.
- `aiGenerateFallback(category, country, city, count, language)`:
  - Arabic system prompt: `"أنت مساعد مفيد لتلخيص الأخبار. أخرج JSON صارم فقط..."`
  - Arabic user prompt asks for `${count} عناصر أخبار ${label} لـ ${locationAr}` with Arabic category labels (`CATEGORY_LABELS_AR`).
  - Source attribution (publisher name) stays the same — international sources remain international (e.g. Al Jazeera, Reuters, BBC). This is the legal-compliance requirement.
- For Arabic, `fetchCategory` no longer appends `" news"` to the search query — the Arabic query already reads naturally as a search phrase, and the English word "news" would dilute Arabic recall.
- Cache key now includes language: `${country}|${city}|${category}|${language}` — EN and AR results don't collide.
- `GetNewsOptions` got a new `language?: NewsLanguage` field (default `"en"`).

#### `searchNews(query, country?, category?, options?)`
- Cross-category keyword search via `web_search`.
- `inferCategoryFromQuery(q)` regex-matches the query against English + Arabic keyword sets:
  - `sport|football|soccer|...|رياض|كرة|كرة القدم` → `sports`
  - `econom|business|market|...|اقتصاد|أعمال|مال|أسواق` → `economy`
  - `tech|ai|software|...|تقني|تكنولوج|ذكاء اصطناعي` → `technology`
  - `health|medical|disease|...|صحة|طب|مرض` → `health`
  - `entertain|movie|film|...|ترفيه|فيلم|سينما|موسيقى` → `entertainment`
  - `world|global|international|دولي|عالم` → `international`
  - `local|city|محلي|بلدي` → `local`
  - default → `breaking`
- Composes search query as `${query} ${countryToken} news` (English) or `${query} ${countryToken} أخبار` (Arabic).
- Falls back to `aiGenerateFallback` if web search returns nothing; pads with AI fallback if too few real results.
- `SearchNewsOptions.limit` clamped to 3–20 (default 10).

#### `getRecommendedNews(country, readingHistory, options?)`
3-step AI-driven personalization:
1. **Topic suggestion**: send the user's reading history (capped at 30 titles) to the LLM and ask for `${limit}` new related topics. Each suggestion has `{topic, category}`. Arabic or English prompts.
2. **Topic → article resolution**: for each suggestion, call `web_search` and take the first article. Concurrency-limited to 2 workers to avoid 429s. De-dupes by `sourceUrl` across all resolutions.
3. **Padding**: if we still don't have `${limit}` items, fetch fresh `breaking` items via `fetchCategory()` and add the missing ones.
- Fallbacks:
  - Empty reading history → fetch `breaking` + `technology` mix.
  - LLM call fails → fetch fresh `breaking` items.
- `RecommendedNewsOptions.limit` clamped to 3–12 (default 8).

#### Bookmark CRUD (in-memory)
- Module-level `bookmarksStore: Map<string, NewsItem[]>` — survives hot reloads, resets on server restart.
- `getBookmarks(userId)` — returns a slice (defensive copy).
- `addBookmark(userId, article)` — de-dupes by `sourceUrl`. If the URL already exists, replaces the existing bookmark with the new article (so the caller can refresh title/summary). New bookmarks are unshifted to the front. Caps at 200 per user (drops oldest from the end).
- `removeBookmark(userId, articleId)` — filters by both `id` and `sourceUrl` (so callers can pass either).
- `clearBookmarks(userId)` — full wipe.
- `bookmarkIdForArticle(article)` — stable URL-derived id `bm-${hash(sourceUrl).toString(36)}`. Lets clients de-dupe and remove bookmarks even after a server restart.

### 2. API routes

#### `GET /api/news/search?q=keyword&country=SA&category=sports&limit=10&language=en`
- 400 on missing `q`.
- 400 on invalid `category` (must be one of `NEWS_CATEGORIES`).
- `language` defaults to `"en"`, accepts `"ar"`.
- `limit` clamped to 3–20 (default 10).
- Response:
  ```json
  {
    "query": "football",
    "country": "SA",
    "category": "auto",         // or the explicit category
    "language": "en",
    "generatedAt": "...",
    "count": 3,
    "items": [NewsItem, ...],
    "sources": 3,
    "elapsedMs": 1234
  }
  ```

#### `GET /api/news/recommend?country=SA&history=t1,t2,t3&limit=8&language=en`
- `history` accepts either a single comma-separated string (`?history=a,b,c`) or repeated params (`?history=a&history=b`).
- `limit` clamped to 3–12 (default 8).
- Response:
  ```json
  {
    "country": "SA",
    "language": "en",
    "historyCount": 3,
    "generatedAt": "...",
    "count": 8,
    "items": [NewsItem, ...],
    "sources": 6,
    "elapsedMs": 4521
  }
  ```

#### `GET / POST / DELETE /api/news/bookmarks`
- `GET ?userId=u1` → 200 `{userId, count, items}`. 400 if no userId.
- `POST` body `{userId, article}`:
  - 400 if no userId.
  - 400 if no article or article missing `title` / `sourceUrl`.
  - Normalizes the article to canonical `NewsItem` shape (fills in `summary`, `source`, `category`, `publishedAt` defaults).
  - 200 `{userId, count, items}` with the updated list.
- `DELETE ?userId=u1&articleId=bm-abc` (or body `{userId, articleId}`):
  - 400 if no userId / articleId.
  - 200 `{userId, count, items}` — idempotent (deleting a non-existent articleId returns 200 with 0 items).

### 3. News-service mini-service enhancements

The file `mini-services/news-service/index.ts` was created by the parallel frontend agent with the core skeleton:
- `socket.io` server on port 3004, `path: "/"`, hard-coded port.
- `pollBreakingNews()` runs every 60s, collects unique `(country, language)` tuples from connected sockets, calls `web_search`, emits `news:breaking` and `news:emergency` events.
- Emergency keyword detection (English + Arabic).
- `subscribe { country, language }` event handler that emits a `news:subscribed` ack.
- Dedup via `lastPushedUrls` Set (max 200).

**What I added:**

1. **`socket.join("news")` on connect** — the spec requires joining clients to a `"news"` room. The frontend agent's version didn't do this; I added it inside the `io.on("connection")` handler. (The per-socket subscription still controls which broadcasts a socket actually receives — the room is for future `io.to("news").emit(...)` use cases.)

2. **Immediate breaking-news fetch on subscribe** — without this, subscribers had to wait up to 60s for the first `pollBreakingNews()` tick. I added an IIFE in the `subscribe` handler that fires `searchWeb()` immediately and pushes any new articles to the socket. Reuses the `lastPushedUrls` dedup so the periodic poll won't re-push them.

3. **`ENGLISH_COUNTRY_NAMES` map + `buildBreakingQuery()` helper** — the existing code built queries like `breaking news SA today news` (using the ISO-2 code). The upstream search returned mostly news-aggregator homepages (e.g. `https://edition.cnn.com/`), which `isLikelyArticleUrl()` correctly rejected, leaving the socket silent. I added a 40-entry ISO-2 → English country name map (`SA → Saudi Arabia`, `AE → United Arab Emirates`, `US → United States`, etc.) and a `buildBreakingQuery(country, language)` function that produces `breaking news Saudi Arabia today` (English) or `أخبار عاجلة السعودية اليوم` (Arabic, using the existing `arabicCountryName()` helper). Updated both `pollBreakingNews()` and the immediate-on-subscribe fetch to use it. Verified: the same query now returns real article URLs from Al Arabiya, BBC, etc.

4. **Debug logging** in the initial-fetch path: `[news-ws] initial fetch for SA/en, query="..."`, `[news-ws] initial fetch returned N raw result(s)`, `[news-ws] initial fetch mapped to M article(s)`. Useful for operators to see what the service is doing without having to instrument the client.

## Work Log

1. Read `/home/z/my-project/worklog.md` (Tasks 1, 3, 5-c, 10, 12, 32, fix-news-home-03, categorized-news-web-02, news-frontend-02) — foundation + chat-service pattern + categorized news lib + frontend news features already wired to my new endpoints by the parallel frontend agent.
2. Read `src/lib/news-service.ts` (709 lines) end-to-end. Read `mini-services/chat-service/index.ts` (383 lines) as the socket.io reference. Read `src/app/api/news/categories/route.ts` for the existing API pattern.
3. Inspected `node_modules/z-ai-web-dev-sdk/dist/index.d.ts` to confirm the `functions.invoke("web_search", {query, num})` and `chat.completions.create()` signatures.
4. Extended `src/lib/news-service.ts`:
   - Added `NewsLanguage` type.
   - Updated `buildQuery()` with Arabic variants (uses `country.arabicName`).
   - Threaded `language` through `cacheKey`, `getCached`, `setCached`, `fetchCategory`, `getNews`.
   - Updated `aiGenerateFallback()` with Arabic system + user prompts; preserved publisher attribution.
   - For Arabic, `fetchCategory` skips appending the English word `"news"` to the query.
   - Added `searchNews()` with category-inference regex (English + Arabic keyword sets).
   - Added `getRecommendedNews()` with 3-step AI personalization (LLM topics → web_search resolution → breaking-news padding).
   - Added bookmark CRUD: `getBookmarks`, `addBookmark`, `removeBookmark`, `clearBookmarks`, `bookmarkIdForArticle`. Module-level `Map<userId, NewsItem[]>`, de-dupe by `sourceUrl`, 200-item cap per user.
5. Created `src/app/api/news/search/route.ts` — GET handler with query validation, `limit` clamp (3–20), `language` param, 400s on missing `q` / invalid `category`.
6. Created `src/app/api/news/recommend/route.ts` — GET handler that parses `history` (comma-string or repeated params), `limit` clamp (3–12), `language` param.
7. Created `src/app/api/news/bookmarks/route.ts` — three handlers (GET / POST / DELETE) on one route file. POST normalizes the article, validates required fields. DELETE accepts query params OR JSON body, idempotent on non-existent articleId.
8. Enhanced `mini-services/news-service/index.ts` (the file existed from the parallel frontend agent):
   - Added `socket.join("news")` on connect.
   - Added immediate breaking-news fetch in the `subscribe` handler.
   - Added `ENGLISH_COUNTRY_NAMES` map (40 entries) + `buildBreakingQuery()` helper.
   - Updated both `pollBreakingNews()` and the initial fetch to use `buildBreakingQuery()`.
   - Added debug logging in the initial-fetch path.
9. Ran `bun install` in `mini-services/news-service/` — `socket.io` + `z-ai-web-dev-sdk` resolved cleanly.
10. Started the news-service via `setsid -f bun run dev` (port 3004). After some trial-and-error, learned that `nohup ... &` alone wasn't enough — the parent shell's exit was taking the child with it despite `disown`. `setsid -f` fully detaches the process (re-parented to init). Verified the service survived 28+ seconds and is still running.
11. Tested the WebSocket push end-to-end with a `socket.io-client` script:
    - `connect` event fired.
    - `subscribe { country: "SA", language: "en" }` emitted.
    - `news:subscribed` ack received with `{country, language, lastPushAt}`.
    - `news:breaking` event received with article `"Saudi Arabia Latest and Breaking News - Al Arabiya"`.
12. Tested all 3 new API endpoints with curl:
    - `GET /api/news/search?q=Riyadh%20metro&country=SA&limit=4` → 200, 4 items from AP News, BBC, etc. `category=auto`.
    - `GET /api/news/search?q=football&country=SA&limit=3` → 200, 3 sports items (Saudi Pro League, etc.) — category correctly inferred as `sports`.
    - `GET /api/news/recommend?country=SA` (no history) → 200, 8 items (fallback to breaking + tech mix).
    - `GET /api/news/recommend?country=SA&history=World%20Cup%202026,Saudi%20Pro%20League&limit=4` → 200, 4 items — first item about LIV Golf / Saudi sovereign wealth fund sports investment, highly relevant.
    - `GET /api/news/recommend?country=SA&history=Saudi%20Vision%202030,Neom%20city,Riyadh%20Season&limit=5` → 200, 5 items including entertainment article about Riyadh Season and economy article about Vision 2030.
    - Bookmarks full CRUD cycle: POST → 1 item, GET → confirms 1 item, DELETE by query param → 0 items, GET → confirms 0 items. Duplicate-POST de-dupes by `sourceUrl`. DELETE without userId → 400. GET without userId → 400. DELETE non-existent → 200, 0 items.
13. Verified multi-language support via the existing `/api/news/categories` route (which the parallel frontend agent had already wired to my new `language` option): `?country=SA&category=breaking&perCategory=3&language=ar&forceRefresh=1` → 200, real Arabic articles from Al Arabiya (e.g. `آخر أخبار السعودية الحصرية - العربية` with Arabic summary). Publisher attribution correctly preserved as `Al Arabiya`.
14. `bun run lint` → 0 errors, 0 warnings throughout.

## Stage Summary

- **`src/lib/news-service.ts`** (709 → 1110 lines): added `NewsLanguage` type; `buildQuery()` now emits Arabic queries (e.g. `أخبار عاجلة السعودية اليوم`); `aiGenerateFallback()` uses Arabic system+user prompts when `language="ar"`; cache key includes language; new `searchNews()` does cross-category keyword search with category inference from English+Arabic keywords; new `getRecommendedNews()` does 3-step AI personalization (LLM topic suggestions → web_search resolution → breaking-news padding); new bookmark CRUD (`getBookmarks` / `addBookmark` / `removeBookmark` / `clearBookmarks` / `bookmarkIdForArticle`) backed by an in-memory `Map<userId, NewsItem[]>` with de-dupe by `sourceUrl` and a 200-item cap per user.
- **`src/app/api/news/search/route.ts`** — `GET /api/news/search?q=&country=&category=&limit=&language=`. Returns real NewsItems via `searchNews()`, with category auto-inference and 3–20 result clamp.
- **`src/app/api/news/recommend/route.ts`** — `GET /api/news/recommend?country=&history=t1,t2&limit=&language=`. Returns AI-recommended NewsItems via `getRecommendedNews()`. History accepted as comma-string or repeated params.
- **`src/app/api/news/bookmarks/route.ts`** — `GET` / `POST` / `DELETE` on one route file. In-memory CRUD via the new `getBookmarks` / `addBookmark` / `removeBookmark` functions. 400s on missing `userId` / `article` / required article fields. DELETE accepts query params OR JSON body. Idempotent deletes.
- **`mini-services/news-service/index.ts`** — added `socket.join("news")` on connect, an immediate breaking-news fetch on `subscribe` (so clients see content within seconds instead of waiting up to 60s for the first poll), and an `ENGLISH_COUNTRY_NAMES` map + `buildBreakingQuery()` helper that produces search-friendly queries using full country names (the ISO-2-only queries were returning news-aggregator homepages that the URL filter rejected). News-service running on port 3004, verified end-to-end: socket.io-client connects → emits `subscribe` → receives `news:subscribed` ack → receives `news:breaking` event with a real article from Al Arabiya.
- **All three services up**: port 3000 (Next.js dev), 3003 (chat-service), 3004 (news-service).
- **`bun run lint`** → 0 errors, 0 warnings.
- **z-ai-web-dev-sdk used server-side only**: `src/lib/news-service.ts` has `import "server-only"` at line 1; the mini-service is a separate bun project (no client-side exposure); all API routes use `NextRequest` / `NextResponse` (route handlers are server-side by default in Next.js App Router).
