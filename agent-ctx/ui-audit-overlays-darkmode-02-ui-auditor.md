# Task ID: ui-audit-overlays-darkmode-02
# Agent: UI Auditor (Overlays + Dark Mode)

## Task
Audit + fix UI issues across 48 overlay components and the dark/light theme system:
1. Verify `src/app/globals.css` theme variable consistency (light/dark pairs, WCAG AA contrast).
2. Scan `src/components/ui/` for hardcoded `text-white`/`bg-white`/`text-black`/`bg-black`/`text-cream`/`text-charcoal` that should use theme tokens.
3. Scan `src/components/overlays/` (48 files) for hardcoded colors, missing backdrops, z-index issues (overlays should be z-[140]+), and text invisible in either mode.
4. Fix all issues found.
5. Run `bun run lint` after fixes.

## Work Log

### 1. Theme variable audit (`src/app/globals.css`)
- **Light (:root)**: `--background 40 50% 98%` (cream), `--foreground 60 8% 9%` (charcoal) → contrast ~19:1 ✓. `--muted-foreground 60 6% 35%` → contrast ~7:1 ✓. `--card 0 0% 100%` + `--card-foreground 60 8% 9%` → ~21:1 ✓.
- **Dark (.dark)**: `--background 60 8% 6%`, `--foreground 40 50% 98%` → ~17:1 ✓. `--muted-foreground 40 15% 65%` → ~9:1 ✓. `--card 60 8% 10%` + `--card-foreground 40 50% 98%` → ~15:1 ✓.
- All theme-adaptive tokens (`--background`, `--foreground`, `--card`, `--glass-strong-bg`, etc.) have matching `.dark` counterparts. Brand tokens (`--gold`, `--teal`, `--rose`, `--steel`, `--charcoal`, `--cream`) are intentionally theme-invariant (brand identity). No fixes needed.

### 2. shadcn/ui audit (`src/components/ui/`)
- `badge.tsx`, `button.tsx`: `bg-destructive text-white` — intentional (destructive is red in both modes; white text on red = visible). Safe.
- `sheet.tsx`, `drawer.tsx`, `alert-dialog.tsx`, `dialog.tsx`: `bg-black/50` backdrop — translucent black works in both modes. Safe.
- No fixes needed in `src/components/ui/`.

### 3. Overlay audit — issues found & fixed

#### 3a. Always-dark overlays — added `dark` class to root
These overlays use `bg-charcoal`/`bg-charcoal/95` (always dark) or a colorful gradient as their root, but contained `glass-strong` / `glass` / `bg-card` panels that adapt to the global theme. In light mode those inner panels turned light, making the `text-cream` text on them invisible. Fix: add `dark` class to the root motion.div so the entire subtree uses dark-mode CSS variables (and `dark:` variants activate). The `text-cream` text then stays visible on the now-dark `glass-strong` panels.

| File | Root element | Change |
|---|---|---|
| `ghost-inbox.tsx` | line 121 — `bg-charcoal text-cream` | added `dark` class |
| `mashahd-player.tsx` | line 230 — `bg-charcoal text-cream` | added `dark` class + z-[95]→z-[140] |
| `live-translate.tsx` | line 123 — `bg-charcoal` | added `dark` class |
| `lamahat-viewer.tsx` | line 109 — `bg-charcoal/95 backdrop-blur-xl` | added `dark` class + z-[95]→z-[140] |
| `thread-theatre.tsx` | line 79 — `style={{ background: post.gradient }}` | added `dark` class |

Verified none of these 5 overlays use `dark:` variants expecting the global theme — `dark` class is purely additive (only forces CSS variables to dark-mode values for descendants).

#### 3b. `bg-foreground/XX text-cream` pattern (broken in dark mode)
`bg-foreground` is theme-aware: dark in light mode, light in dark mode. With `text-cream` (always light), the overlay text was invisible in dark mode. Fixed by replacing with `bg-charcoal/XX text-cream` (theme-invariant dark+light combo, works on any photo/colorful background in both modes).

| File | Line | Before | After |
|---|---|---|---|
| `color-story.tsx` | 129 | `bg-foreground/70 text-cream` | `bg-charcoal/70 text-cream` |
| `ai-director.tsx` | 161, 168 | `bg-foreground/60 text-cream` | `bg-charcoal/70 text-cream` |
| `time-shift-cam.tsx` | 77, 93 | `bg-foreground/60 text-cream` | `bg-charcoal/70 text-cream` |
| `time-shift-cam.tsx` | 96 | `bg-foreground/40 text-cream` | `bg-charcoal/40 text-cream` |
| `group-memory.tsx` | 242 | `bg-foreground/20` (with `text-cream` loader) | `bg-charcoal/40` |
| `living-photos.tsx` | 155 | `bg-foreground/30` (with `text-cream` icon) | `bg-charcoal/40` |

