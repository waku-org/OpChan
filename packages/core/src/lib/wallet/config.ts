import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Default WalletConnect project ID - users should override with their own
const DEFAULT_PROJECT_ID = '2ead96ea166a03e5ab50e5c190532e72';

export function createWagmiConfig(projectId?: string) {
  const wcProjectId = projectId || DEFAULT_PROJECT_ID;

  return createConfig({
    chains: [mainnet],
    connectors: [
      injected(), // MetaMask, Coinbase Wallet extension, etc.
      walletConnect({
        projectId: wcProjectId,
        metadata: {
          name: 'OpChan',
          description: 'Decentralized Forum',
          url: 'https://opchan.app',
          icons: ['https://opchan.app/icon.png'],
        },
        showQrModal: true,
      }),
      coinbaseWallet({ 
        appName: 'OpChan',
        appLogoUrl: 'https://opchan.app/icon.png',
      }),
    ],
    transports: {
      [mainnet.id]: http(),
    },
  });
}

// Default config export for convenience
export const wagmiConfig = createWagmiConfig();
export const config = wagmiConfig; // Alias for backward compatibility
