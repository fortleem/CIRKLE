# DEEP-ANALYSIS-BRAIN-WIRING — CTO (Cirkle Brain Architect)

**Task ID:** DEEP-ANALYSIS-BRAIN-WIRING
**Agent:** CTO (Cirkle Brain Architect)
**Date:** 2026-07-08
**Scope:** Audit ALL 8 screens + key overlays for Cirkle Brain AI coverage; build a universal Brain connection layer; wire any unconnected features.

> Previous agents' work records are available in `/home/z/my-project/agent-ctx/`. This task built on top of the existing Brain modules (`brain-cross-evaluation.ts`, `brain-router.ts`, `brain-orchestrator.ts`, `brain-knowledge.ts`, `brain-memory.ts`, `brain-personalize.ts`, `brain-proactive.ts`, `brain-reasoning.ts`, `brain-federated.ts`, `brain-source-learning.ts`) without modifying any of them.

---

## 1. Audit Results

Grepped the codebase for every Brain-module symbol. **35 files** already touch the Brain. Per-pillar coverage:

| Pillar              | Connected? | Path                                                                                  |
| ------------------- | ---------- | ------------------------------------------------------------------------------------- |
| News                | ✅          | `/api/news`, `/api/news/search`, `/api/news/recommend` — `searchNews` + `crossEvaluate` |
| Feed                | ✅          | `/api/feed` — `generateFeed` + `crossEvaluate`                                        |
| Wasl chat           | ✅          | `/api/ai-ask`, `/api/ai/smart-reply`, `/api/ai/translate`, `/api/ai/summarize`        |
| Rihla travel        | ✅          | `/api/flights/search`, `/api/hotels/search`, `/api/ai/itinerary`, `/api/visa`         |
| Oracle markets      | ✅          | `/api/price/predict`, `/api/predictions/*` — `predictPrice`                           |
| Commit              | ✅          | `/api/commit/analyze`, `/api/commit/mediate` — `analyzeFairness` + `mediateDispute`   |
| Mashahd             | ✅          | `/api/ai/smart-reply` on comments                                                     |
| Home dashboard      | ✅          | News + weather + currency + visa                                                      |
| Overlays (5+)       | ✅          | `ai-assistant`, `personal-ai-os`, `overlay-browser`, `oracle-markets`, `brain-orchestrator` |
| **Lamahat (photos)**| ❌          | Only fetched `/api/posts?module=lamahat` — no AI affordance                           |
| **Pay**             | ❌          | Only fetched `/api/payments/transactions` — no AI affordance                          |
| **Profile**         | ❌          | Rendered settings only — no AI affordance                                             |
| **Midan (social)**  | ⚠️         | Feed uses `/api/posts?algo=true` (Brain-connected ranking) but no "ask the Brain" UI  |

**Verdict:** 4 of 8 screens needed explicit Brain wiring.

---

## 2. What Was Built

### 2.1 `src/lib/brain-universal.ts` (NEW — server-only)

The SOLE orchestrating entry point for ALL Cirkle features.

