export const DB_NAME = 'opchan-local';
export const DB_VERSION = 3;

export const STORE = {
  CELLS: 'cells',
  POSTS: 'posts',
  COMMENTS: 'comments',
  VOTES: 'votes',
  MODERATIONS: 'moderations',
  USER_IDENTITIES: 'userIdentities',
  USER_AUTH: 'userAuth',
  DELEGATION: 'delegation',
  UI_STATE: 'uiState',
  META: 'meta',
  BOOKMARKS: 'bookmarks',
} as const;

export type StoreName = (typeof STORE)[keyof typeof STORE];

/**
 * Open (and create/upgrade) the IndexedDB database used by LocalDatabase.
 * Minimal schema focused on key-based access patterns we already use in memory.
 */
export function openLocalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;

      // Create stores if they do not exist
      if (!db.objectStoreNames.contains(STORE.CELLS)) {
        db.createObjectStore(STORE.CELLS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE.POSTS)) {
        const store = db.createObjectStore(STORE.POSTS, { keyPath: 'id' });
        // Minimal index to fetch posts by cellId
        store.createIndex('by_cellId', 'cellId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.COMMENTS)) {
        const store = db.createObjectStore(STORE.COMMENTS, { keyPath: 'id' });
        // Minimal index to fetch comments by postId
        store.createIndex('by_postId', 'postId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.VOTES)) {
        // Votes are keyed by composite key `${targetId}:${author}`
        db.createObjectStore(STORE.VOTES, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE.MODERATIONS)) {
        // Moderations keyed by targetId
        db.createObjectStore(STORE.MODERATIONS, { keyPath: 'targetId' });
      }
      if (!db.objectStoreNames.contains(STORE.USER_IDENTITIES)) {
        // User identities keyed by address
        db.createObjectStore(STORE.USER_IDENTITIES, { keyPath: 'address' });
      }
      if (!db.objectStoreNames.contains(STORE.USER_AUTH)) {
        // User authentication data with single key 'current'
        db.createObjectStore(STORE.USER_AUTH, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE.DELEGATION)) {
        // Key delegation information with single key 'current'
        db.createObjectStore(STORE.DELEGATION, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE.UI_STATE)) {
        // UI state like wizard flags, preferences
        db.createObjectStore(STORE.UI_STATE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE.META)) {
        // Misc metadata like lastSync timestamps
        db.createObjectStore(STORE.META, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE.BOOKMARKS)) {
        const store = db.createObjectStore(STORE.BOOKMARKS, { keyPath: 'id' });
        // Index to fetch bookmarks by user
        store.createIndex('by_userId', 'userId', { unique: false });
        // Index to fetch bookmarks by type
        store.createIndex('by_type', 'type', { unique: false });
        // Index to fetch bookmarks by targetId
        store.createIndex('by_targetId', 'targetId', { unique: false });
      }
    };
  });
}
