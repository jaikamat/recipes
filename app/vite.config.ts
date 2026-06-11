/**
 * Vite configuration.
 *
 * - The client app lives in `client/`, so that's the Vite root.
 * - `@shared` aliases the isomorphic `shared/` directory (types, parser,
 *   aggregation) so the client imports the exact same code the server uses.
 * - In dev (`npm run dev`), API calls are proxied to the Express server on
 *   port 7878. In production (`npm start`), Express serves the built client
 *   itself and no proxy is involved.
 * - Vitest config rides along here so tests resolve `@shared` identically.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(dirname, 'client'),
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.join(dirname, 'shared'),
    },
  },
  server: {
    fs: {
      // Allow the dev server to serve files from app/ (one level above
      // the Vite root) so the @shared alias works in dev.
      allow: [dirname],
    },
    proxy: {
      '/api': 'http://localhost:7878',
    },
  },
  build: {
    outDir: path.join(dirname, 'dist'),
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.join(dirname, 'client/src/test-setup.ts')],
    include: [
      path.join(dirname, 'shared/**/*.test.ts'),
      path.join(dirname, 'client/src/**/*.test.{ts,tsx}'),
    ],
  },
});
