import React, { createContext, useContext } from 'react';
import { OpChanClient } from '@opchan/core';

export interface ClientContextValue {
  client: OpChanClient;
}

const ClientContext = createContext<ClientContextValue | null>(null);

export const ClientProvider: React.FC<{
  client: OpChanClient;
  children: React.ReactNode;
}> = ({ client, children }) => {
  return (
    <ClientContext.Provider value={{ client }}>
      {children}
    </ClientContext.Provider>
  );
};

export function useClient(): OpChanClient {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within OpChanProvider');
  }
  return context.client;
}

export { ClientContext };
