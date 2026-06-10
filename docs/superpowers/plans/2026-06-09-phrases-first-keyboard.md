# Phrases-First Keyboard Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild PicTalk's keyboard mode as a phrases-first board — category tabs (🚨 Urgent · 🍽 Needs · 💬 Social · 🧩 Starters · ⭐ Mine · ⌨ Type) over a grid of large color-coded phrase tiles, with instant-speak vs. sentence-starter behavior and the full typing keyboard one tab away.

**Architecture:** Same vanilla ES-module, zero-build stack. `keyboard.js` (which owns the `#keyboard` container) gains the tab bar + phrase grid; the built-in phrase library ships in `data.js` (append-only, like picture tiles); custom phrases keep the existing `quickPhrases` storage in `phrases.js` with new `category`/`mode` fields normalized on read — zero migration, Free+ sync untouched.

**Tech Stack:** Vanilla HTML/CSS/JS ES modules. IndexedDB via existing `db.js`. No new files, no packages.

**Spec:** `docs/superpowers/specs/2026-06-09-pictalk-phrases-first-keyboard-design.md`

---

## Context you must know

- **No test framework.** This is a zero-build vanilla app. Verification = serve locally (`python -m http.server 8123` from repo root, open `http://localhost:8123/app/`) and drive with Playwright/browser. **SW gotcha:** after changing files, clear the service worker + caches TWICE (first reload pre-caches old files under the new cache name) or you'll test stale code.
- **db.js `getSetting(key, fallback)`** returns `fallback` for missing keys (bug fixed 2026-06-09 — trust it now).
- **Append-only rule:** built-in phrases, once shipped, are a motor-planning contract. This plan CREATES the library; future changes may only append.
- **`el()` helper** exists in both `app.js` and `keyboard.js`: `el(tag, props, ...kids)` — hyphenated prop keys become attributes, others are DOM properties.
- **Scanning:** the engine groups visible elements into rows by vertical position and rebuilds rows after every activation, so tab switches are picked up automatically; `Scanning.restart()` on explicit tab switch keeps the highlight from going stale mid-cycle. `scanning.js` imports nothing — `keyboard.js` may import it without cycles.
- **Settings dialog** pauses scanning while open; `#phrases-section` in the parent panel is only visible in keyboard mode.
- **Commit style:** imperative subject, body bullets, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

## Acceptance Criteria (from spec)

- [ ] Keyboard mode opens on the 🚨 Urgent tab every time (`show()` resets it)
- [ ] Instant tiles speak immediately and never touch the message buffer
- [ ] Starter tiles append their words (+ trailing space, capitalized if buffer empty) and auto-switch to ⌨ Type with predictions refreshed
- [ ] Builder tiles render dashed with a trailing "…" (display only)
- [ ] ⭐ Mine shows custom phrases; empty state shows a hint; legacy stored phrases (no category/mode) still load
- [ ] Settings form adds category + behavior selects; new phrases appear on the right tab with the right behavior
- [ ] Old quick-pill row is gone from the Type view
- [ ] Tabs + tiles are scannable; auditory scanning speaks phrase labels
- [ ] Dark + high-contrast themes render tabs/tiles correctly
- [ ] SW bumped to `pictalk-v8`; zero console errors; existing tests of picture board unaffected

---

### Task 1: Built-in phrase library (`data.js`)

**Files:**
- Modify: `app/js/data.js` (append at end of file)

- [ ] **Step 1: Append the phrase library to `data.js`**

Add after the closing `};` of `STARTER_TILES`:

