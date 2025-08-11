import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Crown } from 'lucide-react';
import { UserVerificationStatus } from '@/lib/forum/types';

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
  const isVerified = userStatus?.isVerified || false;
  const hasENS = userStatus?.hasENS || false;
  const hasOrdinal = userStatus?.hasOrdinal || false;

  // Get ENS name from user verification status if available
  const ensName = userStatus?.ensName;
  const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-xs text-muted-foreground">
        {displayName}
      </span>
      
      {showBadge && isVerified && (
        <Badge 
          variant="secondary" 
          className="text-xs px-1.5 py-0.5 h-auto bg-green-900/20 border-green-500/30 text-green-400"
        >
          {hasENS ? (
            <>
              <Crown className="w-3 h-3 mr-1" />
              ENS
            </>
          ) : hasOrdinal ? (
            <>
              <Shield className="w-3 h-3 mr-1" />
              Ordinal
            </>
          ) : (
            <>
              <Shield className="w-3 h-3 mr-1" />
              Verified
            </>
          )}
        </Badge>
      )}
    </div>
  );
}
