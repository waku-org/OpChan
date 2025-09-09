import messageManager from './index';
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
  setError: (error: string | null) => void
): Promise<void> => {
  try {
    toast({
      title: 'Refreshing data',
      description: 'SDS handles message syncing automatically...',
    });

    if (!isNetworkConnected) {
      toast({
        title: 'Network disconnected',
        description:
          'Unable to refresh data. Please wait for network connection to be restored.',
        variant: 'destructive',
      });
      return;
    }

    updateStateFromCache();
    toast({
      title: 'Data refreshed',
      description: 'Your view has been updated with the latest messages.',
    });
  } catch (err) {
    console.error('Error refreshing data:', err);
    toast({
      title: 'Refresh failed',
      description: 'Could not sync with network. Please try again.',
      variant: 'destructive',
    });
    setError('Failed to refresh data. Please try again later.');
  }
};

export const initializeNetwork = async (
  toast: ToastFunction,
  setError: (error: string | null) => void
): Promise<void> => {
  try {
    toast({
      title: 'Loading data',
      description: 'Connecting to the Waku network...',
    });

    // Check current network status and provide appropriate feedback
    if (messageManager.isReady) {
      toast({
        title: 'Connected',
        description: 'Successfully connected to Waku network.',
      });
    } else {
      toast({
        title: 'Connecting...',
        description:
          'Establishing network connection. You can view cached data while we connect.',
        variant: 'default',
      });
    }
  } catch (err) {
    console.error('Error loading forum data:', err);
    setError('Failed to load forum data. Please try again later.');
    toast({
      title: 'Load error',
      description: 'Failed to load forum data. Please try refreshing.',
      variant: 'destructive',
    });
  }
};

export const monitorNetworkHealth = (
  setIsNetworkConnected: (isConnected: boolean) => void,
  toast: ToastFunction
): { unsubscribe: () => void } => {
  setIsNetworkConnected(messageManager.isReady);
  const unsubscribe = messageManager.onHealthChange((isReady, health) => {
    setIsNetworkConnected(isReady);

    if (health === HealthStatus.SufficientlyHealthy) {
      toast({
        title: 'Network connected',
        description:
          'Connected to the Waku network with excellent connectivity',
      });
    } else if (health === HealthStatus.MinimallyHealthy) {
      toast({
        title: 'Network connected',
        description: 'Connected to Waku network. Some features may be limited.',
        variant: 'default',
      });
    } else {
      toast({
        title: 'Network disconnected',
        description: 'Lost connection to the Waku network',
        variant: 'destructive',
      });
    }
  });
  return { unsubscribe };
};
