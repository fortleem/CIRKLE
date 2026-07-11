# Task: COMMIT-U1-U2 — CirkleCommit AI upgrades (Live Fairness Audit + AI Mediator)

Agent: full-stack-developer
Task: Build two killer CirkleCommit upgrades inside the existing overlay:
- **U1** — AI Fairness Audit (live clause analysis while typing)
- **U2** — AI Mediator (pre-dispute resolution + third-party lawyer/accountant escalation)

## Files produced / edited

The constraints in the brief were respected: **only the 4 files listed were touched, no new dependencies were added.**

### NEW `src/lib/commit-ai.ts` (server-only, 161 lines)
Exports the public types and two functions:

- `FairnessIssue` / `FairnessAnalysis` (U1 types)
- `MediationOption` / `MediationResult` (U2 types)
- `analyzeFairness(opts)` — Calls `aiComplete` with the fairness-audit system prompt (detects ambiguous clauses, missing cancellation, unfair payment terms, above-market pricing, missing liability cap, missing dispute clause, one-sided terms). Returns a 0-100 score + issues list. Uses a defensive `safeJSON<T>()` extractor that slices from the first `{` to the last `}` and tries `JSON.parse` so providers that wrap JSON in markdown fences still parse. Clamps score 0-100, caps issues at 12. Falls back to `{ score: 50, issues: [], summary: "Analysis unavailable" }` on any failure.
- `mediateDispute(opts)` — Calls `aiComplete` with the mediator prompt (proposes 3 resolution options, sets `escalateToProfessional` + `professionalType` when the dispute is legally/financially complex). Validates the `professionalType` discriminator. Falls back to `{ summary: "Mediation unavailable", disputedClause: "", options: [], aiRecommendation: "", escalateToProfessional: false }` on any failure.

Both functions route through the existing multi-provider `aiComplete` chain in `@/lib/ai` (Groq → OpenAI → HuggingFace → ZAI), so failures of any single provider are invisible to the user.

### NEW `src/app/api/commit/analyze/route.ts` (44 lines)
`POST` handler. Validates the JSON body (title/description/amount/currency/type/country). Short-circuits with `score:50` placeholder when both title and description are empty (saves provider quota on form-open). Returns 200 with the `FairnessAnalysis` shape on success, 500 with the fallback shape on exception.

### NEW `src/app/api/commit/mediate/route.ts` (54 lines)
`POST` handler. Validates body (agreementTitle/description/disputeReason/partyA/partyB/country). 400s if `disputeReason` is empty. Otherwise calls `mediateDispute` and returns the `MediationResult` shape. 500 with fallback shape on exception.

### EDIT `src/components/overlays/cirkle-commit.tsx` (+679 lines, 1091 → 1770)

**Imports extended** (no removals): added `AlertTriangle, Info, Gavel, Scale, Briefcase, Wand2, ArrowUpCircle` to the Lucide import block.

