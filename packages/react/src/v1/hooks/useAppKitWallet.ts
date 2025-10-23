import { useCallback, useMemo } from 'react';
import {
  useAppKit,
  useAppKitAccount,
  useDisconnect,
  useAppKitState,
} from '@reown/appkit/react';

export interface AppKitWalletState {
  address: string | null;
  walletType: 'bitcoin' | 'ethereum' | null;
  isConnected: boolean;
  isInitialized: boolean;
}

export interface AppKitWalletControls {
  connect: (walletType: 'bitcoin' | 'ethereum') => void;
  disconnect: () => Promise<void>;
}

export type AppKitWalletValue = AppKitWalletState & AppKitWalletControls;

export function useAppKitWallet(): AppKitWalletValue {
  // Add error boundary for AppKit hooks
  let initialized = false;
  let appKit: ReturnType<typeof useAppKit> | null = null;
  let appKitDisconnect: (() => Promise<void>) | null = null;
  let bitcoinAccount: ReturnType<typeof useAppKitAccount> | null = null;
  let ethereumAccount: ReturnType<typeof useAppKitAccount> | null = null;

  try {
    const appKitState = useAppKitState();
    initialized = appKitState?.initialized || false;
    appKit = useAppKit();
    const disconnectHook = useDisconnect();
    appKitDisconnect = disconnectHook?.disconnect;
    bitcoinAccount = useAppKitAccount({ namespace: 'bip122' });
    ethereumAccount = useAppKitAccount({ namespace: 'eip155' });
  } catch (error) {
    console.warn('[useAppKitWallet] AppKit hooks not available yet:', error);
    // Return default values if AppKit is not initialized
    return {
      address: null,
      walletType: null,
      isConnected: false,
      isInitialized: false,
      connect: () => console.warn('AppKit not initialized'),
      disconnect: async () => console.warn('AppKit not initialized'),
    };
  }

  // Determine wallet state
  const isBitcoinConnected = bitcoinAccount?.isConnected || false;
  const isEthereumConnected = ethereumAccount?.isConnected || false;
  const isConnected = isBitcoinConnected || isEthereumConnected;

  const walletType = useMemo<'bitcoin' | 'ethereum' | null>(() => {
    if (isBitcoinConnected) return 'bitcoin';
    if (isEthereumConnected) return 'ethereum';
    return null;
  }, [isBitcoinConnected, isEthereumConnected]);

  const address = useMemo<string | null>(() => {
    if (isBitcoinConnected && bitcoinAccount?.address) return bitcoinAccount.address;
    if (isEthereumConnected && ethereumAccount?.address) return ethereumAccount.address;
    return null;
  }, [isBitcoinConnected, bitcoinAccount?.address, isEthereumConnected, ethereumAccount?.address]);

  const connect = useCallback((targetWalletType: 'bitcoin' | 'ethereum') => {
    if (!initialized || !appKit) {
      console.error('AppKit not initialized');
      return;
    }

    const namespace = targetWalletType === 'bitcoin' ? 'bip122' : 'eip155';
    appKit.open({
      view: 'Connect',
      namespace,
    });
  }, [initialized, appKit]);

  const disconnect = useCallback(async () => {
    if (appKitDisconnect) {
      await appKitDisconnect();
    }
  }, [appKitDisconnect]);

  return {
    address,
    walletType,
    isConnected,
    isInitialized: initialized,
    connect,
    disconnect,
  };
}




