// Starter vocabulary for PicTalk.
// Each tile: { id, label, emoji, say, fitz }
//   label -> shown under the tile (and added to the sentence bar)
//   emoji -> the "picture" (v1 uses emoji; ARASAAC images can replace these later)
//   say   -> text spoken aloud (defaults to label when omitted)
//   fitz  -> Modified Fitzgerald Key color (yellow=people/pronouns, green=verbs,
//            blue=describing words, orange=nouns, purple=questions, pink=social/
//            little words, red=important/negation). Color is appearance only.
//
// MOTOR PLANNING RULE: tile order is a contract with the child's muscle memory.
// Never reorder or remove tiles — only APPEND new ones to the end of a category.
//
// Categories are ordered; "Core" comes first because core words (I, want, more,
// stop, yes, no) carry the most communicative weight in early AAC.

export const CATEGORIES = [
  { id: "core",     name: "Core",     emoji: "⭐" },
  { id: "people",   name: "People",   emoji: "👥" },
  { id: "food",     name: "Food",     emoji: "🍎" },
  { id: "feelings", name: "Feelings", emoji: "😊" },
  { id: "actions",  name: "Actions",  emoji: "🏃" },
  { id: "places",   name: "Places",   emoji: "🏠" },
];

// Default Fitzgerald color for parent-added personal tiles, by category.
export const CATEGORY_FITZ = {
  core: "pink",
  people: "yellow",
  food: "orange",
  feelings: "blue",
  actions: "green",
  places: "orange",
};

