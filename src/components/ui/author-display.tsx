import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Crown } from 'lucide-react';
import { UserVerificationStatus } from '@/types/forum';
import { getEnsName } from '@wagmi/core';
import { config } from '@/lib/services/WalletService/config';
import { OrdinalAPI } from '@/lib/services/Ordinal';

interface AuthorDisplayProps {
  address: string;
  userVerificationStatus?: UserVerificationStatus;
  className?: string;
  showBadge?: boolean;
}

export function AuthorDisplay({
  address,
  userVerificationStatus,
  className = '',
  showBadge = true,
}: AuthorDisplayProps) {
  const userStatus = userVerificationStatus?.[address];
  const [resolvedEns, setResolvedEns] = React.useState<string | undefined>(
    undefined
  );
  const [resolvedOrdinal, setResolvedOrdinal] = React.useState<
    boolean | undefined
  >(undefined);

  // Heuristics for address types
  const isEthereumAddress = address.startsWith('0x') && address.length === 42;
  const isBitcoinAddress = !isEthereumAddress; // simple heuristic for our context

  // Lazily resolve ENS name for Ethereum addresses if not provided
  React.useEffect(() => {
    let cancelled = false;
    if (!userStatus?.ensName && isEthereumAddress) {
      getEnsName(config, { address: address as `0x${string}` })
        .then(name => {
          if (!cancelled) setResolvedEns(name || undefined);
        })
        .catch(() => {
          if (!cancelled) setResolvedEns(undefined);
        });
    } else {
      setResolvedEns(userStatus?.ensName);
    }
    return () => {
      cancelled = true;
    };
  }, [address, isEthereumAddress, userStatus?.ensName]);

  // Lazily check Ordinal ownership for Bitcoin addresses if not provided
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      console.log({
        isBitcoinAddress,
        userStatus,
      });
      if (isBitcoinAddress) {
        try {
          const api = new OrdinalAPI();
          const res = await api.getOperatorDetails(address);
          if (!cancelled) setResolvedOrdinal(Boolean(res?.has_operators));
        } catch {
          if (!cancelled) setResolvedOrdinal(undefined);
        }
      } else {
        setResolvedOrdinal(userStatus?.hasOrdinal);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isBitcoinAddress, userStatus?.hasOrdinal]);

  const hasENS =
    Boolean(userStatus?.hasENS) ||
    Boolean(resolvedEns) ||
    Boolean(userStatus?.ensName);
  const hasOrdinal =
    Boolean(userStatus?.hasOrdinal) || Boolean(resolvedOrdinal);

  // Only show a badge if the author has ENS or Ordinal ownership (not for basic verification)
  const shouldShowBadge = showBadge && (hasENS || hasOrdinal);

  const ensName = userStatus?.ensName || resolvedEns;
  const displayName =
    ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-xs text-muted-foreground">{displayName}</span>

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
