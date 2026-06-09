// Free+ sync — reconcile the local board (IndexedDB) with the cloud copy.
//
// Strategy: the device is the source of truth; the cloud is an encrypted mirror.
// We detect "did the local board change since the last sync?" with a content hash, and
// "is the cloud newer?" with its updated_at timestamp. If both changed, we ask the user.
//
// Photos travel separately: tile Blobs go to Storage; the board JSON keeps photo *paths*.

import * as DB from "./db.js";
import * as Cloud from "./cloud.js";

function extOf(blob) {
  const t = blob && blob.type;
  if (t === "image/png") return "png";
  if (t === "image/jpeg") return "jpg";
  if (t === "image/webp") return "webp";
  return "img";
}

// A stable hash of the board's *meaning* (tile metadata + settings), ignoring photo bytes.
function hashBoard(board) {
  const meta = {
    tiles: (board.tiles || []).map((t) => ({
      id: t.id, label: t.label, say: t.say, category: t.category, photo: !!t.photoBlob,
    })),
    settings: board.settings || {},
  };
  const json = JSON.stringify(meta);
  let h = 2166136261;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

const hasContent = (b) => (b.tiles && b.tiles.length > 0) || Object.keys(b.settings || {}).length > 0;

// Push the local board up: upload photos, write the JSON, record what we synced.
export async function pushBoard(user) {
  const board = await DB.dumpBoard();
  const tiles = [];
  for (const t of board.tiles) {
    let photoPath = null;
    if (t.photoBlob) {
      photoPath = `${user.id}/${t.id}.${extOf(t.photoBlob)}`;
      await Cloud.uploadPhoto(photoPath, t.photoBlob);
    }
    tiles.push({ id: t.id, label: t.label, say: t.say, category: t.category, photoPath });
  }
  const cloudData = { tiles, settings: board.settings };
  const updatedAt = await Cloud.putCloudBoard(user, cloudData);
  await DB.setSetting("lastSyncedHash", hashBoard(board));
  await DB.setSetting("lastSyncedAt", updatedAt || new Date().toISOString());
  Cloud.logEvent("board_synced");
  return updatedAt;
}

// Pull the cloud board down: download photos, replace the local board.
export async function pullBoard() {
  const cloud = await Cloud.getCloudBoard();
  if (!cloud) return false;
  const cd = cloud.data || {};
  const tiles = [];
  for (const t of cd.tiles || []) {
    let photoBlob = null;
    if (t.photoPath) {
      try { photoBlob = await Cloud.downloadPhoto(t.photoPath); } catch (e) { /* skip missing */ }
    }
    tiles.push({ id: t.id, label: t.label, say: t.say, category: t.category, photoBlob });
  }
  const board = { tiles, settings: cd.settings || {} };
  await DB.replaceBoard(board);
  await DB.setSetting("lastSyncedHash", hashBoard(board));
  await DB.setSetting("lastSyncedAt", cloud.updated_at);
  return true;
}

// Reconcile on sign-in / app open / reconnect. Returns { action } where action is one of
// "pushed" | "pulled" | "conflict" | "in-sync". On "conflict" the caller asks the user
// which side to keep, then calls resolveConflict().
export async function reconcile(user) {
  const local = await DB.dumpBoard();
  const localHash = hashBoard(local);
  const lastHash = await DB.getSetting("lastSyncedHash", null);
  const lastAt = await DB.getSetting("lastSyncedAt", null);
  const cloud = await Cloud.getCloudBoard();

  if (!cloud) {
    if (hasContent(local)) { await pushBoard(user); return { action: "pushed" }; }
    return { action: "in-sync" };
  }

  const cloudNewer = !lastAt || (cloud.updated_at && cloud.updated_at > lastAt);
  const localChanged = lastHash !== null && localHash !== lastHash;
  const neverSynced = lastHash === null;

  // First time signing in on this device, and both sides have data → let the user choose.
  if (neverSynced && hasContent(local)) return { action: "conflict" };
  if (neverSynced) { await pullBoard(); return { action: "pulled" }; }

  if (localChanged && cloudNewer) return { action: "conflict" };
  if (localChanged) { await pushBoard(user); return { action: "pushed" }; }
  if (cloudNewer) { await pullBoard(); return { action: "pulled" }; }
  return { action: "in-sync" };
}

export async function resolveConflict(user, keep) {
  if (keep === "local") return pushBoard(user);
  return pullBoard();
}

export async function lastSyncedAt() {
  return DB.getSetting("lastSyncedAt", null);
}
