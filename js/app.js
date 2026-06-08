// PicTalk main app logic.
//
// Flow:
//   1. Load starter vocabulary + any parent-added personal tiles from IndexedDB.
//   2. Render a category bar and the tile grid for the active category.
//   3. Tapping a tile speaks it immediately AND appends it to the sentence bar.
//   4. Speak button reads the whole sentence; Clear empties it.
//   5. A child-locked Parent mode (math gate) lets a grown-up add personal tiles
//      (real photo + spoken word) and pick the speaking voice.

import { CATEGORIES, STARTER_TILES } from "./data.js";
import * as DB from "./db.js";
import * as Speech from "./speech.js";

// ---- App state -------------------------------------------------------------
const state = {
  activeCategory: CATEGORIES[0].id,
  personalTiles: [], // [{id, label, say, category, photoBlob}]
  sentence: [], // [{label, say}]
};

// Object URLs created for personal-tile photos; revoked on each re-render.
let photoUrls = [];

// ---- Tiny DOM helpers ------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const k of kids) node.append(k);
  return node;
};

// ---- Rendering -------------------------------------------------------------
function tilesForCategory(catId) {
  const starter = STARTER_TILES[catId] || [];
  const personal = state.personalTiles.filter((t) => t.category === catId);
  // Personal tiles first so a child finds their own people/things quickly.
  return [...personal, ...starter];
}

function renderCategories() {
  const bar = $("#categories");
  bar.replaceChildren();
  for (const cat of CATEGORIES) {
    const active = cat.id === state.activeCategory;
    const btn = el(
      "button",
      {
        className: "cat" + (active ? " active" : ""),
        onclick: () => {
          state.activeCategory = cat.id;
          renderCategories();
          renderGrid();
        },
        "aria-pressed": String(active),
      },
      el("span", { className: "cat-emoji", textContent: cat.emoji }),
      el("span", { className: "cat-name", textContent: cat.name })
    );
    bar.append(btn);
  }
}

function renderGrid() {
  const grid = $("#grid");
  // Clean up any photo URLs from the previous render.
  photoUrls.forEach((u) => URL.revokeObjectURL(u));
  photoUrls = [];
  grid.replaceChildren();

  for (const tile of tilesForCategory(state.activeCategory)) {
    let picture;
    if (tile.photoBlob) {
      const url = URL.createObjectURL(tile.photoBlob);
      photoUrls.push(url);
      picture = el("img", { className: "tile-photo", src: url, alt: "" });
    } else {
      picture = el("span", { className: "tile-emoji", textContent: tile.emoji });
    }
    const btn = el(
      "button",
      {
        className: "tile",
        onclick: () => onTileTap(tile),
        "aria-label": tile.label,
      },
      picture,
      el("span", { className: "tile-label", textContent: tile.label })
    );
    grid.append(btn);
  }
}

function renderSentence() {
  const bar = $("#sentence");
  bar.replaceChildren();
  for (const token of state.sentence) {
    bar.append(el("span", { className: "token", textContent: token.label }));
  }
}

// ---- Interactions ----------------------------------------------------------
function onTileTap(tile) {
  const say = tile.say || tile.label;
  Speech.speak(say); // immediate single-word feedback
  state.sentence.push({ label: tile.label, say });
  renderSentence();
}

function speakSentence() {
  if (!state.sentence.length) return;
  Speech.speak(state.sentence.map((t) => t.say).join(" "));
}

function clearSentence() {
  state.sentence = [];
  renderSentence();
}

// ---- Parent mode (child-locked) -------------------------------------------
function openParentGate() {
  const a = 2 + Math.floor(performance.now() % 7); // changes each open
  const b = 3 + Math.floor((performance.now() / 7) % 6);
  const answer = prompt(
    `Parent check — please solve:\n\n   ${a} + ${b} = ?`
  );
  if (answer === null) return;
  if (parseInt(answer, 10) === a + b) {
    openParentPanel();
  } else {
    alert("That wasn't right. (This keeps the child out of settings.)");
  }
}

