/**
 * The whole backend.
 *
 * - GET /api/recipes  → all recipes, parsed fresh from markdown per request
 * - GET /api/health   → liveness probe used by scripts/start.ts
 * - everything else   → the built client from dist/ (SPA fallback to index.html)
 *
 * All app state (shopping list, weekly plan) lives in the browser's
 * localStorage; this server never writes anything.
 */
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { loadRecipes, REPO_ROOT } from './recipes.js';

export const PORT = 7878;
const DIST = path.join(REPO_ROOT, 'app/dist');

const app = express();

app.get('/api/recipes', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await loadRecipes());
});

app.get('/api/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true });
});

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  // SPA fallback: any non-API path serves the client and lets the router
  // resolve it (e.g. a bookmarked /recipe/dinner/mapo-tofu).
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(DIST, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res
      .status(503)
      .send('Client not built yet — run "npm start" (or "npm run build") in app/.');
  });
}

app.listen(PORT, () => {
  console.log(`Recipe app: http://localhost:${PORT}`);
});
