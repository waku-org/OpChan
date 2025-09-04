import { useState, useEffect, useMemo } from 'react';
import { useForum } from '@/contexts/useForum';
import { EDisplayPreference, EVerificationStatus } from '@/types/identity';

export interface Badge {
  type: 'verification' | 'ens' | 'ordinal' | 'callsign';
  label: string;
  icon: string;
  color: string;
}

export interface UserDisplayInfo {
  displayName: string;
  hasCallSign: boolean;
  hasENS: boolean;
  hasOrdinal: boolean;
  verificationLevel: EVerificationStatus;
  badges: Badge[];
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
    hasCallSign: false,
    hasENS: false,
    hasOrdinal: false,
    verificationLevel: EVerificationStatus.UNVERIFIED,
    badges: [],
    isLoading: true,
    error: null,
  });

  // Get verification status from forum context for reactive updates
  const verificationInfo = useMemo(() => {
    return (
      userVerificationStatus[address] || {
        isVerified: false,
        hasENS: false,
        hasOrdinal: false,
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
          hasCallSign: false,
          hasENS: false,
          hasOrdinal: false,
          verificationLevel:
            verificationInfo.verificationStatus ||
            EVerificationStatus.UNVERIFIED,
          badges: [],
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

          // Generate badges
          const badges: Badge[] = [];

          // Verification badge
          if (
            identity.verificationStatus === EVerificationStatus.VERIFIED_OWNER
          ) {
            badges.push({
              type: 'verification',
              label: 'Verified Owner',
              icon: '🔑',
              color: 'text-cyber-accent',
            });
          } else if (
            identity.verificationStatus === EVerificationStatus.VERIFIED_BASIC
          ) {
            badges.push({
              type: 'verification',
              label: 'Verified',
              icon: '✅',
              color: 'text-green-400',
            });
          }

          // ENS badge
          if (identity.ensName) {
            badges.push({
              type: 'ens',
              label: 'ENS',
              icon: '🏷️',
              color: 'text-blue-400',
            });
          }

          // Ordinal badge
          if (identity.ordinalDetails) {
            badges.push({
              type: 'ordinal',
              label: 'Ordinal',
              icon: '⚡',
              color: 'text-orange-400',
            });
          }

          // Call sign badge
          if (identity.callSign) {
            badges.push({
              type: 'callsign',
              label: 'Call Sign',
              icon: '📻',
              color: 'text-purple-400',
            });
          }

          setDisplayInfo({
            displayName,
            hasCallSign: Boolean(identity.callSign),
            hasENS: Boolean(identity.ensName),
            hasOrdinal: Boolean(identity.ordinalDetails),
            verificationLevel: identity.verificationStatus,
            badges,
            isLoading: false,
            error: null,
          });
        } else {

          // Use verification info from forum context
          const badges: Badge[] = [];
          if (verificationInfo.hasENS) {
            badges.push({
              type: 'ens',
              label: 'ENS',
              icon: '🏷️',
              color: 'text-blue-400',
            });
          }
          if (verificationInfo.hasOrdinal) {
            badges.push({
              type: 'ordinal',
              label: 'Ordinal',
              icon: '⚡',
              color: 'text-orange-400',
            });
          }

          setDisplayInfo({
            displayName:
              verificationInfo.ensName ||
              `${address.slice(0, 6)}...${address.slice(-4)}`,
            hasCallSign: false,
            hasENS: verificationInfo.hasENS,
            hasOrdinal: verificationInfo.hasOrdinal,
            verificationLevel:
              verificationInfo.verificationStatus ||
              EVerificationStatus.UNVERIFIED,
            badges,
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
          hasCallSign: false,
          hasENS: false,
          hasOrdinal: false,
          verificationLevel: EVerificationStatus.UNVERIFIED,
          badges: [],
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
        hasENS: verificationInfo.hasENS || prev.hasENS,
        hasOrdinal: verificationInfo.hasOrdinal || prev.hasOrdinal,
        verificationLevel:
          verificationInfo.verificationStatus || prev.verificationLevel,
      }));
    }
  }, [
    verificationInfo.ensName,
    verificationInfo.hasENS,
    verificationInfo.hasOrdinal,
    verificationInfo.verificationStatus,
    displayInfo.isLoading,
    verificationInfo
  ]);

  return displayInfo;
}

// Export as the main useUserDisplay hook
export { useEnhancedUserDisplay as useUserDisplay };
