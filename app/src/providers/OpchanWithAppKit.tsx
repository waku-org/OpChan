import * as React from 'react';
import { OpChanProvider, type WalletAdapter, type WalletAdapterAccount } from '@opchan/react';
import { useAppKitAccount } from '@reown/appkit/react';
import type { OpChanClientConfig } from '@opchan/core';

interface Props { config: OpChanClientConfig; children: React.ReactNode }

export const OpchanWithAppKit: React.FC<Props> = ({ config, children }) => {
  const btc = useAppKitAccount({ namespace: 'bip122' });
  const eth = useAppKitAccount({ namespace: 'eip155' });

  const listenersRef = React.useRef(new Set<(a: WalletAdapterAccount | null) => void>());

  const getCurrent = React.useCallback((): WalletAdapterAccount | null => {
    if (btc.isConnected && btc.address) return { address: btc.address, walletType: 'bitcoin' };
    if (eth.isConnected && eth.address) return { address: eth.address, walletType: 'ethereum' };
    return null;
  }, [btc.isConnected, btc.address, eth.isConnected, eth.address]);

  const adapter = React.useMemo<WalletAdapter>(() => ({
    getAccount: () => getCurrent(),
    onChange: (cb) => {
      listenersRef.current.add(cb);
      return () => { listenersRef.current.delete(cb); };
    },
  }), [getCurrent]);

  // Notify listeners when AppKit account changes
  React.useEffect(() => {
    const account = getCurrent();
    listenersRef.current.forEach(cb => {
      try { cb(account); } catch (e) { /* ignore */ }
    });
  }, [getCurrent]);

  return (
    <OpChanProvider config={config} walletAdapter={adapter}>
      {children}
    </OpChanProvider>
  );
};


