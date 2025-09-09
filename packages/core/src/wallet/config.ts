import { AppKitOptions } from '@reown/appkit';
import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { createStorage } from 'wagmi';
import { mainnet, bitcoin, AppKitNetwork } from '@reown/appkit/networks';

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, bitcoin];

const projectId =
  process.env.VITE_REOWN_SECRET || '2ead96ea166a03e5ab50e5c190532e72';

if (!projectId) {
  throw new Error(
    'VITE_REOWN_SECRET is not defined. Please set it in your .env file'
  );
}

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: localStorage }),
  ssr: false, // Set to false for Vite/React apps
  projectId,
  networks,
});

// Export the Wagmi config for the provider
export const config = wagmiAdapter.wagmiConfig;

const bitcoinAdapter = new BitcoinAdapter({
  projectId,
});

const metadata = {
  name: 'OpChan',
  description: 'A Forum Library over Waku',
  url:
    process.env.NODE_ENV === 'production'
      ? 'https://opchan.app'
      : 'http://localhost:8080',
  icons: ['https://opchan.com/logo.png'],
};

export const appkitConfig: AppKitOptions = {
  adapters: [wagmiAdapter, bitcoinAdapter],
  networks,
  metadata,
  projectId,
  features: {
    analytics: false,
    socials: false,
    allWallets: false,
  },
  enableWalletConnect: false,
};
