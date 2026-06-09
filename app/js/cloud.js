// Supabase wrapper for PicTalk Free+ — the single integration point with the backend.
//
// The Supabase SDK is loaded with a DYNAMIC import the first time it's needed, so the
// app still loads with no network (and when Free+ is off) — nothing here runs unless a
// user actually opts into Free+.
//
// Note: the anon key is a publishable client key; row-level security is what protects
// each user's data.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

let _client = null;
let _clientPromise = null;

async function getClient() {
  if (_client) return _client;
  if (!_clientPromise) {
    _clientPromise = (async () => {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      return _client;
    })();
  }
  return _clientPromise;
}

const redirectTo = () =>
  typeof location !== "undefined" ? location.origin + location.pathname : undefined;

// ---- Auth ------------------------------------------------------------------
export async function sendMagicLink(email) {
  const c = await getClient();
  const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
  if (error) throw error;
}

export async function getUser() {
  const c = await getClient();
  const { data } = await c.auth.getUser();
  return data.user || null;
}

export async function onAuthChange(cb) {
  const c = await getClient();
  c.auth.onAuthStateChange((_event, session) => cb(session ? session.user : null));
}

export async function signOut() {
  const c = await getClient();
  await c.auth.signOut();
}

export async function ensureProfile(user) {
  const c = await getClient();
  await c.from("profiles").upsert({
    id: user.id, email: user.email, updated_at: new Date().toISOString(),
  });
}

// ---- Board document --------------------------------------------------------
export async function getCloudBoard() {
  const c = await getClient();
  const { data, error } = await c.from("boards").select("data, updated_at").maybeSingle();
  if (error) throw error;
  return data; // { data, updated_at } or null
}

export async function putCloudBoard(user, boardData) {
  const c = await getClient();
  const { data, error } = await c
    .from("boards")
    .upsert({ user_id: user.id, data: boardData, updated_at: new Date().toISOString() })
    .select("updated_at")
    .maybeSingle();
  if (error) throw error;
  return data ? data.updated_at : null;
}

// ---- Photos (Storage) ------------------------------------------------------
export async function uploadPhoto(path, blob) {
  const c = await getClient();
  const { error } = await c.storage.from("tile-photos").upload(path, blob, { upsert: true });
  if (error) throw error;
}

export async function downloadPhoto(path) {
  const c = await getClient();
  const { data, error } = await c.storage.from("tile-photos").download(path);
  if (error) throw error;
  return data; // Blob
}

export async function listPhotoPaths(uid) {
  const c = await getClient();
  const { data, error } = await c.storage.from("tile-photos").list(uid);
  if (error) throw error;
  return (data || []).map((o) => `${uid}/${o.name}`);
}

// ---- Export / delete -------------------------------------------------------
export async function deleteAllData(user) {
  const c = await getClient();
  const paths = await listPhotoPaths(user.id).catch(() => []);
  if (paths.length) await c.storage.from("tile-photos").remove(paths);
  await c.from("boards").delete().eq("user_id", user.id);
  await c.from("profiles").delete().eq("id", user.id);
  // (The auth login itself remains but now holds no data; signing out follows.)
}

// ---- Anonymized impact ping (no PII, fire-and-forget) ----------------------
export function logEvent(eventType) {
  getClient()
    .then((c) => {
      let anon = localStorage.getItem("pt_anon");
      if (!anon) {
        anon = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("pt_anon", anon);
      }
      return c.from("anonymized_events").insert({ anon_id: anon, event_type: eventType });
    })
    .catch(() => {});
}
