// Quick Phrases — saved sentences an adult user can speak with a single tap.
// Stored in the IndexedDB settings store as a JSON array, shared by the keyboard
// board (which renders them) and the settings panel (which edits them).

import { getSetting, setSetting } from "./db.js";

const KEY = "quickPhrases";

// Sensible defaults, urgent/common first. Each: { id, emoji, text }.
const DEFAULTS = [
  { id: "qp-pain",    emoji: "🆘", text: "I'm in pain" },
  { id: "qp-nurse",   emoji: "🔔", text: "Please call my nurse" },
  { id: "qp-bath",    emoji: "🚻", text: "I need the bathroom" },
  { id: "qp-water",   emoji: "💧", text: "I would like some water" },
  { id: "qp-yes",     emoji: "✅", text: "Yes" },
  { id: "qp-no",      emoji: "❌", text: "No" },
  { id: "qp-thanks",  emoji: "🙏", text: "Thank you" },
  { id: "qp-wait",    emoji: "✋", text: "Please wait a moment" },
];

export async function getPhrases() {
  const saved = await getSetting(KEY, null);
  if (saved && Array.isArray(saved)) return saved;
  await setSetting(KEY, DEFAULTS);
  return [...DEFAULTS];
}

export async function addPhrase(text, emoji = "💬") {
  const phrases = await getPhrases();
  phrases.push({
    id: "qp-" + Math.floor(performance.now()),
    emoji,
    text: text.trim(),
  });
  await setSetting(KEY, phrases);
  return phrases;
}

export async function deletePhrase(id) {
  const phrases = (await getPhrases()).filter((p) => p.id !== id);
  await setSetting(KEY, phrases);
  return phrases;
}
