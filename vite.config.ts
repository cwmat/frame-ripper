import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/frame-ripper/',
  server: {
    fs: {
      // When running from a git worktree under .claude/worktrees/<name>/, the
      // installed node_modules live at the parent project root, not inside the
      // worktree. Allow the workspace root plus three levels up so Vite can
      // serve packages like @ffmpeg/ffmpeg's worker bundle from there.
      allow: [searchForWorkspaceRoot(process.cwd()), '..', '../..', '../../..'],
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'FrameRipper',
        short_name: 'FrameRipper',
        description: 'Extract video frames as PNG/JPG — fully client-side',
        theme_color: '#0d0221',
        background_color: '#0d0221',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/unpkg\.com\/@ffmpeg\/core.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ffmpeg-core-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build: {
    target: 'esnext',
  },
});
