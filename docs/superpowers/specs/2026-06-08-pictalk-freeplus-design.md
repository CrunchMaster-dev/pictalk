# PicTalk — Free+ (optional account + encrypted cloud backup & sync)

**Date:** 2026-06-08
**Status:** Approved design (v1)
**Builds on:** picture board, keyboard mode, switch scanning specs

## Mission

Add an **optional, free** account ("Free+") to PicTalk that backs up and syncs a
person's board across devices, and lays the foundation for hands-on support — without
ever adding a paywall and without changing anything for people who don't want an account.

**The promise stays:** PicTalk is free forever. The app works 100% offline with no
account. Free+ is a door people choose to open, never a gate.

## Locked decisions (from brainstorming)

1. **Optional account, local-first.** IndexedDB stays the source of truth on-device.
2. **Server-readable, encrypted at rest** (not end-to-end). This makes building boards
   *for* people and troubleshooting effortless — at the cost of custodianship of
   sensitive data, which the Safeguards section addresses as non-negotiable.
3. **Magic-link sign-in** (email only) — no passwords.
4. **Supabase** as the backend platform.
5. Word-prediction model stays **local-only** in v1.

## Architecture — local-first, cloud optional

Today's behavior is unchanged for anyone without an account. With Free+:
- The device's IndexedDB remains the source of truth; the app fully works offline.
- The cloud is an **encrypted mirror** of the user-created board, synced opportunistically.
- The account is never a dependency — sign out (or never sign in) and everything still works.

## Infrastructure — Supabase

One managed platform provides:
- **Auth** — magic-link (OTP email) sign-in, built in.
- **Postgres** — board data (JSON) + profile + anonymized metrics.
- **Storage** — the photo files for personal tiles.
- **Row-Level Security (RLS)** — each user can only read/write their own rows and files.

Encryption at rest is provided by the platform; all transport is HTTPS. Supabase is
open-source (no hard lock-in; self-hosting is possible later). Free tier is sufficient
for early usage.

*Alternatives considered:* Firebase (easier, more lock-in, NoSQL) and a custom
Node+Postgres server (most control, most ops). Supabase chosen for the solo-builder
balance of capability vs. maintenance.

## What syncs

Only **user-created** data:
- **Personal photo tiles** — the photo file → Storage; the tile's `{id, label, say,
  category, photoPath}` → the board JSON.
- **Settings** — chosen voice, mode (pictures/keyboard), scan settings
  (enabled/stepMs/audio).
- **Quick phrases**.

Does **not** sync: built-in starter tiles (they're code), and the learned
word-prediction model (local-only in v1 — keeps scope down and avoids syncing usage
patterns).

## Data model (Supabase / Postgres)

```
profiles
  id            uuid  primary key   -- = auth.users.id
  email         text
  account_type  text  null          -- SEAM: null/'family' today; 'professional',
                                     --       'institutional' later. Costs nothing now.
  created_at    timestamptz
  updated_at    timestamptz

boards
  user_id       uuid  references profiles(id)   -- one board per user in v1
  data          jsonb                            -- { personalTiles[], settings{}, quickPhrases[] }
  updated_at    timestamptz                      -- for last-write-wins conflict resolution

-- Storage bucket: "tile-photos", object path: <user_id>/<tileId>.<ext>

anonymized_events                                 -- SEAM: impact metrics for grants/partners
  id            bigserial primary key
  anon_id       text                              -- random per-install id, NOT the user id, NOT email
  event_type    text                              -- e.g. 'board_synced', 'tile_added' (counts only)
  created_at    timestamptz
  -- NO user content, NO PII. Opt-out respected. Used only for aggregate impact reporting.
