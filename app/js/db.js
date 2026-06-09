// IndexedDB wrapper for PicTalk.
//
// Two stores:
//   "tiles"    -> parent-added personal tiles, including a photo stored as a Blob.
//                 A Blob lives in IndexedDB efficiently and never touches a server.
//   "settings" -> small key/value prefs (chosen voice, first-run done).
//
// We promisify the old event-based IndexedDB API so app code can use async/await.

const DB_NAME = "pictalk";
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("tiles")) {
        db.createObjectStore("tiles", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(storeName, mode);
        const store = t.objectStore(storeName);
        const result = fn(store);
        t.oncomplete = () => resolve(result && result.__value !== undefined ? result.__value : result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

// Wrap a single IDBRequest so the transaction's oncomplete can return its value.
function reqValue(request) {
  const holder = { __value: undefined };
  request.onsuccess = () => {
    holder.__value = request.result;
  };
  return holder;
}

export async function getAllPersonalTiles() {
  return tx("tiles", "readonly", (store) => reqValue(store.getAll()));
}

export async function addPersonalTile(tile) {
  return tx("tiles", "readwrite", (store) => store.put(tile));
}

export async function deletePersonalTile(id) {
  return tx("tiles", "readwrite", (store) => store.delete(id));
}

export async function getSetting(key, fallback = null) {
  const row = await tx("settings", "readonly", (store) => reqValue(store.get(key)));
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  return tx("settings", "readwrite", (store) => store.put({ key, value }));
}
