# PicTalk World-Class Accessibility Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring PicTalk from "solid v1" to world-class free AAC: industry-standard AAC conventions (Fitzgerald color coding, fixed motor-planning positions, guarded clear, undo-last-word), full WCAG 2.2 accessibility (focus-visible, reduced motion, high-contrast + dark themes, dialog focus management, 3:1 scan highlight), richer switch-scanning controls (debounce/hold, first-item delay), hardened speech + storage (offline voice badges, rate slider, `storage.persist()`), smarter prediction (learns personal tiles), and a visual polish pass — all while keeping the zero-build vanilla stack and 100% offline operation.

**Architecture:** Same vanilla ES-module architecture, no new files except this plan. All UI work lands in `app/index.html` + `app/styles.css`; behavior changes land in the existing focused modules (`app.js` orchestrates; `scanning.js`, `speech.js`, `predict.js`, `data.js`, `keyboard.js` own their domains). New settings follow the existing pattern: `<input>`/`<select>` in the parent panel → wired in `app.js` → persisted via `DB.setSetting/getSetting` → consumed by the owning module via a setter (mirroring `Scan.setStepMs`). Theme switching = `data-theme` attribute on `<html>` + CSS custom-property overrides. Service worker cache version bumps to `pictalk-v7`.

**Tech Stack:** Vanilla HTML/CSS/JS ES modules. Zero new packages, zero build step. IndexedDB via existing `db.js`. Web Speech API via existing `speech.js`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `app/styles.css` | Fitzgerald tile coloring, `:focus-visible`, `prefers-reduced-motion`, dark + high-contrast themes, scan-highlight contrast, message-bar word chips, visual polish |
| Modify | `app/index.html` | Undo (⌫ word) button, new parent-panel settings (theme, tile size, auto-clear, speak-on-tap, color coding toggle, scan hold/debounce, voice rate + test), iOS install hint |
| Modify | `app/js/app.js` | Wire new settings, dialog focus management, guarded clear-all, undo-last-word, sentence-bar word chips, theme apply, `storage.persist()` |
| Modify | `app/js/data.js` | Fitzgerald `color` field per tile/category; expand Core toward Banajee-23 (append-only — never reorder existing tiles) |
| Modify | `app/js/scanning.js` | Hold-duration + repeat-debounce settings, first-item delay, setters following `setStepMs` pattern |
| Modify | `app/js/speech.js` | Offline (`localService`) badge data, `voiceschanged` + poll fallback, rate setting, sentence chunking for long text |
| Modify | `app/js/predict.js` | Learn personal-tile labels + quick phrases into the model |
| Modify | `app/js/keyboard.js` | Apply Fitzgerald-neutral key styling hooks; no behavior change beyond CSS hooks |
| Modify | `app/sw.js` | Bump cache to `pictalk-v7` |
| Modify | `guide.html` | `loading="lazy"` on screenshots; mention new settings briefly |
| Modify | `og-image.png` | Recompress (target < 100 KB) |
| Create | `docs/superpowers/plans/2026-06-09-world-class-accessibility-overhaul.md` | This plan |

---

## Context you must know

