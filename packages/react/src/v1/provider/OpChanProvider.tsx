import React from 'react';
import { OpChanClient, type OpChanClientConfig } from '@opchan/core';
import { ClientProvider } from '../context/ClientContext';
import { StoreWiring } from './StoreWiring';
import { AppKitWalletProvider } from '../context/AppKitWalletContext';

export interface OpChanProviderProps {
  config: OpChanClientConfig;
  children: React.ReactNode;
}

/**
 * OpChan provider that constructs the OpChanClient and provides wallet context.
 * Must be nested inside WagmiProvider and AppKitProvider.
 */
export const OpChanProvider: React.FC<OpChanProviderProps> = ({ config, children }) => {
  const [client] = React.useState(() => new OpChanClient(config));

  return (
    <ClientProvider client={client}>
      <AppKitWalletProvider>
        <StoreWiring />
        {children}
      </AppKitWalletProvider>
    </ClientProvider>
  );
};


