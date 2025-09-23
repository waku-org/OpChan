import { EDisplayPreference, EVerificationStatus } from '@opchan/core';
import { useEffect, useState } from 'react';
import { useClient } from '../../contexts/ClientContext';

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
 */
export function useUserDisplay(address: string): UserDisplayInfo {
  const client = useClient();
  const getDisplayName = (addr: string) => client.userIdentityService.getDisplayName(addr);
  const [displayInfo, setDisplayInfo] = useState<UserDisplayInfo>({
    displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
    callSign: null,
    ensName: null,
    ordinalDetails: null,
    verificationLevel: EVerificationStatus.WALLET_UNCONNECTED,
    displayPreference: null,
    isLoading: true,
    error: null,
  });
  // Subscribe to identity service refresh events directly
  useEffect(() => {
    let cancelled = false;
    const prime = async () => {
      if (!address) return;
      try {
        const identity = await client.userIdentityService.getUserIdentity(address);
        if (cancelled) return;
        if (identity) {
          setDisplayInfo({
            displayName: getDisplayName(address),
            callSign: identity.callSign || null,
            ensName: identity.ensName || null,
            ordinalDetails: identity.ordinalDetails
              ? identity.ordinalDetails.ordinalDetails
              : null,
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
        setDisplayInfo(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };
    prime();
    return () => { cancelled = true; };
  }, [address, client, getDisplayName]);

  useEffect(() => {
    if (!address) return;
    const off = client.userIdentityService.addRefreshListener(async (changed) => {
      if (changed !== address) return;
      const identity = await client.userIdentityService.getUserIdentity(address);
      if (!identity) return;
      setDisplayInfo(prev => ({
        ...prev,
        displayName: getDisplayName(address),
        callSign: identity.callSign || null,
        ensName: identity.ensName || null,
        ordinalDetails: identity.ordinalDetails ? identity.ordinalDetails.ordinalDetails : null,
        verificationLevel: identity.verificationStatus,
        isLoading: false,
        error: null,
      }));
    });
    return () => { try { off && off(); } catch {} };
  }, [address, client, getDisplayName]);

  return displayInfo;
}
