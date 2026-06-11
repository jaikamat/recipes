/**
 * One-command launcher — `npm start` (what start.command runs).
 *
 * 1. If the app is already running on port 7878, just open the browser.
 * 2. Rebuild dist/ only when client/ or shared/ sources are newer than the
 *    last build (first run, or after pulling app changes).
 * 3. Start the server and open the browser.
 *
 * Recipe markdown changes never require a rebuild — the server reads the
 * files fresh on every request.
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(APP_DIR, 'dist');
const URL = 'http://localhost:7878';

/** Newest file mtime (ms) under a directory tree. */
function newestMtime(dir: string): number {
  let newest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    const mtime = entry.isDirectory() ? newestMtime(full) : fs.statSync(full).mtimeMs;
    if (mtime > newest) newest = mtime;
  }
  return newest;
}

async function isAlreadyRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${URL}/api/health`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

function openBrowser(): void {
  spawn('open', [URL], { detached: true, stdio: 'ignore' }).unref();
}

if (await isAlreadyRunning()) {
  console.log(`Already running — opening ${URL}`);
  openBrowser();
  process.exit(0);
}

const sourcesNewest = Math.max(
  newestMtime(path.join(APP_DIR, 'client')),
  newestMtime(path.join(APP_DIR, 'shared')),
);
const distBuiltAt = fs.existsSync(path.join(DIST, 'index.html'))
  ? fs.statSync(path.join(DIST, 'index.html')).mtimeMs
  : 0;

if (sourcesNewest > distBuiltAt) {
  console.log('Building the app (first run or app code changed)…');
  execFileSync('npx', ['vite', 'build'], { cwd: APP_DIR, stdio: 'inherit' });
}

console.log('Starting server…');
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  cwd: APP_DIR,
  stdio: 'inherit',
});
server.on('exit', (code) => process.exit(code ?? 0));

// Give the server a beat to bind, then open the browser.
setTimeout(openBrowser, 800);