async function openParentPanel() {
  await refreshVoiceOptions();
  renderPersonalList();
  $("#parent-panel").showModal();
}

function closeParentPanel() {
  $("#parent-panel").close();
}

async function refreshVoiceOptions() {
  const select = $("#voice-select");
  const voices = await Speech.getVoices();
  const current = Speech.getChosenVoiceURI();
  select.replaceChildren();
  if (!voices.length) {
    select.append(el("option", { textContent: "No voices found on this device" }));
    return;
  }
  for (const v of voices) {
    select.append(
      el("option", {
        value: v.voiceURI,
        textContent: `${v.name} (${v.lang})`,
        selected: v.voiceURI === current,
      })
    );
  }
}

function renderPersonalList() {
  const list = $("#personal-list");
  list.replaceChildren();
  if (!state.personalTiles.length) {
    list.append(el("p", { className: "muted", textContent: "No personal tiles yet. Add one above." }));
    return;
  }
  for (const t of state.personalTiles) {
    const url = t.photoBlob ? URL.createObjectURL(t.photoBlob) : null;
    if (url) photoUrls.push(url);
    const row = el(
      "div",
      { className: "personal-row" },
      url
        ? el("img", { className: "thumb", src: url, alt: "" })
        : el("span", { className: "thumb thumb-emoji", textContent: "🖼️" }),
      el("span", { className: "personal-meta", textContent: `${t.label} · ${capitalize(t.category)}` }),
      el("button", {
        className: "btn danger small",
        textContent: "Delete",
        onclick: () => deletePersonal(t.id),
      })
    );
    list.append(row);
  }
}

async function addPersonal(ev) {
  ev.preventDefault();
  const label = $("#p-label").value.trim();
  const category = $("#p-category").value;
  const say = $("#p-say").value.trim() || label;
  const file = $("#p-photo").files[0];
  if (!label) {
    alert("Please type the word this tile should say.");
    return;
  }
  const tile = {
    id: "u-" + label.toLowerCase().replace(/\s+/g, "-") + "-" + Math.floor(performance.now()),
    label,
    say,
    category,
    photoBlob: file || null,
  };
  await DB.addPersonalTile(tile);
  state.personalTiles = await DB.getAllPersonalTiles();
  $("#add-form").reset();
  renderPersonalList();
  renderGrid();
}

async function deletePersonal(id) {
  await DB.deletePersonalTile(id);
  state.personalTiles = await DB.getAllPersonalTiles();
  renderPersonalList();
  renderGrid();
}

async function onVoiceChange(ev) {
  const uri = ev.target.value;
  Speech.setVoice(uri);
  await DB.setSetting("voiceURI", uri);
  Speech.speak("Hello! This is your voice.");
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ---- Boot ------------------------------------------------------------------
async function init() {
  if (!Speech.isSupported()) {
    $("#no-speech").hidden = false;
  }

  // Restore saved voice choice.
  const savedVoice = await DB.getSetting("voiceURI", null);
  if (savedVoice) Speech.setVoice(savedVoice);
  await Speech.getVoices(); // warm the async voice list

  // Load personal tiles.
  state.personalTiles = await DB.getAllPersonalTiles();

  // Render.
  renderCategories();
  renderGrid();
  renderSentence();

  // Wire controls.
  $("#speak-btn").onclick = speakSentence;
  $("#clear-btn").onclick = clearSentence;
  $("#gear-btn").onclick = openParentGate;
  $("#parent-close").onclick = closeParentPanel;
  $("#add-form").onsubmit = addPersonal;
  $("#voice-select").onchange = onVoiceChange;

  // Populate the parent "category" dropdown.
  const sel = $("#p-category");
  for (const cat of CATEGORIES) {
    sel.append(el("option", { value: cat.id, textContent: cat.name }));
  }

  // Register the service worker for offline use (https or localhost only).
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

init();
