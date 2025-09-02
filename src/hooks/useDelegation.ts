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
    isDelegationValid: contextIsDelegationValid,
    delegationTimeRemaining: contextDelegationTimeRemaining,
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
    const isValid = contextIsDelegationValid();
    const timeRemaining = contextDelegationTimeRemaining();

    return {
      hasDelegation: timeRemaining > 0,
      isValid,
      timeRemaining: timeRemaining > 0 ? timeRemaining : undefined,
      expiresAt:
        timeRemaining > 0 ? new Date(Date.now() + timeRemaining) : undefined,
    };
  }, [contextIsDelegationValid, contextDelegationTimeRemaining]);

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
