import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'client',
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'client/index.html'),
        styleguide: resolve(__dirname, 'client/styleguide.html'),
        privacy: resolve(__dirname, 'client/privacy.html'),
      },
    },
  },
  server: {
    proxy: {
      '/ws': { target: 'ws://localhost:3036', ws: true },
      '/api': { target: 'http://localhost:3036' },
    },
  },
});
