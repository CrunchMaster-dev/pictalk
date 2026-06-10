# PicTalk Phrases-First Keyboard Mode — Design Spec

**Date:** 2026-06-09
**Status:** Approved by John (brainstorming session with visual companion)

## Problem

Keyboard mode buries its most valuable feature. Quick phrases — the one-tap
sentences an adult AAC user reaches for all day ("I'm in pain", "I need the
bathroom") — render as a thin, horizontally-scrolling pill row squeezed under
the keys. They're hard to see, hard to hit, and there's no way to organize
them or to use a phrase as the START of a sentence (combinations).

## Goal

Make keyboard mode **phrases-first**: a category-tabbed board of large,
color-coded phrase tiles (same look and feel as the picture board), with the
full typing keyboard one tab away. Urgent needs are always one tap from
anywhere. Phrase "starters" combine with typing to build full sentences fast.

## UX (approved layout: "Phrases-first board")

```
┌──────────────────────────────────────────────────────┐
│ [message bar: chips/text]   ▶ Speak   ⌫   ✕   ⚙      │  <- existing top bar
├──────────────────────────────────────────────────────┤
│ 🚨 Urgent │ 🍽 Needs │ 💬 Social │ 🧩 Starters │ ⭐ Mine │ ⌨ Type │  <- tab bar
├──────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ I'm in   │ │ I need   │ │ Call my  │   …          │  <- phrase tile grid
│  │ pain     │ │ help now │ │ nurse    │              │     (or keyboard when
│  └──────────┘ └──────────┘ └──────────┘              │      ⌨ Type active)
└──────────────────────────────────────────────────────┘
```

- Keyboard mode **always opens on the 🚨 Urgent tab** (never remembers the
  last tab — emergencies must be one tap away, predictably).
- Tabs swap the content area. ⌨ Type shows today's typing UI unchanged
  (predictions + keys); the old quick-phrase pill row is REMOVED from it.
- Tile tap behavior, by phrase `mode`:
  - `"speak"` (instant): speaks the text immediately. Does NOT touch the
    message buffer. Teaches the prediction model (`Predict.learn`).
  - `"build"` (starter): appends the text + a trailing space to the typing
    buffer (capitalized if the buffer is empty), **auto-switches to ⌨ Type**,
    and refreshes predictions — bigrams then suggest likely next words.
- Builder tiles are visually distinct: dashed border + trailing "…" on the
  label (display only; the stored text has no ellipsis).
- Tiles use the existing Fitzgerald-tint style (soft background + solid
  bottom edge) and respect all themes, tile-size setting NOT applied (phrase
  text length varies; grid uses its own responsive minmax).

## Phrase library (approved starter set)

Built-in, shipped in `data.js`, **append-only** (same motor-planning contract
as picture tiles — never reorder or remove; only append).

| Category | Color | Mode | Phrases |
|---|---|---|---|
| 🚨 urgent | red | speak | I'm in pain · I need help now · Call my nurse · Something is wrong · Emergency — call 911 |
| 🍽 needs | orange | speak | I need the bathroom · Water, please · I'm hungry · My medicine, please · I'm tired — I want to rest · I'm cold · I'm hot · Please adjust my position |
| 💬 social | pink | speak | Yes · No · Thank you · Please wait a moment · Hello · Goodbye · I love you · Can you stay with me? |
| 🧩 starters | blue | build | I need · I want · Please bring · I feel · Can you · Where is · I don't want · When is |
| ⭐ mine | purple | speak (default) | user-added phrases (existing `quickPhrases` appear here) |

## Architecture

No new files. `keyboard.js` already owns the `#keyboard` container and is the
"adult board" module — it gains the tab bar + phrase grid (~+120 lines, still
cohesive). Data and storage stay where they live today.

| File | Change |
|---|---|
| `app/js/data.js` | Add `PHRASE_CATEGORIES` (id, name, emoji, fitz color) and `STARTER_PHRASES` (per category: `{id, text, mode}`) |
| `app/js/keyboard.js` | Tab bar + phrase grid rendering; tab state (module-local, reset to `urgent` on `show()`); starter-insert flow; REMOVE old quick-pill row; `refreshPhrases()` now re-renders the Mine grid |
| `app/js/phrases.js` | Custom phrase objects gain `category` + `mode` fields (defaults `"mine"`/`"speak"`); legacy stored rows without the fields are normalized on read. `addPhrase(text, {category, mode})` |
| `app/js/app.js` | Settings: phrase form gains category + behavior selects; phrase list rows show category; scanning selectors add `.ptab`/`.ptile`; remove `.quick` selector |
| `app/index.html` | Two selects in the quick-phrase settings form |
| `app/styles.css` | `.ptab`, `.ptab.on`, `.phrase-grid`, `.ptile`, `.ptile.builder` (+ theme overrides) |
| `app/sw.js` | Bump cache to `pictalk-v8` |
| `guide.html` | Update step 4 ("Type to talk") to describe tabs + starters briefly |

**Storage / sync:** zero migration. Built-ins live in code. Custom phrases
keep the existing `quickPhrases` setting key, so Free+ sync keeps working;
new fields ride along inside the same JSON. Settings form defaults:
category=Mine, behavior=Speak instantly.

**Built-in phrases are not editable or deletable in v1** (YAGNI — the ⭐ Mine
tab covers personalization; revisit if users ask).

## Accessibility

- Tabs are `<button>`s with `aria-pressed`, matching the picture board's
  category bar pattern (not ARIA tabs — consistency wins).
- Phrase tiles are `<button>`s with `aria-label` = phrase text ("… add to
  message" suffix for builders).
- Switch scanning: tab row and tile grid group into scan rows automatically
  by vertical position; app.js scan selectors updated. Auditory scanning
  speaks each phrase label via the existing `labelOf()` (aria-label).
- All colors come from existing theme variables; works in dark/contrast.
- `:focus-visible` rings apply via existing global rule.

## Edge cases

- **Empty Mine tab:** show a muted hint tile "Add your own in ⚙ settings".
- **Starter tapped twice:** appends again (intentional — "I need I need" is
  visible in the bar and ⌫ undoes a word at a time).
- **Long custom phrases:** tiles wrap text; grid rows auto-size.
- **Scanning active during auto-jump to Type:** `Scanning.restart()` fires on
  tab switch (board re-rendered), same as existing mode changes.
- **Speak-on-tap setting:** does not apply here (phrase tiles have explicit
  per-phrase behavior).

## Testing (Playwright on localhost)

1. Keyboard mode opens on Urgent tab; 5 red tiles visible; 0 console errors.
2. Instant tile speaks (utterance fired) and buffer stays empty.
3. Starter tile: buffer = "I need ", view auto-switches to Type, predictions
   refresh.
4. Mine tab shows existing custom phrases; add-phrase form with category
   Starters/behavior build creates a dashed tile in Starters.
5. Tabs + tiles appear in scan rows when scanning enabled.
6. Dark + contrast themes render tabs/tiles correctly.
7. Existing quickPhrases data (pre-upgrade shape) still loads (legacy
   normalization).

## Out of scope (explicitly)

- Editing/hiding built-in phrases
- Phrase usage statistics / auto-sorting by frequency
- Slot-filling templates ("I need [___]" with a picker)
- Picture-board changes of any kind
