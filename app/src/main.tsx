import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Buffer } from 'buffer';
import { OpChanProvider } from '@opchan/react';
import { WagmiProvider } from 'wagmi';
import { AppKitProvider } from '@reown/appkit/react';
import { appkitConfig, config } from '@opchan/core';

if (!(window as Window & typeof globalThis).Buffer) {
  (window as Window & typeof globalThis).Buffer = Buffer;
}

createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={config}>
    <AppKitProvider {...appkitConfig}>
      <OpChanProvider
        ordiscanApiKey={'6bb07766-d98c-4ddd-93fb-6a0e94d629dd'}
        debug={import.meta.env.DEV}
      >
        <App />
      </OpChanProvider>
    </AppKitProvider>
  </WagmiProvider>
);
