import React from 'react';
import { useClient } from '../context/ClientContext';
import { useOpchanStore, opchanStore } from '../store/opchanStore';
import { EDisplayPreference, EVerificationStatus } from '@opchan/core';
import { UserIdentity } from '@opchan/core/dist/lib/services/UserIdentityService';

export type UserDisplayInfo = UserIdentity & {
  isLoading: boolean;
  error: string | null;
}

/**
 * User display hook with caching and reactive updates
 * Takes an address and resolves display details for it
 */
export function useUserDisplay(address: string): UserDisplayInfo {
  const client = useClient();
  
  // Get identity from central store
  const storeIdentity = useOpchanStore(s => s.identity.identitiesByAddress[address]);
  
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = React.useState<boolean>(false);

  // Initialize from store or load from service
  React.useEffect(() => {
    if (!address || hasInitialized) return;

    let cancelled = false;

    const initializeUserDisplay = async () => {
      try {
        // If already in store, use that
        if (storeIdentity) {
          setIsLoading(false);
          setError(null);
          setHasInitialized(true);
          return;
        }

        const identity = await client.userIdentityService.getIdentity(address, {fresh: true});
        console.log({identity})
        
        if (cancelled) return;

        if (identity) {
          opchanStore.setIdentity(address, identity);
          setError(null);
        } else {
          setError(null);
        }
        
        setIsLoading(false);
        setHasInitialized(true);
      } catch (error) {
        if (cancelled) return;
        
        setIsLoading(false);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setHasInitialized(true);
      }
    };

    initializeUserDisplay();

    return () => {
      cancelled = true;
    };
  }, [address, client.userIdentityService, storeIdentity, hasInitialized]);

  const displayInfo: UserDisplayInfo = React.useMemo(() => {
    if (storeIdentity) {
      console.log({storeIdentity})
      return {
        ...storeIdentity,
        isLoading,
        error,
      };
    }

    return {
      address,
      displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
      lastUpdated: 0,
      callSign: undefined,
      ensName: undefined,
      ordinalDetails: undefined,
      verificationStatus: EVerificationStatus.WALLET_UNCONNECTED,
      displayPreference: EDisplayPreference.WALLET_ADDRESS,
      isLoading,
      error,
    };
  }, [storeIdentity, isLoading, error, address]);

  return displayInfo;
}