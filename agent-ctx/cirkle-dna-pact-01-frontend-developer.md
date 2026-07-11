# Task cirkle-dna-pact-01 — CirkleDNA + CirklePact overlay components

**Agent:** frontend-developer
**Task ID:** cirkle-dna-pact-01
**Scope:** Build two breakthrough full-screen overlay components — `CirkleDNA` (visual social-genome map with animated DNA double-helix) and `CirklePact` (verifiable social contracts with list + create views). Both at `src/components/overlays/`. No other files modified.

## Context reviewed (previous agents' work)

- `/home/z/my-project/worklog.md` — 32 prior task records covering brand tokens, layout, shadcn/ui inventory, theme provider, all 8.9k-paragraph blueprint.
- `src/components/overlays/topic-dna.tsx` — established the overlay pattern (AnimatePresence + motion.div spring, dimmed backdrop at z-[140], panel at z-[150], `glass-strong` panel with `rounded-t-3xl`, header with icon tile + display title + close X). Used as primary reference.
- `src/components/overlays/citizen-shield.tsx` — full-screen variant pattern (`fixed inset-0 z-[150] bg-background flex flex-col`, header with `aurora-bg` overlay, multi-view body via `AnimatePresence mode="wait"` with x-axis slide transitions, sticky footer with `safe-area-inset-bottom`).
- `src/components/overlays/time-capsule.tsx` — framer-motion sealing animation + spring pattern, `Loader2` spinner for async submit, `cn` for conditional classes.
- `src/components/brand/circle-mark.tsx` — imported `CircleMark` for the CirkleDNA header tile (4-circle quadrant SVG with gold/rose/teal gradient stroke).
- `src/app/globals.css` — confirmed available brand tokens (`--gold 39 45% 57%`, `--teal 195 56% 23%`, `--rose 351 41% 56%`, `--steel 211 30% 42%`, `--charcoal 60 8% 9%`, `--cream 40 50% 98%`), `glass-strong`, `bg-gradient-hero`, `bg-gradient-gold`, `bg-gradient-mesh`, `aurora-bg`, `shadow-glow`, `shadow-glass`, `shadow-float`, `gradient-text-gold`, `text-cream`, `text-gold`, `text-rose`, `text-teal` utilities.
- `src/components/ui/{avatar,button,input,textarea,progress}.tsx` — verified exported APIs (`Avatar`/`AvatarFallback`, `Button` with `variant`/`size` props, `Input`, `Textarea`, `Progress` with `value` prop).
- `package.json` — confirmed `framer-motion ^12.23.2`, `sonner ^2.0.6`, `lucide-react ^0.525.0`, `@radix-ui/react-avatar`, `@radix-ui/react-progress` all installed.

## Work Log

### 1. CirkleDNA — `src/components/overlays/cirkle-dna.tsx` (~340 lines)

1. **Props + contract**: `"use client"` directive, `Props { open: boolean; onClose: () => void }`, imports from `framer-motion` (`AnimatePresence`, `motion`), `lucide-react` (`X`, `Share2`, `Users`, `Sparkles`, `Dna`), `sonner` (`toast`), `@/components/brand/circle-mark` (`CircleMark`), `@/lib/utils` (`cn`).

2. **Six strands**: `STRAND_DEFS` array with `Interests`, `Communication Style`, `Emotional Pattern`, `Social Reach`, `Content Taste`, `Trust Score`. Each strand has a two-stop gradient (gold→gold-dark, teal→teal-dark, rose→rose-dark, steel→steel-dark, gold→rose, emerald→emerald-dark), a base `color`, and a short human `blurb`. The final `Trust Score` strand uses an emerald gradient — the only intentional deviation from the four-color brand palette because "trust" needs a success/green affordance, mirroring the emerald usage already established in `citizen-shield.tsx` and `time-capsule.tsx`.

3. **Mock DNA data**: `buildStrands()` returns the 6 strand defs each with `randomScore(60, 95)`. `overall()` averages all six to a 0–100 genome integrity score. The "Resequencer" button in the header re-runs `buildStrands()` and fires `toast.success("DNA resequenced from your last 50 posts")`.

4. **DNA double-helix visualization** (`DNAHelix` component): pure SVG, 360×320 viewBox. Two sinusoidal rails drawn as polylines via `M ... L ...` paths — left rail uses `cx + sin(angle)*amp`, right uses `cx - sin(angle)*amp`. The phase angle advances through `2 * Math.PI * 4` radians over the height (2 full twists). 13 rungs (one every 5 steps of 60) colored by cycling through the 6 strand colors. Each rung has a depth-based opacity: `(cos(angle)+1)/2` yields 0..1, so rungs at the "front" of the twist are fully opaque and rungs "behind" fade to 0.35 — creating a 3D rotation illusion. Two nucleotide nodes (small circles) per rung, one on each rail, with complementary depth-based opacity (left node bright when rung is in front, right node bright when rung is behind).

   Animation: rails drawn with `pathLength: 0 → 1` over 1.2s with staggered 0.15s delay. Rungs fade in with `delay: 0.25 + i*0.025` staggered. Nucleotide nodes scale-pop with spring physics (`stiffness: 360, damping: 18`). Ambient halo: a `bg-gradient-mesh opacity-40 blur-3xl` disc behind the SVG.

