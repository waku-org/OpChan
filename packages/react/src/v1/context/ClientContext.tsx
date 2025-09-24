import React, { createContext, useContext } from 'react';
import type { OpChanClient } from '@opchan/core';

interface ClientContextValue {
  client: OpChanClient;
}

const ClientContext = createContext<ClientContextValue | null>(null);

type ProviderProps = { client: OpChanClient; children: React.ReactNode };

export function ClientProvider({ client, children }: ProviderProps) {
  return (
    <ClientContext.Provider value={{ client }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient(): OpChanClient {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used within ClientProvider');
  return ctx.client;
}




