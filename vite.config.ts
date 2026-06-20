import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: 'Manga Panel Editor',
        short_name: 'MangaEditor',
        description: 'Browser-based manga panel editor with PNG export.',
        theme_color: '#111827',
        background_color: '#f7f8fb',
        display: 'standalone',
        scope: './',
        start_url: './'
      }
    })
  ]
});
