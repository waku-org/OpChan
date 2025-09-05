import { useAuth as useBaseAuth } from '@/contexts/useAuth';
import { User, EVerificationStatus } from '@/types/identity';

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

  // Helper functions
  const getDisplayName = (): string => {
    if (!currentUser) return 'Anonymous';

    if (currentUser.callSign) {
      return currentUser.callSign;
    }

    if (currentUser.ensDetails?.ensName) {
      return currentUser.ensDetails.ensName;
    }

    return `${currentUser.address.slice(0, 6)}...${currentUser.address.slice(-4)}`;
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
