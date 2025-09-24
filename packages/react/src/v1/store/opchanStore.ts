import React, { useSyncExternalStore } from 'react';
import type {
  CellMessage,
  PostMessage,
  CommentMessage,
  Bookmark,
  User,
  EVerificationStatus,
  DelegationFullStatus,
} from '@opchan/core';

type Listener = () => void;

export interface SessionSlice {
  currentUser: User | null;
  verificationStatus: EVerificationStatus;
  delegation: DelegationFullStatus | null;
}

export interface ContentSlice {
  cells: CellMessage[];
  posts: PostMessage[];
  comments: CommentMessage[];
  bookmarks: Bookmark[];
  lastSync: number | null;
  pendingIds: Set<string>;
  pendingVotes: Set<string>;
}

export interface IdentitySlice {
  // minimal identity cache; full logic lives in UserIdentityService
  displayNameByAddress: Record<string, string>;
}

export interface NetworkSlice {
  isConnected: boolean;
  statusMessage: string;
  issues: string[];
}

export interface OpchanState {
  session: SessionSlice;
  content: ContentSlice;
  identity: IdentitySlice;
  network: NetworkSlice;
}

const defaultState: OpchanState = {
  session: {
    currentUser: null,
    verificationStatus: 'wallet-unconnected' as EVerificationStatus,
    delegation: null,
  },
  content: {
    cells: [],
    posts: [],
    comments: [],
    bookmarks: [],
    lastSync: null,
    pendingIds: new Set<string>(),
    pendingVotes: new Set<string>(),
  },
  identity: {
    displayNameByAddress: {},
  },
  network: {
    isConnected: false,
    statusMessage: 'connecting…',
    issues: [],
  },
};

class OpchanStoreImpl {
  private state: OpchanState = defaultState;
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): OpchanState {
    return this.state;
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  setState(mutator: (prev: OpchanState) => OpchanState): void {
    const next = mutator(this.state);
    if (next !== this.state) {
      this.state = next;
      this.notify();
    }
  }
}

export const opchanStore = new OpchanStoreImpl();

export function useOpchanStore<T>(selector: (s: OpchanState) => T, isEqual?: (a: T, b: T) => boolean): T {
  // Subscribe to the raw store snapshot to keep getSnapshot referentially stable
  const state = useSyncExternalStore(
    (cb) => opchanStore.subscribe(cb),
    () => opchanStore.getSnapshot(),
    () => opchanStore.getSnapshot(),
  );

  const compare = isEqual ?? ((a: T, b: T) => a === b);
  const selected = React.useMemo(() => selector(state), [state, selector]);

  // Cache the last selected value using the provided equality to avoid churn
  const cachedRef = React.useRef<T>(selected);
  if (!compare(cachedRef.current, selected)) {
    cachedRef.current = selected;
  }
  return cachedRef.current;
}

export function getOpchanState(): OpchanState {
  return opchanStore.getSnapshot();
}

export function setOpchanState(mutator: (prev: OpchanState) => OpchanState): void {
  opchanStore.setState(mutator);
}


