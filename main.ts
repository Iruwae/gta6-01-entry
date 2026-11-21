// SOLMAR BAY — entrypoint for make.fun gta6-01 (round 14).
// Run as `node main.ts`. Mirrors game/ and screenshots/ into the output
// folder and writes a deterministic dossier.json describing the entry.
// Node 22 standard library only; no build step, no dependencies.
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  cpSync,
} from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const BLURB = 'SOLMAR BAY — an original open-world sunset crime game for make.fun gta6-01.';
const MAX_IMAGE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function repoRoot() {
  if (process.env.MAKEFUN_BOT_DIR) return resolve(process.env.MAKEFUN_BOT_DIR);
  return resolve(dirname(fileURLToPath(import.meta.url)));
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function walk(dir, base) {
  const out = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, base));
    else if (e.isFile()) {
      const rel = relative(base, full).split(sep).join('/');
      out.push({ path: rel, size: statSync(full).size, sha256: sha256(full) });
    }
  }
  return out;
}

function clearContents(dir) {
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

const root = repoRoot();
const gameDir = join(root, 'game');
const shotsDir = join(root, 'screenshots');
if (!existsSync(gameDir)) fail('game/ is missing');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (!existsSync(join(gameDir, 'src', 'main.js'))) fail('game/src/main.js is missing');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');

const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
if (outputDir === '/' || outputDir === root) {
  fail(`refusing unsafe output dir: ${outputDir}`);
}

mkdirSync(outputDir, { recursive: true });
clearContents(outputDir);
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

const gameFiles = walk(join(outputDir, 'game'), outputDir);
const shotFiles = walk(join(outputDir, 'screenshots'), outputDir);
const allFiles = [...gameFiles, ...shotFiles].sort((a, b) => (a.path < b.path ? -1 : 1));
const totalBytes = allFiles.reduce((n, f) => n + f.size, 0);

const coverEntry = shotFiles.find((f) => /(^|\/)cover\.(jpg|png)$/.test(f.path));
const cover = coverEntry ? coverEntry.path : null;

const checks = {
  schema:
    typeof BLURB === 'string' &&
    Array.isArray(gameFiles) &&
    Array.isArray(shotFiles) &&
    gameFiles.length > 0 &&
    gameFiles.every((f) => f.path.startsWith('game/') && typeof f.size === 'number' && f.size >= 0 && /^[0-9a-f]{64}$/.test(f.sha256)) &&
    shotFiles.every((f) => f.path.startsWith('screenshots/') && typeof f.size === 'number' && f.size >= 0 && /^[0-9a-f]{64}$/.test(f.sha256)) &&
    typeof totalBytes === 'number' &&
    (typeof cover === 'string' || cover === null),
  cover: cover === null || (coverEntry && coverEntry.size <= MAX_IMAGE_BYTES),
  images: shotFiles.length >= 4 && shotFiles.every((f) => f.size <= MAX_IMAGE_BYTES),
  textCap: BLURB.length <= 280,
  sizeCap: totalBytes <= MAX_TOTAL_BYTES,
};

const dossier = {
  competition: 'gta6-01',
  entry: 'SOLMAR BAY',
  round: 14,
  blurb: BLURB,
  cover,
  game: gameFiles,
  screenshots: shotFiles,
  totals: { files: allFiles.length, bytes: totalBytes },
  checks,
};

writeFileSync(join(outputDir, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');

console.log(`SOLMAR BAY round 14: ${allFiles.length} files, ${totalBytes} bytes -> ${outputDir}`);
console.log(`checks: schema=${checks.schema} cover=${checks.cover} images=${checks.images} textCap=${checks.textCap} sizeCap=${checks.sizeCap}`);

if (!Object.values(checks).every(Boolean)) {
  console.error('main.ts: one or more dossier checks failed');
  process.exit(1);
}
process.exit(0);
