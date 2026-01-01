import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    remix({
      ssr: false,
    }),
    react(),
    UnoCSS(),
    tsconfigPaths(),
  ],
  build: {
    target: 'esnext',
  },
});