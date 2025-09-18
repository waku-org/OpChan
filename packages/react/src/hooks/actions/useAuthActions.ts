import { useCallback, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DelegationDuration, EVerificationStatus } from '@opchan/core';

export interface AuthActionStates {
  isConnecting: boolean;
  isVerifying: boolean;
  isDelegating: boolean;
  isDisconnecting: boolean;
}

export interface AuthActions extends AuthActionStates {
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => Promise<boolean>;
  verifyWallet: () => Promise<boolean>;
  delegateKey: (duration: DelegationDuration) => Promise<boolean>;
  clearDelegation: () => Promise<boolean>;
  renewDelegation: (duration: DelegationDuration) => Promise<boolean>;
  checkVerificationStatus: () => Promise<void>;
}

export function useAuthActions(): AuthActions {
  const {
    isAuthenticated,
    isAuthenticating,
    verificationStatus,
    connectWallet: baseConnectWallet,
    disconnectWallet: baseDisconnectWallet,
    verifyOwnership,
    delegateKey: baseDelegateKey,
    getDelegationStatus,
    clearDelegation: baseClearDelegation,
  } = useAuth();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const connectWallet = useCallback(async (): Promise<boolean> => {
    if (isAuthenticated) return true;

    setIsConnecting(true);
    try {
      const result = await baseConnectWallet();
      return result;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [isAuthenticated, baseConnectWallet]);

  const disconnectWallet = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) return true;

    setIsDisconnecting(true);
    try {
      baseDisconnectWallet();
      return true;
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      return false;
    } finally {
      setIsDisconnecting(false);
    }
  }, [isAuthenticated, baseDisconnectWallet]);

  const verifyWallet = useCallback(async (): Promise<boolean> => {
    console.log('🎯 verifyWallet called, isAuthenticated:', isAuthenticated, 'verificationStatus:', verificationStatus);
    
    if (!isAuthenticated) {
      console.log('❌ Not authenticated, returning false');
      return false;
    }

    if (verificationStatus === EVerificationStatus.ENS_ORDINAL_VERIFIED) {
      console.log('✅ Already verified, returning true');
      return true;
    }

    console.log('🔄 Setting isVerifying to true and calling verifyOwnership...');
    setIsVerifying(true);
    try {
      const success = await verifyOwnership();
      console.log('📊 verifyOwnership result:', success);
      return success;
    } catch (error) {
      console.error('❌ Failed to verify wallet:', error);
      return false;
    } finally {
      console.log('🔄 Setting isVerifying to false');
      setIsVerifying(false);
    }
  }, [isAuthenticated, verificationStatus, verifyOwnership]);

  const delegateKey = useCallback(
    async (duration: DelegationDuration): Promise<boolean> => {
      if (!isAuthenticated) return false;

      if (verificationStatus === EVerificationStatus.WALLET_UNCONNECTED) {
        return false;
      }

      setIsDelegating(true);
      try {
        const success = await baseDelegateKey(duration);
        return success;
      } catch (error) {
        console.error('Failed to delegate key:', error);
        return false;
      } finally {
        setIsDelegating(false);
      }
    },
    [isAuthenticated, verificationStatus, baseDelegateKey]
  );

  const clearDelegation = useCallback(async (): Promise<boolean> => {
    const delegationInfo = await getDelegationStatus();
    if (!delegationInfo.isValid) return true;

    try {
      await baseClearDelegation();
      return true;
    } catch (error) {
      console.error('Failed to clear delegation:', error);
      return false;
    }
  }, [getDelegationStatus, baseClearDelegation]);

  const renewDelegation = useCallback(
    async (duration: DelegationDuration): Promise<boolean> => {
      const cleared = await clearDelegation();
      if (!cleared) return false;
      return delegateKey(duration);
    },
    [clearDelegation, delegateKey]
  );

  const checkVerificationStatus = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;
    // This would refresh verification status - simplified for now
  }, [isAuthenticated]);

  return {
    isConnecting,
    isVerifying: isVerifying || isAuthenticating,
    isDelegating,
    isDisconnecting,
    connectWallet,
    disconnectWallet,
    verifyWallet,
    delegateKey,
    clearDelegation,
    renewDelegation,
    checkVerificationStatus,
  };
}
