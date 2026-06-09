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
import * as Keyboard from "./keyboard.js";
import * as Phrases from "./phrases.js";
import * as Scanning from "./scanning.js";
import * as Cloud from "./cloud.js";
import * as Sync from "./sync.js";
import { freePlusConfigured } from "./config.js";

// ---- App state -------------------------------------------------------------
const state = {
  mode: "pictures", // "pictures" | "keyboard"
  activeCategory: CATEGORIES[0].id,
  personalTiles: [], // [{id, label, say, category, photoBlob}]
  sentence: [], // [{label, say}]
};

// Object URLs created for personal-tile photos; revoked on each re-render.
let photoUrls = [];

// ---- Tiny DOM helpers ------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
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

// ---- Mode switching (Pictures <-> Keyboard) --------------------------------
function speakActive() {
  if (state.mode === "keyboard") Keyboard.speakCurrent();
  else speakSentence();
}

function clearActive() {
  if (state.mode === "keyboard") Keyboard.clearCurrent();
  else clearSentence();
}

async function setMode(mode, { persist = true } = {}) {
  state.mode = mode;
  const keyboard = mode === "keyboard";

  // Swap the body: picture board vs keyboard board.
  $("#categories").hidden = keyboard;
  $("#grid").hidden = keyboard;
  if (keyboard) Keyboard.show();
  else Keyboard.hide();

  // Reset the shared message bar so leftover content from the other mode is gone.
  if (keyboard) clearSentence(); // empties tokens; keyboard.show() repaints its text
  else { Keyboard.clearCurrent(); renderSentence(); }

  // Quick-phrase editing only makes sense in keyboard mode.
  $("#phrases-section").hidden = !keyboard;

  // Reflect the choice in the settings radios.
  const radio = document.querySelector(`input[name="mode"][value="${mode}"]`);
  if (radio) radio.checked = true;

  if (persist) await DB.setSetting("mode", mode);

  // The set of scannable items changed with the board — rebuild if scanning.
  Scanning.restart();
}

// The actionable elements on the active board, for the scanning engine.
function collectScanItems() {
  const shared = ["#speak-btn", "#clear-btn", "#gear-btn"];
  const perMode =
    state.mode === "keyboard"
      ? ["#keyboard .pred", "#keyboard .key", "#keyboard .quick"]
      : ["#categories .cat", "#grid .tile"];
  return [...shared, ...perMode].flatMap((sel) => [...document.querySelectorAll(sel)]);
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
  Scanning.pause(); // let a caregiver use settings with normal taps
  await refreshVoiceOptions();
  renderPersonalList();
  await renderPhraseList();
  $("#phrases-section").hidden = state.mode !== "keyboard";
  $("#parent-panel").showModal();
}

