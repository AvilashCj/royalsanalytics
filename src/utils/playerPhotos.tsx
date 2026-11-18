import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const PHOTO_DB_NAME = 'superr_selector_photos_db';
const PHOTO_DB_VERSION = 1;
const STORE_PLAYER_PHOTOS = 'player_photos';
const STORE_TEAM_ASSETS = 'team_assets';

export const DEFAULT_TEAM_BANNER = '/assets/aistudio/image_4aa7e332.png';

export interface PlayerPhotoEntry {
  id: string;
  playerName: string;
  normalizedKey: string;
  dataUrl: string;
  fileName: string;
  updatedAt: number;
}

const KNOWN_CRICKET_STARS = [
  'Suryakumar Yadav',
  'Jos Buttler',
  'Yashasvi Jaiswal',
  'Sanju Samson',
  'Riyan Parag',
  'Shimron Hetmyer',
  'Dhruv Jurel',
  'Rinku Singh',
  'Hardik Pandya',
  'Heinrich Klaasen',
  'Virat Kohli',
  'MS Dhoni',
  'Rohit Sharma',
  'Shubman Gill',
  'KL Rahul',
  'Rishabh Pant',
  'Nicholas Pooran',
  'Travis Head',
  'Glenn Maxwell',
  'David Miller',
  'Marcus Stoinis',
  'Shivam Dube',
  'Tilak Varma',
  'Ruturaj Gaikwad',
  'Shreyas Iyer',
  'Phil Salt',
  'Tristan Stubbs',
  'Andre Russell',
  'Sunil Narine',
  'Ravindra Jadeja',
  'Axar Patel',
  'Jasprit Bumrah',
  'Arshdeep Singh',
  'Yuzvendra Chahal',
  'Trent Boult',
  'Sandeep Sharma',
  'Rashid Khan',
  'Kuldeep Yadav',
  'Matheesha Pathirana',
  'Mohammed Siraj',
  'Mohammed Shami',
  'Bhuvneshwar Kumar',
  'Kagiso Rabada',
  'Pat Cummins',
  'Mitchell Starc',
  'Jofra Archer',
  'Wanindu Hasaranga',
  'Maheesh Theekshana',
  'Tushar Deshpande',
  'Avesh Khan',
  'Harshal Patel',
  'Varun Chakravarthy',
  'Ravi Bishnoi',
  'Noor Ahmad',
  'Marco Jansen',
  'Sam Curran',
];

