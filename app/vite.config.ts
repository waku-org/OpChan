import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: '::',
    port: 8080,
    watch: {
      // Watch source files in local packages for hot reload
      ignored: ['!**/node_modules/@opchan/**'],
    },
    fs: {
      // Allow serving files from the monorepo root
      allow: ['..'],
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      buffer: 'buffer',
      // Point to source files instead of dist for hot reloading
      '@opchan/core': path.resolve(__dirname, '../packages/core/src/index.ts'),
      '@opchan/react': path.resolve(__dirname, '../packages/react/src/index.ts'),
    },
  },
  optimizeDeps: {
    include: ['buffer'],
    // Exclude local packages from pre-bundling to enable hot reload
    exclude: ['@opchan/core', '@opchan/react'],
  },
  build: {
    target: 'es2022',
  },
}));
