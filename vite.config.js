
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // =========================================================================
  // === FIX: Ensure Electron can find assets in the packaged app by ========\
  // === using relative paths. Default is '/', which fails on local fs. ===
  base: './',
  // =========================================================================

  plugins: [react()],
  
  // FIX: Explicitly set the server port to match Electron's expectation
  server: {
    port: 5000,
    proxy: {
      // Dev: forward /api → Express backend (port 20246), mirror nginx prod
      '/api': { target: 'http://127.0.0.1:20246', changeOrigin: true },
    },
  },

  // =========================================================================
  // === BUILD OPTIMIZATION ================================================
  // =========================================================================
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  // =========================================================================

  define: {
    'process.env': {}
  },
  resolve: {
    alias: {
      // SWITCHED TO a more robust path resolution method
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
});
