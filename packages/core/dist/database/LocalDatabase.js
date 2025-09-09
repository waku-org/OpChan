import { MessageType, } from '../types/waku';
import { MessageValidator } from '../utils/MessageValidator';
import { EVerificationStatus } from '../types/identity';
import { openLocalDB, STORE } from '../database/schema';
/**
 * Minimal in-memory LocalDatabase
 * Mirrors CacheService message handling to enable incremental migration.
 */
export class LocalDatabase {
    constructor() {
        this.processedMessageIds = new Set();
        this.db = null;
        this._isSyncing = false;
        this._lastSync = null;
        this.pendingIds = new Set();
        this.pendingListeners = new Set();
        this.cache = {
            cells: {},
            posts: {},
            comments: {},
            votes: {},
            moderations: {},
            userIdentities: {},
            bookmarks: {},
        };
        this.validator = new MessageValidator();
    }
    /**
     * Open IndexedDB and hydrate in-memory cache.
     */
    async open() {
        this.db = await openLocalDB();
        await this.hydrateFromIndexedDB();
        await this.hydratePendingFromMeta();
    }
    /**
     * Apply a message into the LocalDatabase.
     * Returns true if the message was newly processed and stored.
     */
    async applyMessage(message) {
        if (!(await this.validator.isValidMessage(message))) {
            const partialMsg = message;
            console.warn('LocalDatabase: Rejecting invalid message', {
                messageId: partialMsg?.id,
                messageType: partialMsg?.type,
                hasSignature: !!partialMsg?.signature,
                hasBrowserPubKey: !!partialMsg?.browserPubKey,
            });
            return false;
        }
        const validMessage = message;
        const messageKey = `${validMessage.type}:${validMessage.id}:${validMessage.timestamp}`;
        if (this.processedMessageIds.has(messageKey)) {
            return false;
        }
        this.processedMessageIds.add(messageKey);
        this.storeMessage(validMessage);
        return true;
    }
    /**
     * Temporary alias to ease migration from CacheService.updateCache
     */
    async updateCache(message) {
        return this.applyMessage(message);
    }
    clear() {
        this.processedMessageIds.clear();
        this.cache.cells = {};
        this.cache.posts = {};
        this.cache.comments = {};
        this.cache.votes = {};
        this.cache.moderations = {};
        this.cache.userIdentities = {};
        this.cache.bookmarks = {};
    }
    storeMessage(message) {
        switch (message.type) {
            case MessageType.CELL:
                if (!this.cache.cells[message.id] ||
                    this.cache.cells[message.id]?.timestamp !== message.timestamp) {
                    this.cache.cells[message.id] = message;
                    this.put(STORE.CELLS, message);
                }
                break;
            case MessageType.POST:
                if (!this.cache.posts[message.id] ||
                    this.cache.posts[message.id]?.timestamp !== message.timestamp) {
                    this.cache.posts[message.id] = message;
                    this.put(STORE.POSTS, message);
                }
                break;
            case MessageType.COMMENT:
                if (!this.cache.comments[message.id] ||
                    this.cache.comments[message.id]?.timestamp !== message.timestamp) {
                    this.cache.comments[message.id] = message;
                    this.put(STORE.COMMENTS, message);
                }
                break;
            case MessageType.VOTE: {
                const voteKey = `${message.targetId}:${message.author}`;
                if (!this.cache.votes[voteKey] ||
                    this.cache.votes[voteKey]?.timestamp !== message.timestamp) {
                    this.cache.votes[voteKey] = message;
                    this.put(STORE.VOTES, { key: voteKey, ...message });
                }
                break;
            }
            case MessageType.MODERATE: {
                const modMsg = message;
                if (!this.cache.moderations[modMsg.targetId] ||
                    this.cache.moderations[modMsg.targetId]?.timestamp !==
                        modMsg.timestamp) {
                    this.cache.moderations[modMsg.targetId] = modMsg;
                    this.put(STORE.MODERATIONS, modMsg);
                }
                break;
            }
            case MessageType.USER_PROFILE_UPDATE: {
                const profileMsg = message;
                const { author, callSign, displayPreference, timestamp } = profileMsg;
                const existing = this.cache.userIdentities[author];
                if (!existing || timestamp > existing.lastUpdated) {
                    const nextRecord = {
                        ensName: existing?.ensName,
                        ordinalDetails: existing?.ordinalDetails,
                        callSign: callSign !== undefined ? callSign : existing?.callSign,
                        displayPreference,
                        lastUpdated: timestamp,
                        verificationStatus: existing?.verificationStatus ??
                            EVerificationStatus.WALLET_UNCONNECTED,
                    };
                    this.cache.userIdentities[author] = nextRecord;
                    // Persist with address keyPath
                    this.put(STORE.USER_IDENTITIES, {
                        address: author,
                        ...nextRecord,
                    });
                }
                break;
            }
            default:
                console.warn('LocalDatabase: Received message with unknown type');
                break;
        }
        // Update last sync time using local receipt time for accurate UI
        this.updateLastSync(Date.now());
    }
    /**
     * Hydrate cache from IndexedDB on warm start
     */
    async hydrateFromIndexedDB() {
        if (!this.db)
            return;
        const [cells, posts, comments, votes, moderations, identities, bookmarks] = await Promise.all([
            this.getAllFromStore(STORE.CELLS),
            this.getAllFromStore(STORE.POSTS),
            this.getAllFromStore(STORE.COMMENTS),
            this.getAllFromStore(STORE.VOTES),
            this.getAllFromStore(STORE.MODERATIONS),
            this.getAllFromStore(STORE.USER_IDENTITIES),
            this.getAllFromStore(STORE.BOOKMARKS),
        ]);
        this.cache.cells = Object.fromEntries(cells.map((c) => [c.id, c]));
        this.cache.posts = Object.fromEntries(posts.map((p) => [p.id, p]));
        this.cache.comments = Object.fromEntries(comments.map((cm) => [cm.id, cm]));
        this.cache.votes = Object.fromEntries(votes.map((v) => {
            const { key, ...rest } = v;
            const vote = rest;
            return [key, vote];
        }));
        this.cache.moderations = Object.fromEntries(moderations.map((m) => [m.targetId, m]));
        this.cache.userIdentities = Object.fromEntries(identities.map((u) => {
            const { address, ...record } = u;
            return [address, record];
        }));
        this.cache.bookmarks = Object.fromEntries(bookmarks.map((b) => [b.id, b]));
    }
    async hydratePendingFromMeta() {
        if (!this.db)
            return;
        const meta = await this.getAllFromStore(STORE.META);
        meta
            .filter((entry) => typeof entry.key === 'string' && entry.key.startsWith('pending:'))
            .forEach((entry) => {
            const id = entry.key.substring('pending:'.length);
            this.pendingIds.add(id);
        });
    }
    getAllFromStore(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db)
                return resolve([]);
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
    put(storeName, value) {
        if (!this.db)
            return;
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(value);
    }
    getSyncState() {
        return { lastSync: this._lastSync, isSyncing: this._isSyncing };
    }
    setSyncing(isSyncing) {
        this._isSyncing = isSyncing;
    }
    updateLastSync(timestamp) {
        this._lastSync = Math.max(this._lastSync ?? 0, timestamp);
        // persist in META store (best-effort)
        if (!this.db)
            return;
        const tx = this.db.transaction(STORE.META, 'readwrite');
        const store = tx.objectStore(STORE.META);
        store.put({ key: 'lastSync', value: this._lastSync });
    }
    markPending(id) {
        this.pendingIds.add(id);
        if (!this.db)
            return;
        const tx = this.db.transaction(STORE.META, 'readwrite');
        const store = tx.objectStore(STORE.META);
        store.put({ key: `pending:${id}`, value: true });
        this.pendingListeners.forEach((l) => l());
    }
    clearPending(id) {
        this.pendingIds.delete(id);
        if (!this.db)
            return;
        const tx = this.db.transaction(STORE.META, 'readwrite');
        const store = tx.objectStore(STORE.META);
        store.delete(`pending:${id}`);
        this.pendingListeners.forEach((l) => l());
    }
    isPending(id) {
        return this.pendingIds.has(id);
    }
    onPendingChange(listener) {
        this.pendingListeners.add(listener);
        return () => this.pendingListeners.delete(listener);
    }
    // ===== User Authentication Storage =====
    /**
     * Store user authentication data
     */
    async storeUser(user) {
        const userData = {
            key: 'current',
            value: user,
            timestamp: Date.now(),
        };
        this.put(STORE.USER_AUTH, userData);
    }
    /**
     * Load user authentication data
     */
    async loadUser() {
        if (!this.db)
            return null;
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE.USER_AUTH, 'readonly');
            const store = tx.objectStore(STORE.USER_AUTH);
            const request = store.get('current');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                if (!result) {
                    resolve(null);
                    return;
                }
                const user = result.value;
                const lastChecked = user.lastChecked || 0;
                const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
                if (Date.now() - lastChecked < expiryTime) {
                    resolve(user);
                }
                else {
                    // User data expired, clear it
                    this.clearUser();
                    resolve(null);
                }
            };
        });
    }
    /**
     * Clear user authentication data
     */
    async clearUser() {
        if (!this.db)
            return;
        const tx = this.db.transaction(STORE.USER_AUTH, 'readwrite');
        const store = tx.objectStore(STORE.USER_AUTH);
        store.delete('current');
    }
    // ===== Delegation Storage =====
    /**
     * Store delegation information
     */
    async storeDelegation(delegation) {
        const delegationData = {
            key: 'current',
            value: delegation,
            timestamp: Date.now(),
        };
        this.put(STORE.DELEGATION, delegationData);
    }
    /**
     * Load delegation information
     */
    async loadDelegation() {
        if (!this.db)
            return null;
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE.DELEGATION, 'readonly');
            const store = tx.objectStore(STORE.DELEGATION);
            const request = store.get('current');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result?.value || null);
            };
        });
    }
    /**
     * Clear delegation information
     */
    async clearDelegation() {
        if (!this.db)
            return;
        const tx = this.db.transaction(STORE.DELEGATION, 'readwrite');
        const store = tx.objectStore(STORE.DELEGATION);
        store.delete('current');
    }
    // ===== UI State Storage =====
    /**
     * Store UI state value
     */
    async storeUIState(key, value) {
        const stateData = {
            key,
            value,
            timestamp: Date.now(),
        };
        this.put(STORE.UI_STATE, stateData);
    }
    /**
     * Load UI state value
     */
    async loadUIState(key) {
        if (!this.db)
            return null;
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE.UI_STATE, 'readonly');
            const store = tx.objectStore(STORE.UI_STATE);
            const request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result?.value || null);
            };
        });
    }
    /**
     * Clear UI state value
     */
    async clearUIState(key) {
        if (!this.db)
            return;
        const tx = this.db.transaction(STORE.UI_STATE, 'readwrite');
        const store = tx.objectStore(STORE.UI_STATE);
        store.delete(key);
    }
    // ===== Bookmark Storage =====
    /**
     * Add a bookmark
     */
    async addBookmark(bookmark) {
        this.cache.bookmarks[bookmark.id] = bookmark;
        this.put(STORE.BOOKMARKS, bookmark);
    }
    /**
     * Remove a bookmark
     */
    async removeBookmark(bookmarkId) {
        delete this.cache.bookmarks[bookmarkId];
        if (!this.db)
            return;
        const tx = this.db.transaction(STORE.BOOKMARKS, 'readwrite');
        const store = tx.objectStore(STORE.BOOKMARKS);
        store.delete(bookmarkId);
    }
    /**
     * Get all bookmarks for a user
     */
    async getUserBookmarks(userId) {
        if (!this.db)
            return [];
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE.BOOKMARKS, 'readonly');
            const store = tx.objectStore(STORE.BOOKMARKS);
            const index = store.index('by_userId');
            const request = index.getAll(userId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
    /**
     * Get bookmarks by type for a user
     */
    async getUserBookmarksByType(userId, type) {
        if (!this.db)
            return [];
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE.BOOKMARKS, 'readonly');
            const store = tx.objectStore(STORE.BOOKMARKS);
            const index = store.index('by_userId');
            const request = index.getAll(userId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const bookmarks = request.result;
                const filtered = bookmarks.filter((b) => b.type === type);
                resolve(filtered);
            };
        });
    }
    /**
     * Check if an item is bookmarked by a user
     */
    isBookmarked(userId, type, targetId) {
        const bookmarkId = `${type}:${targetId}`;
        const bookmark = this.cache.bookmarks[bookmarkId];
        return bookmark?.userId === userId;
    }
    /**
     * Get bookmark by ID
     */
    getBookmark(bookmarkId) {
        return this.cache.bookmarks[bookmarkId];
    }
    /**
     * Get all bookmarks from cache
     */
    getAllBookmarks() {
        return Object.values(this.cache.bookmarks);
    }
}
export const localDatabase = new LocalDatabase();
//# sourceMappingURL=LocalDatabase.js.map