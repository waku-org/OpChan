import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Crown } from 'lucide-react';
import { UserVerificationStatus } from '@/lib/forum/types';
import { getEnsName } from '@wagmi/core';
import { config } from '@/lib/identity/wallets/appkit';

interface AuthorDisplayProps {
  address: string;
  userVerificationStatus?: UserVerificationStatus;
  className?: string;
  showBadge?: boolean;
}

export function AuthorDisplay({ 
  address, 
  userVerificationStatus, 
  className = "",
  showBadge = true 
}: AuthorDisplayProps) {
  const userStatus = userVerificationStatus?.[address];
  const [resolvedEns, setResolvedEns] = React.useState<string | undefined>(undefined);

  // Lazily resolve ENS name for Ethereum addresses if not provided
  React.useEffect(() => {
    const isEthereumAddress = address.startsWith('0x') && address.length === 42;
    if (!userStatus?.ensName && isEthereumAddress) {
      getEnsName(config, { address: address as `0x${string}` })
        .then((name) => setResolvedEns(name || undefined))
        .catch(() => setResolvedEns(undefined));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const hasENS = userStatus?.hasENS || Boolean(resolvedEns) || Boolean(userStatus?.ensName);
  const hasOrdinal = userStatus?.hasOrdinal || false;

  // Only show a badge if the author has ENS or Ordinal ownership (not for basic verification)
  const shouldShowBadge = showBadge && (hasENS || hasOrdinal);

  const ensName = userStatus?.ensName || resolvedEns;
  const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-xs text-muted-foreground">
        {displayName}
      </span>
      
      {shouldShowBadge && (
        <Badge 
          variant="secondary" 
          className="text-xs px-1.5 py-0.5 h-auto bg-green-900/20 border-green-500/30 text-green-400"
        >
          {hasENS ? (
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
