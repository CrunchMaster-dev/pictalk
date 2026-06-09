// Word prediction for PicTalk's keyboard mode — fully offline, learns on-device.
//
// Model:
//   unigrams: { word -> count }        how often a word is used
//   bigrams:  { "w1 w2" -> count }     how often w2 follows w1
//
// Both are seeded from a bundled common-word list, then UPDATED as the user commits
// words (pressing space, picking a suggestion, or speaking). The model is persisted
// in IndexedDB (settings store) and never leaves the device.

import { getSetting, setSetting } from "./db.js";

const MODEL_KEY = "predictModel";

// Common English + AAC/medical words, roughly most-common first. The order seeds an
// initial frequency so predictions are useful on day one, before any learning.
const BASE_WORDS = [
  "I", "you", "the", "a", "to", "and", "is", "it", "in", "my", "me", "we", "he",
  "she", "they", "this", "that", "for", "of", "on", "at", "with", "do", "can",
  "want", "need", "have", "feel", "go", "get", "like", "help", "please", "thank",
  "yes", "no", "not", "am", "are", "was", "will", "would", "could", "should",
  "now", "later", "today", "tomorrow", "more", "some", "all", "good", "bad",
  "hot", "cold", "hungry", "thirsty", "tired", "happy", "sad", "okay", "fine",
  "water", "food", "eat", "drink", "coffee", "tea", "juice", "snack", "bathroom",
  "toilet", "bed", "chair", "up", "down", "sit", "stand", "walk", "rest", "sleep",
  "pain", "hurt", "sick", "medicine", "doctor", "nurse", "hospital", "blanket",
  "pillow", "cold", "warm", "light", "phone", "glasses", "tv", "music", "outside",
  "home", "here", "there", "where", "when", "what", "who", "how", "why", "which",
  "wife", "husband", "son", "daughter", "mom", "dad", "family", "friend", "name",
  "love", "miss", "sorry", "wait", "stop", "come", "stay", "leave", "open", "close",
  "turn", "call", "tell", "ask", "give", "take", "bring", "put", "look", "see",
  "hear", "talk", "read", "write", "think", "know", "remember", "forget", "again",
  "minute", "hour", "morning", "night", "soon", "almost", "done", "ready", "better",
  "worse", "left", "right", "front", "back", "near", "far", "very", "too", "little",
  "much", "many", "thank you", "excuse me", "i'm", "don't", "can't", "won't", "it's",
];

// A few useful word-pairs so next-word prediction feels smart from the start.
const BASE_BIGRAMS = {
  "I need": 6, "I want": 6, "I am": 6, "I feel": 5, "I would": 4, "I don't": 4,
  "I like": 3, "I have": 3, "I can": 3, "need to": 5, "want to": 5, "going to": 4,
  "please call": 4, "please help": 4, "thank you": 6, "can you": 5, "would you": 4,
  "feel sick": 3, "in pain": 4, "the bathroom": 4, "some water": 3, "i'm tired": 3,
};

let model = null; // { unigrams, bigrams }

function freshModel() {
  const unigrams = {};
  const n = BASE_WORDS.length;
  BASE_WORDS.forEach((w, i) => {
    // Earlier (more common) words get a higher seed count.
    unigrams[w.toLowerCase()] = Math.max(1, n - i);
  });
  // Lowercase bigram keys so they match the model's lowercased lookups.
  const bigrams = {};
  for (const [key, count] of Object.entries(BASE_BIGRAMS)) {
    bigrams[key.toLowerCase()] = count;
  }
  return { unigrams, bigrams };
}

export async function load() {
  const saved = await getSetting(MODEL_KEY, null);
  model = saved && saved.unigrams ? saved : freshModel();
  return model;
}

let saveTimer = null;
function persistSoon() {
  // Debounce writes so rapid typing doesn't hammer IndexedDB.
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => setSetting(MODEL_KEY, model), 400);
}

const clean = (w) => w.toLowerCase().replace(/[^a-z'’]/g, "");

// Teach the model from a finished chunk of text (a spoken message or committed word).
export function learn(text) {
  if (!model || !text) return;
  const words = text.split(/\s+/).map(clean).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    model.unigrams[words[i]] = (model.unigrams[words[i]] || 0) + 1;
    if (i > 0) {
      const key = words[i - 1] + " " + words[i];
      model.bigrams[key] = (model.bigrams[key] || 0) + 1;
    }
  }
  persistSoon();
}

function matchCase(partial, suggestion) {
  if (partial && partial[0] === partial[0].toUpperCase() && /[a-z]/i.test(partial[0])) {
    return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
  }
  return suggestion;
}

// Return up to `limit` suggestions for the current text buffer.
export function predict(text, limit = 4) {
  if (!model) return [];
  const endsWithSpace = /\s$/.test(text) || text === "";
  const tokens = text.split(/\s+/).filter(Boolean);

  if (endsWithSpace) {
    // Next-word prediction.
    const prev = tokens.length ? clean(tokens[tokens.length - 1]) : null;
    return rankNextWord(prev, limit).map((w) => matchCase("", w));
  }

  // Word completion on the trailing partial word.
  const rawPartial = tokens[tokens.length - 1] || "";
  const partial = clean(rawPartial);
  if (!partial) return [];
  const prev = tokens.length > 1 ? clean(tokens[tokens.length - 2]) : null;

  const candidates = Object.keys(model.unigrams)
    .filter((w) => w.startsWith(partial) && w !== partial);
  const scored = candidates.map((w) => ({
    w,
    score: (model.unigrams[w] || 0) + 50 * (prev ? model.bigrams[prev + " " + w] || 0 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => matchCase(rawPartial, s.w));
}

function rankNextWord(prev, limit) {
  const scores = {};
  if (prev) {
    const pfx = prev + " ";
    for (const key of Object.keys(model.bigrams)) {
      if (key.startsWith(pfx)) {
        const next = key.slice(pfx.length);
        scores[next] = (scores[next] || 0) + 100 * model.bigrams[key];
      }
    }
  }
  // Back off to overall word frequency so we always have suggestions.
  for (const w of Object.keys(model.unigrams)) {
    scores[w] = (scores[w] || 0) + model.unigrams[w];
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

// Apply a chosen suggestion to the text buffer: replace the trailing partial word
// (or append after a space) with the suggestion + a trailing space.
export function applySuggestion(text, suggestion) {
  const committed = /\s$/.test(text) || text === ""
    ? text + suggestion
    : text.replace(/\S+$/, suggestion);
  learn(committed);
  return committed + " ";
}
