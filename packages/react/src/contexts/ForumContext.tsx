import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { localDatabase, messageManager, ForumActions, OpChanClient, getDataFromCache } from '@opchan/core';
import { transformCell, transformPost, transformComment } from '@opchan/core';
import { useAuth } from './AuthContext';
import { Cell, Post, Comment, UserVerificationStatus } from '@opchan/core';

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

export const ForumProvider: React.FC<{ 
  client: OpChanClient; 
  children: React.ReactNode 
}> = ({ client, children }) => {
  const { currentUser } = useAuth();
  const [cells, setCells] = useState<Cell[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [userVerificationStatus, setUserVerificationStatus] = useState<UserVerificationStatus>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNetworkConnected, setIsNetworkConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = useMemo(() => new ForumActions(), []);

  const updateFromCache = useCallback(async () => {
    try {
      const data = await getDataFromCache(undefined, userVerificationStatus);
      setCells(data.cells);
      setPosts(data.posts);
      setComments(data.comments);
    } catch (e) {
      console.error('Failed to read cache', e);
    }
  }, [userVerificationStatus]);

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

  useEffect(() => {
    let unsubHealth: (() => void) | null = null;
    let unsubMsg: (() => void) | null = null;

    const init = async () => {
      try {
        // Ensure LocalDatabase is opened before hydrating
        if (!localDatabase.getSyncState) {
          console.log('📥 Opening LocalDatabase for ForumProvider...');
          await localDatabase.open();
        }
        
        await updateFromCache();
        setIsInitialLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to initialize');
        setIsInitialLoading(false);
      }

      // Check initial health status
      const initialHealth = messageManager.currentHealth;
      const initialReady = messageManager.isReady;
      console.log('🔌 ForumContext initial state:', { initialReady, initialHealth });
      setIsNetworkConnected(!!initialReady);

      unsubHealth = messageManager.onHealthChange((ready: boolean, health: any) => {
        console.log('🔌 ForumContext health change:', { ready, health });
        setIsNetworkConnected(!!ready);
      });

      unsubMsg = messageManager.onMessageReceived(async () => {
        await updateFromCache();
      });
    };

    init();
    return () => {
      try { unsubHealth && unsubHealth(); } catch {}
      try { unsubMsg && unsubMsg(); } catch {}
    };
  }, [updateFromCache]);

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


