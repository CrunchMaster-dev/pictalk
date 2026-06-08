# PicTalk — Keyboard Mode (adult text-to-speech AAC)

**Date:** 2026-06-08
**Status:** Approved design (v1)
**Builds on:** 2026-06-07-pictalk-aac-design.md

## Mission

Add a second "board" to PicTalk for people who can **read and spell but cannot
speak** (stroke, ALS, laryngectomy). They type, the device speaks. Same free,
private, offline promise as the picture board.

## User

*"A literate adult who lost speech. Can read and type. Needs to say new sentences
quickly, and to fire off urgent/common ones instantly."*

## Key decisions (from brainstorming)

1. **A mode inside PicTalk**, not a separate app — reuses speech, offline, install,
   and storage. The child picture board is untouched.
2. **Full fast experience in v1:** on-screen keyboard + **learning word prediction**
   + **Quick Phrases** (one-tap instant speech).

## Mode switching

A **Mode** setting (Pictures ↔ Keyboard) lives in the ⚙ settings panel and is saved
on-device. Set once, it persists on every launch — no math gate on each use. The
shared top bar (message area + ▶ Speak + ✕ + ⚙) is identical in both modes; only the
area below it changes.

## Keyboard screen

```
[ message bar ........................ ▶ Speak  ✕  ⚙ ]   ← shared
[ pred1 ] [ pred2 ] [ pred3 ] [ pred4 ]                  ← prediction row (learns)
 q w e r t y u i o p
  a s d f g h j k l
 ⇧  z x c v b n m  ⌫
 123    [   space   ]   .   ↵Speak
[ Quick: 🆘 I'm in pain │ 🚻 Bathroom │ ✅ Yes │ ❌ No │ + ]  ← one-tap, speaks now
```

- **Type → Speak.** Letters build a message; ▶ Speak (or ↵Speak key) reads the whole
  message aloud; ✕ clears it.
- **Prediction row.** Up to 4 suggestions above the keys. Tapping one completes the
  current word (or adds a likely next word) and inserts a space.
- **Quick Phrases.** Saved sentences; one tap **speaks immediately** (urgent path).
  Seeded defaults: "I'm in pain", "Please call my nurse", "I need the bathroom",
  "Yes", "No", "Thank you". Editable in settings.

## Prediction (offline, learns on-device)

- A bundled list of common English + AAC/medical words seeds an initial model.
- The model is **unigram counts** (word frequency) + **bigram counts** (word-pairs),
  persisted in `IndexedDB`. It updates as the user commits words (space / picking a
  suggestion / speaking), so frequent words rise to the front over time.
- `predict(text)`:
  - text ends mid-word → **completion** (words starting with the partial), ranked by
    bigram(prevWord, candidate) then unigram.
  - text empty or ends with space → **next-word** prediction, ranked the same way.
- Nothing is uploaded; the model lives only on the device.

## New / changed files

- `js/predict.js` — word list, prediction, on-device learning model.
- `js/keyboard.js` — keyboard board UI + text buffer + quick-phrase row.
- `js/phrases.js` — quick-phrase storage + defaults (shared by keyboard + settings).
- `js/app.js` — owns `state.mode`; routes the shared Speak/Clear to the active board;
  toggles `#categories`+`#grid` vs `#keyboard`.
- `index.html` — adds `#keyboard` container; settings panel gains Mode switch +
  Quick-Phrase manager.
- `styles.css` — keyboard, keys, prediction row, quick-phrase styles.
- `sw.js` — cache the new files; bump cache version.
- Reuses `speech.js`, `db.js` unchanged in shape (settings store holds the prediction
  model and quick phrases as JSON values).

## Explicitly OUT of v1

- Full-sentence/grammar prediction, abbreviation expansion, number/symbol depth beyond
  one extra layer, scanning/switch access, multiple user profiles.

## Success criteria

1. Switch to Keyboard mode, type "I need water," hear it spoken, with relevant
   predictions appearing as you type — offline.
2. Tap "I'm in pain" → it speaks instantly, no typing.
3. After typing several sentences, frequently used words appear earlier in predictions.
4. The child picture board still works exactly as before.
