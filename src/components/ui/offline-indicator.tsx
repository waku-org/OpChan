import { AlertCircle, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  isNetworkConnected: boolean;
  isSyncing: boolean;
  outboxCount: number;
  className?: string;
}

export function OfflineIndicator({ 
  isNetworkConnected, 
  isSyncing, 
  outboxCount,
  className 
}: OfflineIndicatorProps) {
  if (isNetworkConnected && !isSyncing && outboxCount === 0) {
    return null;
  }

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 max-w-sm",
      className
    )}>
      {!isNetworkConnected && (
        <div className="bg-destructive/90 backdrop-blur-sm text-destructive-foreground px-3 py-2 rounded-md shadow-lg flex items-center gap-2 text-sm">
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
          {outboxCount > 0 && (
            <span className="bg-destructive-foreground text-destructive px-2 py-0.5 rounded-full text-xs font-medium">
              {outboxCount} pending
            </span>
          )}
        </div>
      )}
      
      {isNetworkConnected && isSyncing && outboxCount > 0 && (
        <div className="bg-blue-500/90 backdrop-blur-sm text-white px-3 py-2 rounded-md shadow-lg flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing {outboxCount} items...</span>
        </div>
      )}
      
      {isNetworkConnected && !isSyncing && outboxCount > 0 && (
        <div className="bg-yellow-500/90 backdrop-blur-sm text-white px-3 py-2 rounded-md shadow-lg flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{outboxCount} items pending sync</span>
        </div>
      )}
    </div>
  );
}