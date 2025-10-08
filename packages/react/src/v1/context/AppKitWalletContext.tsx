import React, { createContext, useContext, useCallback, useMemo } from 'react';
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

export type AppKitWalletContextValue = AppKitWalletState & AppKitWalletControls;

const AppKitWalletContext = createContext<AppKitWalletContextValue | null>(null);

interface AppKitWalletProviderProps {
  children: React.ReactNode;
}

export function AppKitWalletProvider({ children }: AppKitWalletProviderProps) {
  const { initialized } = useAppKitState();
  const appKit = useAppKit();
  const { disconnect: appKitDisconnect } = useDisconnect();

  // Get account info for different chains
  const bitcoinAccount = useAppKitAccount({ namespace: 'bip122' });
  const ethereumAccount = useAppKitAccount({ namespace: 'eip155' });

  // Determine wallet state
  const isBitcoinConnected = bitcoinAccount.isConnected;
  const isEthereumConnected = ethereumAccount.isConnected;
  const isConnected = isBitcoinConnected || isEthereumConnected;

  const walletType = useMemo<'bitcoin' | 'ethereum' | null>(() => {
    if (isBitcoinConnected) return 'bitcoin';
    if (isEthereumConnected) return 'ethereum';
    return null;
  }, [isBitcoinConnected, isEthereumConnected]);

  const address = useMemo<string | null>(() => {
    if (isBitcoinConnected && bitcoinAccount.address) return bitcoinAccount.address;
    if (isEthereumConnected && ethereumAccount.address) return ethereumAccount.address;
    return null;
  }, [isBitcoinConnected, bitcoinAccount.address, isEthereumConnected, ethereumAccount.address]);

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
    await appKitDisconnect();
  }, [appKitDisconnect]);

  const value = useMemo<AppKitWalletContextValue>(() => ({
    address,
    walletType,
    isConnected,
    isInitialized: initialized,
    connect,
    disconnect,
  }), [address, walletType, isConnected, initialized, connect, disconnect]);

  return (
    <AppKitWalletContext.Provider value={value}>
      {children}
    </AppKitWalletContext.Provider>
  );
}

export function useAppKitWallet(): AppKitWalletContextValue {
  const ctx = useContext(AppKitWalletContext);
  if (!ctx) {
    throw new Error('useAppKitWallet must be used within AppKitWalletProvider');
  }
  return ctx;
}

