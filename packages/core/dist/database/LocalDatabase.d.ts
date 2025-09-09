import { CellCache, PostCache, CommentCache, VoteCache, UserIdentityCache, ModerateMessage } from '../types/waku';
import { User } from '../types/identity';
import { DelegationInfo } from '../delegation/types';
import { Bookmark, BookmarkCache } from '../types/forum';
export interface LocalDatabaseCache {
    cells: CellCache;
    posts: PostCache;
    comments: CommentCache;
    votes: VoteCache;
    moderations: {
        [targetId: string]: ModerateMessage;
    };
    userIdentities: UserIdentityCache;
    bookmarks: BookmarkCache;
}
/**
 * Minimal in-memory LocalDatabase
 * Mirrors CacheService message handling to enable incremental migration.
 */
export declare class LocalDatabase {
    private processedMessageIds;
    private validator;
    private db;
    private _isSyncing;
    private _lastSync;
    private pendingIds;
    private pendingListeners;
    readonly cache: LocalDatabaseCache;
    constructor();
    /**
     * Open IndexedDB and hydrate in-memory cache.
     */
    open(): Promise<void>;
    /**
     * Apply a message into the LocalDatabase.
     * Returns true if the message was newly processed and stored.
     */
    applyMessage(message: unknown): Promise<boolean>;
    /**
     * Temporary alias to ease migration from CacheService.updateCache
     */
    updateCache(message: unknown): Promise<boolean>;
    clear(): void;
    private storeMessage;
    /**
     * Hydrate cache from IndexedDB on warm start
     */
    private hydrateFromIndexedDB;
    private hydratePendingFromMeta;
    private getAllFromStore;
    private put;
    getSyncState(): {
        lastSync: number | null;
        isSyncing: boolean;
    };
    setSyncing(isSyncing: boolean): void;
    updateLastSync(timestamp: number): void;
    markPending(id: string): void;
    clearPending(id: string): void;
    isPending(id: string): boolean;
    onPendingChange(listener: () => void): () => void;
    /**
     * Store user authentication data
     */
    storeUser(user: User): Promise<void>;
    /**
     * Load user authentication data
     */
    loadUser(): Promise<User | null>;
    /**
     * Clear user authentication data
     */
    clearUser(): Promise<void>;
    /**
     * Store delegation information
     */
    storeDelegation(delegation: DelegationInfo): Promise<void>;
    /**
     * Load delegation information
     */
    loadDelegation(): Promise<DelegationInfo | null>;
    /**
     * Clear delegation information
     */
    clearDelegation(): Promise<void>;
    /**
     * Store UI state value
     */
    storeUIState(key: string, value: unknown): Promise<void>;
    /**
     * Load UI state value
     */
    loadUIState(key: string): Promise<unknown>;
    /**
     * Clear UI state value
     */
    clearUIState(key: string): Promise<void>;
    /**
     * Add a bookmark
     */
    addBookmark(bookmark: Bookmark): Promise<void>;
    /**
     * Remove a bookmark
     */
    removeBookmark(bookmarkId: string): Promise<void>;
    /**
     * Get all bookmarks for a user
     */
    getUserBookmarks(userId: string): Promise<Bookmark[]>;
    /**
     * Get bookmarks by type for a user
     */
    getUserBookmarksByType(userId: string, type: 'post' | 'comment'): Promise<Bookmark[]>;
    /**
     * Check if an item is bookmarked by a user
     */
    isBookmarked(userId: string, type: 'post' | 'comment', targetId: string): boolean;
    /**
     * Get bookmark by ID
     */
    getBookmark(bookmarkId: string): Bookmark | undefined;
    /**
     * Get all bookmarks from cache
     */
    getAllBookmarks(): Bookmark[];
}
export declare const localDatabase: LocalDatabase;
//# sourceMappingURL=LocalDatabase.d.ts.map