# Task 32 — MashahdPlayer YouTube-style auto-hide + comments toggle

**Agent:** full-stack-developer
**File modified:** `src/components/overlays/mashahd-player.tsx` (overwritten, 725 lines)
**Lint:** 0 errors, 0 warnings
**Dev server:** compiles cleanly, `GET / 200`

## What was done

Rewrote `MashahdPlayer` to add YouTube-style auto-hide controls and a comments toggle while preserving every existing feature (play/pause, seek, prev/next, mute, theater, captions, settings, AI chapters, action pills, follow, comments, close, keyboard shortcuts, P2P/AI badges).

### Auto-hide controls
- `controlsVisible` state (timer-driven) + `forceShow` derived (`!playing || showSettings || commentFocused`).
- `effectiveControlsVisible = forceShow || controlsVisible` computed during render.
- Window `mousemove` / `touchstart` / `click` / `wheel` listeners call stable `resetHideTimer()` (reads `forceShow` from a ref mirror).
- 3s `setTimeout` → `setControlsVisible(false)`. `hideTimerRef` for cleanup.
- Paused / settings-open / comment-focused → controls always visible.
- Clicking the video toggles play/pause AND resets the timer (first click on hidden controls reveals + toggles — YouTube behavior).
- When hidden: `cursor-none` on overlay, top bar slides up, bottom controls slide down, prev/next fade+slide out, side rail + badges fade.
- Thin 2px progress strip (`h-0.5 bg-gradient-gold`, no handle) stays visible at the bottom when controls are hidden.

### Comments toggle
- `commentsVisible` state: default open on desktop, closed on mobile (`window.innerWidth >= 768`).
- `MessageCircle` toggle button in the bottom controls bar (icon-only on mobile, "Comments" label on `sm+`).
- `c` keyboard shortcut.
- Side rail wrapped in `AnimatePresence`: slides right (`x: 60`) on exit, video stage expands to full width.

### Lint-rule hurdles resolved
1. `react-hooks/set-state-in-effect` — moved the timer scheduling into the effect directly (`setTimeout` callback calls `setControlsVisible(false)` — async, not flagged); handled the "resume reveals controls" case via the derived-state-during-render pattern.
2. `react-hooks/refs` — converted the `prevForceShowRef` to `prevForceShow` state (matching the existing `prevKey` pattern).
3. Final: 0 errors.

## Consumer
`src/screens/mashahd-screen.tsx` calls `<MashahdPlayer open={playerIdx !== null} index={playerIdx ?? 0} onClose={...} />` — prop signature unchanged.
