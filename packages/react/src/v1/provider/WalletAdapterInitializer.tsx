import React from 'react';
import { useAppKit, useAppKitAccount, useAppKitState } from '@reown/appkit/react';
import type { UseAppKitAccountReturn } from '@reown/appkit/react';
import { WalletManager } from '@opchan/core';
import type { AppKit } from '@reown/appkit';

export const WalletAdapterInitializer: React.FC = () => {
  // Add error boundary for AppKit hooks
  let initialized = false;
  let appKit: ReturnType<typeof useAppKit> | null = null;
  let btc: UseAppKitAccountReturn | null = null;
  let eth: UseAppKitAccountReturn | null = null;

  try {
    const appKitState = useAppKitState();
    initialized = appKitState?.initialized || false;
    appKit = useAppKit();
    btc = useAppKitAccount({ namespace: 'bip122' });
    eth = useAppKitAccount({ namespace: 'eip155' });
  } catch (error) {
    console.warn('[WalletAdapterInitializer] AppKit hooks not available yet:', error);
    // Return early if AppKit is not initialized
    return null;
  }

  React.useEffect(() => {
    // Only proceed if AppKit is properly initialized
    if (!initialized || !appKit || !btc || !eth) {
      return;
    }

    const isBtc = btc.isConnected && !!btc.address;
    const isEth = eth.isConnected && !!eth.address;
    const anyConnected = isBtc || isEth;

    if (anyConnected) {
      // Initialize WalletManager for signing flows
      try {
        WalletManager.create(
          appKit as unknown as AppKit,
          btc as unknown as UseAppKitAccountReturn,
          eth as unknown as UseAppKitAccountReturn,
        );
      } catch (e) {
        console.warn('[WalletAdapterInitializer] WalletManager.create failed', e);
      }
      return () => {
        try { WalletManager.clear(); } catch (e) { console.warn('[WalletAdapterInitializer] WalletManager.clear failed', e); }
      };
    }

    // No connection: clear manager
    try { WalletManager.clear(); } catch (e) { console.warn('[WalletAdapterInitializer] WalletManager.clear failed', e); }
  }, [initialized, appKit, btc?.isConnected, btc?.address, eth?.isConnected, eth?.address]);

  return null;
};


