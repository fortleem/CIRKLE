# INSTITUTION-REGISTRATION — full-stack-developer

**Task ID:** INSTITUTION-REGISTRATION
**Agent:** full-stack-developer
**Date:** 2026-08-20

## What was built

A 4-step Institution Registration overlay for the Wasl (chat) module, reachable from the Wasl screen and any other surface that dispatches the `circle:institution-register` CustomEvent.

## Files

- **Created:** `src/components/overlays/institution-register.tsx` (~770 lines)
- **Modified:** `src/lib/overlay-registry.ts` — added `institution-register` entry (🏢 social, event `circle:institution-register`).
- **Modified:** `src/app/page.tsx` — dynamic import + `useState` + `addEventListener` + render + Escape handler reset.
- **Modified:** `src/screens/wasl-screen.tsx` — `Building2` icon import + dropdown item + a prominent entry button below Smart Folders.

## Architecture

- `<OverlayShell variant="fullscreen" ariaLabel="Institution registration">` owns backdrop, focus trap, Esc-to-close, body scroll lock.
- 4-step wizard: state `step` (0–3) + `direction` (1/-1) drives Framer Motion slide transitions.
- Step indicator: 4 numbered dots; active=emerald, done=emerald/20+check, upcoming=white/5.

### Steps
1. **Founder Verification** — `useAuth().user` is the founder. No user → "No personal account found" card with Close. Else → avatar + `@username@cirkle` + Continue.
2. **Institution Details** — name, `@handle` (auto-suggested from name; `^[a-z0-9_]{3,30}$`), country (defaults to founder's), company type, industry, registered emails (multi-input add/remove), registration #, tax ID. Continue gated by `step1Valid`.
3. **Document Upload** — fetches `/api/institutions/documents-requirements?country=…&companyType=…` (refetches when country/type change while on step 2). Each `DocumentCard` has English+Arabic label, description, formats, max size, hidden file input. Records `{ type, fileName, fileHash }` (mock hash via FNV-1a-like). Progress pill: `{uploaded} of {total}`.
4. **Review & Submit** — summary grid, confirmation checkbox, `POST /api/institutions/register`. On success → SuccessScreen with `@handle@cirkle` + verification status `pending`. On error (esp. missing docs) → renders the `missingDocs` list.

## Integration points

- **Event:** `circle:institution-register` (matches registry entry).
- **Wasl entry points:** dropdown menu item + a prominent glass button below Smart Folders.
- **API:** consumes `POST /api/institutions/register` and `GET /api/institutions/documents-requirements`.

## Lint

`bun run lint` → 0 errors, 0 warnings (clean).

## Notes for follow-up agents

- The mock `fileHash` is a deterministic 32-bit hash prefixed `0x…` — sufficient for the demo store shape. Swap for a real SHA-256 server-side hash when the upload pipeline is wired.
- The reset-on-open pattern uses the same `prevOpen` mirror approach as `circle-create.tsx` to avoid `setState-in-effect`.
- `Enter` advances steps 0–2 but NOT step 3 (to avoid accidental submits). Submit requires the explicit button click.