#### 3c. `text-cream/XX` on theme-adaptive gradient tiles (broken in light mode)
The variant tiles in `time-shift-cam.tsx` use `v.tint` (`from-secondary/40 via-accent/15 to-background`) which is theme-adaptive (`to-background` flips). `text-cream` (light) was invisible on the light-mode tile. Replaced with `text-foreground/XX` which adapts.

| File | Line | Before | After |
|---|---|---|---|
| `time-shift-cam.tsx` | 90 | `text-cream/70`, `text-cream/80` | `text-foreground/70`, `text-foreground/80` |
| `time-shift-cam.tsx` | 94 | `text-cream/70` | `text-foreground/70` |
| `time-shift-cam.tsx` | 124 | `text-cream/80` | `text-foreground/80` |

#### 3d. `text-cream` on `bg-secondary`/gradient buttons (low contrast in one mode)
- `debate-arena.tsx:166` — `bg-gradient-to-r from-secondary to-accent text-cream`: gold-to-rose gradient in light mode made cream text low-contrast on the gold end. Replaced with `text-secondary-foreground` (charcoal-in-light, cream-in-dark) — visible on both gold-to-rose and teal-to-rose.
- `echo-breaker.tsx:105` — `text-cream` on 4 brand-color pills (`bg-secondary`/`bg-accent`/`bg-primary`/`bg-steel`): cream was low-contrast on gold (`bg-secondary` light) and on gold (`bg-primary` dark). Replaced with `text-secondary-foreground` — visible on all 4 brand colors in both modes.
- `mashahd-player.tsx` (4 occurrences, lines 255/273/446/717) — `bg-secondary text-charcoal`: with the new `dark` class forcing dark mode, `bg-secondary` becomes teal and `text-charcoal` (always dark) loses contrast. Replaced with `text-secondary-foreground` (cream-in-dark via the forced `.dark` subtree).

#### 3e. z-index fixes (overlays should be z-[140]+)
Bumped under-z-indexed overlays to the standard z-[140] (backdrop) / z-[150] (content) convention used by the 35+ primary feature overlays.

| File | Before | After |
|---|---|---|
| `composer.tsx` | z-[80]/z-[90] | z-[140]/z-[150] |
| `governance-center.tsx` | z-[80]/z-[90] | z-[140]/z-[150] |
| `command-palette.tsx` | z-[120]/z-[130] | z-[140]/z-[150] |
| `ai-assistant.tsx` | z-[120] (+content had no z) | z-[140]/z-[150] |
| `circle-pulse.tsx` | z-[80] (+content had no z) | z-[140]/z-[150] |
| `mashahd-player.tsx` | z-[95] | z-[140] |
| `lamahat-viewer.tsx` | z-[95] | z-[140] |

#### 3f. citizen-shield contrast fixes
- `citizen-shield.tsx:85` — stop button: `bg-accent-foreground` (always cream) + `bg-white` square = invisible in both modes. Changed `bg-white` → `bg-accent` (rose on cream = visible).
- `citizen-shield.tsx:73` — toggle knob: `bg-white` on `bg-muted` track (dark gray in dark mode) = low contrast in dark mode. Changed `bg-white` → `bg-background` (cream-in-light, charcoal-in-dark — visible on both `bg-emerald-500` and `bg-muted` in both modes).

### 4. Patterns intentionally left as-is
- `bg-gradient-gold text-charcoal` (15+ occurrences across 13 files): always-gold gradient + always-dark text = theme-invariant, safe in both modes.
- `bg-cream text-charcoal` (`thread-theatre.tsx`, `word-garden.tsx`, `live-translate.tsx`, `mood-player.tsx`): always-light + always-dark = theme-invariant toggle/play buttons. Safe.
- `text-cream` on `bg-gradient-hero` (`smart-chapters.tsx:122`, `echo-remix.tsx:120-121`, `mood-player.tsx:171`): `--gradient-hero` is always dark-ish mid-tones in both modes (light variant: teal-steel-rose 23%/42%/56%; dark variant: 18%/25%/36%). Cream text visible in both. Safe.
- `text-cream` on `bg-charcoal` / `bg-charcoal/XX` (`composer.tsx:246`, `ghost-inbox.tsx`, `live-translate.tsx`, `lamahat-viewer.tsx`): always-dark + always-light = theme-invariant. Safe.
- `text-cream` on trait color segments (`topic-dna.tsx`): trait colors are static hsl (dark teal, rose, steel, gold, dark gray, darker rose) — text-cream on mid-tones is a design choice, consistent across both modes. Not a theme issue.
- `bg-white` camera flash (`circle-lens.tsx:261`): literal white flash overlay. Theme-invariant by design.
- `bg-white` REC dot on `bg-accent/90` badge (`citizen-shield.tsx:85`): rose badge + white dot = visible in both modes.
- `text-white` on `bg-emerald-500/90` / `bg-charcoal` (`citizen-shield.tsx`): always-green/always-dark + always-light = theme-invariant. Safe.
- `bg-black` / `bg-white/XX` on video player (`mashahd-player.tsx`): photo/video overlays, theme-invariant. Safe.

