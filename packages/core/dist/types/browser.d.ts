export interface Cell {
    id: string;
    name: string;
    description?: string;
    createdAt: number;
    author: string;
}
export interface Post {
    id: string;
    cellId: string;
    title: string;
    content: string;
    author: string;
    createdAt: number;
    updatedAt?: number;
}
export interface Comment {
    id: string;
    postId: string;
    content: string;
    author: string;
    createdAt: number;
    updatedAt?: number;
}
export interface User {
    address: string;
    ensName?: string;
    callSign?: string;
    displayPreference: 'ens' | 'callsign' | 'address';
    verificationStatus: 'unverified' | 'verified' | 'pending';
}
export interface Bookmark {
    id: string;
    userId: string;
    type: 'post' | 'comment' | 'cell';
    targetId: string;
    createdAt: number;
}
export declare const STORE_NAMES: {
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
export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];
//# sourceMappingURL=browser.d.ts.map