```js
// ---- Phrase board (keyboard mode) -------------------------------------------
// Built-in one-tap phrases for literate users. SAME append-only contract as
// tiles: never reorder or remove — only append to the end of a category.
//   mode: "speak" -> tap speaks the text instantly
//   mode: "build" -> tap drops the text into the message bar (sentence starter)
export const PHRASE_CATEGORIES = [
  { id: "urgent",   name: "Urgent",   emoji: "🚨", fitz: "red" },
  { id: "needs",    name: "Needs",    emoji: "🍽️", fitz: "orange" },
  { id: "social",   name: "Social",   emoji: "💬", fitz: "pink" },
  { id: "starters", name: "Starters", emoji: "🧩", fitz: "blue" },
  { id: "mine",     name: "Mine",     emoji: "⭐", fitz: "purple" },
];

export const STARTER_PHRASES = {
  urgent: [
    { id: "ph-pain",      text: "I'm in pain",          mode: "speak" },
    { id: "ph-help",      text: "I need help now",      mode: "speak" },
    { id: "ph-nurse",     text: "Call my nurse",        mode: "speak" },
    { id: "ph-wrong",     text: "Something is wrong",   mode: "speak" },
    { id: "ph-911",       text: "Emergency — call 911", mode: "speak" },
  ],
  needs: [
    { id: "ph-bathroom",  text: "I need the bathroom",        mode: "speak" },
    { id: "ph-water",     text: "Water, please",              mode: "speak" },
    { id: "ph-hungry",    text: "I'm hungry",                 mode: "speak" },
    { id: "ph-medicine",  text: "My medicine, please",        mode: "speak" },
    { id: "ph-rest",      text: "I'm tired — I want to rest", mode: "speak" },
    { id: "ph-cold",      text: "I'm cold",                   mode: "speak" },
    { id: "ph-hot",       text: "I'm hot",                    mode: "speak" },
    { id: "ph-position",  text: "Please adjust my position",  mode: "speak" },
  ],
  social: [
    { id: "ph-yes",       text: "Yes",                   mode: "speak" },
    { id: "ph-no",        text: "No",                    mode: "speak" },
    { id: "ph-thanks",    text: "Thank you",             mode: "speak" },
    { id: "ph-wait",      text: "Please wait a moment",  mode: "speak" },
    { id: "ph-hello",     text: "Hello",                 mode: "speak" },
    { id: "ph-goodbye",   text: "Goodbye",               mode: "speak" },
    { id: "ph-love",      text: "I love you",            mode: "speak" },
    { id: "ph-stay",      text: "Can you stay with me?", mode: "speak" },
  ],
  starters: [
    { id: "ph-ineed",     text: "I need",       mode: "build" },
    { id: "ph-iwant",     text: "I want",       mode: "build" },
    { id: "ph-bring",     text: "Please bring", mode: "build" },
    { id: "ph-ifeel",     text: "I feel",       mode: "build" },
    { id: "ph-canyou",    text: "Can you",      mode: "build" },
    { id: "ph-whereis",   text: "Where is",     mode: "build" },
    { id: "ph-dontwant",  text: "I don't want", mode: "build" },
    { id: "ph-whenis",    text: "When is",      mode: "build" },
  ],
  mine: [], // custom phrases (phrases.js) render here
};
```

- [ ] **Step 2: Syntax check**

`data.js` is an ES module, so import it in node:

Run: `node --input-type=module -e "import('file:///C:/Users/chris/pictalk/app/js/data.js').then(m => console.log(Object.keys(m).join(',')))"`
Expected output includes: `CATEGORIES,CATEGORY_FITZ,PHRASE_CATEGORIES,STARTER_PHRASES,STARTER_TILES`

- [ ] **Step 3: Commit**

```bash
git add app/js/data.js
git commit -m "Add built-in phrase library for phrases-first keyboard mode"
```

---

### Task 2: Custom phrase storage gains category + mode (`phrases.js`)

**Files:**
- Modify: `app/js/phrases.js`

- [ ] **Step 1: Replace the body of `phrases.js`**

The built-in library now ships in `data.js`, so the old `DEFAULTS` seeding is
removed: new users get an empty Mine tab (built-ins cover the old defaults).
Existing users' stored arrays load unchanged, normalized to `category:"mine"`,
`mode:"speak"`.

