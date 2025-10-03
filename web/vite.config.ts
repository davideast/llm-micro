import { defineConfig } from 'vite';
import fileRoutes from './plugins/api';
import path from 'node:path';

export default defineConfig({
  plugins: [fileRoutes],
  appType: 'spa',
  server: {
    middlewareMode: false
  },
  resolve: {
    alias: {
      '@/lib': path.resolve(__dirname, '../src'),
    }
  },
});
