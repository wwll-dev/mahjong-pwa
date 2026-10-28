/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { navigationAllowlist, normalizeBase } from './src/pwa/base';
import { manifest } from './src/pwa/manifest';

export default defineConfig(() => {
  const base = normalizeBase(process.env.VITE_BASE);
  return {
    base,
    plugins: [
      react(),
      ...(!process.env.VITEST
        ? [VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
            manifest,
            workbox: {
              navigateFallback: 'index.html',
              navigateFallbackAllowlist: navigationAllowlist(base),
              globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
            },
          })]
        : []),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  };
});
