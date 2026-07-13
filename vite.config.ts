import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base is relative so the built app can be served from any static path
// (GitHub Pages project sites, subfolders, file previews, …).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
});