export function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.(png|jpe?g|webp|avif|svg|gif)$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function toTitleCase(str: string): string {
  return str
    .split(' ')
    .filter(Boolean)
    .map((w) => (w.length <= 2 && w.toUpperCase() === 'MS' ? 'MS' : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

export function matchFilenameToPlayer(fileName: string, dynamicPlayerNames: string[]): string {
  const cleaned = normalizePlayerName(fileName)
    .replace(/\b(photo|headshot|portrait|player|cutout|img|image|pic|ipl|rr|t20|\d+)\b/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const candidatePool = Array.from(new Set([...dynamicPlayerNames, ...KNOWN_CRICKET_STARS]));

  if (!cleaned) {
    return candidatePool[0] || 'Unknown Player';
  }

  // 1. Exact normalized match
  for (const candidate of candidatePool) {
    if (normalizePlayerName(candidate) === cleaned) {
      return candidate;
    }
  }

  // 2. Substring or all-tokens match
  const fileTokens = cleaned.split(' ').filter((t) => t.length >= 2);
  let bestCandidate: string | null = null;
  let bestScore = 0;

  for (const candidate of candidatePool) {
    const normCand = normalizePlayerName(candidate);
    const candTokens = normCand.split(' ');

    let score = 0;
    for (const ft of fileTokens) {
      if (candTokens.includes(ft)) {
        score += 3;
      } else if (candTokens.some((ct) => ct.startsWith(ft) || ft.startsWith(ct))) {
        score += 1.5;
      }
    }
    // Bonus if last name matches
    if (
      fileTokens.length > 0 &&
      candTokens.length > 0 &&
      fileTokens[fileTokens.length - 1] === candTokens[candTokens.length - 1]
    ) {
      score += 2.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  if (bestCandidate && bestScore >= 2.5) {
    return bestCandidate;
  }

  return toTitleCase(cleaned);
}

function openPhotoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTO_DB_NAME, PHOTO_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PLAYER_PHOTOS)) {
        db.createObjectStore(STORE_PLAYER_PHOTOS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TEAM_ASSETS)) {
        db.createObjectStore(STORE_TEAM_ASSETS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface PlayerPhotosContextValue {
  photoEntries: PlayerPhotoEntry[];
  teamBannerUrl: string;
  getPlayerPhoto: (playerName: string) => string | null;
  uploadPlayerFiles: (files: FileList | File[], knownPlayers?: string[]) => Promise<number>;
  assignPhotoToPlayer: (entryId: string, newPlayerName: string) => Promise<void>;
  removePhotoEntry: (entryId: string) => Promise<void>;
  uploadTeamBanner: (file: File) => Promise<void>;
  resetTeamBanner: () => Promise<void>;
  clearAllPhotos: () => Promise<void>;
}

const PlayerPhotosContext = createContext<PlayerPhotosContextValue>({
  photoEntries: [],
  teamBannerUrl: DEFAULT_TEAM_BANNER,
  getPlayerPhoto: () => null,
  uploadPlayerFiles: async () => 0,
  assignPhotoToPlayer: async () => {},
  removePhotoEntry: async () => {},
  uploadTeamBanner: async () => {},
  resetTeamBanner: async () => {},
  clearAllPhotos: async () => {},
});

export const PlayerPhotosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [photoEntries, setPhotoEntries] = useState<PlayerPhotoEntry[]>([]);
  const [teamBannerUrl, setTeamBannerUrl] = useState<string>(DEFAULT_TEAM_BANNER);

  // Load saved photos & banner from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const db = await openPhotoDB();
        const tx = db.transaction([STORE_PLAYER_PHOTOS, STORE_TEAM_ASSETS], 'readonly');
        const photoStore = tx.objectStore(STORE_PLAYER_PHOTOS);
        const assetStore = tx.objectStore(STORE_TEAM_ASSETS);

        const allPhotosReq = photoStore.getAll();
        const bannerReq = assetStore.get('team_banner');

        allPhotosReq.onsuccess = () => {
          if (mounted && Array.isArray(allPhotosReq.result)) {
            setPhotoEntries(
              allPhotosReq.result.sort((a: PlayerPhotoEntry, b: PlayerPhotoEntry) => b.updatedAt - a.updatedAt)
            );
          }
        };

        bannerReq.onsuccess = () => {
          if (mounted && typeof bannerReq.result === 'string' && bannerReq.result.length > 0) {
            setTeamBannerUrl(bannerReq.result);
          }
        };
      } catch (err) {
        console.warn('Could not load player photos from IndexedDB:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getPlayerPhoto = useCallback(
    (playerName: string): string | null => {
      if (!playerName || photoEntries.length === 0) return null;
      const normTarget = normalizePlayerName(playerName);

      // 1. Direct normalized match
      const exact = photoEntries.find((e) => e.normalizedKey === normTarget);
      if (exact) return exact.dataUrl;

      // 2. Partial / token match (e.g., "S Yadav" or "Buttler" matching "Jos Buttler")
      const targetTokens = normTarget.split(' ').filter(Boolean);
      if (targetTokens.length > 0) {
        const lastToken = targetTokens[targetTokens.length - 1];
        const partial = photoEntries.find((e) => {
          const entryTokens = e.normalizedKey.split(' ');
          if (entryTokens.length === 1 && entryTokens[0] === lastToken && lastToken.length >= 4) {
            return true;
          }
          return (
            entryTokens[entryTokens.length - 1] === lastToken &&
            entryTokens[0]?.[0] === targetTokens[0]?.[0]
          );
        });
        if (partial) return partial.dataUrl;
      }

      return null;
    },
    [photoEntries]
  );

  const uploadPlayerFiles = useCallback(
    async (files: FileList | File[], knownPlayers: string[] = []): Promise<number> => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (fileArray.length === 0) return 0;

      const newEntries: PlayerPhotoEntry[] = [];

      for (const file of fileArray) {
        const dataUrl = await readFileAsDataUrl(file);
        const matchedName = matchFilenameToPlayer(file.name, knownPlayers);
        const normalizedKey = normalizePlayerName(matchedName);

        newEntries.push({
          id: `photo_${normalizedKey.replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          playerName: matchedName,
          normalizedKey,
          dataUrl,
          fileName: file.name,
          updatedAt: Date.now(),
        });
      }

      try {
        const db = await openPhotoDB();
        const tx = db.transaction(STORE_PLAYER_PHOTOS, 'readwrite');
        const store = tx.objectStore(STORE_PLAYER_PHOTOS);

        setPhotoEntries((prev) => {
          // Replace any existing entry with the same normalizedKey so re-uploading updates cleanly
          const incomingKeys = new Set(newEntries.map((e) => e.normalizedKey));
          const filteredPrev = prev.filter((p) => {
            if (incomingKeys.has(p.normalizedKey)) {
              store.delete(p.id);
              return false;
            }
            return true;
          });
          for (const entry of newEntries) {
            store.put(entry);
          }
          return [...newEntries, ...filteredPrev];
        });
      } catch (err) {
        console.warn('Error saving player photos to IndexedDB:', err);
      }

      return newEntries.length;
    },
    []
  );

  const assignPhotoToPlayer = useCallback(async (entryId: string, newPlayerName: string) => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    const normalizedKey = normalizePlayerName(trimmed);

    try {
      const db = await openPhotoDB();
      const tx = db.transaction(STORE_PLAYER_PHOTOS, 'readwrite');
      const store = tx.objectStore(STORE_PLAYER_PHOTOS);

      setPhotoEntries((prev) =>
        prev.map((item) => {
          if (item.id === entryId) {
            const updated: PlayerPhotoEntry = {
              ...item,
              playerName: trimmed,
              normalizedKey,
              updatedAt: Date.now(),
            };
            store.put(updated);
            return updated;
          }
          return item;
        })
      );
    } catch (err) {
      console.warn('Failed to reassign player photo:', err);
    }
  }, []);

  const removePhotoEntry = useCallback(async (entryId: string) => {
    try {
      const db = await openPhotoDB();
      const tx = db.transaction(STORE_PLAYER_PHOTOS, 'readwrite');
      tx.objectStore(STORE_PLAYER_PHOTOS).delete(entryId);
      setPhotoEntries((prev) => prev.filter((item) => item.id !== entryId));
    } catch (err) {
      console.warn('Failed to remove player photo:', err);
    }
  }, []);

  const uploadTeamBanner = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const dataUrl = await readFileAsDataUrl(file);
    setTeamBannerUrl(dataUrl);
    try {
      const db = await openPhotoDB();
      const tx = db.transaction(STORE_TEAM_ASSETS, 'readwrite');
      tx.objectStore(STORE_TEAM_ASSETS).put(dataUrl, 'team_banner');
    } catch (err) {
      console.warn('Failed to save team banner to IndexedDB:', err);
    }
  }, []);

  const resetTeamBanner = useCallback(async () => {
    setTeamBannerUrl(DEFAULT_TEAM_BANNER);
    try {
      const db = await openPhotoDB();
      const tx = db.transaction(STORE_TEAM_ASSETS, 'readwrite');
      tx.objectStore(STORE_TEAM_ASSETS).delete('team_banner');
    } catch (err) {
      console.warn('Failed to reset team banner:', err);
    }
  }, []);

  const clearAllPhotos = useCallback(async () => {
    setPhotoEntries([]);
    try {
      const db = await openPhotoDB();
      const tx = db.transaction(STORE_PLAYER_PHOTOS, 'readwrite');
      tx.objectStore(STORE_PLAYER_PHOTOS).clear();
    } catch (err) {
      console.warn('Failed to clear player photos:', err);
    }
  }, []);

  return (
    <PlayerPhotosContext.Provider
      value={{
        photoEntries,
        teamBannerUrl,
        getPlayerPhoto,
        uploadPlayerFiles,
        assignPhotoToPlayer,
        removePhotoEntry,
        uploadTeamBanner,
        resetTeamBanner,
        clearAllPhotos,
      }}
    >
      {children}
    </PlayerPhotosContext.Provider>
  );
};

export const usePlayerPhotos = () => useContext(PlayerPhotosContext);
export { KNOWN_CRICKET_STARS };
