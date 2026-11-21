// SOLMAR BAY — tiny static file server (Node stdlib only). Serves the
// game/ folder over plain HTTP so the browser can load the ES modules
// without file:// or CORS trouble. Listens on 127.0.0.1:8904 (PORT env
// overrides). Resolves the game folder from its own file location, never
// from the working directory.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'game');
const PORT = Number(process.env.PORT || 8904);
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
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const file = resolve(join(GAME_DIR, rel));
    if (!file.startsWith(GAME_DIR + '/') && file !== GAME_DIR) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const body = readFileSync(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
    });
    if (req.method === 'HEAD') res.end();
    else res.end(body);
  } catch (e) {
    res.writeHead(500);
    res.end('server error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`SOLMAR BAY serving ${GAME_DIR} at http://127.0.0.1:${PORT}/`);
});
