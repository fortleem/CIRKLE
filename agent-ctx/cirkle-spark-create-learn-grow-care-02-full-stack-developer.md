# Task: cirkle-spark-create-learn-grow-care-02

**Agent**: Full-Stack Developer (Overlay Builder)
**Task**: Create 5 new overlay components — CirkleSpark, CirkleCreate, CirkleLearn, CirkleGrow, CirkleCare.

## Context

Read `/home/z/my-project/worklog.md` (latest entries: ui-audit-overlays-darkmode-02 fixed contrast/z-index issues across 17 overlay files; wasl-feature-audit-01 catalogued 15 missing chat features). Also read existing overlays (`ai-assistant.tsx`, `circle-hub.tsx`, `privacy-shield.tsx`) for design-language reference, plus `globals.css` for brand tokens and `progress.tsx` for shadcn progress component.

## Files Created (5)

All in `/home/z/my-project/src/components/overlays/`. Total: 2,808 lines.

### 1. `cirkle-spark.tsx` (491 lines) — AI Idea Incubator
- Gold-accent overlay. Header chip uses `bg-gradient-gold` with `Lightbulb` icon.
- Pitch textarea + "Evaluate with AI" button (1.1s mock delay, spin loader).
- Sample ideas (3): food delivery, tutoring service, handmade crafts.
- `evaluateIdea()` mock analyzer: keyword-based verdict → "Promising" / "Risky" / "Needs refinement".
- Analysis card: verdict card (color-coded: gold/rose/steel), 5 metrics with animated progress bars (1–10 scale, `bg-gradient-gold`), co-founders in your Circle (3 mock people with skill lists + match %), AI Action Plan (5-step roadmap with vertical timeline).
- "Save idea to notebook" button → sonner toast.
- All on `glass-strong` full-screen panel (z-[150]) with `bg-charcoal/60 backdrop-blur` backdrop (z-[140]).

### 2. `cirkle-create.tsx` (671 lines) — AI Creative Studio
- Rose-accent creative studio. Header chip uses `bg-gradient-to-br from-rose/40 to-gold/30` with `Wand2` icon.
- 4-tool grid (2 cols): AI Image 🎨 (rose), AI Video Edit 🎬 (teal), AI Writing ✍️ (gold), AI Music 🎵 (steel).
- Each tool opens a back-navigable detail form:
  - **AI Image**: prompt textarea + 3-style selector (realistic/artistic/minimal) + Generate button → placeholder preview card (gradient with `ImageIcon`) + toast "Image generated".
  - **AI Video Edit**: brief textarea + 3 toggle pills (auto-cut, subtitles, music) with animated switch knobs + Generate → toast "Video edit queued".
  - **AI Writing**: topic textarea + 4-tone selector (professional/casual/witty/formal) + Generate → outputs a mock draft in a copyable card with toast "Draft ready".
  - **AI Music**: mood selector (4 emoji cards) + duration selector (15/30/60s) + Generate → animated waveform equalizer (28 bars, `bg-gradient-to-t from-steel/40 to-steel`) + toast "Music generated".

### 3. `cirkle-learn.tsx` (538 lines) — AI Personal Tutor
- Teal-accent tutor. Header chip uses `bg-gradient-to-br from-teal to-steel` with `GraduationCap` icon.
- Top streak strip (3 stats: 12-day streak, 148 min/week, 3 active courses).
- "Continue learning" — 3 sample courses (Arabic for Beginners 64%, Python Basics 38%, Saudi Culture 101 82%) with progress bars; tapping loads the matching subject.
- 6 subject cards in a 2-col grid: 🗣️ Languages, 💻 Coding, 📚 Exam Prep, 🌍 Cultural, 🎨 Creative, 📈 Business (each with brand-tinted gradient + emoji + tagline).
- Subject detail view: hero (emoji + name + tagline), current-course progress bar, level selector (Beginner/Intermediate/Advanced), daily goal selector (10/15/30 min), streak card, "Start today's lesson" button → toast "Lesson started".
- Sticky bottom "Ask tutor" input with gold sparkles icon + teal/steel send button → toast.

### 4. `cirkle-grow.tsx` (443 lines) — AI Life Coach
- Steel-accent life coach. Header chip uses `bg-gradient-to-br from-steel to-teal` with `TrendingUp` icon.
- 3 seed goals: 💰 Save 10,000 SAR by December (62%), 📚 Read 24 books (62%), 💪 Exercise 3×/week (85% streak).
- Each goal card: emoji tile, title, progress label, days remaining, animated progress bar (`bg-gradient-to-r from-steel to-teal`), AI tip in a muted callout with gold sparkles.
- Weekly AI Review card: 3 AI-generated insights (momentum "Strong", reading "+0.4 books", spending "−12%") with brand-tinted backgrounds.
- "Create new goal" dashed-border button → form view: 5-category selector (Finance/Health/Learning/Habit/Career), description textarea, target date input, "AI will track and motivate you" note, Create goal button → adds to list + toast.
- `daysUntil()` helper for computing remaining days.