**New client-side types** (mirror of server types — can't import them directly because `commit-ai.ts` is `server-only`): `FairnessIssue`, `FairnessAnalysis`, `MediationOption`, `MediationResult`.

**New helpers** (all brand-palette only — rose / gold / emerald, NO indigo / blue):
- `scoreBadgeClass(score)` → rose chip `<40`, gold chip `40-70`, emerald chip `>70`
- `scoreBarClass(score)` → matching bar color
- `scoreLabel(score)` → "High risk" / "Review needed" / "Fair"
- `SEVERITY_META` map → `{ warning: AlertTriangle+rose, info: Info+gold, good: CheckCircle2+emerald }`
- `RECOMMENDATION_META` map → `{ accept: emerald, negotiate: gold, reject: rose }`
- `countryForCurrency(c)` → SAR→SA, AED→AE, EGP→EG, USD→US, EUR→EU, USDC→US (default SA)

**New `IssueRow` sub-component** (outside the main component, so it doesn't re-create on every render): renders a single fairness issue with severity icon, severity chip, clause text, message, and a "Fix" button (Wand2 icon) that one-tap appends the AI suggestion to the description field.

**U1 state**: `analysis: FairnessAnalysis | null`, `analysisLoading: boolean`.

**U1 useEffect** (debounced 1.5s): fires whenever `view === "create"` and any of `title/description/amount/currency/type` changes. Skips the round-trip entirely when both title and description are empty (zero provider calls on form-open). POSTs to `/api/commit/analyze` and stores the result.

**U1 panel** (in Create form, between the existing AI Fairness Check button and the Submit button — existing button preserved):
- Header with Scale icon, "Live Fairness Audit" title, "analyzing…" pulse, and color-coded score chip + label
- Animated score bar
- Summary sentence
- Market range
- Scrollable issues list (`max-h-72 overflow-y-auto`) with `IssueRow`s; each row's "Fix" button appends the suggestion to `description` with a success toast

**U2 state**: `disputeReason`, `disputeFiled`, `mediating`, `mediation: MediationResult | null`, `acceptedOptionId`, `partyBAccepted`, `disputeResolved`.

**U2 functions**:
- `fileDispute()` — POSTs to `/api/commit/mediate`, flips agreement status to `"disputed"` in both `agreements` and `selected`, success toast.
- `acceptOption(optId)` — records Party A's accept, toast "Waiting for {counterparty}…".
- `connectProfessional()` — dispatches `window.dispatchEvent(new CustomEvent("circle:pro-network", { detail: { source: "cirkle-commit", professionalType, agreementId } }))`. (page.tsx already listens for this event and opens the Pro Network overlay.) Toast "Opening Professional Network…".

**U2 useEffects**:
- Reset dispute state when `selected` changes (so opening a different agreement clears stale mediation).
- Simulate Party B accepting the same option ~2.5s after Party A accepts — flips `disputeResolved=true`, updates agreement status back to `"active"`, success toast "Both parties agreed — dispute resolved."

**U2 panel** (in detail view, between Hash & escrow and Created timestamp, only when status is not completed/draft). Three states:
1. **Filing**: textarea + "Submit to AI Mediator" button (Gavel icon).
2. **Loading**: "AI Mediator is analyzing the dispute…" with Hourglass pulse.
3. **Result**:
   - AI summary banner (primary tint) with disputed clause
   - AI recommendation banner (secondary tint, Info icon)
   - 3 resolution option cards, each with #id, title, recommendation chip (Accept/Negotiate/Reject), description, legal basis (Scale icon), and an Accept button that transitions to "You accepted · Waiting for {counterparty}…" and then "Both parties accepted · Resolved" (emerald border + badge) once Party B accepts
   - Escalation card (when `escalateToProfessional === true`): Scale icon for lawyer / Briefcase icon for accountant, the verbatim note from the brief, and "Connect with a verified professional" button that dispatches `circle:pro-network`
   - "Re-file dispute with a different reason" link when not yet resolved

The mediation section header also shows a "Resolved" pill once `disputeResolved` flips to true.

**Reset hygiene**: both the existing reset-on-close `useEffect` and `resetForm()` were extended to clear all new U1+U2 state, so navigating away from the overlay never carries stale analysis / dispute state between sessions.

## Verification

- `bun run lint` → **ZERO errors / warnings in any of my 4 files**. The only lint errors reported by ESLint are in pre-existing files I did NOT touch (`signature-pad.tsx`, `cirkle-gradebook.tsx`, `cirkle-mint.tsx`, `knowledge-wiki.tsx`).
- `curl -X POST /api/commit/analyze` → HTTP 200 in 508ms. Returns the graceful fallback `{"score":50,"issues":[],"summary":"Analysis unavailable"}` because the ZAI provider is currently rate-limited (429) at the platform level. The fallback contract is by design — the overlay UX never breaks.
- `curl -X POST /api/commit/mediate` → HTTP 200 in 270ms. Returns the graceful fallback `{"summary":"Mediation unavailable","disputedClause":"","options":[],"aiRecommendation":"","escalateToProfessional":false}`.
- Dev server compiled both new API routes cleanly (no TypeScript errors visible in `dev.log`). The 429 errors visible in `dev.log` are the ZAI provider being rate-limited at the platform level (also affecting the pre-existing news-service) — my code handles these via the `aiComplete` chain's null-on-failure contract and the per-function try/catch fallbacks.
- Home page (`GET / 200`) still renders, confirming the dynamically-imported CirkleCommit overlay compiles cleanly.

## Design decisions

- **Brand palette only**: rose (`--accent`) for warnings, gold (`--secondary`) for info/negotiate, emerald for good/accept/resolved, teal (`--primary`) for the AI summary banner, steel/charcoal/cream for surfaces. NO indigo, NO blue. Matches the existing CirkleCommit visual identity.
- **Server-only lib pattern**: `commit-ai.ts` imports `server-only` and re-uses the existing `aiComplete` chain — no new providers, no new deps. The client overlay mirrors the types locally (rather than importing them) precisely because the server module is gated.
- **Graceful degradation everywhere**: every AI call has a typed fallback, so a rate-limited / failed provider never crashes the overlay. The U1 panel just shows the fallback analysis; the U2 panel shows the fallback mediation with an "escalate to a professional" fallback card hidden (since `escalateToProfessional` defaults to false).
- **Existing functionality preserved**: the Active list view, Create form (including the original AI Fairness Check button), Detail view, Hash & escrow card, Awaiting-signature sheet, and Created-success modal are all untouched. The new U1 panel is inserted between the existing AI Fairness Check button and the Submit button; the new U2 panel is inserted between the Hash & escrow card and the Created timestamp.
- **Both-party-accept simulation**: the brief says "both parties must accept the same option to resolve". In this single-user demo, Party B's accept is simulated ~2.5s after Party A's — same option id → dispute resolved, agreement reactivated to `"active"` status, toast confirmation. The waiting state is visible to the user ("You accepted · Waiting for {counterparty}…") before the resolution lands.
- **Debounce contract**: the live fairness analysis debounces 1.5s on `view/title/description/amount/currency/type` changes per the brief. The cleanup function clears the pending timeout on every dep change, so rapid typing only fires one AI call once the user pauses.

## Constraints respected

- ✅ Did NOT add new dependencies (all features built on existing `aiComplete`, `lucide-react`, `framer-motion`, `sonner`).
- ✅ Edited ONLY the 4 files listed in the brief.
- ✅ Ran `bun run lint` and fixed errors in my files (zero errors in my files; pre-existing errors in other files were left untouched per the brief).
- ✅ Kept all existing CirkleCommit functionality intact.
