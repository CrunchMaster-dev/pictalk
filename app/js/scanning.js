// Switch scanning engine for PicTalk — board-agnostic, one-switch automatic,
// row-column scanning with optional auditory cues.
//
// It does not know about tiles, keys, or phrases. The app gives it:
//   collectItems() -> the actionable elements on the active board right now
//   speak(text)    -> say a label aloud (for auditory scanning)
// The engine groups items into rows by their on-screen position, runs a timed
// row-then-column highlight, and on a "switch press" selects a row, then activates
// an item by clicking it.
//
// The switch is the spacebar, Enter, or a tap ANYWHERE — which is how real assistive
// switches present themselves. When scanning is on, direct taps are turned into switch
// presses (so individual buttons aren't activated by touch).

let collectItems = () => [];
let speak = () => {};

let cfg = { enabled: false, stepMs: 1500, audio: true };

let active = false;         // the scan loop is currently running
let paused = false;         // temporarily suspended (e.g. settings dialog open)
let phase = "row";          // "row" | "col"
let rows = [];              // [[el, el, ...], ...] top-to-bottom, left-to-right
let rowIndex = 0;
let colIndex = 0;
let colPasses = 0;
let timer = null;
let programmatic = false;   // true while WE click an item (so we ignore that click)

const COL_PASSES_BEFORE_ESCAPE = 2;

// ---- Public API ------------------------------------------------------------
export function init(opts) {
  collectItems = opts.collectItems || collectItems;
  speak = opts.speak || speak;
}

export function configure(partial) {
  cfg = { ...cfg, ...partial };
  reconcile();
}

export function isEnabled() {
  return cfg.enabled;
}

// Pause while a modal (settings) is open; resume afterward.
export function pause() {
  if (paused) return;
  paused = true;
  teardown();
}

export function resume() {
  if (!paused) return;
  paused = false;
  reconcile();
}

// Called when the board re-renders (mode change, etc.) — rebuild if running.
export function restart() {
  if (active) {
    clearTimer();
    startRowScan();
  }
}

// Single source of truth for "should the loop be running, and is it?".
function reconcile() {
  const shouldRun = cfg.enabled && !paused;
  if (shouldRun && !active) {
    active = true;
    attachSwitch();
    startRowScan();
  } else if (!shouldRun && active) {
    teardown();
  } else if (shouldRun && active) {
    // Config changed mid-run (e.g. new speed) — restart the loop.
    clearTimer();
    startRowScan();
  }
}

function teardown() {
  active = false;
  clearTimer();
  detachSwitch();
  clearHighlight();
}

// ---- Row/column model ------------------------------------------------------
function buildRows() {
  const items = collectItems().filter(isVisible);
  // Group by vertical position (rounded) so visually-wrapped grids form real rows.
  const byTop = new Map();
  for (const el of items) {
    const top = Math.round(el.getBoundingClientRect().top / 8) * 8;
    if (!byTop.has(top)) byTop.set(top, []);
    byTop.get(top).push(el);
  }
  rows = [...byTop.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, els]) => els.sort((x, y) => x.getBoundingClientRect().left - y.getBoundingClientRect().left));
}

function isVisible(el) {
  return el && el.getClientRects().length > 0 && !el.hidden;
}

// ---- Scanning loop ---------------------------------------------------------
function startRowScan() {
  buildRows();
  phase = "row";
  rowIndex = 0;
  if (!rows.length) {
    // Nothing to scan yet (mid-render) — try again shortly.
    timer = setTimeout(startRowScan, cfg.stepMs);
    return;
  }
  highlightRow();
  scheduleTick();
}

function scheduleTick() {
  clearTimer();
  timer = setTimeout(tick, cfg.stepMs);
}

function tick() {
  if (phase === "row") {
    rowIndex = (rowIndex + 1) % rows.length;
    highlightRow();
  } else {
    const row = rows[rowIndex] || [];
    colIndex += 1;
    if (colIndex >= row.length) {
      colIndex = 0;
      colPasses += 1;
      if (colPasses >= COL_PASSES_BEFORE_ESCAPE) {
        // Give up on this row, go back to scanning rows.
        startRowScan();
        return;
      }
    }
    highlightItem();
  }
  scheduleTick();
}

function onSwitch() {
  if (!active || paused) return;
  if (phase === "row") {
    // Select the highlighted row, start scanning its items.
    phase = "col";
    colIndex = 0;
    colPasses = 0;
    highlightItem();
    scheduleTick();
  } else {
    // Activate the highlighted item.
    const el = (rows[rowIndex] || [])[colIndex];
    clearTimer();
    clearHighlight();
    if (el) activate(el);
    // The board may have re-rendered (or activation opened the paused settings
    // dialog). Only resume if we're still actively running.
    if (active && !paused) {
      timer = setTimeout(startRowScan, 350);
    }
  }
}

function activate(el) {
  programmatic = true;
  el.click();
  programmatic = false;
}

// ---- Highlighting + audio --------------------------------------------------
function clearHighlight() {
  document.querySelectorAll(".scan-hl, .scan-hl-row").forEach((el) => {
    el.classList.remove("scan-hl", "scan-hl-row");
  });
}

function labelOf(el) {
  return (
    el.getAttribute("aria-label") ||
    (el.querySelector(".tile-label, .quick-text") || {}).textContent ||
    el.textContent ||
    ""
  ).trim();
}

function highlightRow() {
  clearHighlight();
  const row = rows[rowIndex] || [];
  row.forEach((el) => el.classList.add("scan-hl-row"));
  if (row[0]) {
    row[0].scrollIntoView({ block: "nearest" });
    if (cfg.audio) speak(labelOf(row[0]));
  }
}

function highlightItem() {
  clearHighlight();
  const el = (rows[rowIndex] || [])[colIndex];
  if (!el) return;
  el.classList.add("scan-hl");
  el.scrollIntoView({ block: "nearest" });
  if (cfg.audio) speak(labelOf(el));
}

// ---- Switch input ----------------------------------------------------------
function onKey(e) {
  if (e.key === " " || e.key === "Enter" || e.code === "Space") {
    e.preventDefault();
    e.stopPropagation();
    onSwitch();
  }
}

function onClickCapture(e) {
  if (programmatic) return; // our own activation click — let it through
  e.preventDefault();
  e.stopPropagation();
  onSwitch();
}

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function attachSwitch() {
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("click", onClickCapture, true);
}

function detachSwitch() {
  document.removeEventListener("keydown", onKey, true);
  document.removeEventListener("click", onClickCapture, true);
}
