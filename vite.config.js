import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4100,
    host: true,
    strictPort: true,
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:4110',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4100,
    host: true,
    strictPort: true,
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:4110',
        changeOrigin: true,
      },
    },
  },
});