```

**RLS policies:** on `profiles` and `boards`, `auth.uid() = id` / `auth.uid() =
user_id` for select/insert/update/delete. Storage policies restrict objects to the
owning `user_id` prefix. `anonymized_events` is insert-only from the client and never
linked to a user.

## Auth flow (magic link)

1. User enters email in the Free+ card.
2. Supabase emails a one-time link/code.
3. User taps the link (or enters the code) → session established, stored locally.
4. A `profiles` row is created on first sign-in (`account_type` left null = family).

Sessions persist on-device so the user stays signed in; "Sign out" clears the session
(local board data remains intact on the device).

## Sync model

- **Triggers:** on sign-in, on local change (debounced ~2s), and on app open.
- **Push:** serialize the local board → upsert `boards.data` + `updated_at`; upload any
  new/changed photos to Storage.
- **Pull:** fetch cloud board; if newer than the local `lastSyncedAt`, download photos
  and merge into IndexedDB.
- **Conflict (edited on two devices):** board-level **last-write-wins** by `updated_at`.
  If both local and cloud changed since last sync, show a simple prompt: *"Keep this
  device's version, or the saved version?"* — no silent data loss.
- **UI:** a "Last synced ✓ / time" indicator and a manual **Sync now** button in settings.

## The opt-in experience (interaction flow — visuals are a separate design pass)

- App works with no account exactly as today.
- Settings gains a **"Free+ — back up & sync (free)"** card.
- Tap → enter email → tap magic link → signed in → initial backup runs.
- Signed-in state shows: status ("Backed up ✓ / Last synced…"), **Sync now**,
  **Sign out**, **Export my data**, **Delete my account & data**.
- Copy is explicit throughout: *optional, free, works offline without it, delete anytime.*

## Safeguards (non-negotiable)

- **Consent at sign-up:** a plain-language checkbox stating what's stored and that staff
  may access a board *to help* (with the later admin tooling); links to a **privacy policy** page.
- **Store the minimum.** No content analytics. Metrics are anonymized and opt-out.
- **Isolation** via RLS; transport over HTTPS; encryption at rest.
- **One-click Export** (board JSON + photos) and **Delete everything** (purges DB rows +
  Storage objects).
- **Children's data:** minimized, parent-controlled, never shared with third parties.
- **Staff/admin access** (for white-glove help) is a *later* feature and will be
  consent-gated and access-logged.

## Sustainability & future value (why free-to-families still has value)

PicTalk is free at the point of need and monetized at the point of *budget* — never
charging users or families. The eventual value comes from:

1. **Institutions & payers** (largest direct revenue): school districts (IDEA-funded
   AAC budgets), hospitals/rehab/SLP clinics, government programs (Medicaid, state AT
   Act, Vocational Rehab), and insurance/DME — paying for supported deployment, admin
   dashboards, IEP/progress reporting, training, and clinician features. Families stay free.
2. **Grants & philanthropy:** a free assistive tool with real impact metrics is highly
   fundable (disability foundations, corporate CSR, innovation grants). Likely via a
   nonprofit or fiscal sponsor.
3. **Professional tier:** SLPs/therapists pay for caseload management, data collection,
   and progress reporting. The clinic pays; individual users stay free.
4. **Groundwork.ai credibility & lead-gen:** PicTalk proves capability and wins paid
   Groundwork contracts — the nearest-term, indirect value.
5. Smaller: sponsorships, donations, hardware bundles, commercial licensing.

**How Free+ enables this without touching families:** the `account_type` seam allows a
future institutional/professional account type; the `anonymized_events` seam produces
the aggregate impact numbers that win grants and prove value to institutions; and
clustered institutional usage (e.g., one email domain creating many boards) becomes a
sales signal. v1 builds neither monetization feature — it only leaves the cheap seams so
they bolt on cleanly later.

**Honest framing:** this is patient value, not a fast goldmine. Grants and institutional
sales are slow; Groundwork credibility is indirect. The mission is the point; the money
is real but downstream.

## New code (modular, matches the vanilla-JS, no-build style)

- `js/cloud.js` — Supabase wrapper: magic-link auth, board get/upsert, photo
  upload/download, account export/delete. The single integration point with Supabase.
- `js/sync.js` — reconcile local IndexedDB ↔ cloud board; conflict handling; emits
  status events for the UI.
- **Settings UI** — the Free+ card (sign in/out, status, Sync now, export, delete) added
  to the existing settings panel.
- `js/db.js` — add `updatedAt`/`lastSyncedAt` tracking and `dumpBoard()` / `loadBoard()`
  helpers so sync has a clean local interface.
- `speech.js`, `scanning.js`, `keyboard.js`, `predict.js` — untouched.
- The Supabase JS SDK loads as an ES module (CDN ESM build) and is cached by the service
  worker so the app still loads offline. (If CDN caching proves unreliable, vendor a copy
  into the repo — decided during planning.)

## Explicitly OUT of v1 (each a follow-on spec)

- Remote white-glove board-building console (staff building a board *for* someone)
- Support/admin tooling and access logging UI
- Professional/institutional account types and their features
- Impact-metrics dashboard/reporting (the table exists; the reporting does not)
- Prediction-model sync, multi-caregiver shared boards, templates library

## Success criteria

1. A user can *optionally* create a Free+ account via magic link, and their personalized
   board (photo tiles, voice, mode, scan settings, quick phrases) backs up and restores
   on a second device.
2. The app works fully offline with no account, and **no-account behavior is identical to
   today**.
3. Sign out leaves local data intact; **Export** produces a complete JSON + photos;
   **Delete** purges all cloud rows and Storage objects.
4. Conflict between two devices never silently loses data.

## Risks / open questions (resolve during planning)

- **Supabase JS SDK offline caching** in a no-build PWA — confirm the ESM-via-CDN +
  service-worker-cache approach, or vendor the SDK.
- **Email deliverability** for magic links (Supabase default vs. a custom SMTP/domain).
- **Free-tier limits** (Storage GB, monthly active users) — fine early; monitor.
- **Photo size** — consider downscaling photos on upload to control Storage cost.
