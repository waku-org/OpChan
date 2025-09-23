import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { localDatabase, getDataFromCache } from '@opchan/core';
import { useAuth } from './AuthContext';
import { Cell, Post, Comment, UserVerificationStatus, EVerificationStatus } from '@opchan/core';
import { useClient } from './ClientContext';
import type { ForumActions } from '@opchan/core';

export interface ForumContextValue {
  cells: Cell[];
  posts: Post[];
  comments: Comment[];
  userVerificationStatus: UserVerificationStatus;

  isInitialLoading: boolean;
  isRefreshing: boolean;
  isNetworkConnected: boolean;
  lastSync: number | null;
  error: string | null;

  refreshData: () => Promise<void>;

  // Actions
  actions: ForumActions;
}

const ForumContext = createContext<ForumContextValue | null>(null);

export const ForumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const client = useClient();
  const { currentUser } = useAuth();
  const [cells, setCells] = useState<Cell[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [userVerificationStatus, setUserVerificationStatus] = useState<UserVerificationStatus>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNetworkConnected, setIsNetworkConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = useMemo(() => client.forumActions, [client]);

  const updateFromCache = useCallback(async () => {
    try {
      // Rebuild verification status map from centralized user identity cache
      const nextVerificationStatus: UserVerificationStatus = {};
      try {
        const identities = localDatabase.cache.userIdentities || {};
        Object.entries(identities).forEach(([address, record]) => {
          const hasENS = Boolean((record as { ensName?: unknown }).ensName);
          const hasOrdinal = Boolean((record as { ordinalDetails?: unknown }).ordinalDetails);
          const verificationStatus = (record as { verificationStatus?: EVerificationStatus }).verificationStatus;
          const isVerified =
            hasENS ||
            hasOrdinal ||
            verificationStatus === EVerificationStatus.WALLET_CONNECTED ||
            verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED;
          nextVerificationStatus[address] = {
            isVerified,
            hasENS,
            hasOrdinal,
            ensName: (record as { ensName?: string }).ensName,
            verificationStatus,
          };
        });
      } catch {}

      setUserVerificationStatus(nextVerificationStatus);

      const data = await getDataFromCache(undefined, nextVerificationStatus);
      setCells(data.cells);
      setPosts(data.posts);
      setComments(data.comments);
    } catch (e) {
      console.error('Failed to read cache', e);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await updateFromCache();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  }, [updateFromCache]);

  // 1) Initial cache hydrate only – decoupled from network subscriptions
  useEffect(() => {
    const init = async () => {
      try {
        await updateFromCache();
        setIsInitialLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to initialize');
        setIsInitialLoading(false);
      }
    };
    init();
  }, [updateFromCache]);

  // 2) Network wiring – subscribe once to the client's message manager
  useEffect(() => {
    let unsubHealth: (() => void) | null = null;
    let unsubMsg: (() => void) | null = null;

    // Check initial health status from the provided client to ensure a single core instance
    const initialHealth = client.messageManager.currentHealth;
    const initialReady = client.messageManager.isReady;
    console.log('🔌 ForumContext initial state:', { initialReady, initialHealth });
    setIsNetworkConnected(!!initialReady);

    unsubHealth = client.messageManager.onHealthChange(async (ready: boolean, health: any) => {
      console.log('🔌 ForumContext health change:', { ready, health });
      setIsNetworkConnected(!!ready);
      if (ready) {
        try { await updateFromCache(); } catch {}
      }
    });

    unsubMsg = client.messageManager.onMessageReceived(async () => {
      await updateFromCache();
    });

    return () => {
      try { unsubHealth && unsubHealth(); } catch {}
      try { unsubMsg && unsubMsg(); } catch {}
    };
  }, [client, updateFromCache]);

  // 2b) Pending state wiring – rehydrate when local pending queue changes
  useEffect(() => {
    const off = localDatabase.onPendingChange(async () => {
      try { await updateFromCache(); } catch {}
    });
    return () => { try { off && off(); } catch {} };
  }, [updateFromCache]);

  // 3) Visibility change: re-check connection immediately when tab becomes active
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const ready = client.messageManager.isReady;
        setIsNetworkConnected(!!ready);
        console.debug('🔌 ForumContext visibility check, ready:', ready);
        if (ready) {
          try { await updateFromCache(); } catch {}
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [client]);

  const ctx: ForumContextValue = useMemo(() => ({
    cells,
    posts,
    comments,
    userVerificationStatus,
    isInitialLoading,
    isRefreshing,
    isNetworkConnected,
    lastSync: localDatabase.getSyncState().lastSync,
    error,
    refreshData,
    actions,
  }), [cells, posts, comments, userVerificationStatus, isInitialLoading, isRefreshing, isNetworkConnected, error, refreshData, actions]);

  return <ForumContext.Provider value={ctx}>{children}</ForumContext.Provider>;
};

export function useForum() {
  const ctx = useContext(ForumContext);
  if (!ctx) throw new Error('useForum must be used within OpChanProvider');
  return ctx;
}

export { ForumContext };


