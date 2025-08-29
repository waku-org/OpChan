import messageManager from '@/lib/waku';
import { HealthStatus } from '@waku/sdk';

export type ToastFunction = (props: {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}) => void;

export const refreshData = async (
  isNetworkConnected: boolean,
  toast: ToastFunction,
  updateStateFromCache: () => void,
  setError: (error: string | null) => void,
): Promise<void> => {
  try {
    toast({ title: 'Refreshing data', description: 'Fetching latest messages from the network...' });
    if (!isNetworkConnected) {
      try {
        await messageManager.waitForRemotePeer(10000);
      } catch (err) {
        console.warn('Could not connect to peer during refresh:', err);
      }
    }
    await messageManager.queryStore();
    updateStateFromCache();
    toast({ title: 'Data refreshed', description: 'Your view has been updated with the latest messages.' });
  } catch (err) {
    console.error('Error refreshing data:', err);
    toast({ title: 'Refresh failed', description: 'Could not fetch the latest messages. Please try again.', variant: 'destructive' });
    setError('Failed to refresh data. Please try again later.');
  }
};

export const initializeNetwork = async (
  toast: ToastFunction,
  updateStateFromCache: () => void,
  setError: (error: string | null) => void,
): Promise<void> => {
  try {
    toast({ title: 'Loading data', description: 'Connecting to the Waku network...' });
    try {
      await messageManager.waitForRemotePeer(15000);
    } catch (err) {
      toast({ title: 'Connection timeout', description: 'Could not connect to any peers. Some features may be unavailable.', variant: 'destructive' });
      console.warn('Timeout connecting to peer:', err);
    }
    // await messageManager.queryStore();
    updateStateFromCache();
  } catch (err) {
    console.error('Error loading forum data:', err);
    setError('Failed to load forum data. Please try again later.');
    toast({ title: 'Connection error', description: 'Failed to connect to Waku network. Please try refreshing.', variant: 'destructive' });
  }
};

export const setupPeriodicQueries = (
  isNetworkConnected: boolean,
  updateStateFromCache: () => void,
): { cleanup: () => void } => {
  const uiRefreshInterval = setInterval(updateStateFromCache, 5000);
  const networkQueryInterval = setInterval(async () => {
    if (isNetworkConnected) {
      try {
        await messageManager.queryStore();
      } catch (err) {
        console.warn('Error during scheduled network query:', err);
      }
    }
  }, 3000);
  return {
    cleanup: () => {
      clearInterval(uiRefreshInterval);
      clearInterval(networkQueryInterval);
    },
  };
};

export const monitorNetworkHealth = (
  setIsNetworkConnected: (isConnected: boolean) => void,
  toast: ToastFunction,
): { unsubscribe: () => void } => {
  setIsNetworkConnected(messageManager.isReady);
  const unsubscribe = messageManager.onHealthChange((isReady, health) => {
    setIsNetworkConnected(isReady);
    
    if (health === HealthStatus.SufficientlyHealthy) {
      toast({ title: 'Network connected', description: 'Connected to the Waku network with excellent connectivity' });
    } else if (health === HealthStatus.MinimallyHealthy) {
      toast({ title: 'Network connected', description: 'Connected to Waku network. Some features may be limited.', variant: 'default' });
    } else {
      toast({ title: 'Network disconnected', description: 'Lost connection to the Waku network', variant: 'destructive' });
    }
  });
  return { unsubscribe };
};
