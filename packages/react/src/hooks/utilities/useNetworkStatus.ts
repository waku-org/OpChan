import { useMemo, useState, useEffect } from 'react';
import { useForum } from '../../contexts/ForumContext';
import { useAuth } from '../../contexts/AuthContext';
import { useClient } from '../../contexts/ClientContext';
import { DelegationFullStatus } from '@opchan/core';

export interface NetworkHealth {
  isConnected: boolean;
  isHealthy: boolean;
  lastSync: number | null;
  syncAge: string | null;
  issues: string[];
}

export interface SyncStatus {
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isSyncing: boolean;
  lastRefresh: number | null;
  nextRefresh: number | null;
  autoRefreshEnabled: boolean;
}

export interface ConnectionStatus {
  waku: {
    connected: boolean;
    peers: number;
    status: 'connected' | 'connecting' | 'disconnected' | 'error';
  };
  wallet: {
    connected: boolean;
    network: string | null;
    status: 'connected' | 'connecting' | 'disconnected' | 'error';
  };
  delegation: {
    active: boolean;
    expires: number | null;
    status: 'active' | 'expired' | 'none';
  };
}

export interface NetworkStatusData {
  // Overall status
  health: NetworkHealth;
  sync: SyncStatus;
  connections: ConnectionStatus;

  // Actions
  canRefresh: boolean;
  canSync: boolean;
  needsAttention: boolean;

  // Helper methods
  getStatusMessage: () => string;
  getHealthColor: () => 'green' | 'yellow' | 'red';
  getRecommendedActions: () => string[];
}

