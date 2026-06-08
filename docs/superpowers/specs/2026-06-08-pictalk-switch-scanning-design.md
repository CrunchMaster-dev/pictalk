# PicTalk — Switch Scanning (single-switch access)

**Date:** 2026-06-08
**Status:** Approved design (v1)
**Builds on:** 2026-06-07 picture board, 2026-06-08 keyboard mode

## Mission

Open PicTalk to people with severe motor disabilities who can't reliably touch the
screen. The device highlights items automatically; the user activates a single
switch (spacebar, Enter, a tap anywhere, or any plug-in assistive switch that
emulates those) to select what's highlighted.

## Decisions (from brainstorming)

1. **One-switch automatic** scanning (timed highlight, one switch selects).
2. **Both boards** — a shared, board-agnostic engine.
3. **Auditory scanning** — speak each item as it highlights (toggle).

## Architecture: a board-agnostic engine

`js/scanning.js` is the only code that knows *how* to scan. It calls back to the app
for "what are the actionable items on the active board right now?", groups them into
**rows by their on-screen position** (so it works for the wrapping picture grid, the
keyboard's rows, and the shared top bar identically), and runs **row-column scanning**.

### Row-column flow (one-switch automatic)
1. **Row scan:** a highlight moves top-to-bottom, row by row, on a timer. With audio
   on, it speaks a hint for each row.
2. **Switch press** selects the highlighted row.
3. **Column scan:** the highlight moves across that row, item by item, speaking each.
4. **Switch press** activates the highlighted item (clicks it — speak / type / fire),
   then returns to row scan.

### Escapes (so a mistake never traps the user)
- Letting a row pass: scanning continues to the next row and loops.
- Entering the wrong row: after 2 column passes with no selection, it returns to row
  scan automatically.

### The switch
When scanning is ON: **spacebar, Enter, or a tap/click anywhere** is the switch.
Direct tapping of individual buttons is intentionally disabled (a global capture-phase
handler turns every tap into a switch press). Programmatic activation by the engine is
guarded so it doesn't re-trigger the switch handler. When scanning is OFF, nothing is
attached and both boards behave exactly as before.

### Auditory cues
Spoken label per item = `aria-label` → `.tile-label`/`.quick-text` text → `textContent`.
Row hint speaks the row's first item. Uses the existing speech module (which cancels
prior utterances, so fast steps don't pile up).

### Pausing
While the settings dialog is open, scanning pauses and its global handlers detach, so a
caregiver can operate settings with normal taps. It resumes on close (if still enabled).

## Settings (⚙ panel — new "Switch scanning" section)

- **Switch scanning:** On / Off (default Off — opt-in).
- **Scan speed:** 0.7s / 1s / 1.5s / 2s / 3s per step (default 1.5s).
- **Speak items while scanning:** On / Off (default On).
- Persisted in the IndexedDB settings store.

## Files

- `js/scanning.js` — engine (row grouping, timing loop, highlight, switch input, audio).
- `js/app.js` — `collectScanItems()` per mode; wires settings; pauses on dialog;
  restarts the engine after mode changes.
- `index.html` — "Switch scanning" settings section.
- `styles.css` — `.scan-hl-row` (row highlight) and `.scan-hl` (active item highlight).
- `sw.js` — cache `js/scanning.js`; bump cache version.

## Explicitly OUT of v1

- Two-switch step mode, group/block scanning, per-region scan-order customization,
  dwell/eye-gaze input. All later.

## Success criteria

1. Scanning on, direct touch off: row highlight auto-advances; a switch press
   (Space / Enter / tap anywhere) selects a row; the row scans item-by-item speaking
   each; a second press activates the item — on **both** boards and the top-bar controls.
2. Scan speed and speak-toggle apply from settings and persist across reload.
3. After a category switch / typing re-render, scanning re-collects the new items.
4. Scanning off → both boards behave exactly as today.
