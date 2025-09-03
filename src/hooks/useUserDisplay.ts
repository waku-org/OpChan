import { useState, useEffect } from 'react';
import { useForum } from '@/contexts/useForum';
import { DisplayPreference } from '@/types/identity';

export interface UserDisplayInfo {
  displayName: string;
  hasCallSign: boolean;
  hasENS: boolean;
  hasOrdinal: boolean;
  isLoading: boolean;
}

export function useUserDisplay(address: string): UserDisplayInfo {
  const { userIdentityService } = useForum();
  const [displayInfo, setDisplayInfo] = useState<UserDisplayInfo>({
    displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
    hasCallSign: false,
    hasENS: false,
    hasOrdinal: false,
    isLoading: true,
  });

  useEffect(() => {
    const getUserDisplayInfo = async () => {
      if (!address || !userIdentityService) {
        console.log('useUserDisplay: No address or service available', { address, hasService: !!userIdentityService });
        setDisplayInfo({
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
          hasCallSign: false,
          hasENS: false,
          hasOrdinal: false,
          isLoading: false,
        });
        return;
      }

      try {
        console.log('useUserDisplay: Getting identity for address', address);
        const identity = await userIdentityService.getUserIdentity(address);
        console.log('useUserDisplay: Received identity', identity);
        
        if (identity) {
          let displayName = `${address.slice(0, 6)}...${address.slice(-4)}`;
          
          // Determine display name based on preferences
          if (
            identity.displayPreference === DisplayPreference.CALL_SIGN &&
            identity.callSign
          ) {
            displayName = identity.callSign;
            console.log('useUserDisplay: Using call sign as display name', identity.callSign);
          } else if (identity.ensName) {
            displayName = identity.ensName;
            console.log('useUserDisplay: Using ENS as display name', identity.ensName);
          } else {
            console.log('useUserDisplay: Using truncated address as display name');
          }

          setDisplayInfo({
            displayName,
            hasCallSign: Boolean(identity.callSign),
            hasENS: Boolean(identity.ensName),
            hasOrdinal: Boolean(identity.ordinalDetails),
            isLoading: false,
          });
        } else {
          console.log('useUserDisplay: No identity found, using fallback');
          setDisplayInfo({
            displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
            hasCallSign: false,
            hasENS: false,
            hasOrdinal: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('useUserDisplay: Failed to get user display info:', error);
        setDisplayInfo({
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
          hasCallSign: false,
          hasENS: false,
          hasOrdinal: false,
          isLoading: false,
        });
      }
    };

    getUserDisplayInfo();
  }, [address, userIdentityService]);

  return displayInfo;
}