### 5. `cirkle-care.tsx` (665 lines) — AI Health Companion
- Rose-accent health companion. Header chip uses `bg-gradient-to-br from-rose to-gold` with `HeartPulse` icon.
- Top privacy banner: `100% on-device · Nothing leaves your phone` (teal lock tile).
- 5 sections, each wrapped in a reusable `Section` component (icon + title + optional action):
  1. **Symptom Check**: glass search input + 8 symptom chips (toggle pills) + "Check" action → mock possible-conditions list (keyword-matched: tension headache, viral URI, dehydration, muscle strain, etc.) with match-percentage bars + "Not medical advice" disclaimer box.
  2. **Medication Reminders**: divided list of 3 seed meds (Vitamin D, Omega-3, Magnesium) with time pills + "Add" action that prepends a new editable reminder.
  3. **Mental Health Check**: "How are you feeling today?" + 5-emoji selector (😄🙂😐😟😢) → AI mood insight card with tailored coping suggestion (3 tiers: ≥4 gratitude, =3 walk/sun, ≤2 breathing + hotline).
  4. **Emergency Info**: 3 fields (conditions, allergies, contact) with Edit/Done toggle for inline editing.
  5. **Health Stats**: 3 SVG progress rings (steps 78%, sleep 90%, water 64%) using `<linearGradient>` with `style={{ stopColor: 'hsl(var(--gold))' }}` for proper brand-token coloring. Each ring has unique ID (`ring-gradient-${label}`) to avoid SVG def collisions.
- Footer disclaimer: "CirkleCare is informational and never replaces professional medical advice…".

## Design Language (shared across all 5)

- **Backdrop**: `fixed inset-0 z-[140]` with `background: hsl(var(--charcoal) / 0.6)` + `backdrop-filter: blur(8px)`. Closes on click.
- **Container**: `fixed inset-x-0 bottom-0 top-[4vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col max-w-2xl mx-auto`.
- **Header**: `px-5 py-4 border-b border-border/50`, with 40×40 brand-gradient chip (icon), title + subtitle, optional back button, close button.
- **Body**: `flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-24` (with `pb-24` so content clears any sticky footer).
- **Animation**: framer-motion `motion.div` with `initial={{ y: 40, opacity: 0 }}` → `animate={{ y: 0, opacity: 1 }}`, spring `{ stiffness: 240, damping: 26 }`. Inner list items use staggered `initial={{ opacity: 0, y: 12 }}` with `delay: i * 0.05`.
- **Accent rotation**: each overlay has a distinct brand color (gold → rose → teal → steel → rose/gold) to feel visually unique while sharing the same chrome.

## Brand Palette Compliance

All files use ONLY brand tokens: `gold`, `teal`, `rose`, `steel`, `charcoal`, `cream`, plus the semantic theme-adaptive tokens (`background`, `foreground`, `card`, `muted`, `border`, `accent`, `secondary`, `primary`, etc.). No indigo, no blue, no purple. `--steel` (211 30% 42%) is a desaturated steel-blue explicitly listed in the brand palette and used sparingly as a gradient partner.

Theme-adaptive text follows the audit findings from the previous task: `text-cream` only on always-dark gradients (`bg-gradient-hero`, `bg-charcoal/XX`, brand-color gradients on dark contexts); `text-charcoal` only on `bg-gradient-gold`; `text-secondary-foreground` not needed since no `bg-secondary` + cream/charcoal combos were used.

## Verification

- **Lint**: `bun run lint` → exit 0, 0 errors, 0 warnings.
- **TypeScript**: `npx tsc --noEmit --skipLibCheck` → 0 errors in any of the 5 new files (pre-existing errors in other files are untouched and out of scope per "Do NOT modify any other files").
- **Dev server**: next dev running on :3000. New files import nothing new (only React, framer-motion, sonner, lucide-react) — no compile triggers since the components aren't yet imported by a parent (per task constraint).

## Patterns Applied from Worklog

- z-index convention z-[140] (backdrop) + z-[150] (content) from the ui-audit-overlays-darkmode-02 audit.
- Backdrop style uses inline `style={{ background: 'hsl(var(--charcoal) / 0.6)' }}` instead of utility classes (matching `circle-hub.tsx` pattern).
- `glass-strong` on the container, `glass` on inner panels (matching `ai-assistant.tsx`).
- Card pattern `rounded-3xl border border-border/60 bg-card p-4 space-y-3` matches `circle-hub.tsx` PillarDetail.
- Animated progress bars use `motion.div` with `initial={{ width: 0 }}` + delay stagger, matching existing patterns.

No other files modified. Ready for the parent task to wire these overlays into the shell/dock/command palette.
