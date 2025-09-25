import { Badge } from '@/components/ui/badge';
import { Shield, Crown, Hash } from 'lucide-react';
import { useUserDisplay } from '@opchan/react';
import { useEffect } from 'react';

interface AuthorDisplayProps {
  address: string;
  className?: string;
  showBadge?: boolean;
}

export function AuthorDisplay({
  address,
  className = '',
  showBadge = true,
}: AuthorDisplayProps) {
  const { ensName, ordinalDetails, callSign, displayName } = useUserDisplay(address);

  useEffect(()=> {
    console.log({ensName, ordinalDetails, callSign, displayName, address})
  }, [address, ensName, ordinalDetails, callSign, displayName])

  // Only show a badge if the author has ENS, Ordinal, or Call Sign
  const shouldShowBadge = showBadge && (ensName || ordinalDetails || callSign);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-xs text-muted-foreground">{displayName}</span>

      {shouldShowBadge && (
        <Badge
          variant="secondary"
          className="text-xs px-1.5 py-0.5 h-auto bg-green-900/20 border-green-500/30 text-green-400"
        >
          {callSign ? (
            <>
              <Hash className="w-3 h-3 mr-1" />
              Call Sign
            </>
          ) : ensName ? (
            <>
              <Crown className="w-3 h-3 mr-1" />
              ENS
            </>
          ) : (
            <>
              <Shield className="w-3 h-3 mr-1" />
              Ordinal
            </>
          )}
        </Badge>
      )}
    </div>
  );
}