function closeParentPanel() {
  $("#parent-panel").close();
  Scanning.resume();
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

// ---- Quick phrases (settings) ----------------------------------------------
async function renderPhraseList() {
  const list = $("#phrase-list");
  const phrases = await Phrases.getPhrases();
  list.replaceChildren();
  for (const p of phrases) {
    const row = el(
      "div",
      { className: "personal-row" },
      el("span", { className: "thumb thumb-emoji", textContent: p.emoji }),
      el("span", { className: "personal-meta", textContent: p.text }),
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
}

async function addPhrase(ev) {
  ev.preventDefault();
  const text = $("#phrase-text").value.trim();
  if (!text) return;
  await Phrases.addPhrase(text);
  $("#phrase-form").reset();
  await renderPhraseList();
  await Keyboard.refreshPhrases();
}

async function onVoiceChange(ev) {
  const uri = ev.target.value;
  Speech.setVoice(uri);
  await DB.setSetting("voiceURI", uri);
  Speech.speak("Hello! This is your voice.");
}

// ---- Switch scanning settings ----------------------------------------------
async function applyScanSettings() {
  const enabled = $("#scan-enable").checked;
  const stepMs = parseInt($("#scan-speed").value, 10);
  const audio = $("#scan-audio").checked;
  await DB.setSetting("scanEnabled", enabled);
  await DB.setSetting("scanStepMs", stepMs);
  await DB.setSetting("scanAudio", audio);
  // Keep scanning paused while the settings dialog is open; it resumes on close.
  // configure() updates the stored config so resume() uses the new speed/audio.
  Scanning.configure({ enabled, stepMs, audio });
  if ($("#parent-panel").open) Scanning.pause();
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ---- Free+ (optional cloud backup & sync) ----------------------------------
// Stays completely hidden unless config.js is filled in and enabled.
const CONFLICT_MSG =
  "This device and your saved backup both have changes.\n\n" +
  "OK = keep THIS device's words & photos\n" +
  "Cancel = use your SAVED backup";

async function setupFreePlus() {
  if (!freePlusConfigured()) return;
  $("#freeplus-section").hidden = false;

  const showSignedIn = (user) => {
    $("#fp-signedout").hidden = !!user;
    $("#fp-signedin").hidden = !user;
  };

  async function refreshStatus() {
    const at = await Sync.lastSyncedAt();
    $("#fp-status").textContent = at
      ? `Backed up ✓ — last synced ${new Date(at).toLocaleString()}`
      : "Signed in. Not backed up yet — tap Sync now.";
  }

  async function handleReconcile(user) {
    const r = await Sync.reconcile(user);
    if (r.action === "conflict") {
      const keepLocal = confirm(CONFLICT_MSG);
      await Sync.resolveConflict(user, keepLocal ? "local" : "cloud");
      if (!keepLocal) { location.reload(); return; }
    } else if (r.action === "pulled") {
      location.reload();
      return;
    }
    await refreshStatus();
  }

  async function onSignedIn(user) {
    showSignedIn(user);
    try {
      await Cloud.ensureProfile(user);
      await handleReconcile(user);
    } catch (e) {
      console.warn("Free+ sync error:", e);
      $("#fp-status").textContent = "Signed in. (Couldn't reach the cloud just now.)";
    }
  }

  $("#fp-login-form").onsubmit = async (ev) => {
    ev.preventDefault();
    const email = $("#fp-email").value.trim();
    if (!email) return;
    const msg = $("#fp-login-msg");
    try {
      await Cloud.sendMagicLink(email);
      msg.textContent = "Check your email for a sign-in link, then come back to this page.";
    } catch (e) {
      msg.textContent = "Couldn't send the link — check the email and try again.";
    }
    msg.hidden = false;
  };

  $("#fp-sync").onclick = async () => {
    const user = await Cloud.getUser();
    if (!user) return;
    $("#fp-status").textContent = "Syncing…";
    try { await handleReconcile(user); }
    catch (e) { $("#fp-status").textContent = "Couldn't sync just now."; }
  };

  $("#fp-signout").onclick = async () => { await Cloud.signOut(); showSignedIn(null); };
  $("#fp-export").onclick = exportMyData;

  $("#fp-delete").onclick = async () => {
    const user = await Cloud.getUser();
    if (!user) return;
    if (!confirm("Delete your account and everything backed up to the cloud? This can't be undone.\n\n(Your words stay on THIS device.)")) return;
    try { await Cloud.deleteAllData(user); await Cloud.signOut(); } catch (e) { console.warn(e); }
    showSignedIn(null);
  };

  await Cloud.onAuthChange((user) => { if (user) onSignedIn(user); else showSignedIn(null); });
  const current = await Cloud.getUser();
  if (current) onSignedIn(current); else showSignedIn(null);
}

async function exportMyData() {
  const board = await DB.dumpBoard();
  const tiles = [];
  for (const t of board.tiles) {
    tiles.push({
      id: t.id, label: t.label, say: t.say, category: t.category,
      photo: t.photoBlob ? await blobToDataURL(t.photoBlob) : null,
    });
  }
  const data = { exportedAt: new Date().toISOString(), tiles, settings: board.settings };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: "pictalk-my-data.json" });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function blobToDataURL(blob) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(blob);
  });
}

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

  // Render the picture board.
  renderCategories();
  renderGrid();
  renderSentence();

  // Initialize the keyboard board (hidden until selected).
  await Keyboard.init({ container: $("#keyboard"), messageEl: $("#sentence") });

  // The scanning engine reads the active board's items and speaks labels.
  Scanning.init({ collectItems: collectScanItems, speak: (t) => Speech.speak(t) });

  // Wire shared controls — they route to whichever board is active.
  $("#speak-btn").onclick = speakActive;
  $("#clear-btn").onclick = clearActive;
  $("#gear-btn").onclick = openParentGate;
  $("#parent-close").onclick = closeParentPanel;
  $("#add-form").onsubmit = addPersonal;
  $("#voice-select").onchange = onVoiceChange;
  $("#phrase-form").onsubmit = addPhrase;
  for (const radio of document.querySelectorAll('input[name="mode"]')) {
    radio.onchange = (ev) => setMode(ev.target.value);
  }
  $("#scan-enable").onchange = applyScanSettings;
  $("#scan-speed").onchange = applyScanSettings;
  $("#scan-audio").onchange = applyScanSettings;

  // Populate the parent "category" dropdown.
  const sel = $("#p-category");
  for (const cat of CATEGORIES) {
    sel.append(el("option", { value: cat.id, textContent: cat.name }));
  }

  // Restore the saved mode (defaults to the picture board).
  const savedMode = await DB.getSetting("mode", "pictures");
  await setMode(savedMode, { persist: false });

  // Restore switch-scanning settings, then start the engine if enabled.
  const scanEnabled = await DB.getSetting("scanEnabled", false);
  const scanStepMs = await DB.getSetting("scanStepMs", 1500);
  const scanAudio = await DB.getSetting("scanAudio", true);
  $("#scan-enable").checked = scanEnabled;
  $("#scan-speed").value = String(scanStepMs);
  $("#scan-audio").checked = scanAudio;
  Scanning.configure({ enabled: scanEnabled, stepMs: scanStepMs, audio: scanAudio });

  // First-run hint — shown once, only on the picture board.
  const seenHint = await DB.getSetting("seenHint", false);
  const hint = $("#firstrun-hint");
  if (!seenHint && state.mode === "pictures") hint.hidden = false;
  $("#hint-dismiss").onclick = async () => {
    hint.hidden = true;
    await DB.setSetting("seenHint", true);
  };

  // Register the service worker for offline use (https or localhost only).
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // Free+ (optional cloud backup & sync) — no-op unless configured + enabled.
  setupFreePlus().catch((e) => console.warn("Free+ unavailable:", e));
}

init();
