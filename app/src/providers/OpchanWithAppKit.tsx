import * as React from 'react';
import {
  OpChanProvider,
  type WalletAdapter,
  type WalletAdapterAccount,
} from '@opchan/react';
import { useAppKitAccount, modal } from '@reown/appkit/react';
import { AppKit } from '@reown/appkit';
import type { OpChanClientConfig } from '@opchan/core';
import { walletManager } from '@opchan/core';

interface Props {
  config: OpChanClientConfig;
  children: React.ReactNode;
}

export const OpchanWithAppKit: React.FC<Props> = ({ config, children }) => {
  const btc = useAppKitAccount({ namespace: 'bip122' });
  const eth = useAppKitAccount({ namespace: 'eip155' });

  const listenersRef = React.useRef(
    new Set<(a: WalletAdapterAccount | null) => void>()
  );

  const getCurrent = React.useCallback((): WalletAdapterAccount | null => {
    if (btc.isConnected && btc.address)
      return { address: btc.address, walletType: 'bitcoin' };
    if (eth.isConnected && eth.address)
      return { address: eth.address, walletType: 'ethereum' };
    return null;
  }, [btc.isConnected, btc.address, eth.isConnected, eth.address]);

  const adapter = React.useMemo<WalletAdapter>(
    () => ({
      getAccount: () => getCurrent(),
      onChange: cb => {
        listenersRef.current.add(cb);
        return () => {
          listenersRef.current.delete(cb);
        };
      },
    }),
    [getCurrent]
  );

  // Notify listeners when AppKit account changes
  React.useEffect(() => {
    const account = getCurrent();
    listenersRef.current.forEach(cb => {
      try {
        cb(account);
      } catch {
        /* ignore */
      }
    });
  }, [getCurrent]);

  React.useEffect(() => {
    if (!modal) return;
    try {
      const hasBtc = btc.isConnected && !!btc.address;
      const hasEth = eth.isConnected && !!eth.address;
      if (hasBtc || hasEth) {
        walletManager.create(modal as AppKit, btc, eth);
      } else if (walletManager.hasInstance()) {
        walletManager.clear();
      }
    } catch (err) {
      console.warn('WalletManager initialization error', err);
    }
  }, [btc, btc.isConnected, btc.address, eth, eth.isConnected, eth.address]);

  return (
    <OpChanProvider config={config} walletAdapter={adapter}>
      {children}
    </OpChanProvider>
  );
};
