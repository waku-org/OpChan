import { EDisplayPreference, EVerificationStatus } from '@opchan/core';
import { useEffect, useState } from 'react';
import { useClient } from '../../contexts/ClientContext';
import { useIdentity } from '../../contexts/IdentityContext';

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
  const { getIdentity, getDisplayName } = useIdentity();
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
  // Subscribe via IdentityContext by relying on its internal listener
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
  }, [address, client.userIdentityService, getDisplayName]);

  // Reactively reflect IdentityContext cache changes
  useEffect(() => {
    if (!address) return;
    const id = getIdentity(address);
    if (!id) return;
    setDisplayInfo(prev => ({
      ...prev,
      displayName: getDisplayName(address),
      callSign: id.callSign,
      ensName: id.ensName,
      ordinalDetails: id.ordinalDetails,
      verificationLevel: id.verificationStatus,
      isLoading: false,
      error: null,
    }));
  }, [address, getIdentity, getDisplayName]);

  return displayInfo;
}
