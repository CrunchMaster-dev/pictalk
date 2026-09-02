# PicTalk — CLAUDE.md

## Goal
Free, private, offline AAC (Augmentative & Alternative Communication) app for
non-speaking people. A child taps pictures to speak ("I want apple"); literate
adults use a phrases-first keyboard with word prediction. Built because good AAC
devices cost $5k–$15k and apps charge hundreds a year — this is John's
"calling to help people" project. Support email: Groundworkshelps@gmail.com.

## Architecture
- Vanilla JS ES modules. **No framework, no bundler, no build step.**
- PWA: `app/sw.js` service worker pre-caches the app shell (cache-first);
  installable via `app/manifest.webmanifest`.
- Speech: Web Speech API (`speechSynthesis`) — `app/js/speech.js`.
- Storage: IndexedDB for personal tiles, settings, prediction model (`app/js/db.js`).
- Word prediction: on-device unigram/bigram model, seeded from a bundled word
  list, learns as the user types (`app/js/predict.js`).
- Switch scanning: board-agnostic row-column scanning engine with auditory cues
  (`app/js/scanning.js`).
- Free+ (optional cloud backup/sync): Supabase, dynamically imported from
  esm.sh only if the user signs in. `FREEPLUS_ENABLED = true` in
  `app/js/config.js` (anon/publishable key only; RLS protects data). Device is
  source of truth; cloud is a mirror (`app/js/cloud.js`, `app/js/sync.js`).

## File Layout
```
index.html, landing.css      Landing page (links to ./app/)
guide.html, guide-*.png      Parent how-to guide
app/index.html               The app shell (picture board + keyboard + parent dialog)
app/styles.css               All app styles
app/sw.js                    Service worker (bump CACHE_VERSION on any app change!)
app/manifest.webmanifest     PWA manifest
app/js/app.js                Main controller (~790 lines): board, parent mode, SW registration
app/js/data.js               Built-in vocabulary + STARTER_PHRASES
app/js/db.js                 IndexedDB wrapper
app/js/speech.js             speechSynthesis wrapper
app/js/keyboard.js           Adult board: phrase tabs + typing keyboard
app/js/predict.js            Offline learning word prediction
app/js/phrases.js            User's custom Quick Phrases
app/js/scanning.js           Switch scanning engine
app/js/config.js|cloud.js|sync.js   Free+ (Supabase) config/client/sync
docs/freeplus/               Supabase SETUP.md + schema.sql
docs/superpowers/specs|plans Design specs and implementation plans
```

## Status
- LIVE at https://crunchmaster-dev.github.io/pictalk/ since 2026-06-08.
- Shipped: picture board, sentence bar, parent mode (math gate), personal photo
  tiles, phrases-first adult keyboard w/ prediction, switch scanning, PWA
  offline install, landing page + guide, Free+ backup/sync (enabled).
- Latest work (SW cache `pictalk-v9`): mobile optimization, phrases-first
  keyboard, update auto-reload.
- README "planned next": ARASAAC symbols, two-switch/group scanning, board
  rearranging/folders/profiles, eye-gaze/dwell access.

## Key Constraints
- **Free forever.** No account required, no subscription, no paid tiers.
  Free+ backup is also free and strictly optional.
- **Offline-first & private.** App must fully work with zero network after
  first load. Photos/names live only in IndexedDB; nothing is uploaded unless
  a user explicitly opts into Free+. Never add required network calls,
  analytics, or trackers. The only external fetch is the dynamic Supabase
  import, and only after opt-in.
- **Accessibility is the product.** Big touch targets, aria-labels/live
  regions, switch scanning must keep working for every new UI surface
  (scanning engine collects actionable elements from the active board).
  Audience includes non-readers — prefer pictures/emoji over text.
- **Cheap devices.** Must run on low-end tablets/phones/Chromebooks in
  Chrome, Safari, and Edge. Keep it lightweight; no heavy dependencies.
- Keep parent-only controls behind the math gate; keep kid UI un-breakable.

## Deployment (GitHub Pages)
- Repo: https://github.com/CrunchMaster-dev/pictalk (branch `master`).
- GitHub Pages serves the repo root from `master` (no gh-pages branch, no
  `.github/` workflow — deploy is just `git push origin master`).
- Landing = `/pictalk/`, app = `/pictalk/app/`.
- **Always bump `CACHE_VERSION` in `app/sw.js`** when app files change, or
  installed users never receive the update (app.js auto-reloads on
  controllerchange).

## Running / testing locally
No build step, but SW/speech/IndexedDB require http(s), not `file://`:
```powershell
cd C:\Users\chris\pictalk
python -m http.server 8123
```
Open http://localhost:8123 (landing) or http://localhost:8123/app/ (app).
No test suite; verify manually (tap-to-speak, keyboard, scanning, offline
reload with DevTools "Offline").

## Roadmap / Context
- PicTalk may become the basis of a 501(c)(3) nonprofit — the planned host
  organization for a Claude Corps cohort (Jan/Aug 2027). Keep licensing,
  cost-free hosting, and mission framing compatible with that.
