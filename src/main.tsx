import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Buffer } from 'buffer';

// Ensure Buffer is available in the browser (needed by some wallet libs)
if (!(window as Window & typeof globalThis).Buffer) {
  (window as Window & typeof globalThis).Buffer = Buffer;
}

createRoot(document.getElementById('root')!).render(<App />);
