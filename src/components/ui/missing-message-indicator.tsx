import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface MissingMessageIndicatorProps {
  missingCount: number;
  recoveredCount: number;
  totalMissing: number;
  totalRecovered: number;
  className?: string;
}

export function MissingMessageIndicator({
  missingCount,
  recoveredCount,
  totalMissing,
  totalRecovered,
  className = '',
}: MissingMessageIndicatorProps) {
  // Don't show if no missing messages detected
  if (totalMissing === 0) {
    return null;
  }

  const recoveryRate = totalMissing > 0 ? (totalRecovered / totalMissing) * 100 : 0;
  const hasActiveMissing = missingCount > 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 ${className}`}>
            {hasActiveMissing ? (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {missingCount} Missing
              </Badge>
            ) : totalMissing > 0 ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Synced
              </Badge>
            ) : null}
            
            {totalRecovered > 0 && (
              <Badge variant="default" className="flex items-center gap-1 bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-3 w-3" />
                {recoveredCount > 0 ? `+${recoveredCount}` : totalRecovered} Recovered
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-sm">
            <div className="font-medium">Message Synchronization Status</div>
            <div className="space-y-1 text-xs">
              <div>• Currently Missing: {missingCount}</div>
              <div>• Recently Recovered: {recoveredCount}</div>
              <div>• Total Missing (Session): {totalMissing}</div>
              <div>• Total Recovered (Session): {totalRecovered}</div>
              <div>• Recovery Rate: {recoveryRate.toFixed(1)}%</div>
            </div>
            {hasActiveMissing && (
              <div className="text-xs text-muted-foreground mt-2">
                The system is automatically attempting to recover missing messages.
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
