export declare const DB_NAME = "opchan-local";
export declare const DB_VERSION = 3;
export declare const STORE: {
    readonly CELLS: "cells";
    readonly POSTS: "posts";
    readonly COMMENTS: "comments";
    readonly VOTES: "votes";
    readonly MODERATIONS: "moderations";
    readonly USER_IDENTITIES: "userIdentities";
    readonly USER_AUTH: "userAuth";
    readonly DELEGATION: "delegation";
    readonly UI_STATE: "uiState";
    readonly META: "meta";
    readonly BOOKMARKS: "bookmarks";
};
export type StoreName = (typeof STORE)[keyof typeof STORE];
/**
 * Open (and create/upgrade) the IndexedDB database used by LocalDatabase.
 * Minimal schema focused on key-based access patterns we already use in memory.
 */
export declare function openLocalDB(): Promise<IDBDatabase>;
//# sourceMappingURL=schema.d.ts.map