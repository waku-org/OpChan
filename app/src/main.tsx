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
        ordiscanApiKey: '6bb07766-d98c-4ddd-93fb-6a0e94d629dd',
        wakuConfig: {
          contentTopic: '/opchan/1/messages/proto',
          reliableChannelId: 'opchan-messages'
        }
      }}>
        <App />
      </OpChanProvider>
);
