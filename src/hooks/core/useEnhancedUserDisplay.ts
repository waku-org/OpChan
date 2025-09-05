import { useState, useEffect, useMemo } from 'react';
import { useForum } from '@/contexts/useForum';
import { EDisplayPreference, EVerificationStatus } from '@/types/identity';

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
 * Enhanced user display hook with caching and reactive updates
 */
export function useEnhancedUserDisplay(address: string): UserDisplayInfo {
  const { userIdentityService, userVerificationStatus } = useForum();
  const [displayInfo, setDisplayInfo] = useState<UserDisplayInfo>({
    displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
    callSign: null,
    ensName: null,
    ordinalDetails: null,
    verificationLevel: EVerificationStatus.UNVERIFIED,
    displayPreference: null,
    isLoading: true,
    error: null,
  });

  // Get verification status from forum context for reactive updates
  const verificationInfo = useMemo(() => {
    return (
      userVerificationStatus[address] || {
        isVerified: false,
        ensName: null,
        verificationStatus: EVerificationStatus.UNVERIFIED,
      }
    );
  }, [userVerificationStatus, address]);

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

      if (!userIdentityService) {
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
            EVerificationStatus.UNVERIFIED,
          displayPreference: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        const identity = await userIdentityService.getUserIdentity(address);

        if (identity) {
          let displayName = `${address.slice(0, 6)}...${address.slice(-4)}`;

          // Determine display name based on preferences
          if (
            identity.displayPreference === EDisplayPreference.CALL_SIGN &&
            identity.callSign
          ) {
            displayName = identity.callSign;
          } else if (identity.ensName) {
            displayName = identity.ensName;
          }

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
            displayName:
              verificationInfo.ensName ||
              `${address.slice(0, 6)}...${address.slice(-4)}`,
            callSign: null,
            ensName: verificationInfo.ensName || null,
            ordinalDetails: null,
            verificationLevel:
              verificationInfo.verificationStatus ||
              EVerificationStatus.UNVERIFIED,
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
          verificationLevel: EVerificationStatus.UNVERIFIED,
          displayPreference: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    getUserDisplayInfo();
  }, [address, userIdentityService, verificationInfo]);

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

// Export as the main useUserDisplay hook
export { useEnhancedUserDisplay as useUserDisplay };
