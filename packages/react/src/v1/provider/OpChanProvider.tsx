import React from "react";
import { OpChanClient, type OpChanClientConfig } from "@opchan/core";
import { ClientProvider } from "../context/ClientContext";
import { StoreWiring } from "./StoreWiring";
import { WalletAdapterInitializer } from "./WalletAdapterInitializer";
import { AppKitProvider } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";
import { appkitConfig, config as wagmiConfig } from "@opchan/core";
import { AppKitErrorBoundary } from "../components/AppKitErrorBoundary";

export interface OpChanProviderProps {
  config: OpChanClientConfig;
  children: React.ReactNode;
}

/**
 * OpChan provider that constructs the OpChanClient and provides wallet context.
 * This component already wraps WagmiProvider and AppKitProvider internally,
 * so you can mount it directly at your app root with the required config.
 */
export const OpChanProvider: React.FC<OpChanProviderProps> = ({
  config,
  children,
}) => {
  const [client] = React.useState(() => new OpChanClient(config));

  return (
    <WagmiProvider config={wagmiConfig}>
      <AppKitErrorBoundary>
        <AppKitProvider {...appkitConfig}>
          <ClientProvider client={client}>
            <WalletAdapterInitializer />
            <StoreWiring />
            {children}
          </ClientProvider>
        </AppKitProvider>
      </AppKitErrorBoundary>
    </WagmiProvider>
  );
};
