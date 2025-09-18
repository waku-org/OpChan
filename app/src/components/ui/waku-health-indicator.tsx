import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { useWakuHealthStatus } from '@opchan/react';
import { cn } from '@opchan/core';

interface WakuHealthIndicatorProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function WakuHealthIndicator({
  className,
  showText = true,
  size = 'md',
}: WakuHealthIndicatorProps) {
  const { connectionStatus, statusColor, statusMessage } =
    useWakuHealthStatus();

  const getIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="text-green-500" />;
      case 'connecting':
        return <Wifi className="text-yellow-500 animate-pulse" />;
      case 'disconnected':
        return <WifiOff className="text-red-500" />;
      case 'error':
        return <AlertTriangle className="text-red-500" />;
      default:
        return <Wifi className="text-gray-500" />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={getSizeClasses()}>{getIcon()}</div>
      {showText && (
        <span
          className={cn(
            'text-sm font-medium',
            statusColor === 'green' && 'text-green-400',
            statusColor === 'yellow' && 'text-yellow-400',
            statusColor === 'red' && 'text-red-400'
          )}
        >
          {statusMessage}
        </span>
      )}
    </div>
  );
}

/**
 * Simple dot indicator for Waku health status
 * Useful for compact displays like headers or status bars
 */
export function WakuHealthDot({ className }: { className?: string }) {
  const { statusColor } = useWakuHealthStatus();

  return (
    <div
      className={cn(
        'w-2 h-2 rounded-full',
        statusColor === 'green' && 'bg-green-500',
        statusColor === 'yellow' && 'bg-yellow-500 animate-pulse',
        statusColor === 'red' && 'bg-red-500',
        className
      )}
      title={`Waku network: ${statusColor}`}
    />
  );
}
