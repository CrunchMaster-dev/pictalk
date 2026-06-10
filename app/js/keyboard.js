// PicTalk keyboard board — the "adult board": a phrases-first tile board with
// the full typing keyboard one tab away.
//
// Tabs: built-in phrase categories (data.js STARTER_PHRASES) + ⭐ Mine (custom
// phrases from phrases.js) + ⌨ Type (predictions + keys). Phrase tiles either
// speak instantly (mode "speak") or drop their words into the message bar to be
// finished by typing (mode "build" — sentence starters).
//
// The shared top-bar message element (#sentence) mirrors the buffer; the shared
// ▶ Speak / ⌫ / ✕ controls in app.js call speakCurrent() / undoWord() / clearCurrent().

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

const LETTERS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", "back"],
  ["layer", "space", ".", "speak"],
];

const SYMBOLS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["-", "/", ":", ";", "(", ")", "$", "&", "@", "\""],
  ["layer2", ".", ",", "?", "!", "'", "+", "back"],
  ["letters", "space", "…", "speak"],
];

const el = (tag, props = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [key, val] of Object.entries(props)) {
    // Hyphenated keys (aria-*, data-*) are attributes, not DOM properties.
    if (key.includes("-")) node.setAttribute(key, val);
    else node[key] = val;
  }
  for (const k of kids) node.append(k);
  return node;
};

// ---- Buffer + display ------------------------------------------------------
function updateMessage() {
  messageEl.textContent = buffer;
  messageEl.scrollTop = messageEl.scrollHeight; // keep the newest words visible
}

function refreshPredictions() {
  const suggestions = Predict.predict(buffer, 4);
  predRow.replaceChildren();
  for (const s of suggestions) {
    predRow.append(
      el("button", {
        className: "pred",
        textContent: s,
        onclick: () => {
          buffer = Predict.applySuggestion(buffer, s);
          shift = false;
          updateMessage();
          refreshPredictions();
          renderKeys();
        },
      })
    );
  }
}

function insert(ch) {
  buffer += ch;
  shift = false;
  updateMessage();
  refreshPredictions();
}

function backspace() {
  buffer = buffer.slice(0, -1);
  updateMessage();
  refreshPredictions();
}

export function speakCurrent(opts = {}) {
  const text = buffer.trim();
  if (!text) return;
  Speech.speak(text, opts);
  Predict.learn(text);
}

// Remove the last whole word (the shared ⌫ undo button).
export function undoWord() {
  buffer = buffer.replace(/\s*\S+\s*$/, "");
  updateMessage();
  refreshPredictions();
}

export function clearCurrent() {
  buffer = "";
  shift = false;
  updateMessage();
  refreshPredictions();
}

export function getText() {
  return buffer;
}

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

// ---- Key handling ----------------------------------------------------------
function onKey(key) {
  switch (key) {
    case "shift": shift = !shift; renderKeys(); return;
    case "back": backspace(); return;
    case "space": insert(" "); return;
    case "speak": speakCurrent(); return;
    case "layer": layer = "symbols"; renderKeys(); return;
    case "layer2": /* second symbol page — reuse same for v1 */ renderKeys(); return;
    case "letters": layer = "letters"; renderKeys(); return;
    default: {
      const ch = shift && key.length === 1 ? key.toUpperCase() : key;
      insert(ch);
    }
  }
}

function keyLabel(key) {
  switch (key) {
    case "shift": return shift ? "⬆" : "⇧";
    case "back": return "⌫";
    case "space": return "space";
    case "speak": return "▶";
    case "layer": return "123";
    case "letters": return "ABC";
    case "layer2": return "#+=";
    default: return shift && key.length === 1 ? key.toUpperCase() : key;
  }
}

function keyClass(key) {
  if (["shift", "back", "speak", "layer", "letters", "layer2"].includes(key)) return "key key-fn";
  if (key === "space") return "key key-space";
  if (key === "shift" && shift) return "key key-fn key-active";
  return "key";
}

function renderKeys() {
  const rows = layer === "letters" ? LETTERS : SYMBOLS;
  keysEl.replaceChildren();
  for (const row of rows) {
    const rowEl = el("div", { className: "key-row" });
    for (const key of row) {
      let cls = keyClass(key);
      if (key === "shift" && shift) cls += " key-active";
      rowEl.append(
        el("button", {
          className: cls,
          textContent: keyLabel(key),
          onclick: () => onKey(key),
          "aria-label": key,
        })
      );
    }
    keysEl.append(rowEl);
  }
}

// ---- Custom phrases --------------------------------------------------------
// Re-pull custom phrases (called by settings after add/delete).
export async function refreshPhrases() {
  customPhrases = await Phrases.getPhrases();
  if (gridEl && activeTab !== "type") renderGrid();
}

// ---- Lifecycle -------------------------------------------------------------
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

export function hide() {
  container.hidden = true;
}
