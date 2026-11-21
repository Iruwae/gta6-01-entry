// SOLMAR BAY — tiny static file server for local play.
//
// Serves the game/ folder (index.html plus the ES modules and the
// vendored three.js build) over plain HTTP, so the browser can load
// the game as modules without file:// or CORS trouble. No build step,
// no dependencies — Node 22 standard library only.
//
// Usage:  node serve.ts            (listens on 127.0.0.1:8904)
//         PORT=8911 node serve.ts  (custom port)
// Then open http://127.0.0.1:8904/ in a desktop browser.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the game folder from THIS file's own location, never from the
// process working directory — the server must work from anywhere.
const HERE = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = resolve(HERE, 'game');
const PORT = Number(process.env.PORT ?? 8904);

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
};

const server = createServer(async (req, res) => {
  try {
    const rawPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const rel = rawPath === '/' ? 'index.html' : rawPath.replace(/^\/+/, '');
    const file = resolve(join(GAME_DIR, rel));
    // Never serve anything outside game/.
    if (file !== GAME_DIR && !file.startsWith(GAME_DIR + '/')) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    if (!existsSync(file)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    res.writeHead(500);
    res.end('server error');
  }
});

server.listen(PORT, () => {
  console.log(`SOLMAR BAY serving ${GAME_DIR} at http://127.0.0.1:${PORT}/`);
});