5. **Score bar** (`ScoreBar`): per-strand horizontal bar with `motion.div` width animation (delay `0.3 + i*0.07`, duration 0.8s, `[0.16,1,0.3,1]` ease). Shimmer effect: a 48px-wide white blur that travels `-20% → 120%` over 1.4s with `repeat: Infinity, repeatDelay: 3`. Label + colored dot (with `box-shadow` glow matching strand color) + monospace score `/100` + small `blurb` under each bar.

6. **Layout**:
   - **Header**: relative container with `aurora-bg opacity-30` overlay, max-w-2xl, CircleMark inside `glass border-gold/30` tile with mesh-gradient halo behind, "Your CirkleDNA" h1 + "v3.1" gold version chip + "A living map of your social genome · rebuilt on-device" subtitle, close X button.
   - **Middle**: scrollable region with hero card (genome integrity score in `gradient-text-gold` 5xl display + DNA helix + 3-stat grid: Strands/Twists/Mutations), then "Six strands of you" section with the `ScoreBar` list, then "Quick compatibility" 3-up grid (Layla 91%, Omar 74%, Sara 68% — colored circles with initial letter).
   - **Footer**: absolute-positioned at bottom with `safe-area-inset-bottom` padding, two-column grid: "Share DNA Card" (gold gradient + `shadow-glow`) and "Compare with friend" (hero gradient + `shadow-glass`). Both fire toasts on click.

7. **Entrance animation**: `motion.div` slides up from `y: "100%"` → `y: 0` with `spring stiffness: 220, damping: 28`. Backdrop fades opacity 0→1.

### 2. CirklePact — `src/components/overlays/cirkle-pact.tsx` (~470 lines)

1. **Props + contract**: `"use client"`, same `Props`. Imports `motion`/`AnimatePresence`, lucide icons (`X`, `FileSignature`, `Users`, `Check`, `Clock`, `Plus`, `Shield`), `sonner` `toast`, shadcn `Avatar`/`AvatarFallback`, `Button`, `Input`, `Progress`, `Textarea`, `cn`.

2. **Types**: `PactStatus = "active" | "completed" | "pending" | "broken"`; `View = "list" | "create"`; `Signer { name, initial, color }`; `Pact { id, title, description, status, deadlineISO, progress, signers: Signer[], witnesses, signedAt, hash }`.

3. **Mock data**: `FRIENDS` array of 6 (Layla gold, Omar teal, Sara rose, Khalid steel, Noura gold, Yousef teal). `INITIAL_PACTS`:
   - **Active**: "Quit smoking by Ramadan" — 68% progress, signed by Layla + Omar, 3 witnesses, deadline 2026-02-28, hash `0xa4f1c9b2`.
   - **Completed**: "Pay back the Jeddah trip" — 100% progress, signed by Layla + Sara, 2 witnesses, deadline 2026-01-10, hash `0x9e3b7d04`.
   - **Pending**: "Co-found the book club" — 12% progress, signed by Khalid only, 1 witness, deadline 2026-03-15, hash `0x77ad22e1`.

4. **`STATUS_META` lookup**: each `PactStatus` maps to `{ label, chip classes, dot color, bar classes }`. Active uses `bg-gold/15 text-gold border-gold/30`; Completed uses `bg-emerald-500/15 text-emerald-600 dark:text-emerald-400`; Pending uses `bg-rose/15 text-rose border-rose/30`; Broken uses `bg-destructive/15 text-destructive`.

5. **`SignerStack`**: overlapping `-space-x-2` Avatar pile with `ring-2 ring-background` so each avatar visually separates. Each avatar pops in with spring physics (`stiffness: 360, damping: 18`, stagger `i*0.06`).

6. **`PactCard`** (the list-card): glass-strong card with ambient corner blur matching signer color. Status chip + days-left mono label at top, `font-display` title, 2-line clamp description, progress bar (skipped when status is completed/broken to avoid double-rendering with bar), then a footer row with `SignerStack` + signer count + witness count (Users icon rose) + deadline (Clock icon teal). Bottom row: pact hash in mono + a contextual action Button (Verified / Co-sign / Witness) that fires the `onAction` callback.

