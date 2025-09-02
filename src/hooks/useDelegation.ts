import { useCallback, useContext, useMemo } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { DelegationDuration } from '@/lib/delegation';

export const useDelegation = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useDelegation must be used within an AuthProvider');
  }

  const {
    delegateKey: contextDelegateKey,
    getDelegationStatus: contextGetDelegationStatus,
    clearDelegation: contextClearDelegation,
    isAuthenticating,
  } = context;

  const createDelegation = useCallback(
    async (duration?: DelegationDuration): Promise<boolean> => {
      return contextDelegateKey(duration);
    },
    [contextDelegateKey]
  );

  const clearDelegation = useCallback((): void => {
    contextClearDelegation();
  }, [contextClearDelegation]);

  const delegationStatus = useMemo(() => {
    const status = contextGetDelegationStatus();

    return {
      hasDelegation: status.hasDelegation,
      isValid: status.isValid,
      timeRemaining: status.timeRemaining,
      expiresAt:
        status.timeRemaining ? new Date(Date.now() + status.timeRemaining) : undefined,
      publicKey: status.publicKey,
      address: status.address,
      walletType: status.walletType,
    };
  }, [contextGetDelegationStatus]);

  const formatTimeRemaining = useCallback((timeMs: number): string => {
    const hours = Math.floor(timeMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days === 1 ? '' : 's'}`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }, []);

  return {
    // Delegation status
    delegationStatus,
    isCreatingDelegation: isAuthenticating,

    // Delegation actions
    createDelegation,
    clearDelegation,

    // Utilities
    formatTimeRemaining,
  };
};