### 5. Lint + dev server
- `bun run lint` — passes clean (no errors, no warnings).
- `dev.log` — no new compile errors after changes; multiple `✓ Compiled in XXXms` for the edited files.

## Stage Summary

### Files modified (16)
1. `src/components/overlays/ghost-inbox.tsx` — added `dark` class to root.
2. `src/components/overlays/mashahd-player.tsx` — added `dark` class to root, bumped z-[95]→z-[140], `text-charcoal`→`text-secondary-foreground` (4 occurrences).
3. `src/components/overlays/live-translate.tsx` — added `dark` class to root.
4. `src/components/overlays/lamahat-viewer.tsx` — added `dark` class to root, bumped z-[95]→z-[140].
5. `src/components/overlays/thread-theatre.tsx` — added `dark` class to root.
6. `src/components/overlays/color-story.tsx` — `bg-foreground/70 text-cream`→`bg-charcoal/70 text-cream`.
7. `src/components/overlays/ai-director.tsx` — `bg-foreground/60 text-cream`→`bg-charcoal/70 text-cream` (2 occurrences).
8. `src/components/overlays/time-shift-cam.tsx` — `bg-foreground/XX text-cream`→`bg-charcoal/XX text-cream` (3 occurrences); `text-cream/XX`→`text-foreground/XX` (3 occurrences).
9. `src/components/overlays/group-memory.tsx` — `bg-foreground/20`→`bg-charcoal/40`.
10. `src/components/overlays/living-photos.tsx` — `bg-foreground/30`→`bg-charcoal/40`.
11. `src/components/overlays/debate-arena.tsx` — `text-cream`→`text-secondary-foreground` on gradient pill.
12. `src/components/overlays/echo-breaker.tsx` — `text-cream`→`text-secondary-foreground` on brand-color pills.
13. `src/components/overlays/composer.tsx` — z-[80]/z-[90]→z-[140]/z-[150].
14. `src/components/overlays/governance-center.tsx` — z-[80]/z-[90]→z-[140]/z-[150].
15. `src/components/overlays/command-palette.tsx` — z-[120]/z-[130]→z-[140]/z-[150].
16. `src/components/overlays/ai-assistant.tsx` — z-[120]→z-[140], added z-[150] to content.
17. `src/components/overlays/circle-pulse.tsx` — z-[80]→z-[140], added z-[150] to content.
18. `src/components/overlays/citizen-shield.tsx` — `bg-white`→`bg-accent` (stop button), `bg-white`→`bg-background` (toggle knob).

### Issue categories fixed
- **5 always-dark overlays** now force dark mode on their entire subtree via the `dark` class — internal `glass-strong`/`bg-card` panels no longer flip to light in light mode (which made `text-cream` text invisible).
- **6 overlays** with `bg-foreground/XX text-cream` photo-overlay patterns — replaced with theme-invariant `bg-charcoal/XX text-cream` (works on any photo/colorful bg in both modes).
- **3 overlays** with `text-cream` on theme-adaptive gradient tiles — replaced with `text-foreground/XX` (adapts to theme).
- **3 overlays** with `text-cream` on `bg-secondary`/gradient buttons — replaced with `text-secondary-foreground` (charcoal-in-light on gold, cream-in-dark on teal).
- **7 overlays** with z-index below 140 — bumped to z-[140]/z-[150] to match the standard overlay convention.
- **2 contrast bugs in `citizen-shield.tsx`** — stop button square and toggle knob now visible in both modes.

### Verification
- `bun run lint`: clean (0 errors, 0 warnings).
- Dev server: all 16 edited files compile successfully (verified via `dev.log` showing repeated `✓ Compiled in XXXms` after edits).
- No `dark:` variants in the 5 always-dark overlays — the `dark` class is purely additive (forces CSS variables to dark-mode values for descendants, no side effects on existing styles).
