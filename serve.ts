// SOLMAR BAY — tiny static file server (Node stdlib only).
// Serves the game/ folder over plain HTTP so the browser can load the
// modules without file:// or CORS trouble.
// Listens on 127.0.0.1:8904 (PORT env overrides).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), 'game');
const port = Number(process.env.PORT || 8904);
const MIME = {
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
    const p = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = resolve(join(root, p === '/' ? 'index.html' : p));
    if (file !== root && !file.startsWith(root + '/')) {
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
    res.end('error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`SOLMAR BAY serving game/ on http://127.0.0.1:${port}/`);
});
