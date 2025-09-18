import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Buffer } from 'buffer';
import { environment } from '@opchan/core';

// Configure the core library environment
environment.configure({
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  apiKeys: {
    ordiscan: import.meta.env.VITE_ORDISCAN_API,
  },
});

// Ensure Buffer is available in the browser (needed by some wallet libs)
if (!(window as Window & typeof globalThis).Buffer) {
  (window as Window & typeof globalThis).Buffer = Buffer;
}

createRoot(document.getElementById('root')!).render(<App />);
