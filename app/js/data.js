// Starter vocabulary for PicTalk.
// Each tile: { id, label, emoji, say }
//   label -> shown under the tile (and added to the sentence bar)
//   emoji -> the "picture" (v1 uses emoji; ARASAAC images can replace these later)
//   say   -> text spoken aloud (defaults to label when omitted)
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

export const STARTER_TILES = {
  core: [
    { id: "c-i",       label: "I",        emoji: "🙋" },
    { id: "c-you",     label: "you",      emoji: "👉" },
    { id: "c-want",    label: "want",     emoji: "🤲" },
    { id: "c-more",    label: "more",     emoji: "➕" },
    { id: "c-stop",    label: "stop",     emoji: "✋" },
    { id: "c-go",      label: "go",       emoji: "🟢" },
    { id: "c-yes",     label: "yes",      emoji: "👍" },
    { id: "c-no",      label: "no",       emoji: "👎" },
    { id: "c-help",    label: "help",     emoji: "🆘" },
    { id: "c-please",  label: "please",   emoji: "🙏" },
    { id: "c-like",    label: "like",     emoji: "❤️" },
    { id: "c-dislike", label: "no thank you", emoji: "🚫", say: "no thank you" },
    { id: "c-done",    label: "all done", emoji: "🏁", say: "all done" },
    { id: "c-mine",    label: "mine",     emoji: "🫳" },
  ],
  people: [
    { id: "p-mom",     label: "Mom",      emoji: "👩" },
    { id: "p-dad",     label: "Dad",      emoji: "👨" },
    { id: "p-me",      label: "me",       emoji: "🧒" },
    { id: "p-grandma", label: "Grandma",  emoji: "👵" },
    { id: "p-grandpa", label: "Grandpa",  emoji: "👴" },
    { id: "p-friend",  label: "friend",   emoji: "🧑‍🤝‍🧑" },
    { id: "p-teacher", label: "teacher",  emoji: "🧑‍🏫" },
    { id: "p-baby",    label: "baby",     emoji: "👶" },
    { id: "p-doctor",  label: "doctor",   emoji: "🧑‍⚕️" },
  ],
  food: [
    { id: "f-eat",    label: "eat",     emoji: "🍽️" },
    { id: "f-drink",  label: "drink",   emoji: "🥤" },
    { id: "f-water",  label: "water",   emoji: "💧" },
    { id: "f-milk",   label: "milk",    emoji: "🥛" },
    { id: "f-juice",  label: "juice",   emoji: "🧃" },
    { id: "f-apple",  label: "apple",   emoji: "🍎" },
    { id: "f-banana", label: "banana",  emoji: "🍌" },
    { id: "f-cookie", label: "cookie",  emoji: "🍪" },
    { id: "f-cereal", label: "cereal",  emoji: "🥣" },
    { id: "f-pizza",  label: "pizza",   emoji: "🍕" },
    { id: "f-snack",  label: "snack",   emoji: "🥨" },
    { id: "f-hungry", label: "hungry",  emoji: "🍴" },
    { id: "f-thirsty",label: "thirsty", emoji: "🥵" },
  ],
  feelings: [
    { id: "e-happy",  label: "happy",  emoji: "😊" },
    { id: "e-sad",    label: "sad",    emoji: "😢" },
    { id: "e-mad",    label: "mad",    emoji: "😠" },
    { id: "e-scared", label: "scared", emoji: "😨" },
    { id: "e-tired",  label: "tired",  emoji: "😴" },
    { id: "e-hurt",   label: "hurt",   emoji: "🤕" },
    { id: "e-sick",   label: "sick",   emoji: "🤢" },
    { id: "e-love",   label: "love",   emoji: "🥰" },
    { id: "e-silly",  label: "silly",  emoji: "🤪" },
    { id: "e-calm",   label: "calm",   emoji: "😌" },
  ],
  actions: [
    { id: "a-play",  label: "play",  emoji: "🧸" },
    { id: "a-sleep", label: "sleep", emoji: "🛏️" },
    { id: "a-look",  label: "look",  emoji: "👀" },
    { id: "a-come",  label: "come",  emoji: "🫴" },
    { id: "a-open",  label: "open",  emoji: "📂" },
    { id: "a-wash",  label: "wash",  emoji: "🧼" },
    { id: "a-read",  label: "read",  emoji: "📖" },
    { id: "a-music", label: "music", emoji: "🎵" },
    { id: "a-tv",    label: "watch", emoji: "📺", say: "watch" },
    { id: "a-walk",  label: "walk",  emoji: "🚶" },
    { id: "a-hug",   label: "hug",   emoji: "🤗" },
  ],
  places: [
    { id: "l-home",    label: "home",    emoji: "🏠" },
    { id: "l-school",  label: "school",  emoji: "🏫" },
    { id: "l-outside", label: "outside", emoji: "🌳" },
    { id: "l-bath",    label: "bathroom",emoji: "🚽" },
    { id: "l-store",   label: "store",   emoji: "🛒" },
    { id: "l-park",    label: "park",    emoji: "🛝" },
    { id: "l-car",     label: "car",     emoji: "🚗" },
    { id: "l-bed",     label: "bed",     emoji: "🛌" },
    { id: "l-kitchen", label: "kitchen", emoji: "🍳" },
  ],
};