export const STARTER_TILES = {
  core: [
    { id: "c-i",       label: "I",        emoji: "🙋", fitz: "yellow" },
    { id: "c-you",     label: "you",      emoji: "👉", fitz: "yellow" },
    { id: "c-want",    label: "want",     emoji: "🤲", fitz: "green" },
    { id: "c-more",    label: "more",     emoji: "➕", fitz: "blue" },
    { id: "c-stop",    label: "stop",     emoji: "✋", fitz: "red" },
    { id: "c-go",      label: "go",       emoji: "🟢", fitz: "green" },
    { id: "c-yes",     label: "yes",      emoji: "👍", fitz: "pink" },
    { id: "c-no",      label: "no",       emoji: "👎", fitz: "red" },
    { id: "c-help",    label: "help",     emoji: "🆘", fitz: "red" },
    { id: "c-please",  label: "please",   emoji: "🙏", fitz: "pink" },
    { id: "c-like",    label: "like",     emoji: "❤️", fitz: "green" },
    { id: "c-dislike", label: "no thank you", emoji: "🚫", say: "no thank you", fitz: "pink" },
    { id: "c-done",    label: "all done", emoji: "🏁", say: "all done", fitz: "blue" },
    { id: "c-mine",    label: "mine",     emoji: "🫳", fitz: "yellow" },
    // Appended 2026-06-09 — Banajee core-word research set (append-only!).
    { id: "c-it",      label: "it",       emoji: "🔵", fitz: "yellow" },
    { id: "c-my",      label: "my",       emoji: "🫶", fitz: "yellow" },
    { id: "c-on",      label: "on",       emoji: "💡", fitz: "pink" },
    { id: "c-off",     label: "off",      emoji: "🌑", fitz: "pink" },
    { id: "c-in",      label: "in",       emoji: "📥", fitz: "pink" },
    { id: "c-out",     label: "out",      emoji: "📤", fitz: "pink" },
    { id: "c-what",    label: "what",     emoji: "❓", fitz: "purple" },
    { id: "c-where",   label: "where",    emoji: "🧭", fitz: "purple" },
  ],
  people: [
    { id: "p-mom",     label: "Mom",      emoji: "👩", fitz: "yellow" },
    { id: "p-dad",     label: "Dad",      emoji: "👨", fitz: "yellow" },
    { id: "p-me",      label: "me",       emoji: "🧒", fitz: "yellow" },
    { id: "p-grandma", label: "Grandma",  emoji: "👵", fitz: "yellow" },
    { id: "p-grandpa", label: "Grandpa",  emoji: "👴", fitz: "yellow" },
    { id: "p-friend",  label: "friend",   emoji: "🧑‍🤝‍🧑", fitz: "yellow" },
    { id: "p-teacher", label: "teacher",  emoji: "🧑‍🏫", fitz: "yellow" },
    { id: "p-baby",    label: "baby",     emoji: "👶", fitz: "yellow" },
    { id: "p-doctor",  label: "doctor",   emoji: "🧑‍⚕️", fitz: "yellow" },
  ],
  food: [
    { id: "f-eat",    label: "eat",     emoji: "🍽️", fitz: "green" },
    { id: "f-drink",  label: "drink",   emoji: "🥤", fitz: "green" },
    { id: "f-water",  label: "water",   emoji: "💧", fitz: "orange" },
    { id: "f-milk",   label: "milk",    emoji: "🥛", fitz: "orange" },
    { id: "f-juice",  label: "juice",   emoji: "🧃", fitz: "orange" },
    { id: "f-apple",  label: "apple",   emoji: "🍎", fitz: "orange" },
    { id: "f-banana", label: "banana",  emoji: "🍌", fitz: "orange" },
    { id: "f-cookie", label: "cookie",  emoji: "🍪", fitz: "orange" },
    { id: "f-cereal", label: "cereal",  emoji: "🥣", fitz: "orange" },
    { id: "f-pizza",  label: "pizza",   emoji: "🍕", fitz: "orange" },
    { id: "f-snack",  label: "snack",   emoji: "🥨", fitz: "orange" },
    { id: "f-hungry", label: "hungry",  emoji: "🍴", fitz: "blue" },
    { id: "f-thirsty",label: "thirsty", emoji: "🥵", fitz: "blue" },
  ],
  feelings: [
    { id: "e-happy",  label: "happy",  emoji: "😊", fitz: "blue" },
    { id: "e-sad",    label: "sad",    emoji: "😢", fitz: "blue" },
    { id: "e-mad",    label: "mad",    emoji: "😠", fitz: "blue" },
    { id: "e-scared", label: "scared", emoji: "😨", fitz: "blue" },
    { id: "e-tired",  label: "tired",  emoji: "😴", fitz: "blue" },
    { id: "e-hurt",   label: "hurt",   emoji: "🤕", fitz: "red" },
    { id: "e-sick",   label: "sick",   emoji: "🤢", fitz: "red" },
    { id: "e-love",   label: "love",   emoji: "🥰", fitz: "blue" },
    { id: "e-silly",  label: "silly",  emoji: "🤪", fitz: "blue" },
    { id: "e-calm",   label: "calm",   emoji: "😌", fitz: "blue" },
  ],
  actions: [
    { id: "a-play",  label: "play",  emoji: "🧸", fitz: "green" },
    { id: "a-sleep", label: "sleep", emoji: "🛏️", fitz: "green" },
    { id: "a-look",  label: "look",  emoji: "👀", fitz: "green" },
    { id: "a-come",  label: "come",  emoji: "🫴", fitz: "green" },
    { id: "a-open",  label: "open",  emoji: "📂", fitz: "green" },
    { id: "a-wash",  label: "wash",  emoji: "🧼", fitz: "green" },
    { id: "a-read",  label: "read",  emoji: "📖", fitz: "green" },
    { id: "a-music", label: "music", emoji: "🎵", fitz: "orange" },
    { id: "a-tv",    label: "watch", emoji: "📺", say: "watch", fitz: "green" },
    { id: "a-walk",  label: "walk",  emoji: "🚶", fitz: "green" },
    { id: "a-hug",   label: "hug",   emoji: "🤗", fitz: "green" },
  ],
  places: [
    { id: "l-home",    label: "home",    emoji: "🏠", fitz: "orange" },
    { id: "l-school",  label: "school",  emoji: "🏫", fitz: "orange" },
    { id: "l-outside", label: "outside", emoji: "🌳", fitz: "orange" },
    { id: "l-bath",    label: "bathroom",emoji: "🚽", fitz: "orange" },
    { id: "l-store",   label: "store",   emoji: "🛒", fitz: "orange" },
    { id: "l-park",    label: "park",    emoji: "🛝", fitz: "orange" },
    { id: "l-car",     label: "car",     emoji: "🚗", fitz: "orange" },
    { id: "l-bed",     label: "bed",     emoji: "🛌", fitz: "orange" },
    { id: "l-kitchen", label: "kitchen", emoji: "🍳", fitz: "orange" },
  ],
};
