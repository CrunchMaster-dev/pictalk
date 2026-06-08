# PicTalk — Free, Offline AAC Picture Board

**Date:** 2026-06-07
**Status:** Approved design (v1)
**Author:** John Christofero + Claude

## Mission

Give a free, private, offline communication tool to non-speaking children whose
families cannot afford a $5,000–$15,000 AAC device or a paid AAC app. A child taps
picture-tiles and the device speaks for them.

## First user (the person we build for)

*"Mateo, age 5, non-verbal, can't read yet. He needs to tell his mom he's hungry,
sad, or wants to go outside — by tapping pictures on a cheap tablet that talks for him."*

## Form factor

A **Progressive Web App (PWA)**. Distributed as a URL. Runs in any browser on a
phone, tablet, Chromebook, or library PC. "Add to Home Screen" makes it a real app
icon. Caches itself on first load and then runs with **zero internet**. No account,
no app store, $0 to distribute.

## Screens

### 1. Talk screen (default — what the child uses)
- Grid of large picture-tiles grouped into categories: **Core** (I, want, more, stop,
  yes, no, help…), **People**, **Food**, **Feelings**, **Actions**, **Places**.
- A **sentence bar** across the top shows tapped tiles.
- Tapping a tile speaks that word immediately AND appends it to the sentence bar
  (useful for single words and for building sentences).
- A big ▶ **Speak** button reads the whole sentence; ✕ **Clear** empties it.
- A hidden ⚙ gear opens Parent mode (child-locked).

### 2. Parent mode (behind a simple math gate so a child can't wander in)
- Add a **personal tile**: choose category, take/upload a real photo, type the word
  it should speak (e.g. "Mama", "Rex").
- Edit / delete personal tiles. Built-in starter tiles are fixed in v1.
- Choose the speaking **voice** from the device's available voices.

### 3. First-run (one skippable screen)
- Friendly welcome, optional voice pick.

## Under the hood (kept deliberately simple — no build step, vanilla JS)

- **Speech:** browser `Web Speech API` (`speechSynthesis`). Free, offline on most
  devices, no accounts.
- **Starter pictures:** **emoji** for v1 (free, universal, zero downloaded assets,
  fully offline). ARASAAC Creative-Commons images are a clean drop-in upgrade later.
- **Storage:** `IndexedDB` on the device. Personal photos and custom words never
  leave the tablet — this is our privacy promise to families. No server.
- **Offline:** a service worker caches the app shell on first load.
- **No framework, no bundler:** plain HTML/CSS/JS so it is trivial to host, audit,
  and hand off.

## Privacy promise

Nothing a family enters — photos, names, the child's vocabulary — is ever uploaded.
Everything stays in the browser's local storage on their own device.

## Explicitly OUT of v1 (YAGNI — each is a later follow-on)

- Word prediction / AI
- Text keyboard for literate users (the stroke/ALS adult version)
- Multi-board folders, full drag-and-drop board editor
- Switch access / eye-gaze / scanning
- Cloud sync, multiple child profiles
- ARASAAC image library bundling

## Success criteria

1. A parent can open the link, install it, and have the child tap "I want apple"
   and hear it spoken — with **no internet and no account** — in under 2 minutes.
2. A parent can add a photo of themselves labeled "Mama"; the child taps it to call them.
3. The app continues to work after the device goes offline and is reopened.

## File layout

```
pictalk/
  index.html              app shell + screens
  styles.css              styling (large-touch, high-contrast)
  js/
    data.js               starter vocabulary (categories + tiles)
    db.js                 IndexedDB wrapper for personal tiles + settings
    speech.js             Web Speech API wrapper + voice selection
    app.js                UI wiring: grid, sentence bar, parent mode
  sw.js                   service worker (offline cache)
  manifest.webmanifest    PWA manifest
  icons/                  app icons (192, 512, maskable)
```
