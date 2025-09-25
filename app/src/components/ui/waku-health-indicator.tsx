import { Wifi, WifiOff, CheckCircle } from 'lucide-react';
import { useNetwork } from '@opchan/react';
import { cn } from '../../utils'

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
  const {isConnected, statusMessage} = useNetwork();

  const getIcon = () => {
    if (isConnected === true) {
      return <CheckCircle className="text-green-500" />;
    } else if (isConnected === false) {
      return <WifiOff className="text-red-500" />;
    } else {
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
            isConnected === true && 'text-green-400',
            isConnected === false && 'text-red-400',
            isConnected === null && 'text-gray-400'
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
  const { isConnected } = useNetwork();
  const statusColor = isConnected === true ? 'green' : isConnected === false ? 'red' : 'gray';

  return (
    <div
      className={cn(
        'w-2 h-2 rounded-full',
        isConnected === true && 'bg-green-500',
        isConnected === false && 'bg-red-500',
        isConnected === null && 'bg-gray-500',
        className
      )}
      title={`Waku network: ${statusColor === 'green' ? 'Connected' : statusColor === 'red' ? 'Disconnected' : 'Loading'}`}
    />
  );
}
