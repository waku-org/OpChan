import { useMemo } from 'react';
import { useAuth as useBaseAuth } from '@/contexts/useAuth';
import { User, EVerificationStatus } from '@/types/identity';

export interface Permission {
  canPost: boolean;
  canComment: boolean;
  canVote: boolean;
  canCreateCell: boolean;
  canModerate: (cellId: string) => boolean;
  canDelegate: boolean;
  canUpdateProfile: boolean;
}

export interface DetailedVerificationStatus {
  level: EVerificationStatus;
  hasWallet: boolean;
  hasENS: boolean;
  hasOrdinal: boolean;
  hasCallSign: boolean;
  isVerifying: boolean;
  canUpgrade: boolean;
  nextSteps: string[];
}

export interface DelegationInfo {
  isActive: boolean;
  isExpired: boolean;
  expiresAt: number | null;
  timeRemaining: string | null;
  canDelegate: boolean;
  needsRenewal: boolean;
}

export interface EnhancedAuthState {
  // Base auth data
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;

  // Enhanced verification info
  verificationStatus: DetailedVerificationStatus;

  // Delegation info
  delegationInfo: DelegationInfo;

  // Permissions
  permissions: Permission;

  // Helper functions
  hasPermission: (action: keyof Permission, cellId?: string) => boolean;
  getDisplayName: () => string;
  getVerificationBadge: () => string | null;
}

/**
 * Enhanced authentication hook with detailed status and permissions
 */
export function useEnhancedAuth(): EnhancedAuthState {
  const {
    currentUser,
    isAuthenticated,
    isAuthenticating,
    verificationStatus: baseVerificationStatus,
    getDelegationStatus,
  } = useBaseAuth();

  // Detailed verification status
  const verificationStatus = useMemo((): DetailedVerificationStatus => {
    const hasWallet = !!currentUser;
    const hasENS = !!currentUser?.ensDetails;
    const hasOrdinal = !!currentUser?.ordinalDetails;
    const hasCallSign = !!currentUser?.callSign;
    const isVerifying = baseVerificationStatus === 'verifying';

    let level: EVerificationStatus = EVerificationStatus.UNVERIFIED;
    if (currentUser) {
      level = currentUser.verificationStatus;
    }

    const canUpgrade =
      hasWallet && !isVerifying && level !== EVerificationStatus.VERIFIED_OWNER;

    const nextSteps: string[] = [];
    if (!hasWallet) {
      nextSteps.push('Connect your wallet');
    } else if (level === EVerificationStatus.UNVERIFIED) {
      nextSteps.push('Verify wallet ownership');
      if (!hasOrdinal && !hasENS) {
        nextSteps.push('Acquire Ordinal or ENS for posting privileges');
      }
    } else if (level === EVerificationStatus.VERIFIED_BASIC && !hasOrdinal) {
      nextSteps.push('Acquire Ordinal for full privileges');
    }

    if (hasWallet && !hasCallSign) {
      nextSteps.push('Set up call sign for better identity');
    }

    return {
      level,
      hasWallet,
      hasENS,
      hasOrdinal,
      hasCallSign,
      isVerifying,
      canUpgrade,
      nextSteps,
    };
  }, [currentUser, baseVerificationStatus]);

  // Delegation information
  const delegationInfo = useMemo((): DelegationInfo => {
    const delegationStatus = getDelegationStatus();
    const isActive = delegationStatus.isValid;

    let expiresAt: number | null = null;
    let timeRemaining: string | null = null;
    let isExpired = false;

    if (currentUser?.delegationExpiry) {
      expiresAt = currentUser.delegationExpiry;
      const now = Date.now();
      isExpired = now > expiresAt;

      if (!isExpired) {
        const remaining = expiresAt - now;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) {
          timeRemaining = `${days} day${days > 1 ? 's' : ''}`;
        } else {
          timeRemaining = `${hours} hour${hours > 1 ? 's' : ''}`;
        }
      }
    }

    const canDelegate =
      isAuthenticated &&
      verificationStatus.level !== EVerificationStatus.UNVERIFIED;
    const needsRenewal =
      isExpired ||
      (expiresAt !== null && expiresAt - Date.now() < 24 * 60 * 60 * 1000); // Less than 24 hours

    return {
      isActive,
      isExpired,
      expiresAt,
      timeRemaining,
      canDelegate,
      needsRenewal,
    };
  }, [
    currentUser,
    getDelegationStatus,
    isAuthenticated,
    verificationStatus.level,
  ]);

  // Permission calculations
  const permissions = useMemo((): Permission => {
    const canPost =
      verificationStatus.level === EVerificationStatus.VERIFIED_OWNER;
    const canComment = canPost; // Same requirements for now
    const canVote =
      canPost || verificationStatus.hasENS || verificationStatus.hasOrdinal;
    const canCreateCell = canPost;
    const canDelegate =
      verificationStatus.level !== EVerificationStatus.UNVERIFIED;
    const canUpdateProfile = isAuthenticated;

    const canModerate = (cellId: string): boolean => {
      if (!currentUser || !cellId) return false;
      // This would need to be enhanced with actual cell ownership data
      // For now, we'll return false and let the specific hooks handle this
      return false;
    };

    return {
      canPost,
      canComment,
      canVote,
      canCreateCell,
      canModerate,
      canDelegate,
      canUpdateProfile,
    };
  }, [verificationStatus, currentUser, isAuthenticated]);

  // Helper functions
  const hasPermission = (
    action: keyof Permission,
    cellId?: string
  ): boolean => {
    const permission = permissions[action];
    if (typeof permission === 'function') {
      return permission(cellId || '');
    }
    return Boolean(permission);
  };

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
    switch (verificationStatus.level) {
      case EVerificationStatus.VERIFIED_OWNER:
        return '🔑'; // Ordinal owner
      case EVerificationStatus.VERIFIED_BASIC:
        return '✅'; // Verified wallet
      default:
        if (verificationStatus.hasENS) return '🏷️'; // ENS
        return null;
    }
  };

  return {
    // Base auth data
    currentUser,
    isAuthenticated,
    isAuthenticating,

    // Enhanced status
    verificationStatus,
    delegationInfo,
    permissions,

    // Helper functions
    hasPermission,
    getDisplayName,
    getVerificationBadge,
  };
}

// Export the enhanced hook as the main useAuth hook
export { useEnhancedAuth as useAuth };
