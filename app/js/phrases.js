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
