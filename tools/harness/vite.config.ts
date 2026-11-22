// Visual harness: the real client with a mocked Devvit client and API. Never shipped.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwind()],
  resolve: { alias: { '@devvit/web/client': fileURLToPath(new URL('./devvit-client.ts', import.meta.url)) } },
  server: { port: 5199, strictPort: true, fs: { allow: ['../..'] } },
});
