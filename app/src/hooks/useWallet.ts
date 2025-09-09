import { useCallback, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { modal } from '@reown/appkit/react';

export const useWallet = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useWallet must be used within an AuthProvider');
  }

  const {
    currentUser,
    isAuthenticated,
    verificationStatus,
    connectWallet: contextConnectWallet,
    disconnectWallet: contextDisconnectWallet,
  } = context;

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
