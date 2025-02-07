import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'LaneRunner',
        short_name: 'LaneRunner',
        description: 'Modern freight management platform',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'state': ['zustand'],
          'supabase': ['@supabase/supabase-js'],
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api/loads': {
        target: process.env.VITE_LOAD_SERVICE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/loads/, '')
      },
      '/api/quotes': {
        target: process.env.VITE_QUOTE_SERVICE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/quotes/, '')
      },
      '/api/shipments': {
        target: process.env.VITE_SHIPMENT_SERVICE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/shipments/, '')
      },
      '/api/carriers': {
        target: process.env.VITE_CARRIER_SERVICE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/carriers/, '')
      },
      '/api/messages': {
        target: process.env.VITE_MESSAGE_SERVICE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/messages/, '')
      }
    }
  },
})