**Exports:**
- `askBrain(req: BrainRequest): Promise<BrainResponse>` — wraps `crossEvaluate`, tags the query with `[feature:action]`, calls `recordLearning` (only when `username` is present — matches that function's required-fields contract), and degrades gracefully (never throws — returns a low-confidence `BrainResponse` on failure so the UI never breaks)
- `getBrainStatus()` — provider availability + feature/action vocabulary + knowledge-graph stats
- `BrainFeature` type — 14 pillars: `news | feed | chat | travel | pay | video | photos | social | profile | commit | maps | mail | health | safety`
- `BrainAction` type — 8 verbs: `search | summarize | translate | predict | recommend | analyze | generate | mediate`
- `BrainRequest` / `BrainResponse` interfaces

**Why this matters:** Every future Cirkle feature (maps, mail, health, safety) only needs to call `askBrain({ feature, action, query, … })` — no new infrastructure. The Brain's full pipeline (KG → 5-provider consensus → web search → cross-evaluation → continuous learning) is one function call away.

### 2.2 `src/app/api/brain/status/route.ts` (NEW)

GET-only, read-only endpoint that returns `getBrainStatus()`. Caches for 30s with `stale-while-revalidate=60` so polling stays cheap.

**Smoke-tested:**
```bash
curl http://localhost:3000/api/brain/status
# HTTP 200 in 271ms
# {
#   "online": true,
#   "providers": [{"name":"groq","available":true,"strengths":["text","arabic","code"]}, … 6 providers],
#   "features": ["news","feed","chat","travel","pay","video","photos","social","profile","commit","maps","mail","health","safety"],
#   "actions": ["search","summarize","translate","predict","recommend","analyze","generate","mediate"],
#   "knowledgeGraph": {"countries":246,"paymentMethods":1766,"transportOptions":800,"newsSources":1200},
#   "universalLayerVersion": "1.0.0",
#   "updatedAt": "2026-07-08T17:40:51.830Z"
# }
```

### 2.3 Four screen wirings

Each screen:
1. Adds a Brain-labeled button (lucide `Brain` icon, gold accent, `Loader2` spinner while in flight)
2. Dispatches a `circle:brain-query` CustomEvent with `{ feature, action, country, city }` for any future page-level listener / telemetry
3. POSTs to `/api/brain/cross-evaluate` with a `[feature:action]`-tagged query
4. Shows the consensus answer in a `sonner` toast via `toast.promise` (loading / success / error states)
5. Disables the button while in flight (avoids double-submit)
6. Passes real user context (currency, balance, tx count, display name, verified status, region) so the Brain's answer is grounded in the user's actual data — not generic

| Screen                              | Button                    | feature     | action       | Query                                                                                  | Placement                                                    |
| ----------------------------------- | ------------------------- | ----------- | ------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/screens/lamahat-screen.tsx`    | "Brain AI" pill           | `photos`    | `recommend`  | "suggest photos based on my interests"                                                 | Header, next to Capture                                      |
| `src/screens/pay-screen.tsx`        | "Brain AI Insights" banner| `pay`       | `analyze`    | "analyze my spending patterns" + currency + balance + tx count                         | Between balance card and quick-actions grid                  |
| `src/screens/profile-screen.tsx`    | "Brain AI Profile" banner | `profile`   | `analyze`    | "analyze my Cirkle usage patterns" + display name + verified status + region           | Between stats grid and Account card                          |
| `src/screens/midan-screen.tsx`      | "Brain AI" pill           | `social`    | `recommend`  | "what's trending in my city right now" + 5 topics + local event                        | Header, next to Spaces                                       |

---

## 3. Constraints Honored

- ✅ **No new dependencies** — only used existing `lucide-react` `Brain` icon + existing `useApp` / `useAuth` / `sonner` / `fetch`
- ✅ **Edited ONLY the 6 permitted files** (2 new + 4 screens). Did NOT touch `page.tsx` — instead each screen self-contains its Brain call + toast, while still dispatching `circle:brain-query` for any future listener
- ✅ **`bun run lint` → 0 errors** in my files. 4 pre-existing warnings in `cirkle-gradebook.tsx` / `cirkle-mint.tsx` / `knowledge-wiki.tsx` are all unrelated to this task
- ✅ **Dev server compiled cleanly**; smoke-tested both `/api/brain/status` (200) and `/api/brain/cross-evaluate` (200, returned KG + web-search sources for a `[photos:recommend]` query)

---

## 4. Files Touched

| File                                             | Action  | Lines   |
| ------------------------------------------------ | ------- | ------- |
| `src/lib/brain-universal.ts`                     | NEW     | ~225    |
| `src/app/api/brain/status/route.ts`              | NEW     | ~55     |
| `src/screens/lamahat-screen.tsx`                 | EDITED  | +50     |
| `src/screens/pay-screen.tsx`                     | EDITED  | +65     |
| `src/screens/profile-screen.tsx`                 | EDITED  | +60     |
| `src/screens/midan-screen.tsx`                   | EDITED  | +55     |

Total: ~510 lines added across 6 files, 0 deletions to existing logic.

---

## 5. Future Work (Out Of Scope For This Task)

- A `circle:brain-query` listener in `page.tsx` could intercept every Brain query across the app for global telemetry, proactive suggestions, or rate-limiting. The screens already dispatch the event — the listener just needs to be wired.
- The 4 remaining un-listed features in the universal vocabulary (`maps`, `mail`, `health`, `safety`) can be wired the same way when their screens ship — `askBrain({ feature: "maps", action: "search", query: "…" })`.
- The Brain Status API could be polled by a "Brain health" widget on the home dashboard to show provider availability at a glance.