export function useNetworkStatus(): NetworkStatusData {
  const { isNetworkConnected, isInitialLoading, isRefreshing, error } =
    useForum();
  const client = useClient();

  const { isAuthenticated, currentUser, getDelegationStatus } = useAuth();
  const [delegationInfo, setDelegationInfo] =
    useState<DelegationFullStatus | null>(null);

  // Track Waku ready state directly from the client to react to changes
  const [wakuReady, setWakuReady] = useState<boolean>(
    Boolean((client)?.messageManager?.isReady)
  );

  useEffect(() => {
    try {
      // Prime from current state so UI updates immediately without navigation
      try {
        const nowReady = Boolean(client?.messageManager?.isReady);
        setWakuReady(nowReady);
        console.debug('[useNetworkStatus] primed wakuReady from client', { nowReady });
      } catch {}

      const off = client?.messageManager?.onHealthChange?.(
        (ready: boolean) => {
          console.debug('[useNetworkStatus] onHealthChange -> wakuReady', { ready });
          setWakuReady(Boolean(ready));
        }
      );
      return () => {
        try { off && off(); } catch {}
      };
    } catch {}
  }, [client]);

  // Load delegation status
  useEffect(() => {
    getDelegationStatus().then(setDelegationInfo).catch(console.error);
  }, [getDelegationStatus]);

  // Network health assessment
  const health = useMemo((): NetworkHealth => {
    const issues: string[] = [];

    const fallbackConnected = Boolean(wakuReady);
    const effectiveConnected = isNetworkConnected || wakuReady;

    if (!effectiveConnected) {
      issues.push('Waku network disconnected');
    }

    if (error) {
      issues.push(`Forum error: ${error}`);
    }

    if (isAuthenticated && !delegationInfo?.isValid) {
      issues.push('Key delegation expired');
    }

    const isHealthy = issues.length === 0;
    const lastSync = Date.now(); // This would come from actual sync tracking
    const syncAge = lastSync ? formatTimeAgo(lastSync) : null;

    // Debug: surface the raw inputs to health computation
    console.debug('[useNetworkStatus] health', {
      forumIsNetworkConnected: isNetworkConnected,
      fallbackConnected,
      effectiveConnected,
      isInitialLoading,
      isRefreshing,
      error,
      delegationValid: delegationInfo?.isValid,
      issues,
    });

    return {
      isConnected: effectiveConnected,
      isHealthy,
      lastSync,
      syncAge,
      issues,
    };
  }, [client, isNetworkConnected, wakuReady, error, isAuthenticated, delegationInfo?.isValid]);

  // Sync status
  const sync = useMemo((): SyncStatus => {
    const lastRefresh = Date.now() - 30000; // Mock: 30 seconds ago
    const nextRefresh = lastRefresh + 60000; // Mock: every minute

    return {
      isInitialLoading,
      isRefreshing,
      isSyncing: isInitialLoading || isRefreshing,
      lastRefresh,
      nextRefresh,
      autoRefreshEnabled: true, // This would be configurable
    };
  }, [isInitialLoading, isRefreshing]);

  // Connection status
  const connections = useMemo((): ConnectionStatus => {
    const effectiveConnected = health.isConnected;
    return {
      waku: {
        connected: effectiveConnected,
        peers: effectiveConnected ? 3 : 0, // Mock peer count
        status: effectiveConnected ? 'connected' : 'disconnected',
      },
      wallet: {
        connected: isAuthenticated,
        network: currentUser?.walletType === 'bitcoin' ? 'Bitcoin' : 'Ethereum',
        status: isAuthenticated ? 'connected' : 'disconnected',
      },
      delegation: {
        active: delegationInfo?.isValid || false,
        expires: delegationInfo?.timeRemaining || null,
        status: delegationInfo?.isValid ? 'active' : 'expired',
      },
    };
  }, [health.isConnected, isAuthenticated, currentUser, delegationInfo]);

  // Status assessment
  const canRefresh = !isRefreshing && !isInitialLoading;
  const canSync = health.isConnected && !isRefreshing;
  const needsAttention = !health.isHealthy || !delegationInfo?.isValid;

  // Helper methods
  const getStatusMessage = useMemo(() => {
    return (): string => {
      console.debug('[useNetworkStatus] statusMessage inputs', {
        isInitialLoading,
        isRefreshing,
        isNetworkConnected,
        error,
        issues: health.issues,
      });
      if (isInitialLoading) return 'Loading forum data...';
      if (isRefreshing) return 'Refreshing data...';
      const fallbackConnected = Boolean(wakuReady);
      const effectiveConnected = isNetworkConnected || fallbackConnected;
      if (!effectiveConnected) return 'Network disconnected';
      if (error) return `Error: ${error}`;
      if (health.issues.length > 0) return health.issues[0] || 'Unknown issue';
      return 'All systems operational';
    };
  }, [
    isInitialLoading,
    isRefreshing,
    isNetworkConnected,
    client,
    wakuReady,
    error,
    health.issues,
  ]);

  const getHealthColor = useMemo(() => {
    return (): 'green' | 'yellow' | 'red' => {
      console.debug('[useNetworkStatus] healthColor inputs', {
        isNetworkConnected,
        error,
        issues: health.issues,
        delegationValid: delegationInfo?.isValid,
      });
      const fallbackConnected = Boolean(wakuReady);
      const effectiveConnected = isNetworkConnected || fallbackConnected;
      if (!effectiveConnected || error) return 'red';
      if (health.issues.length > 0 || !delegationInfo?.isValid) return 'yellow';
      return 'green';
    };
  }, [
    isNetworkConnected,
    client,
    wakuReady,
    error,
    health.issues.length,
    delegationInfo?.isValid,
  ]);

  const getRecommendedActions = useMemo(() => {
    return (): string[] => {
      const actions: string[] = [];

      if (!isNetworkConnected) {
        actions.push('Check your internet connection');
        actions.push('Try refreshing the page');
      }

      if (!isAuthenticated) {
        actions.push('Connect your wallet');
      }

      if (!delegationInfo?.isValid) {
        actions.push('Renew key delegation');
      }

      if (
        delegationInfo?.isValid &&
        delegationInfo?.timeRemaining &&
        delegationInfo.timeRemaining < 3600
      ) {
        actions.push('Consider renewing key delegation soon');
      }

      if (error) {
        actions.push('Try refreshing forum data');
      }

      if (actions.length === 0) {
        actions.push('All systems are working normally');
      }

      return actions;
    };
  }, [isNetworkConnected, isAuthenticated, delegationInfo, error]);

  return {
    health,
    sync,
    connections,
    canRefresh,
    canSync,
    needsAttention,
    getStatusMessage,
    getHealthColor,
    getRecommendedActions,
  };
}

// Helper function to format time ago
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}
