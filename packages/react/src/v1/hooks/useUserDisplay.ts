import React from 'react';
import { useClient } from '../context/ClientContext';
import { EDisplayPreference, EVerificationStatus } from '@opchan/core';
import { UserIdentity } from '@opchan/core/dist/lib/services/UserIdentityService';

export interface UserDisplayInfo extends UserIdentity {
  isLoading: boolean;
  error: string | null;
}

/**
 * User display hook with caching and reactive updates
 * Takes an address and resolves display details for it
 */
export function useUserDisplay(address: string): UserDisplayInfo {
  const client = useClient();
  
  const [displayInfo, setDisplayInfo] = React.useState<UserDisplayInfo>({
    address,
    displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
    lastUpdated: 0,
    callSign: undefined,
    ensName: undefined,
    ordinalDetails: undefined,
    verificationStatus: EVerificationStatus.WALLET_UNCONNECTED,
    displayPreference: EDisplayPreference.WALLET_ADDRESS,
    isLoading: true,
    error: null,
  });

  // Initial load and refresh listener
  React.useEffect(() => {
    if (!address) return;

    let cancelled = false;

    const loadUserDisplay = async () => {
      try {
        const identity = await client.userIdentityService.getIdentity(address);
        
        if (cancelled) return;

        if (identity) {
          setDisplayInfo({
            ...identity,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        if (cancelled) return;
        
        setDisplayInfo(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    loadUserDisplay();

    // Subscribe to identity service refresh events
    const unsubscribe = client.userIdentityService.subscribe(async (changedAddress) => {
      if (changedAddress !== address || cancelled) return;
      
      try {
        const identity = await client.userIdentityService.getIdentity(address);
        if (!identity || cancelled) return;

        setDisplayInfo(prev => ({
          ...prev,
          ...identity,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        if (cancelled) return;
        
        setDisplayInfo(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    });

    return () => {
      cancelled = true;
      try {
        unsubscribe();
      } catch {
        // Ignore unsubscribe errors
      }
    };
  }, [address, client]);

  return displayInfo;
}