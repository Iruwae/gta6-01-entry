// SOLMAR BAY — tiny static file server (Node stdlib only).
// Serves the game/ folder over plain HTTP so the browser can load the
// modules without file:// or CORS trouble. Listens on 127.0.0.1:8904
// (PORT env overrides). Resolves game/ from its own file location.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const thisDir = dirname(fileURLToPath(import.meta.url));
const GAME = resolve(thisDir, 'game');
const PORT = Number(process.env.PORT || 8904);

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  try {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
    const file = resolve(join(GAME, rel));
    if (!file.startsWith(GAME + '/') && file !== GAME) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch (e) {
    res.writeHead(500);
    res.end('server error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`SOLMAR BAY serving game/ at http://127.0.0.1:${PORT}/`);
});
