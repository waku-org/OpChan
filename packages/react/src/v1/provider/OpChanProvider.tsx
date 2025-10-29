import React from "react";
import { OpChanClient, type OpChanClientConfig, createWagmiConfig } from "@opchan/core";
import { ClientProvider } from "../context/ClientContext";
import { StoreWiring } from "./StoreWiring";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export interface OpChanProviderProps {
  config: OpChanClientConfig;
  children: React.ReactNode;
}

// Create a default QueryClient instance
const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * OpChan provider that constructs the OpChanClient and provides wallet context.
 * Simplified to use WagmiProvider + QueryClient only (no AppKit).
 */
export const OpChanProvider: React.FC<OpChanProviderProps> = ({
  config,
  children,
}) => {
  const [client] = React.useState(() => new OpChanClient(config));
  const [wagmiConfig] = React.useState(() => createWagmiConfig(config.reownProjectId));

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={defaultQueryClient}>
        <ClientProvider client={client}>
          <StoreWiring />
          {children}
        </ClientProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
