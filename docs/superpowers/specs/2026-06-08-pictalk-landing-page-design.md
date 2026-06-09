# PicTalk — Landing Page

**Date:** 2026-06-08
**Status:** Approved design
**Builds on:** the live PicTalk app

## Mission

Give PicTalk a real front door: a warm, fast, fully accessible page that makes a first-
time visitor instantly understand what PicTalk is and who it's for, and get them to
**open/install it in one tap** — while people who already installed it still open straight
into the app.

## Locked decisions (from brainstorming)

1. **Landing at the root; the app moves to `/app/`.** The manifest `start_url` points at
   the app, so "Add to Home Screen" still opens the app directly.
2. **Primary action: Open / install PicTalk.** Secondary: "Get help" (families) and
   "Let's talk" (professionals).
3. **Audience: families & users first**, a smaller professionals section second.
4. **Tone: warm, friendly, accessible** — matches the app's brand (blue #1d6fb8, green
   #2bb673, speech-bubble icon, big readable type).
5. **Contact = `mailto:Groundworkshelps@gmail.com`** for all "get help / let's talk" CTAs.

## Tech & structure

- **Static HTML/CSS, no build** — same as the app; fast and simple to host on GitHub Pages.
- **Exemplary accessibility** (this is the whole point of the product): semantic landmarks,
  one `<h1>`, logical heading order, WCAG-AA+ contrast, large tap targets, visible focus
  rings, full keyboard navigation, descriptive `alt` text, and `prefers-reduced-motion`
  honored (no essential motion).
- **Repo layout change:**
  - App files move from repo root into `app/` (`app/index.html`, `app/js/…`,
    `app/styles.css`, `app/sw.js`, `app/manifest.webmanifest`, `app/icons/…`).
  - New landing page at repo root: `index.html` + `landing.css` (+ reuse `icons/`).
  - `app/manifest.webmanifest`: `start_url` and `scope` = `./` (i.e. `/pictalk/app/`),
    so installs open the app. The service worker scope stays under `app/`.
  - The landing page does **not** register the app's service worker.
- **Existing links keep working:** the flyer/QR/posts point at `/pictalk/` → they now hit
  the landing page (good for new people), whose prominent "Open PicTalk" button launches
  `/pictalk/app/`.

## Page sections (top → bottom)

1. **Nav** — PicTalk logo; links: How it helps · For professionals · **[Open PicTalk]**.
2. **Hero** — `<h1>` "Everyone deserves to be heard." + sub "PicTalk is a free app that
   speaks for people who can't — tap pictures or type, and it talks out loud." Primary
   **[Open PicTalk]** + secondary **[How it works]**. Promise chips: Free · Private ·
   Works offline. Visual: a real screenshot of the app in a phone frame.
3. **Who it helps** — four cards (reuse the established content): 🖼️ Picture board ·
   ⌨️ Talking keyboard · 🔘 Switch access · 👁️ Vision tracking *(coming soon)*.
4. **Why it's different** — $5,000–$15,000 → **Free**; **Private** (nothing uploaded);
   **Offline**; **Any device you own**.
5. **"We'll build it with you"** — the personal/white-glove angle: your people, your words,
   your way; we help you set up the perfect board. CTA **[Get help →]** (mailto). One small
   line: "Free backup & sync across devices — coming soon (Free+)."
6. **For schools, clinics & therapists** — secondary section: free for every family you
   serve; we support your deployment. CTA **[Let's talk →]** (mailto).
7. **Start in 30 seconds** — 1) Open  2) Add to Home Screen  3) Works offline forever.
   **[Open PicTalk]**.
8. **From the maker** — short, human note (why John built it) to build trust.
9. **Footer** — Open app · Open-source (GitHub) · Contact (mailto) · Privacy · "Free &
   always will be."

## Content choices

- **Hero headline:** "Everyone deserves to be heard." (confirmed.)
- **Honesty:** the page sells what's **live** (the four boards; Vision tracking flagged
  "coming soon"). The **"we'll build it with you"** service is real and prominent. Free+
  backup/sync gets a single small "coming soon" mention — no overpromising.
- **Primary CTA "Open PicTalk"** repeats at nav, hero, mid-page, and footer; it links to
  `app/` (opens the PWA).

## Out of scope

- The app itself — no changes beyond relocating it to `app/` and updating manifest/SW paths.
- Free+ accounts (separate spec), analytics, blog, a contact form (mailto for now; a
  Formspree form can be added later like the Groundwork site).

## Success criteria

1. A first-time visitor understands what PicTalk is and who it's for within seconds, and
   can open/install it in one tap.
2. The page meets WCAG-AA (contrast, keyboard, focus, alt text, reduced-motion).
3. Installing from the page (or any existing link) results in an installed icon that opens
   **the app**, not the landing page.
4. The app continues to work exactly as today at its new `app/` path (loads, runs offline,
   service worker registers under the new scope).

## Risks / migration notes

- **Existing installs:** the few current installs were made when `start_url` resolved to
  the root; after restructuring, their baked-in start_url may open the landing page. Install
  base is ~zero today, so acceptable; users can re-add. Note in release.
- **Path updates:** every relative path is already `./`-relative, so moving into `app/`
  should "just work," but the service worker pre-cache list and registration path must be
  re-verified after the move.
- **Phone-frame screenshot:** generate a fresh, current screenshot of the app for the hero.
