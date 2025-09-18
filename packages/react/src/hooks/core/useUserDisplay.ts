import { useState, useEffect, useMemo, useRef } from 'react';
import { useForum } from '../../contexts/ForumContext';
import { useAuth } from '../../contexts/AuthContext';
import { EDisplayPreference, EVerificationStatus, UserIdentityService } from '@opchan/core';

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

export function useUserDisplay(address: string): UserDisplayInfo {
  const { userVerificationStatus } = useForum();
  const { currentUser } = useAuth();
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
  const isLoadingRef = useRef(false);

  // Check if this is the current user to get their direct ENS details
  const isCurrentUser = currentUser && currentUser.address.toLowerCase() === address.toLowerCase();

  const verificationInfo = useMemo(() => {
    if (isCurrentUser && currentUser) {
      // Use current user's direct ENS details
      return {
        isVerified: currentUser.verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED,
        ensName: currentUser.ensDetails?.ensName || null,
        verificationStatus: currentUser.verificationStatus,
      };
    }
    
    return (
      userVerificationStatus[address] || {
        isVerified: false,
        ensName: null,
        verificationStatus: EVerificationStatus.WALLET_UNCONNECTED,
      }
    );
  }, [userVerificationStatus, address, isCurrentUser, currentUser]);

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

      // Prevent multiple simultaneous calls
      if (isLoadingRef.current) {
        return;
      }

      isLoadingRef.current = true;

      try {
        // Use UserIdentityService to get proper identity and display name from central store
        const { UserIdentityService } = await import('@opchan/core');
        const userIdentityService = new UserIdentityService(null as any); // MessageService not needed for display
        
        // For current user, ensure their ENS details are in the database first
        if (isCurrentUser && currentUser?.ensDetails?.ensName) {
          const { localDatabase } = await import('@opchan/core');
          await localDatabase.upsertUserIdentity(address, {
            ensName: currentUser.ensDetails.ensName,
            verificationStatus: currentUser.verificationStatus,
            lastUpdated: Date.now(),
          });
        }
        
        // Get user identity which includes ENS name, callSign, etc. from central store
        const identity = await userIdentityService.getUserIdentity(address);
        
        // Use the service's getDisplayName method which has the correct priority logic
        const displayName = userIdentityService.getDisplayName(address);

        setDisplayInfo({
          displayName,
          callSign: identity?.callSign || null,
          ensName: identity?.ensName || verificationInfo.ensName || null,
          ordinalDetails: identity?.ordinalDetails ? 
            `${identity.ordinalDetails.ordinalId}` : null,
          verificationLevel: identity?.verificationStatus ||
            verificationInfo.verificationStatus ||
            EVerificationStatus.WALLET_UNCONNECTED,
          displayPreference: identity?.displayPreference || null,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('useUserDisplay: Failed to get user display info:', error);
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
      } finally {
        isLoadingRef.current = false;
      }
    };

    getUserDisplayInfo();

    // Cleanup function to reset loading ref
    return () => {
      isLoadingRef.current = false;
    };
  }, [address, refreshTrigger, verificationInfo.verificationStatus]);

  return displayInfo;
}