- **Motor planning is sacred.** Existing tile ORDER and POSITIONS in `data.js` must never change — kids like Mateo have memorized them. New core words are appended at the END of categories only. Color coding changes appearance, never position.
- **Settings pattern to copy:** parent panel input in `index.html` → load in `app.js` `init()` via `DB.getSetting(key, fallback)` → `change` listener calls `DB.setSetting` + module setter. See `scan-speed` wiring in `app.js` for the canonical example.
- **Modified Fitzgerald Key colors:** yellow=pronouns/people, green=verbs/actions, blue=descriptors/feelings, orange=nouns/food, purple=questions, pink=social, red=negation/emergency (no/stop/help), white=misc. Tint tile **background softly + 4px bottom border in full color** so text contrast stays ≥4.5:1. Provide an off toggle (`colorCoding` setting, default ON).
- **Scanning grabs elements by vertical position** (`buildRows()` 8px snap) — any layout change that shifts tile rows still works automatically, but test scanning after CSS changes.
- **`speechSynthesis.cancel()` before every `speak()`** is already in `speech.js` — keep it. iOS requires first speak inside a user gesture (already satisfied — all speech is tap-driven).
- **Pause/resume keep-alive is FORBIDDEN** (breaks Android). For >200-char utterances, chunk by sentence and queue via `utterance.onend`.
- **Service worker:** any shipped change requires bumping `CACHE` in `sw.js` (currently `pictalk-v6`) or users keep the old version forever.
- **Dark/high-contrast themes:** implement as `:root[data-theme="dark"]` / `:root[data-theme="contrast"]` variable overrides. Default stays current light theme; setting key `theme` with values `light|dark|contrast|auto` (auto = `prefers-color-scheme`).
- **Free+ sync:** new settings keys are device-local unless added to `BOARD_SETTING_KEYS` in `db.js` — add `theme`, `colorCoding`, `tileSize`, `autoClear`, `speakOnTap`, `scanHoldMs`, `scanDebounceMs`, `rate` so they sync.
- **Local dev:** `python -m http.server 8123` from repo root, open `http://localhost:8123/app/`. Needs http (not file://) for SW + speech.
- **Deploy:** push to `master`; GitHub Pages serves root. Landing at `/`, app at `/app/`.
- **Verify with Playwright** against localhost: tab focus rings visible, dialog focus trap, scanning still highlights rows, themes switch, no console errors.

---

## Acceptance Criteria

- [ ] Every interactive element shows a ≥3px high-contrast focus ring on keyboard focus (`:focus-visible`) in the app
- [ ] `prefers-reduced-motion: reduce` disables all transforms/transitions in the app
- [ ] Tiles are color-coded per Modified Fitzgerald Key, toggleable in settings, text contrast ≥4.5:1 in all themes
- [ ] Dark, high-contrast, and auto themes selectable in parent settings and persisted
- [ ] Sentence bar shows tappable word chips; ⌫ removes last word; Clear requires hold-to-confirm (with non-hold fallback prompt)
- [ ] Auto-clear-after-speak and speak-on-tap toggles work and persist
- [ ] Scan settings include hold-duration and repeat-debounce; both filter inputs correctly
- [ ] Scan highlight has ≥3:1 contrast in every theme
- [ ] Voice list groups offline voices with a badge; rate slider + "test voice" button work
- [ ] Long sentences (>200 chars) speak fully on Chrome desktop (chunked)
- [ ] Prediction suggests personal-tile words after they're added
- [ ] `navigator.storage.persist()` requested on init
- [ ] Parent panel dialogs trap focus and restore it on close
- [ ] og-image.png < 100 KB; guide images lazy-load
- [ ] SW cache bumped to v7; app loads offline after refresh
- [ ] Playwright smoke pass on localhost: both modes render, scanning runs, themes apply, zero console errors
- [ ] Existing tile positions in data.js unchanged (append-only diff)

---

### Task 1: Accessibility foundation (CSS)

**Files:** Modify `app/styles.css`

- [ ] Add `:focus-visible` ring (3px, `--focus` var, offset 2px) for all buttons/inputs/selects
- [ ] Add `@media (prefers-reduced-motion: reduce)` killing transforms/transitions
- [ ] Define `data-theme="dark"` and `data-theme="contrast"` variable overrides incl. scan highlight colors with ≥3:1 contrast
- [ ] Add `tileSize` hooks: `data-tilesize="small|medium|large"` adjusting grid `minmax()`

### Task 2: Fitzgerald color coding + vocabulary

**Files:** Modify `app/js/data.js`, `app/js/app.js`, `app/styles.css`, `app/index.html`

- [ ] Add `color` category field per tile group; CSS classes `tile--yellow` etc. (soft bg + solid bottom border)
- [ ] Append missing Banajee core words to Core (e.g., go, more variants already exist — append only what's missing: mine, on, in, out, off, all done, what)
- [ ] `colorCoding` setting (default on) + toggle in parent panel

### Task 3: Sentence bar upgrade

**Files:** Modify `app/js/app.js`, `app/index.html`, `app/styles.css`

- [ ] Render sentence as word chips (tap chip = speak that word)
- [ ] Add ⌫ undo-last-word button (aria-label "Remove last word")
- [ ] Guard Clear: press-and-hold 600ms OR confirm fallback; visual hold progress
- [ ] `autoClear` (clear after Speak) and `speakOnTap` settings + parent panel toggles

### Task 4: Scanning upgrades

**Files:** Modify `app/js/scanning.js`, `app/js/app.js`, `app/index.html`

- [ ] `setHoldMs(ms)` — switch must be held ≥N ms to count (0 default)
- [ ] `setDebounceMs(ms)` — ignore presses within N ms after an activation (0 default)
- [ ] First-item delay: +50% dwell on first item of each cycle
- [ ] Parent-panel controls for both, persisted, synced

### Task 5: Speech hardening

**Files:** Modify `app/js/speech.js`, `app/js/app.js`, `app/index.html`

- [ ] `voiceschanged` listener + 250ms poll up to 2s fallback
- [ ] Voice dropdown: offline voices first with "— offline" suffix
- [ ] Rate slider (0.6–1.4) + "Test voice" button; persist `rate`
- [ ] Chunk utterances >200 chars by sentence, queue on `onend`

### Task 6: Prediction + storage

**Files:** Modify `app/js/predict.js`, `app/js/app.js`, `app/js/db.js`

- [ ] `Predict.learn()` personal tile labels on add + on init; learn quick phrases
- [ ] `navigator.storage.persist()` on init (fire-and-forget)
- [ ] Add new setting keys to `BOARD_SETTING_KEYS`

### Task 7: Dialog focus management + polish

**Files:** Modify `app/js/app.js`, `app/index.html`, `app/styles.css`

- [ ] Focus first control on dialog open; return focus to opener on close (native `<dialog>` handles trap; verify + handle `close` event)
- [ ] Visual polish pass: refined shadows/spacing/typography per frontend-design skill, keeping warm friendly brand
- [ ] iOS "Add to Home Screen" hint (shown once on iOS Safari, dismissible)

### Task 8: Assets, SW, verify, ship

**Files:** Modify `og-image.png`, `guide.html`, `app/sw.js`

- [ ] Recompress og-image.png (<100 KB); add `loading="lazy"` to guide images
- [ ] Bump SW cache to `pictalk-v7`
- [ ] Playwright verification pass on localhost (both modes, scanning, themes, console clean)
- [ ] Commit + push to master (deploys via GitHub Pages)
