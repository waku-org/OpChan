import messageManager from '@/lib/waku';

type ToastFunction = (props: { 
  title: string; 
  description: string; 
  variant?: "default" | "destructive"; 
}) => void;

// Function to refresh data from the network
export const refreshData = async (
  isNetworkConnected: boolean,
  toast: ToastFunction,
  updateStateFromCache: () => void,
  setError: (error: string | null) => void
): Promise<void> => {
  try {
    toast({
      title: "Refreshing data",
      description: "Fetching latest messages from the network...",
    });
    
    // Try to connect if not already connected
    if (!isNetworkConnected) {
      try {
        await messageManager.waitForRemotePeer(10000);
      } catch (err) {
        console.warn("Could not connect to peer during refresh:", err);
      }
    }
    
    // Query historical messages from the store
    await messageManager.queryStore();
    
    // Update UI state from the cache
    updateStateFromCache();
    
    toast({
      title: "Data refreshed",
      description: "Your view has been updated with the latest messages.",
    });
  } catch (err) {
    console.error("Error refreshing data:", err);
    toast({
      title: "Refresh failed",
      description: "Could not fetch the latest messages. Please try again.",
      variant: "destructive",
    });
    setError("Failed to refresh data. Please try again later.");
  }
};

// Function to initialize data loading
export const initializeNetwork = async (
  toast: ToastFunction,
  updateStateFromCache: () => void,
  setError: (error: string | null) => void
): Promise<void> => {
  try {
    toast({
      title: "Loading data",
      description: "Connecting to the Waku network...",
    });
    
    // Wait for peer connection with timeout
    try {
      await messageManager.waitForRemotePeer(15000);
    } catch (err) {
      toast({
        title: "Connection timeout",
        description: "Could not connect to any peers. Some features may be unavailable.",
        variant: "destructive",
      });
      console.warn("Timeout connecting to peer:", err);
    }
    
    // Query historical messages from the store
    await messageManager.queryStore();
    
    // Subscribe to new messages
    await messageManager.subscribeToMessages();
    
    // Update UI state from the cache
    updateStateFromCache();
  } catch (err) {
    console.error("Error loading forum data:", err);
    setError("Failed to load forum data. Please try again later.");
    
    toast({
      title: "Connection error",
      description: "Failed to connect to Waku network. Please try refreshing.",
      variant: "destructive",
    });
  }
};

// Function to setup periodic network queries
export const setupPeriodicQueries = (
  isNetworkConnected: boolean,
  updateStateFromCache: () => void
): { cleanup: () => void } => {
  // Set up a polling mechanism to refresh the UI every few seconds
  // This is a temporary solution until we implement real-time updates with message callbacks
  const uiRefreshInterval = setInterval(() => {
    updateStateFromCache();
  }, 5000);
  
  // Set up regular network queries to fetch new messages
  const networkQueryInterval = setInterval(async () => {
    if (isNetworkConnected) {
      try {
        await messageManager.queryStore();
        // No need to call updateStateFromCache() here as the UI refresh interval will handle that
      } catch (err) {
        console.warn("Error during scheduled network query:", err);
      }
    }
  }, 3000);

  // Return a cleanup function to clear the intervals
  return {
    cleanup: () => {
      clearInterval(uiRefreshInterval);
      clearInterval(networkQueryInterval);
    }
  };
};

// Function to monitor network health
export const monitorNetworkHealth = (
  setIsNetworkConnected: (isConnected: boolean) => void,
  toast: ToastFunction
): { unsubscribe: () => void } => {
  // Initial status
  setIsNetworkConnected(messageManager.isReady);
  
  // Subscribe to health changes
  const unsubscribe = messageManager.onHealthChange((isReady) => {
    setIsNetworkConnected(isReady);
    
    if (isReady) {
      toast({
        title: "Network connected",
        description: "Connected to the Waku network",
      });
    } else {
      toast({
        title: "Network disconnected",
        description: "Lost connection to the Waku network",
        variant: "destructive",
      });
    }
  });
  
  return { unsubscribe };
}; 