7. **`CreateView`**: form with title `Input` (max 80), description `Textarea` (max 400), deadline date `Input` (min=today), witness picker (6 friend toggle-chips in a 3-col grid, with `Check` badge when selected), live preview card (gradient-bordered with title/description/status), and "Create Pact" `Button` (gold gradient + shadow-glow + spinner during the 1.2s signing delay). Validation: toast.error if title or description empty. On success: pushes new Pact to state, fires `toast.success("Pact created and cryptographically signed", { description: \`Hash ${hash} · ${witnesses} witnesses notified\` })`, switches back to list view.

8. **`handlePactAction`** state machine on the parent:
   - **Completed** → `toast.success("Pact verification re-shared", { description: \`Signed hash ${p.hash}\` })`.
   - **Pending** → co-signs the pact: appends "You" signer, flips status to active, fires `toast.success(\`You co-signed "${p.title}"\`)`.
   - **Active** → increments witness count, fires `toast.success(\`You're now witnessing "${p.title}"\`)`.

9. **Header**: same glass-tile + mesh-halo pattern as CirkleDNA. Shield icon (gold) in tile. Title "CirklePact" + "on-chain ready" teal chip. Below the header, a 2-col pill switcher with `layoutId="pact-view-pill"` for the active background (uses `bg-gradient-hero` so the pill slides between the two tabs with spring physics).

10. **Body**: `AnimatePresence mode="wait"` swaps between List view (3-up stats strip — Active/Completed/Witnesses counts; pact list with `popLayout` AnimatePresence for reordering; covenant privacy note; gold gradient "Draft a new pact" CTA at the bottom) and Create view (slides in from the right).

11. **Entrance animation**: identical to CirkleDNA — `y: "100%" → 0` spring, dimmed backdrop.

### 3. Quality gates

12. Ran `bunx eslint src/components/overlays/cirkle-dna.tsx src/components/overlays/cirkle-pact.tsx` → **zero output, zero errors, zero warnings** on both new files.
13. Ran `bun run lint` (whole project) → 1 pre-existing error in `src/components/overlays/cirkle-mood.tsx:120:54` (`react-hooks/set-state-in-effect`). That file is **not part of my task scope** ("Do NOT modify any other files") and was already untracked in git before I started. Left untouched.
14. Verified dev server compiled the new files cleanly — `dev.log` shows `✓ Compiled in 700ms` followed by `✓ Compiled in 554ms` then `✓ Compiled in 460ms` with no errors and `GET / 200` responses.
15. Verified all required imports per spec:
    - CirkleDNA: `X, Share2, Users, Sparkles, Dna` from `lucide-react` ✓; `CircleMark` from `@/components/brand/circle-mark` ✓; `motion, AnimatePresence` from `framer-motion` ✓; `toast` from `sonner` ✓.
    - CirklePact: `X, FileSignature, Users, Check, Clock, Plus, Shield` from `lucide-react` ✓; `Input, Textarea, Button, Progress, Avatar` from shadcn/ui ✓; `motion, AnimatePresence` ✓; `toast` ✓.
16. Verified both files use `z-[150]`, `fixed inset-0`, `bg-background`, `"use client"`, `glass-strong`, `bg-gradient-hero`, `bg-gradient-gold`, `text-cream` — all per spec.
17. Verified no indigo or blue colors used anywhere. All gradients come from brand tokens (gold/teal/rose/steel) + emerald (only for "completed" success state, matching existing `citizen-shield.tsx` and `time-capsule.tsx` convention).

## Stage Summary

- **Two new files** created at `src/components/overlays/`:
  - `cirkle-dna.tsx` (~340 lines) — full-screen social-genome overlay with an animated SVG DNA double-helix (2 twists, 13 colored rungs, depth-based opacity for 3D rotation illusion), 6 strand score bars with shimmer, genome-integrity hero score, quick-compatibility preview, share/compare actions.
  - `cirkle-pact.tsx` (~470 lines) — full-screen social-contracts overlay with a List view (3 sample pacts: active/completed/pending, status chips, signer avatar stacks, progress bars, witness counts, hash footers) and a Create view (title/description/deadline/witness-picker form with live preview and signing animation).
- **Both files pass ESLint with 0 errors, 0 warnings** (the single project-level lint error lives in `cirkle-mood.tsx`, an unrelated pre-existing file outside this task's scope).
- **Dev server compiles cleanly** with the new files present.
- **No other files modified** — strict adherence to the task constraint. The two overlays are drop-in components that can be opened from anywhere by mounting `<CirkleDNA open={...} onClose={...} />` or `<CirklePact open={...} onClose={...} />`.
- All brand-palette rules respected (gold/teal/rose/steel + cream/charcoal; no indigo, no blue). Emerald is used only for "completed" success states, mirroring the established convention in `citizen-shield.tsx` and `time-capsule.tsx`.
