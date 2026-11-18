/**
 * High-performance IndexedDB storage wrapper for caching large cricket datasets
 * (200,000+ ball-by-ball deliveries and relational tables).
 */

const DB_NAME = 'superr_selector_db';
const DB_VERSION = 1;
const STORE_DATASETS = 'raw_datasets';
const STORE_META = 'metadata';

interface CachedDataset {
  deliveries?: any[];
  matches?: any[];
  competitions?: any[];
  playingEleven?: any[];
  teams?: any[];
  playerMapping?: any[];
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DATASETS)) {
        db.createObjectStore(STORE_DATASETS);
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDatasetsToCache(dataset: Omit<CachedDataset, 'timestamp'>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_DATASETS, STORE_META], 'readwrite');
    const dataStore = tx.objectStore(STORE_DATASETS);
    const metaStore = tx.objectStore(STORE_META);

    if (dataset.deliveries) dataStore.put(dataset.deliveries, 'deliveries');
    if (dataset.matches) dataStore.put(dataset.matches, 'matches');
    if (dataset.competitions) dataStore.put(dataset.competitions, 'competitions');
    if (dataset.playingEleven) dataStore.put(dataset.playingEleven, 'playingEleven');
    if (dataset.teams) dataStore.put(dataset.teams, 'teams');
    if (dataset.playerMapping) dataStore.put(dataset.playerMapping, 'playerMapping');

    metaStore.put({
      timestamp: Date.now(),
      deliveryCount: dataset.deliveries?.length || 0,
      matchCount: dataset.matches?.length || 0,
    }, 'cached_info');

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save dataset to IndexedDB:', err);
  }
}

export async function loadDatasetsFromCache(): Promise<CachedDataset | null> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_DATASETS, STORE_META], 'readonly');
    const dataStore = tx.objectStore(STORE_DATASETS);
    const metaStore = tx.objectStore(STORE_META);

    const getReq = (store: IDBObjectStore, key: string) =>
      new Promise<any>((resolve) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

    const meta = await getReq(metaStore, 'cached_info');
    if (!meta) return null;

    const [deliveries, matches, competitions, playingEleven, teams, playerMapping] = await Promise.all([
      getReq(dataStore, 'deliveries'),
      getReq(dataStore, 'matches'),
      getReq(dataStore, 'competitions'),
      getReq(dataStore, 'playingEleven'),
      getReq(dataStore, 'teams'),
      getReq(dataStore, 'playerMapping'),
    ]);

    if (!deliveries || deliveries.length === 0) return null;

    return {
      deliveries,
      matches: matches || [],
      competitions: competitions || [],
      playingEleven: playingEleven || [],
      teams: teams || [],
      playerMapping: playerMapping || [],
      timestamp: meta.timestamp || Date.now(),
    };
  } catch (err) {
    console.warn('Failed to load dataset from IndexedDB:', err);
    return null;
  }
}

export async function clearCacheDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_DATASETS, STORE_META], 'readwrite');
    tx.objectStore(STORE_DATASETS).clear();
    tx.objectStore(STORE_META).clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to clear IndexedDB:', err);
  }
}
