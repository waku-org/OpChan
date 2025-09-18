import { EDisplayPreference, EVerificationStatus } from '@opchan/core';
import { useState, useEffect, useMemo } from 'react';
import { useForumData } from './useForumData';
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
  const { userVerificationStatus } = useForumData();
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get verification status from forum context for reactive updates
  const verificationInfo = useMemo(() => {
    return (
      userVerificationStatus[address] || {
        isVerified: false,
        ensName: null,
        verificationStatus: EVerificationStatus.WALLET_UNCONNECTED,
      }
    );
  }, [userVerificationStatus, address]);

  // Set up refresh listener for user identity changes
  useEffect(() => {
    if (!client.userIdentityService || !address) return;

    const unsubscribe = client.userIdentityService.addRefreshListener(
      updatedAddress => {
        if (updatedAddress === address) {
          setRefreshTrigger(prev => prev + 1);
        }
      }
    );

    return unsubscribe;
  }, [client.userIdentityService, address]);

  useEffect(() => {
    const getUserDisplayInfo = async () => {
      if (!address) {
        setDisplayInfo(prev => ({
          ...prev,
          isLoading: false,
          error: 'No address provided',
        }));
        return;
      }

      if (!client.userIdentityService) {
        console.log(
          'useEnhancedUserDisplay: No service available, using fallback',
          { address }
        );
        setDisplayInfo({
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
          callSign: null,
          ensName: verificationInfo.ensName || null,
          ordinalDetails: null,
          verificationLevel:
            verificationInfo.verificationStatus ||
            EVerificationStatus.WALLET_UNCONNECTED,
          displayPreference: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        const identity = await client.userIdentityService.getUserIdentity(address);

        if (identity) {
          const displayName = client.userIdentityService.getDisplayName(address);

          setDisplayInfo({
            displayName,
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
          setDisplayInfo({
            displayName: client.userIdentityService.getDisplayName(address),
            callSign: null,
            ensName: verificationInfo.ensName || null,
            ordinalDetails: null,
            verificationLevel:
              verificationInfo.verificationStatus ||
              EVerificationStatus.WALLET_UNCONNECTED,
            displayPreference: null,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error(
          'useEnhancedUserDisplay: Failed to get user display info:',
          error
        );
        setDisplayInfo({
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
          callSign: null,
          ensName: null,
          ordinalDetails: null,
          verificationLevel: EVerificationStatus.WALLET_UNCONNECTED,
          displayPreference: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    getUserDisplayInfo();
  }, [address, client.userIdentityService, verificationInfo, refreshTrigger]);

  // Update display info when verification status changes reactively
  useEffect(() => {
    if (!displayInfo.isLoading && verificationInfo) {
      setDisplayInfo(prev => ({
        ...prev,
        ensName: verificationInfo.ensName || prev.ensName,
        verificationLevel:
          verificationInfo.verificationStatus || prev.verificationLevel,
      }));
    }
  }, [
    verificationInfo.ensName,
    verificationInfo.verificationStatus,
    displayInfo.isLoading,
    verificationInfo,
  ]);

  return displayInfo;
}
