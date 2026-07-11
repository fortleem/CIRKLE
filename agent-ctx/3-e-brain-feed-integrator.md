# Task 3-e — Brain-Feed Integrator

**Goal:** Wire Cirkle Brain AI + ZAI `web_search` into the home page Featured
section so it's truly AI-driven, web-connected, and always learning.

## Files edited (exactly 2 — the only files this agent is allowed to touch)

1. `src/lib/ai.ts` — added `fetchTrendingTopics()` helper, modified `generateFeed()`
2. `src/app/api/feed/route.ts` — reduced cache TTL from 5 min to 2 min

## What changed in `src/lib/ai.ts`

### New imports
```ts
import { type CountryInfo, getCountry } from "@/lib/countries";
```
(`getCountry` was not previously imported; `ZAI` was already imported at top.)

### New helper: `fetchTrendingTopics(country: string, city: string | null): Promise<string[]>`
- Uses `ZAI.create()` then `zai.functions.invoke("web_search", { query, num })`.
- Query template: `` `trending news today ${location} ${today}` `` where
  `location = city ? `${city}, ${countryInfo.name}` : ${countryInfo.name}` and
  `today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })`.
- Defensive result-shape handling: ZAI's `web_search` may return either an
  array directly, an object with `.results`, or an object with `.data.results`
  (or `.data` array). All four shapes are narrowed via `Array.isArray(...)`.
- Per-item extraction: prefers `name` (the SDK's actual field name from
  `news-service.ts:SearchFunctionResultItem`), falls back to `title`, then
  `snippet`. Whitespace-collapsed and trimmed. Max 8 items.
- Wrapped in try/catch; on any failure, logs
  `[feed] web_search trending failed: <first 120 chars>` and returns `[]`.

### `generateFeed()` modifications
1. Computes `todayLong = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })` — injected into both SYSTEM and USER prompts so "today" is always meaningful.
2. Awaits `fetchTrendingTopics(country.code, cityName)` — wrapped in `.catch(() => [] as string[])` as defense-in-depth (the helper already try/catches internally, so a web_search failure can NEVER break the feed).
3. **SYSTEM prompt** now reads: `You are the Cirkle Brain AI feed engine for ${cityName}, ${country.name}. Today is ${todayLong}. Generate a JSON feed based on REAL current events. Respond with VALID JSON only. ${ctx}` — replaces the old "You are the Circle AI feed engine" (Circle → Cirkle Brain AI) and adds the today's-date clause.
4. **USER prompt**: if trending topics were returned, prepends a
   `Trending topics from live web search for {location} on {date}:` block
   (one bullet per topic, max 8) followed by the instruction
   `Base your featured items, trending hashtags, and forYou posts on these REAL trending topics. Rewrite titles/subtitles in a social-feed tone — do NOT copy the headlines verbatim.`
   Otherwise the prompt is the same as before but still injects today's date
   in two places (`Today: ${todayLong}` and `Content from TODAY (${todayLong})`).
5. **Unchanged**: the JSON shape spec (4 featured / 4 nearby / 4 trending / 3 forYou / 5 officialUpdates / 2 spaces), the `aiComplete()` 4-provider fan-out (Groq → OpenAI → HF → ZAI), the `getWeather()` call, the parsing/normalization logic, the `fallbackFeed()` path.
6. **Interface shapes preserved**: `FeaturedItem`, `NearbyItem`, `TrendingItem`, `ForYouPost`, `OfficialUpdate`, `WeatherInfo`, `LiveSpace`, `FeedData` — all unchanged. No new fields, no removed fields. Frontend keeps working.

## What changed in `src/app/api/feed/route.ts`
- `const TTL = 5 * 60 * 1000;` → `const TTL = 2 * 60 * 1000;` (5 min → 2 min).
- Added an inline comment explaining why (Cirkle Brain freshness).
- Nothing else touched: the cache key (`${countryCode}:${city || ""}`), the
  `X-Cache: HIT|MISS` headers, the `Cache-Control: max-age=300` header, the
  `getCountry`/`getDefaultCountry` resolution, and the `generateFeed()` call
  are all unchanged.

## Step 5 of the GOAL (client-side 3-min refresh interval)
- The home page is owned by `src/screens/home-screen.tsx` which this agent is
  explicitly forbidden to edit (only allowed to read for context). The
  client-side `setInterval(() => fetchFeed(), 3 * 60 * 1000)` belongs to a
  sibling agent that owns `home-screen.tsx`. This agent has prepared the
  server side (2-min TTL + always-fresh web_search-backed feed) so that when
  the 3-min client refresh fires, it will reliably get a freshly-regenerated
  Featured carousel driven by real-time web trends.

## Verification
- `bunx tsc --noEmit` → 22 errors, ALL in other agents' files:
  `src/app/api/contacts/{route,search/route}.ts`,
  `src/app/api/{flights,hotels,price}/search/route.ts` / `predict/route.ts`,
  `src/app/api/shield/report/route.ts`,
  `src/lib/brain-personalize.ts`,
  `src/lib/cirkle-brain.ts`,
  `src/lib/shield-engine.ts`,
  `src/screens/{mashahd,profile,wasl}-screen.tsx`.
  **Zero errors in `src/lib/ai.ts` or `src/app/api/feed/route.ts`.**
- `bun run lint` → exit 0, 0 errors, 1 warning (in
  `src/components/overlays/cirkle-mint.tsx` — not this agent's file).
- Dev server log confirms `GET /api/feed?country=EG&city=Cairo → 200` and
  `GET /api/feed?country=SA&city=Riyadh → 200` after edits, with the
  expected slower first-hit (22-27s for full ZAI web_search + LLM fan-out)
  followed by fast cached responses (12-669ms).

## Failure modes tested by inspection
1. **ZAI 429 rate limit** — the dev.log shows ZAI returning `429 Too many
   requests`. In that case `fetchTrendingTopics` catches the thrown error,
   logs `[feed] web_search trending failed: …`, and returns `[]`. The
   `trendingBlock` becomes `""`, so the LLM is asked to generate based on
   today's date alone — exactly the original behavior. The 4-provider
   `aiComplete()` fan-out then runs as before.
2. **`web_search` returns unexpected shape** — the result-shape narrowing
   handles all four observed shapes (array, `{results}`, `{data:{results}}`,
   `{data:[]}`). If none match, returns `[]`.
3. **All 4 LLM providers fail** — `aiComplete()` returns `null`,
   `extractJSON(null)` returns `null`, and `generateFeed()` falls through to
   `fallbackFeed()` exactly as before. Web users always get a feed.

## Constraints honored
- ✅ Only 2 files edited (`src/lib/ai.ts`, `src/app/api/feed/route.ts`).
- ✅ Did NOT touch `src/lib/cirkle-brain.ts`, `src/lib/news-service.ts`,
  `src/app/api/news/route.ts`, `src/screens/home-screen.tsx`, or any
  `src/lib/brain-*.ts` file.
- ✅ Did NOT change `FeedData` or `FeaturedItem` interface shapes.
- ✅ Did NOT add new dependencies (`z-ai-web-dev-sdk` was already imported).
- ✅ Kept the 4-provider fan-out in `aiComplete()` unchanged.
- ✅ ZAI web_search wrapped in try/catch (inside helper) AND `.catch()`
  (at call site) — double-safety.
- ✅ Cache TTL reduced from 5 min → 2 min.
- ✅ Today's date injected into BOTH system and user prompts.
