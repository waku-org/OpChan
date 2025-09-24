import React from 'react';
import { useClient } from '../context/ClientContext';
import { EDisplayPreference, EVerificationStatus } from '@opchan/core';

export interface UserDisplayInfo {
  displayName: string;
  callSign: string | null;
  ensName: string | null;
  ordinalDetails: string | null;
  verificationLevel: EVerificationStatus;
  displayPreference: EDisplayPreference | null;
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
    displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
    callSign: null,
    ensName: null,
    ordinalDetails: null,
    verificationLevel: EVerificationStatus.WALLET_UNCONNECTED,
    displayPreference: null,
    isLoading: true,
    error: null,
  });

  const getDisplayName = React.useCallback((addr: string) => {
    return client.userIdentityService.getDisplayName(addr);
  }, [client]);

  // Initial load and refresh listener
  React.useEffect(() => {
    if (!address) return;

    let cancelled = false;

    const loadUserDisplay = async () => {
      try {
        const identity = await client.userIdentityService.getUserIdentity(address);
        
        if (cancelled) return;

        if (identity) {
          setDisplayInfo({
            displayName: getDisplayName(address),
            callSign: identity.callSign || null,
            ensName: identity.ensName || null,
            ordinalDetails: identity.ordinalDetails?.ordinalDetails || null,
            verificationLevel: identity.verificationStatus,
            displayPreference: identity.displayPreference || null,
            isLoading: false,
            error: null,
          });
        } else {
          setDisplayInfo(prev => ({
            ...prev,
            displayName: getDisplayName(address),
            isLoading: false,
            error: null,
          }));
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
    const unsubscribe = client.userIdentityService.addRefreshListener(async (changedAddress) => {
      if (changedAddress !== address || cancelled) return;
      
      try {
        const identity = await client.userIdentityService.getUserIdentity(address);
        if (!identity || cancelled) return;

        setDisplayInfo(prev => ({
          ...prev,
          displayName: getDisplayName(address),
          callSign: identity.callSign || null,
          ensName: identity.ensName || null,
          ordinalDetails: identity.ordinalDetails?.ordinalDetails || null,
          verificationLevel: identity.verificationStatus,
          displayPreference: identity.displayPreference || null,
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
  }, [address, client, getDisplayName]);

  return displayInfo;
}