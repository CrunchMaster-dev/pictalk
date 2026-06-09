// PicTalk keyboard board — an on-screen keyboard for literate users who can't speak.
//
// Owns a text buffer. Renders: a prediction row (from predict.js), the keyboard keys
// (letters + a numbers/symbols layer, with a one-shot shift), and a Quick Phrases row
// (from phrases.js) that speaks a whole saved sentence on a single tap.
//
// The shared top-bar message element (#sentence) mirrors the buffer; the shared
// ▶ Speak / ✕ controls in app.js call speakCurrent() / clearCurrent().

import * as Speech from "./speech.js";
import * as Predict from "./predict.js";
import * as Phrases from "./phrases.js";

let container = null;   // #keyboard
let messageEl = null;   // #sentence (shared)
let predRow, keysEl, quickRow;

let buffer = "";
let shift = false;      // one-shot capitalization
let layer = "letters";  // "letters" | "symbols"

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

export function speakCurrent() {
  const text = buffer.trim();
  if (!text) return;
  Speech.speak(text);
  Predict.learn(text);
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

// ---- Quick phrases ---------------------------------------------------------
export async function refreshPhrases() {
  const phrases = await Phrases.getPhrases();
  quickRow.replaceChildren();
  for (const p of phrases) {
    quickRow.append(
      el("button", {
        className: "quick",
        onclick: () => Speech.speak(p.text),
        title: p.text,
      },
        el("span", { className: "quick-emoji", textContent: p.emoji }),
        el("span", { className: "quick-text", textContent: p.text })
      )
    );
  }
}

// ---- Lifecycle -------------------------------------------------------------
export async function init(opts) {
  container = opts.container;
  messageEl = opts.messageEl;

  predRow = el("div", { className: "pred-row", "aria-label": "Word suggestions" });
  keysEl = el("div", { className: "keys" });
  quickRow = el("div", { className: "quick-row", "aria-label": "Quick phrases" });
  container.replaceChildren(predRow, keysEl, quickRow);

  await Predict.load();
  renderKeys();
  await refreshPhrases();
}

export function show() {
  container.hidden = false;
  updateMessage();
  refreshPredictions();
}

export function hide() {
  container.hidden = true;
}
