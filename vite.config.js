import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // 相对路径：构建产物可在任何子路径部署，避免绝对 /assets 404
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8010',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
