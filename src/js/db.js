const DB_NAME = 'opp-local-vault';
const DB_VERSION = 1;
export const STORES = Object.freeze({
  settings: 'settings',
  faceProfiles: 'faceProfiles',
  locationPoints: 'locationPoints',
  searchWindows: 'searchWindows',
  evidence: 'evidence',
  audit: 'audit',
});

let dbPromise;

export function openOppDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(store)) {
          const objectStore = db.createObjectStore(store, { keyPath: 'id' });
          if (store === STORES.locationPoints) objectStore.createIndex('startTime', 'startTime');
          if (store === STORES.searchWindows) objectStore.createIndex('startTime', 'startTime');
          if (store === STORES.audit) objectStore.createIndex('createdAt', 'createdAt');
        }
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
  return dbPromise;
}

export async function putRecord(store, record) {
  const db = await openOppDb();
  return requestToPromise(db.transaction(store, 'readwrite').objectStore(store).put(record));
}

export async function putRecords(store, records) {
  const db = await openOppDb();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  for (const record of records) objectStore.put(record);
  return transactionDone(tx);
}

export async function getRecord(store, id) {
  const db = await openOppDb();
  return requestToPromise(db.transaction(store).objectStore(store).get(id));
}

export async function getAllRecords(store) {
  const db = await openOppDb();
  return requestToPromise(db.transaction(store).objectStore(store).getAll());
}

export async function deleteRecord(store, id) {
  const db = await openOppDb();
  return requestToPromise(db.transaction(store, 'readwrite').objectStore(store).delete(id));
}

export async function clearStore(store) {
  const db = await openOppDb();
  return requestToPromise(db.transaction(store, 'readwrite').objectStore(store).clear());
}

export async function wipeDatabase() {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    request.onblocked = () => reject(new Error('Database deletion blocked by another open tab.'));
  });
}

export async function addAudit(action, detail = {}) {
  return putRecord(STORES.audit, {
    id: `a_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    action,
    detail,
  });
}

export async function getSettings() {
  const settings = await getRecord(STORES.settings, 'app-settings');
  return settings || { id: 'app-settings', consent: {}, youtubeApiKey: '' };
}

export async function saveSettings(update) {
  const current = await getSettings();
  const next = { ...current, ...update, id: 'app-settings', updatedAt: new Date().toISOString() };
  await putRecord(STORES.settings, next);
  return next;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted.'));
  });
}
