import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Buffer } from 'buffer';
import { OpChanProvider } from '@opchan/react';

if (!(window as Window & typeof globalThis).Buffer) {
  (window as Window & typeof globalThis).Buffer = Buffer;
}

createRoot(document.getElementById('root')!).render(
      <OpChanProvider config={{ 
        wakuConfig: {
          contentTopic: '/opchan-demo/1/messages/proto',
          reliableChannelId: 'opchan-messages'
        },
        reownProjectId: import.meta.env.VITE_REOWN_SECRET || '2ead96ea166a03e5ab50e5c190532e72'
      }}>
        <App />
      </OpChanProvider>
);
