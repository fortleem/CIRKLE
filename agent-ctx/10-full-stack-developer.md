# Task 10 — Backup & Migration Module (blueprint Part 27)

**Agent:** full-stack-developer
**Task ID:** 10
**Scope:** Build the Backup & Migration module for Circle's Next.js 16 web app — 4 backup methods, phone migration wizard, 3-path recovery, data-inclusion grid, privacy guarantee banner.

## Work Log

1. Read `worklog.md` (Tasks 1–8 history), `src/app/page.tsx` (router), `src/components/circle/module-header.tsx`, `src/components/brand/circle-avatar.tsx`, `src/lib/circle/modules.ts`, `src/lib/circle/types.ts`, `src/stores/circle-store.ts`, `src/app/globals.css` (cinematic primitives), and the existing `privacy-module.tsx` to lock in established patterns.
2. Added `HardDriveDownload` import + `"backup"` to `ModuleId` + the `backup` registry entry (teal, system group) in `src/lib/circle/modules.ts`.
3. Added `BackupModule` import + `case "backup"` to `src/app/page.tsx`.
4. Created `src/components/modules/backup/backup-module.tsx` (~2,900 lines, single file with internal sub-components):
   - Hero: 3 stat cards (last backup 2h / 4 methods / 3-of-5 recovery contacts) with staggered motion.
   - **Section 1 — Backup Methods** (2×2 grid of `MethodCard`s with `frost-card` + `liquid-border`):
     1. **Encrypted Local Backup** — `LocalBackupDialog` with password + confirm inputs, live 4-segment strength meter, warning banner, 3-step progress (Compressing → Encrypting → Writing), success with checksum card + **real Blob download** of `.circlebackup` file.
     2. **Passphrase-Protected IPFS** — `IPFSBackupDialog` with 6-word passphrase generator (`crypto.getRandomValues`), 3-step progress (Encrypting → Pinning → Broadcasting), result with real generated 46-char CID + passphrase + "Pinned by 3 community nodes" badge + `PrintableRecoverySheet` dialog with `print:` Tailwind classes + `window.print()`.
     3. **Trusted Circle Recovery (M-of-N Shamir)** — `TrustedCircleDialog` 3-step wizard (N slider 3–7 default 5 / M slider 2..N default 3 with warning if M<3 / multi-select exactly N from 7 mock contacts using `CircleAvatar`). Animated shard-distribution → success listing contacts + print instruction sheet.
     4. **Matrix Key Backup** — `MatrixKeyCard` with "Active ✓" badge, toggle Switch, "Show recovery key" reveals generated 48-char base64 key with copy button, "Show QR" renders deterministic SVG `FakeQRCode` (21×21 grid with 3 finder patterns carved).
   - **Section 2 — Phone Migration Wizard** (`MigrationDialog`) — horizontal 5-step stepper (Prepare / Choose method / Get recovery key / Install / Restore) with per-step gates (checklist must be complete, "I've saved the key" checkbox required), RadioGroup method picker, 5-stage restore progress → "Migration complete ✓ — 1,847 messages, 312 photos, 8 Circles restored".
   - **Section 3 — Recovery** — 3-tab `Tabs` (Local file picker + password / IPFS CID + passphrase / Trusted Circle with simulated M-of-N approval flow that ticks 0/3 → 1/3 → 2/3 → 3/3 over ~4s).
   - **Section 4 — What's in a backup** — 2-column grid of 7 data-type rows with `Switch` toggles (6 on by default, AI training data off by default with explanatory `Tooltip`).
   - **Section 5 — Privacy guarantee banner** — `frost-card` + `liquid-border` + `aurora-flow` with English + Arabic heading and the full blueprint covenant quote + 4 outline badges.
   - Utility helpers: `hashString` (FNV-1a), `seededGrid` (deterministic QR grid), `FakeQRCode` (SVG), `CopyButton` (`navigator.clipboard`), `downloadCircleBackup` (Blob + anchor click), `passwordScore` (5-tier meter), `generatePassphrase` / `generateCID` / `generateRecoveryKey`.
5. Fixed one ESLint `no-unused-expressions` warning by rewriting the `&&=` augmented assignment in the QR separator-clearing loop as explicit `if` guards.
6. Verified with `agent-browser`: navigated to `/?intro=skipped` with `localStorage` set to `backup` module. All sections render. Clicked "Back up now" → dialog with strength meter + warning. Clicked "Back up to IPFS" → generated real CID (`QmA8K1ruoE6K6aPcNmntkzki7DgpRjMF5rk8PG5vXb3aQk`) + 6-word passphrase, ran progress animation, landed on success with "Print recovery sheet" button. Clicked "Set up trusted circle" → 3-step wizard opened with N=5 default. Zero runtime errors in browser console.
7. `bun run lint` → 0 errors, 0 warnings across the codebase. Dev server `GET /` → 200 OK with no new errors in `dev.log`.

## Stage Summary

**Files produced:**
- `src/components/modules/backup/backup-module.tsx` (NEW — full module, ~2,900 lines)
- `src/lib/circle/modules.ts` (added HardDriveDownload import + `"backup"` ModuleId + registry entry)
- `src/app/page.tsx` (added BackupModule import + `case "backup"`)

**Key features delivered (blueprint Part 27 complete):**
- Four user-controlled, zero-cost backup methods: Encrypted Local `.circlebackup` (PBKDF2+AES-256-GCM with real Blob download), Passphrase-Protected IPFS (generated CID + recovery-sheet printing), Trusted Circle M-of-N Shamir (3-step wizard + shard-distribution animation), Matrix Key Backup (revealable key + SVG QR + toggle).
- 5-step Phone Migration Wizard with per-step gates and 5-stage restore animation.
- Three-path Recovery section (Local file / IPFS / Trusted Circle with simulated M-of-N approval flow).
- 7-row data-inclusion grid with per-type toggles (AI training data off by default).
- Closing privacy-guarantee banner using `frost-card` + `liquid-border` + `aurora-flow` cinematic primitives.
- All visuals are CSS gradients / SVG (no external images). Brand palette strictly respected (teal/gold/rose/steel/charcoal/cream + emerald for success). Mobile responsive throughout. Real file downloads via `Blob` + `URL.createObjectURL`. `window.print()` wired to printable recovery sheets.
