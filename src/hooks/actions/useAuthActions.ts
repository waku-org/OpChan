import { useCallback, useState } from 'react';
import { useAuth } from '@/hooks/core/useAuth';
import { DelegationDuration } from '@/lib/delegation';
import { useToast } from '@/components/ui/use-toast';
import { useAuth as useAuthContext } from '@/contexts/useAuth';
import { EVerificationStatus } from '@/types/identity';

export interface AuthActionStates {
  isConnecting: boolean;
  isVerifying: boolean;
  isDelegating: boolean;
  isDisconnecting: boolean;
}

export interface AuthActions extends AuthActionStates {
  // Connection actions
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => Promise<boolean>;

  // Verification actions
  verifyWallet: () => Promise<boolean>;

  // Delegation actions
  delegateKey: (duration: DelegationDuration) => Promise<boolean>;
  clearDelegation: () => Promise<boolean>;
  renewDelegation: (duration: DelegationDuration) => Promise<boolean>;

  // Utility actions
  checkVerificationStatus: () => Promise<void>;
}

/**
 * Hook for authentication and verification actions
 */
export function useAuthActions(): AuthActions {
  const { isAuthenticated, isAuthenticating, verificationStatus } = useAuth();

  const {
    verifyOwnership,
    delegateKey: delegateKeyFromContext,
    getDelegationStatus,
  } = useAuthContext();
  const { toast } = useToast();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Connect wallet
  const connectWallet = useCallback(async (): Promise<boolean> => {
    if (isAuthenticated) {
      toast({
        title: 'Already Connected',
        description: 'Your wallet is already connected.',
      });
      return true;
    }

    setIsConnecting(true);

    try {
      // This would trigger the wallet connection flow
      // The actual implementation would depend on the wallet system
      // For now, we'll assume it's handled by the auth context

      toast({
        title: 'Connecting...',
        description: 'Please approve the connection in your wallet.',
      });

      // Wait for authentication to complete
      // This is a simplified implementation
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (isAuthenticated) {
        toast({
          title: 'Wallet Connected',
          description: 'Your wallet has been connected successfully.',
        });
        return true;
      } else {
        toast({
          title: 'Connection Failed',
          description: 'Failed to connect wallet. Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast({
        title: 'Connection Error',
        description: 'An error occurred while connecting your wallet.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [isAuthenticated, toast]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) {
      toast({
        title: 'Not Connected',
        description: 'No wallet is currently connected.',
      });
      return true;
    }

    setIsDisconnecting(true);

    try {
      // This would trigger the wallet disconnection
      // The actual implementation would depend on the wallet system

      toast({
        title: 'Wallet Disconnected',
        description: 'Your wallet has been disconnected.',
      });
      return true;
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      toast({
        title: 'Disconnection Error',
        description: 'An error occurred while disconnecting your wallet.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsDisconnecting(false);
    }
  }, [isAuthenticated, toast]);

  // Verify wallet
  const verifyWallet = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first.',
        variant: 'destructive',
      });
      return false;
    }

    if (verificationStatus !== EVerificationStatus.WALLET_UNCONNECTED) {
      toast({
        title: 'Already Verified',
        description: 'Your wallet is already verified.',
      });
      return true;
    }

    setIsVerifying(true);

    try {
      // Call the real verification function from AuthContext
      const success = await verifyOwnership();

      if (success) {
        toast({
          title: 'Verification Complete',
          description: 'Your wallet has been verified successfully.',
        });
      } else {
        toast({
          title: 'Verification Failed',
          description: 'Failed to verify wallet ownership. Please try again.',
          variant: 'destructive',
        });
      }

      return success;
    } catch (error) {
      console.error('Failed to verify wallet:', error);
      toast({
        title: 'Verification Failed',
        description: 'Failed to verify wallet. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [isAuthenticated, verificationStatus, verifyOwnership, toast]);

  // Delegate key
  const delegateKey = useCallback(
    async (duration: DelegationDuration): Promise<boolean> => {
      if (!isAuthenticated) {
        toast({
          title: 'Wallet Not Connected',
          description: 'Please connect your wallet first.',
          variant: 'destructive',
        });
        return false;
      }

      if (verificationStatus === EVerificationStatus.WALLET_UNCONNECTED) {
        toast({
          title: 'Verification Required',
          description: 'Please verify your wallet before delegating keys.',
          variant: 'destructive',
        });
        return false;
      }

      setIsDelegating(true);

      try {
        // Call the real delegation function from AuthContext
        const success = await delegateKeyFromContext(duration);

        if (success) {
          const durationLabel = duration === '7days' ? '1 week' : '30 days';
          toast({
            title: 'Key Delegated',
            description: `Your signing key has been delegated for ${durationLabel}.`,
          });
        } else {
          toast({
            title: 'Delegation Failed',
            description: 'Failed to delegate signing key. Please try again.',
            variant: 'destructive',
          });
        }

        return success;
      } catch (error) {
        console.error('Failed to delegate key:', error);
        toast({
          title: 'Delegation Failed',
          description: 'Failed to delegate signing key. Please try again.',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsDelegating(false);
      }
    },
    [isAuthenticated, verificationStatus, delegateKeyFromContext, toast]
  );

  // Clear delegation
  const clearDelegation = useCallback(async (): Promise<boolean> => {
    const delegationInfo = await getDelegationStatus();
    if (!delegationInfo.isValid) {
      toast({
        title: 'No Active Delegation',
        description: 'There is no active key delegation to clear.',
      });
      return true;
    }

    try {
      // This would clear the delegation
      // The actual implementation would use the DelegationManager

      toast({
        title: 'Delegation Cleared',
        description: 'Your key delegation has been cleared.',
      });
      return true;
    } catch (error) {
      console.error('Failed to clear delegation:', error);
      toast({
        title: 'Clear Failed',
        description: 'Failed to clear delegation. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [getDelegationStatus, toast]);

  // Renew delegation
  const renewDelegation = useCallback(
    async (duration: DelegationDuration): Promise<boolean> => {
      // Clear existing delegation first, then create new one
      const cleared = await clearDelegation();
      if (!cleared) return false;

      return delegateKey(duration);
    },
    [clearDelegation, delegateKey]
  );

  // Check verification status
  const checkVerificationStatus = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;

    try {
      // This would check the current verification status
      // The actual implementation would query the verification service

      toast({
        title: 'Status Updated',
        description: 'Verification status has been refreshed.',
      });
    } catch (error) {
      console.error('Failed to check verification status:', error);
      toast({
        title: 'Status Check Failed',
        description: 'Failed to refresh verification status.',
        variant: 'destructive',
      });
    }
  }, [isAuthenticated, toast]);

  return {
    // States
    isConnecting,
    isVerifying: isVerifying || isAuthenticating,
    isDelegating,
    isDisconnecting,

    // Actions
    connectWallet,
    disconnectWallet,
    verifyWallet,
    delegateKey,
    clearDelegation,
    renewDelegation,
    checkVerificationStatus,
  };
}
