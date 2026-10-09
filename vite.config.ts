import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/xls-comparaison/',
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'zustand',
      'xlsx',
      'lucide-react',
      '@tanstack/react-table',
      'recharts',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
    ],
  },
});
