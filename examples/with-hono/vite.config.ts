import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@static-admin/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@static-admin/ui/styles.css': path.resolve(__dirname, '../../packages/ui/src/styles.css'),
    },
  },
  build: {
    outDir: 'dist/client',
    emptyDirBeforeWrite: true,
  },
});
