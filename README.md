# PicTalk 🗣️

A **free, private, offline talking picture board** for non-speaking children.
A child taps pictures to speak — "I want apple" — on any cheap tablet, phone, or
Chromebook. No account, no subscription, nothing uploaded.

Built because good AAC (Augmentative & Alternative Communication) devices cost
$5,000–$15,000 and good apps charge hundreds a year — pricing out the families who
need them most.

## What it does

- **Tap-to-speak picture grid** organized into Core words, People, Food, Feelings,
  Actions, and Places.
- **Sentence building** — tap several tiles, then press ▶ Speak to say the whole thing.
- **Parent mode** (behind a simple math gate) to add **personal tiles** with a real
  photo and the word it should say — "Mama", your dog, a favorite toy.
- **Works offline.** After the first load it runs with no internet.
- **Private by design.** Photos and names are stored only on the device
  (`IndexedDB`) and are never uploaded anywhere.
- **Installable.** "Add to Home Screen" makes it a real app icon.

## How to run it on this computer

It's plain HTML/CSS/JS — no build step. It just needs to be *served* (the speech,
offline cache, and storage features need `http`/`https`, not a `file://` path).

```powershell
cd C:\Users\chris\pictalk
python -m http.server 8123
```

Then open **http://localhost:8123** in Chrome, Edge, or Safari.

## How to get it to a family (free)

1. **Easiest:** host the `pictalk` folder on any free static host — GitHub Pages,
   Netlify, Cloudflare Pages, or Vercel — and text them the link. They open it,
   tap "Add to Home Screen," and it's an app that works offline forever.
2. **No internet at all:** copy the folder onto the device and serve it locally,
   or wrap it (later) as an Android app.

## Using it

- **Child:** just tap pictures. Each tap speaks the word and adds it to the bar at
  the top. The green **Speak** button reads the whole sentence; **✕** clears it.
- **Parent:** tap the **⚙ gear**, solve the little math problem (keeps kids out),
  then add personal tiles and pick the speaking voice.

## What's planned next (not in this first version)

- ARASAAC symbol images as an option alongside emoji
- A text keyboard + word prediction for literate users (stroke / ALS adults)
- Rearranging the board, folders, multiple child profiles
- Switch / eye-gaze access for kids who can't use a touchscreen

## Tech notes

- Vanilla JS ES modules, no framework, no bundler.
- `speechSynthesis` (Web Speech API) for the voice.
- `IndexedDB` for personal tiles + settings.
- A service worker (`sw.js`) caches the app shell for offline use.

Design spec: [`docs/superpowers/specs/2026-06-07-pictalk-aac-design.md`](docs/superpowers/specs/2026-06-07-pictalk-aac-design.md)
