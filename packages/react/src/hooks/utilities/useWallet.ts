import { useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { modal } from '@reown/appkit/react';

export const useWallet = () => {
  const {
    currentUser,
    isAuthenticated,
    verificationStatus,
    connectWallet: contextConnectWallet,
    disconnectWallet: contextDisconnectWallet,
  } = useAuth();

  const connect = useCallback(async (): Promise<boolean> => {
    return contextConnectWallet();
  }, [contextConnectWallet]);

  const disconnect = useCallback((): void => {
    contextDisconnectWallet();
  }, [contextDisconnectWallet]);

  const openModal = useCallback(async (): Promise<void> => {
    if (modal) {
      await modal.open();
    }
  }, []);

  const closeModal = useCallback((): void => {
    if (modal) {
      modal.close();
    }
  }, []);

  return {
    // Wallet state
    isConnected: isAuthenticated,
    address: currentUser?.address,
    walletType: currentUser?.walletType,
    verificationStatus,
    currentUser,

    // Wallet actions
    connect,
    disconnect,
    openModal,
    closeModal,
  };
};
