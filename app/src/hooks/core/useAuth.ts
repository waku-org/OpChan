import { useAuth as useBaseAuth } from '@/contexts/useAuth';
import { useForum } from '@/contexts/useForum';
import { User, EVerificationStatus } from '@opchan/core';

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  verificationStatus: EVerificationStatus;

  // Helper functions
  getDisplayName: () => string;
  getVerificationBadge: () => string | null;
}

/**
 * Unified authentication hook that provides core auth state and helpers
 */
export function useAuth(): AuthState {
  const { currentUser, isAuthenticated, isAuthenticating, verificationStatus } =
    useBaseAuth();
  const { userIdentityService } = useForum();

  // Helper functions
  const getDisplayName = (): string => {
    if (!currentUser) return 'Anonymous';
    // Centralized display logic; fallback to truncated address if service unavailable
    if (userIdentityService) {
      return userIdentityService.getDisplayName(currentUser.address);
    }
    const addr = currentUser.address;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getVerificationBadge = (): string | null => {
    switch (verificationStatus) {
      case EVerificationStatus.ENS_ORDINAL_VERIFIED:
        return '🔑'; // ENS/Ordinal owner
      case EVerificationStatus.WALLET_CONNECTED:
        return '✅'; // Wallet connected
      default:
        return null;
    }
  };

  return {
    currentUser,
    isAuthenticated,
    isAuthenticating,
    verificationStatus,
    getDisplayName,
    getVerificationBadge,
  };
}
