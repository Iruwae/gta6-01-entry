// serve.ts — SOLMAR BAY static dev server (GTA6-01 round 8 rebuild).
//
// Serves the game/ folder over plain HTTP so a desktop browser can load
// index.html and play from static files. Node 22+ standard library only:
// no dependencies, no build step, no installs.
//
// Usage:
//   node serve.ts            # serves game/ on http://127.0.0.1:8903/
//   PORT=8123 node serve.ts  # pick another port
//
// The game directory is resolved from this file's own location, never
// from the process working directory, so the server works no matter
// where you run it from.

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = resolve(HERE, 'game');
const PORT = Number(process.env.PORT || 8903);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = createServer((req, res) => {
  const rawPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const relPath = rawPath === '/' ? 'index.html' : rawPath.replace(/^\/+/, '');
  const file = join(GAME_DIR, relPath);

  // Never serve anything outside game/.
  if (!file.startsWith(GAME_DIR) || !existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  res.end(readFileSync(file));
});

server.listen(PORT, HOST, () => {
  console.log(`SOLMAR BAY serving game/ at http://${HOST}:${PORT}/`);
  console.log(`Open http://${HOST}:${PORT}/index.html to play.`);
});
