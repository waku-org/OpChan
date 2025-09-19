import { useState, useEffect, useMemo } from 'react';
import { useForum } from '@/contexts/useForum';
import { EDisplayPreference, EVerificationStatus, IdentityProvider } from '@/types/identity';

export interface UserDisplayInfo {
  displayName: string;
  callSign: string | null;
  ensName: string | null;
  ordinalDetails: string | null;
  verificationLevel: EVerificationStatus;
  displayPreference: EDisplayPreference | null;
  isLoading: boolean;
  error: string | null;
  identityProviders: IdentityProvider[] | null;
  countryFlag: string | null;
  ageEmoji: string | null;
  genderEmoji: string | null;
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
    verificationLevel: EVerificationStatus.WALLET_UNCONNECTED,
    displayPreference: null,
    isLoading: true,
    error: null,
    identityProviders: null,
    countryFlag: null,
    ageEmoji: null,
    genderEmoji: null,
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
    if (!userIdentityService || !address) return;

    const unsubscribe = userIdentityService.addRefreshListener(
      updatedAddress => {
        if (updatedAddress === address) {
          setRefreshTrigger(prev => prev + 1);
        }
      }
    );

    return unsubscribe;
  }, [userIdentityService, address]);

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
            EVerificationStatus.WALLET_UNCONNECTED,
          displayPreference: null,
          isLoading: false,
          error: null,
          identityProviders: null,
          countryFlag: null,
          ageEmoji: null,
          genderEmoji: null,
        });
        return;
      }

      try {
        const identity = await userIdentityService.getUserIdentity(address);

        if (identity) {
          const displayName = userIdentityService.getDisplayName(address);

          // Extract country, adult, and gender claims from identity providers
          let countryFlag = null;
          let ageEmoji = null;
          let genderEmoji = null;
          
          if (identity.identityProviders) {
            for (const provider of identity.identityProviders) {
              if (provider.type === 'zkpassport') {
                for (const claim of provider.claims) {
                  if (claim.key === 'country' && claim.verified && typeof claim.value === 'string') {
                    // Convert country code to flag emoji
                    countryFlag = getCountryFlag(claim.value);
                  }
                  if (claim.key === 'adult' && claim.verified && typeof claim.value === 'boolean') {
                    ageEmoji = claim.value ? '🧓' : '👶';
                  }
                  if (claim.key === 'gender' && claim.verified && typeof claim.value === 'string') {
                    // Map gender to emoji
                    genderEmoji = claim.value.toLowerCase() === 'm' ? '♂️' :
                                 claim.value.toLowerCase() === 'f' ? '♀️' : '⚧️';
                  }
                }
              }
            }
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
            identityProviders: identity.identityProviders || null,
            countryFlag,
            ageEmoji,
            genderEmoji,
          });
        } else {
          setDisplayInfo({
            displayName: userIdentityService.getDisplayName(address),
            callSign: null,
            ensName: verificationInfo.ensName || null,
            ordinalDetails: null,
            verificationLevel:
              verificationInfo.verificationStatus ||
              EVerificationStatus.WALLET_UNCONNECTED,
            displayPreference: null,
            isLoading: false,
            error: null,
            identityProviders: null,
            countryFlag: null,
            ageEmoji: null,
            genderEmoji: null,
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
          identityProviders: null,
          countryFlag: null,
          ageEmoji: null,
          genderEmoji: null,
        });
      }
    };

    getUserDisplayInfo();
  }, [address, userIdentityService, verificationInfo, refreshTrigger]);

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

  // Helper function to convert country code to flag emoji
  function getCountryFlag(countryCode: string): string {
    // Convert country code to flag emoji using regional indicator symbols
    // For example, 'US' -> '🇺🇸'
    return countryCode
      .toUpperCase()
      .replace(/./g, char =>
        String.fromCodePoint(127397 + char.charCodeAt(0))
      );
  }

  return displayInfo;
}

// Export as the main useUserDisplay hook
export { useEnhancedUserDisplay as useUserDisplay };
