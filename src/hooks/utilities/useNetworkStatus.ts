import { useMemo } from 'react';
import { useForum } from '@/contexts/useForum';
import { useAuth } from '@/hooks/core/useAuth';
import { useAuth as useAuthContext } from '@/contexts/useAuth';

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

/**
 * Hook for monitoring network status and connection health
 */
export function useNetworkStatus(): NetworkStatusData {
  const { isNetworkConnected, isInitialLoading, isRefreshing, error } =
    useForum();

  const { isAuthenticated, currentUser } = useAuth();
  const { getDelegationStatus } = useAuthContext();
  const delegationInfo = getDelegationStatus();

  // Network health assessment
  const health = useMemo((): NetworkHealth => {
    const issues: string[] = [];

    if (!isNetworkConnected) {
      issues.push('Waku network disconnected');
    }

    if (error) {
      issues.push(`Forum error: ${error}`);
    }

    if (isAuthenticated && !delegationInfo.isValid) {
      issues.push('Key delegation expired');
    }

    const isHealthy = issues.length === 0;
    const lastSync = Date.now(); // This would come from actual sync tracking
    const syncAge = lastSync ? formatTimeAgo(lastSync) : null;

    return {
      isConnected: isNetworkConnected,
      isHealthy,
      lastSync,
      syncAge,
      issues,
    };
  }, [isNetworkConnected, error, isAuthenticated, delegationInfo.isValid]);

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
    return {
      waku: {
        connected: isNetworkConnected,
        peers: isNetworkConnected ? 3 : 0, // Mock peer count
        status: isNetworkConnected ? 'connected' : 'disconnected',
      },
      wallet: {
        connected: isAuthenticated,
        network: currentUser?.walletType === 'bitcoin' ? 'Bitcoin' : 'Ethereum',
        status: isAuthenticated ? 'connected' : 'disconnected',
      },
      delegation: {
        active: delegationInfo.isValid,
        expires: delegationInfo.timeRemaining || null,
        status: delegationInfo.isValid ? 'active' : 'expired',
      },
    };
  }, [isNetworkConnected, isAuthenticated, currentUser, delegationInfo]);

  // Status assessment
  const canRefresh = !isRefreshing && !isInitialLoading;
  const canSync = isNetworkConnected && !isRefreshing;
  const needsAttention = !health.isHealthy || !delegationInfo.isValid;

  // Helper methods
  const getStatusMessage = useMemo(() => {
    return (): string => {
      if (isInitialLoading) return 'Loading forum data...';
      if (isRefreshing) return 'Refreshing data...';
      if (!isNetworkConnected) return 'Network disconnected';
      if (error) return `Error: ${error}`;
      if (health.issues.length > 0) return health.issues[0] || 'Unknown issue';
      return 'All systems operational';
    };
  }, [
    isInitialLoading,
    isRefreshing,
    isNetworkConnected,
    error,
    health.issues,
  ]);

  const getHealthColor = useMemo(() => {
    return (): 'green' | 'yellow' | 'red' => {
      if (!isNetworkConnected || error) return 'red';
      if (health.issues.length > 0 || !delegationInfo.isValid) return 'yellow';
      return 'green';
    };
  }, [isNetworkConnected, error, health.issues.length, delegationInfo.isValid]);

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

      if (!delegationInfo.isValid) {
        actions.push('Renew key delegation');
      }

      if (
        delegationInfo.isValid &&
        delegationInfo.timeRemaining &&
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
