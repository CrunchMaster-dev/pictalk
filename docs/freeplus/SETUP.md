# Free+ — Supabase setup (≈10 minutes, one time)

Free+ needs a free Supabase project (the backend that stores backups). Only you can
create it. Once it's up and you paste two values into the fill-in file, Claude wires it
in and we test it together. **Until then, Free+ stays hidden — the app is unaffected.**

## Steps

1. **Create a project**
   - Go to https://supabase.com → sign up (free) → **New project**.
   - Name it `pictalk`, pick a region near Kansas City (e.g. `us-east-1`), set a database
     password (save it somewhere), and create. Wait ~2 min for it to provision.

2. **Copy the two keys**
   - Left sidebar → **Project Settings → API**.
   - Copy the **Project URL** and the **anon public** key.
   - Paste them into the file Claude opened in Notepad: `Supabase-keys-FILL-IN.txt`.
   - (The anon key is *meant* to be public — it's safe in the app. Do **not** paste the
     `service_role` key anywhere.)

3. **Create the database tables**
   - Left sidebar → **SQL Editor → New query**.
   - Open `docs/freeplus/schema.sql`, copy the whole thing, paste it in, and click **Run**.
   - You should see "Success." This creates the profiles/boards/events tables, the
     security rules, and the photo storage bucket.

4. **Turn on email (magic-link) sign-in**
   - Left sidebar → **Authentication → Sign In / Providers** → make sure **Email** is
     enabled (it is by default).
   - **Authentication → URL Configuration:**
     - **Site URL:** `https://crunchmaster-dev.github.io/pictalk/app/`
     - **Redirect URLs:** add `https://crunchmaster-dev.github.io/pictalk/app/`
       and (for local testing) `http://localhost:8140/app/`.

5. **Tell Claude you're done** (or just say the keys are pasted).
   - Claude will drop the two values into `app/js/config.js`, flip Free+ on, and we test:
     sign in by magic link, back up a board, and restore it on a second device.

## What this stores (and the promise)

- A user's board (custom tiles, settings, quick phrases) + their photos — only for people
  who *choose* to make a Free+ account.
- Row-level security means each user can only ever read/write their own data.
- Anonymized event counts (no names, no content) for grant/impact reporting.
- Export and delete-everything are one-click for the user.
- The app still works 100% offline with **no** account.
