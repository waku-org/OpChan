import React from 'react';
import { OpChanClient, type OpChanClientConfig } from '@opchan/core';
import { ClientProvider } from '../context/ClientContext';
import { StoreWiring } from './StoreWiring';
import { setOpchanState } from '../store/opchanStore';
import { EVerificationStatus } from '@opchan/core';
import type { EDisplayPreference, User } from '@opchan/core';

export interface WalletAdapterAccount {
  address: string;
  walletType: 'bitcoin' | 'ethereum';
}

export interface WalletAdapter {
  getAccount(): WalletAdapterAccount | null;
  onChange(callback: (account: WalletAdapterAccount | null) => void): () => void;
}

export interface NewOpChanProviderProps {
  config: OpChanClientConfig;
  walletAdapter?: WalletAdapter;
  children: React.ReactNode;
}

/**
 * New provider that constructs the OpChanClient and sets up DI.
 * Event wiring and store hydration will be handled in a separate effect layer.
 */
export const OpChanProvider: React.FC<NewOpChanProviderProps> = ({ config, walletAdapter, children }) => {
  const [client] = React.useState(() => new OpChanClient(config));

  // Bridge wallet adapter to session state
  React.useEffect(() => {
    if (!walletAdapter) return;

    const syncFromAdapter = async (account: WalletAdapterAccount | null) => {
      if (account) {
        // Persist base user and update session
        const baseUser: User = {
          address: account.address,
          walletType: account.walletType,
          displayPreference: 'wallet-address' as EDisplayPreference,
          verificationStatus: EVerificationStatus.WALLET_CONNECTED,
          displayName: account.address,
          lastChecked: Date.now(),
        };
        try {
          await client.database.storeUser(baseUser);
        } catch (err) {
          console.warn('OpChanProvider: failed to persist base user', err);
        }
        setOpchanState(prev => ({
          ...prev,
          session: {
            currentUser: baseUser,
            verificationStatus: baseUser.verificationStatus,
            delegation: prev.session.delegation,
          },
        }));
      } else {
        // Clear session on disconnect
        try { await client.database.clearUser(); } catch (err) {
          console.warn('OpChanProvider: failed to clear user on disconnect', err);
        }
        setOpchanState(prev => ({
          ...prev,
          session: {
            currentUser: null,
            verificationStatus: EVerificationStatus.WALLET_UNCONNECTED,
            delegation: null,
          },
        }));
      }
    };

    // Initial sync
    syncFromAdapter(walletAdapter.getAccount());
    // Subscribe
    const off = walletAdapter.onChange(syncFromAdapter);
    return () => { try { off(); } catch { /* noop */ } };
  }, [walletAdapter, client]);

  return (
    <ClientProvider client={client}>
      <StoreWiring />
      {children}
    </ClientProvider>
  );
};


