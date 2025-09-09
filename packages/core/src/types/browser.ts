// Browser-compatible types for the core package

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

// IndexedDB store names
export const STORE_NAMES = {
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

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];
