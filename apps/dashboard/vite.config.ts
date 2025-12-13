import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Radix UI components
          'ui-vendor': [
            '@radix-ui/react-toast',
            '@radix-ui/react-slot',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-dialog',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],

          // State management & data fetching
          'query-vendor': ['@tanstack/react-query', 'zustand'],

          // Charts
          'chart-vendor': ['recharts'],

          // Terminal
          'terminal-vendor': ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-web-links'],

          // Forms
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],

          // Internationalization
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],

          // Utilities
          'utils-vendor': [
            'date-fns',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
            'framer-motion',
            'socket.io-client',
          ],
        },
      },
    },
  },
});