```js
// Quick Phrases — saved sentences an adult user can speak with a single tap.
// Stored in the IndexedDB settings store as a JSON array, shared by the keyboard
// board (which renders them) and the settings panel (which edits them).
//
// Built-in phrases live in data.js (STARTER_PHRASES); this module only stores
// the user's OWN phrases. Each: { id, emoji, text, category, mode }
//   category -> which phrase tab it appears on ("mine" default)
//   mode     -> "speak" (say instantly) | "build" (drop into the message bar)

import { getSetting, setSetting } from "./db.js";

const KEY = "quickPhrases";

// Rows saved before categories existed lack the new fields — default them.
const normalize = (p) => ({ category: "mine", mode: "speak", ...p });

export async function getPhrases() {
  const saved = await getSetting(KEY, null);
  return saved && Array.isArray(saved) ? saved.map(normalize) : [];
}

export async function addPhrase(text, { emoji = "💬", category = "mine", mode = "speak" } = {}) {
  const phrases = await getPhrases();
  phrases.push({
    id: "qp-" + Math.floor(performance.now()),
    emoji,
    text: text.trim(),
    category,
    mode,
  });
  await setSetting(KEY, phrases);
  return phrases;
}

export async function deletePhrase(id) {
  const phrases = (await getPhrases()).filter((p) => p.id !== id);
  await setSetting(KEY, phrases);
  return phrases;
}
```

- [ ] **Step 2: Check the one existing caller of `addPhrase`**

`app.js` `addPhrase(ev)` currently calls `Phrases.addPhrase(text)` — still valid
(options default). It gets the new selects in Task 5.

- [ ] **Step 3: Commit**

```bash
git add app/js/phrases.js
git commit -m "Quick phrases: add category + tap-behavior fields, stop seeding defaults"
```

---

### Task 3: Phrase board styles (`styles.css`)

**Files:**
- Modify: `app/styles.css` (replace the `.quick-row`/`.quick` block; add new classes)

- [ ] **Step 1: Replace the quick-phrase styles**

DELETE these rules (the pill row is gone): `.quick-row`, `.quick`,
`.quick:active`, `.quick-emoji`, and the dark/contrast `.quick` override
(`:root[data-theme="dark"] .quick, ...`).

ADD in their place:

```css
/* ---- Phrase board (keyboard mode) ---- */
.ptabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  flex-shrink: 0;
}
.ptab {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 2px solid transparent;
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--ink);
  font-size: 16px;
  font-weight: 700;
  padding: 10px 14px;
  cursor: pointer;
  white-space: nowrap;
}
.ptab.on {
  background: var(--brand-soft);
  border-color: var(--brand);
  color: var(--brand-dark);
}
:root[data-theme="contrast"] .ptab { border-color: var(--border); }

.phrase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 10px;
  align-content: start;
  overflow-y: auto;
  flex: 1;
  padding-bottom: max(4px, env(safe-area-inset-bottom));
}
.ptile {
  border: 2px solid var(--border);
  border-bottom-width: 5px;
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  padding: 18px 12px;
  min-height: 76px;
  cursor: pointer;
  transition: transform 0.05s ease;
}
.ptile:active { transform: scale(0.96); }
.ptile.fitz-red    { background: var(--fitz-red-bg);    border-bottom-color: var(--fitz-red); }
.ptile.fitz-orange { background: var(--fitz-orange-bg); border-bottom-color: var(--fitz-orange); }
.ptile.fitz-pink   { background: var(--fitz-pink-bg);   border-bottom-color: var(--fitz-pink); }
.ptile.fitz-blue   { background: var(--fitz-blue-bg);   border-bottom-color: var(--fitz-blue); }
.ptile.fitz-purple { background: var(--fitz-purple-bg); border-bottom-color: var(--fitz-purple); }
.ptile.builder {
  border-style: dashed;
  border-bottom-style: solid;
  color: var(--brand-dark);
}
.phrase-empty {
  grid-column: 1 / -1;
  color: var(--muted);
  font-size: 16px;
  text-align: center;
  padding: 28px 8px;
}

/* Typing view wrapper (predictions + keys) */
.typing {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
}
```

- [ ] **Step 2: Check `.keyboard` container still lays out correctly**

`.keyboard` is `display:flex; flex-direction:column; gap:10px;` — its children
become `.ptabs` (fixed), `.phrase-grid` (flex:1, scrolls), `.typing` (flex:1).
Verify in Task 6's browser pass; adjust only if tiles overflow the viewport.

- [ ] **Step 3: Commit**

```bash
git add app/styles.css
git commit -m "Styles for phrase board: tabs, tiles, builder variant; drop quick pills"
```

---

### Task 4: Phrase board in `keyboard.js`

