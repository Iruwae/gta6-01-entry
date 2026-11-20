// serve.ts — SOLMAR BAY dev server (GTA6-01 round 7 rebuild).
//
// Serves the static game/ folder on http://localhost:8080 so the game
// can be opened in a desktop browser. This is a development convenience
// only: no caching tricks, no compression, no directory listings, and
// no path outside game/ is ever served.
//
// Usage:
//   node serve.ts               (port 8080)
//   node serve.ts --port 8123
//   node serve.ts --port=8123

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const GAME_ROOT = join(HERE, "game");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function pickPort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--port" && args[i + 1] !== undefined) {
      const n = Number(args[i + 1]);
      if (Number.isInteger(n) && n > 0 && n < 65536) return n;
    }
    if (arg.startsWith("--port=")) {
      const n = Number(arg.slice("--port=".length));
      if (Number.isInteger(n) && n > 0 && n < 65536) return n;
    }
  }
  return 8080;
}

function notFound(res: import("node:http").ServerResponse): void {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("not found");
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("method not allowed");
      return;
    }
    const raw = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = raw === "/" ? "index.html" : raw.replace(/^\/+/, "");
    const target = resolve(join(GAME_ROOT, rel));
    if (target !== GAME_ROOT && !target.startsWith(GAME_ROOT + "/")) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("forbidden");
      return;
    }
    let file = target;
    let info;
    try {
      info = await stat(file);
    } catch {
      notFound(res);
      return;
    }
    if (info.isDirectory()) {
      file = join(file, "index.html");
      try {
        info = await stat(file);
      } catch {
        notFound(res);
        return;
      }
    }
    if (!info.isFile()) {
      notFound(res);
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type":
        TYPES[extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": body.length,
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (err) {
    console.error("serve error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    }
    res.end("server error");
  }
});

const port = pickPort();
server.listen(port, () => {
  console.log(`SOLMAR BAY dev server: http://localhost:${port}/ (serving game/)`);
});
