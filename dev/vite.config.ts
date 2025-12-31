import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@static-admin/ui': path.resolve(__dirname, '../packages/ui/src'),
      '@static-admin/ui/styles.css': path.resolve(__dirname, '../packages/ui/src/styles.css'),
    },
  },
  css: {
    postcss: path.resolve(__dirname, '../packages/ui'),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