**Files:**
- Modify: `app/js/keyboard.js`

- [ ] **Step 1: Update imports and module state**

Replace the import block and the `let container/messageEl/predRow...` lines at the top with:

```js
import * as Speech from "./speech.js";
import * as Predict from "./predict.js";
import * as Phrases from "./phrases.js";
import * as Scanning from "./scanning.js";
import { PHRASE_CATEGORIES, STARTER_PHRASES } from "./data.js";

let container = null;   // #keyboard
let messageEl = null;   // #sentence (shared)
let tabsEl, gridEl, typingEl, predRow, keysEl;

let buffer = "";
let shift = false;      // one-shot capitalization
let layer = "letters";  // "letters" | "symbols"
let activeTab = "urgent";   // a PHRASE_CATEGORIES id, or "type"
let customPhrases = [];     // cached from Phrases.getPhrases()
```

(Also update the file's header comment: the board is now "phrase tabs +
typing keyboard", quick pills are gone.)

- [ ] **Step 2: Add tab + grid rendering and the tap flow**

Add after `clearCurrent()`/`getText()` (before "Key handling"):

```js
// ---- Phrase board ------------------------------------------------------------
const TABS = [...PHRASE_CATEGORIES, { id: "type", name: "Type", emoji: "⌨️" }];

function setTab(id) {
  activeTab = id;
  renderTabs();
  const typing = id === "type";
  gridEl.hidden = typing;
  typingEl.hidden = !typing;
  if (typing) refreshPredictions();
  else renderGrid();
  Scanning.restart(); // board layout changed — rebuild scan rows
}

function renderTabs() {
  tabsEl.replaceChildren();
  for (const t of TABS) {
    const on = t.id === activeTab;
    tabsEl.append(
      el("button", {
        className: "ptab" + (on ? " on" : ""),
        "aria-pressed": String(on),
        "aria-label": t.name,
        onclick: () => setTab(t.id),
      },
        el("span", { textContent: t.emoji }),
        el("span", { textContent: t.name })
      )
    );
  }
}

function phrasesFor(catId) {
  const builtIn = STARTER_PHRASES[catId] || [];
  const custom = customPhrases.filter((p) => p.category === catId);
  return [...builtIn, ...custom];
}

function renderGrid() {
  gridEl.replaceChildren();
  const cat = PHRASE_CATEGORIES.find((c) => c.id === activeTab);
  const items = phrasesFor(activeTab);
  if (!items.length) {
    gridEl.append(
      el("p", { className: "phrase-empty", textContent: "Add your own phrases in ⚙ Parent settings." })
    );
    return;
  }
  for (const p of items) {
    const build = p.mode === "build";
    gridEl.append(
      el("button", {
        className: "ptile fitz-" + (cat ? cat.fitz : "purple") + (build ? " builder" : ""),
        "aria-label": build ? p.text + ", add to message" : p.text,
        onclick: () => onPhraseTap(p),
      },
        el("span", { textContent: build ? p.text + " …" : p.text })
      )
    );
  }
}

function onPhraseTap(p) {
  if (p.mode === "build") {
    // Sentence starter: drop the words into the buffer and go finish typing.
    insertStarter(p.text);
    setTab("type");
  } else {
    Speech.speak(p.text);
    Predict.learn(p.text);
  }
}

function insertStarter(text) {
  let t = text;
  if (buffer.trim() === "") {
    buffer = "";
    t = t.charAt(0).toUpperCase() + t.slice(1); // sentence-initial capital
  } else if (!/\s$/.test(buffer)) {
    t = " " + t;
  }
  buffer += t + " ";
  shift = false;
  updateMessage();
}
```

- [ ] **Step 3: Rewrite `refreshPhrases`, `init`, and `show`**

Replace the existing `refreshPhrases()` (which built `quickRow` pills) with:

```js
// Re-pull custom phrases (called by settings after add/delete).
export async function refreshPhrases() {
  customPhrases = await Phrases.getPhrases();
  if (gridEl && activeTab !== "type") renderGrid();
}
```

Replace `init()` and `show()` with:

```js
export async function init(opts) {
  container = opts.container;
  messageEl = opts.messageEl;

  tabsEl = el("div", { className: "ptabs", "aria-label": "Phrase categories" });
  gridEl = el("div", { className: "phrase-grid", "aria-label": "Phrases" });
  predRow = el("div", { className: "pred-row", "aria-label": "Word suggestions" });
  keysEl = el("div", { className: "keys" });
  typingEl = el("div", { className: "typing" }, predRow, keysEl);
  container.replaceChildren(tabsEl, gridEl, typingEl);

  await Predict.load();
  renderKeys();
  await refreshPhrases();
  renderTabs();
  setTab("urgent");
}

export function show() {
  container.hidden = false;
  updateMessage();
  setTab("urgent"); // urgent is ALWAYS the landing tab — predictable in a crisis
}
```

Note: `el("div", {...}, predRow, keysEl)` — the existing `el()` helper accepts
children; `quickRow` and all its references are now gone from the file.

- [ ] **Step 4: Syntax check**

Run: `node --input-type=module -e "import('file:///C:/Users/chris/pictalk/app/js/keyboard.js').catch(e => console.log('expected DOM error, syntax OK:', e.message))"`
Expected: an error about `document`/DOM (no DOM in node) — NOT a SyntaxError.

- [ ] **Step 5: Commit**

```bash
git add app/js/keyboard.js
git commit -m "Keyboard mode: phrases-first board with category tabs and starter flow"
```

---

### Task 5: Settings form + scanning selectors (`app.js`, `index.html`)

**Files:**
- Modify: `app/index.html` (phrases section)
- Modify: `app/js/app.js` (`collectScanItems`, `addPhrase`, `renderPhraseList`, phrases-section copy)

- [ ] **Step 1: Update the quick-phrases settings section in `index.html`**

Replace the `#phrases-section` contents (keep the section element and ids):

```html
    <section id="phrases-section" class="parent-section" hidden>
      <h3>Quick phrases</h3>
      <p class="muted">One-tap phrases for the phrase board. "Speak right away"
        phrases talk instantly; "sentence starters" drop their words into the
        message to be finished by typing.</p>
      <form id="phrase-form" class="add-form">
        <label>New quick phrase
          <input id="phrase-text" type="text" placeholder="I need my medicine" maxlength="120" />
        </label>
        <label>Where it goes
          <select id="phrase-category">
            <option value="mine" selected>⭐ Mine</option>
            <option value="urgent">🚨 Urgent</option>
            <option value="needs">🍽️ Needs</option>
            <option value="social">💬 Social</option>
            <option value="starters">🧩 Starters</option>
          </select>
        </label>
        <label>When tapped
          <select id="phrase-mode">
            <option value="speak" selected>Speak it right away</option>
            <option value="build">Add to the message (sentence starter)</option>
          </select>
        </label>
        <button type="submit" class="btn primary">Add phrase</button>
      </form>
      <div id="phrase-list" class="personal-list"></div>
    </section>
```

- [ ] **Step 2: Update `app.js` — scan selectors**

In `collectScanItems()`, replace the keyboard selector list:

```js
  const perMode =
    state.mode === "keyboard"
      ? ["#keyboard .ptab", "#keyboard .ptile", "#keyboard .pred", "#keyboard .key"]
      : ["#categories .cat", "#grid .tile"];
```

- [ ] **Step 3: Update `app.js` — `addPhrase` and `renderPhraseList`**

`addPhrase(ev)` body, after the `text` guard:

```js
  await Phrases.addPhrase(text, {
    category: $("#phrase-category").value,
    mode: $("#phrase-mode").value,
  });
  Predict.learn(text);
  $("#phrase-form").reset();
  await renderPhraseList();
  await Keyboard.refreshPhrases();
```

In `renderPhraseList()`, import `PHRASE_CATEGORIES` is needed — extend the
existing data.js import at the top of `app.js`:

```js
import { CATEGORIES, STARTER_TILES, CATEGORY_FITZ, PHRASE_CATEGORIES } from "./data.js";
```

and show the category in each row's meta line:

```js
  for (const p of phrases) {
    const cat = PHRASE_CATEGORIES.find((c) => c.id === p.category);
    const row = el(
      "div",
      { className: "personal-row" },
      el("span", { className: "thumb thumb-emoji", textContent: p.emoji }),
      el("span", {
        className: "personal-meta",
        textContent: `${p.text} · ${cat ? cat.emoji + " " + cat.name : "⭐ Mine"}${p.mode === "build" ? " · starter" : ""}`,
      }),
      el("button", {
        className: "btn danger small",
        textContent: "Delete",
        onclick: async () => {
          await Phrases.deletePhrase(p.id);
          await renderPhraseList();
          await Keyboard.refreshPhrases();
        },
      })
    );
    list.append(row);
  }
```

- [ ] **Step 4: Commit**

```bash
git add app/index.html app/js/app.js
git commit -m "Settings: phrase category + behavior selects; scan the phrase board"
```

---

### Task 6: Guide, SW bump, browser verification

**Files:**
- Modify: `guide.html` (step 4 list)
- Modify: `app/sw.js` (cache version)

- [ ] **Step 1: Update guide step 4 ("Type to talk")**

Replace the step-4 `<ul>` items with:

```html
          <li>For someone who can read and spell (for example, after a stroke or with
            ALS), open the <b>⚙ gear → Mode → Keyboard</b>.</li>
          <li>It opens on ready-made <b>phrase tiles</b> — Urgent, Needs, and Social
            phrases speak <b>instantly</b> with one tap. Add your own under ⭐ Mine.</li>
          <li><b>🧩 Starters</b> like "I need…" drop their words into the message —
            finish the sentence on the <b>⌨ Type</b> tab, where <b>word prediction</b>
            learns the words used most.</li>
```

(Use the Edit tool — NEVER PowerShell text replacement on this file; it
contains emoji and em-dashes that Windows PowerShell 5.1 mangles.)

- [ ] **Step 2: Bump the service worker cache**

In `app/sw.js`: `const CACHE_VERSION = "pictalk-v7";` → `"pictalk-v8"`.

- [ ] **Step 3: Serve and verify with Playwright**

Run: `python -m http.server 8123 --directory C:\Users\chris\pictalk` (background).
Open `http://localhost:8123/app/`, then **unregister SW + delete caches, reload,
and repeat once** (see Context). Then verify, in order:

1. Switch mode to Keyboard (⚙ → math gate → Mode → Keyboard). Board opens on
   🚨 Urgent with 5 red tiles; tab bar shows all 6 tabs; 0 console errors.
2. Tap "I'm in pain" → speaks; message bar stays empty.
3. Open 🧩 Starters → tap "I need" → view jumps to ⌨ Type, message bar reads
   "I need ", predictions visible, keys present, NO pill row at the bottom.
4. Type a word, ▶ Speak works; ⌫ removes last word.
5. ⭐ Mine: empty-state hint visible on a fresh profile (or legacy phrases
   listed on an old profile). Add a phrase in settings with category Starters +
   behavior "Add to the message" → dashed tile appears in 🧩 Starters.
6. Settings → enable switch scanning → close. Tabs and tiles get scan-row
   highlights; auditory scan speaks phrase labels.
7. Theme → dark, then high contrast: tabs/tiles legible, builder dashes visible.
8. Reload page: mode persists, board opens on Urgent again.
9. Console: zero errors/warnings for the whole pass.

- [ ] **Step 4: Commit**

```bash
git add guide.html app/sw.js
git commit -m "Guide step 4 for phrase board; bump SW cache to pictalk-v8"
```

---

### Task 7: Ship

- [ ] **Step 1: Final review**

`git -C C:\Users\chris\pictalk status` → clean except intended changes all
committed; `git log --oneline -6` shows the five commits above.

- [ ] **Step 2: Push (deploys via GitHub Pages)**

```bash
git push origin master
```

- [ ] **Step 3: Confirm live**

Poll `https://crunchmaster-dev.github.io/pictalk/app/sw.js` until it contains
`pictalk-v8`, then spot-check the live app loads with 0 console errors.

- [ ] **Step 4: Update memory**

Update `project_pictalk.md`: phrases-first keyboard shipped (commit hash),
phrase library is append-only, quickPhrases schema gained category/mode with
normalize-on-read, DEFAULTS seeding removed.
