// SOLMAR BAY — make.fun gta6-01 round 19 entrypoint.
// Mirrors game/ and screenshots/ into the output folder and writes a
// deterministic dossier.json describing the entry. Node stdlib only.
// Run as: node main.ts  (MAKEFUN_OUTPUT_DIR overrides /output)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, statSync, rmSync } from 'node:fs';
import { join, resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BLURB = 'SOLMAR BAY — an original open-world sunset crime game for make.fun gta6-01.';
const MAX_IMAGE_BYTES = 262144;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

function fail(msg) {
  console.error(`main.ts: ${msg}`);
  process.exit(1);
}

const repoRoot = process.env.MAKEFUN_BOT_DIR
  ? resolve(process.env.MAKEFUN_BOT_DIR)
  : dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
if (outDir === '/' || outDir === repoRoot) {
  fail(`refusing unsafe output dir: ${outDir}`);
}

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(gameDir)) fail('game/ is missing');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (!existsSync(join(gameDir, 'src', 'main.js'))) fail('game/src/main.js is missing');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');

// Mirror into a clean output folder: create it if needed, then clear ONLY
// its contents (loop over readdirSync and remove each entry) — NEVER
// remove the output directory itself, because at the grader /output is a
// mount point and removing it fails EBUSY and exits 1.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

function copyTree(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src).sort()) {
    const s = join(src, entry);
    const d = join(dst, entry);
    if (statSync(s).isDirectory()) copyTree(s, d);
    else copyFileSync(s, d);
  }
}
copyTree(gameDir, join(outDir, 'game'));
copyTree(shotsDir, join(outDir, 'screenshots'));

// Walk both mirrored trees (sorted) and record every file.
function walk(dir, base) {
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      out.push(...walk(p, base));
    } else {
      const buf = readFileSync(p);
      const rel = p.slice(base.length + 1).split(sep).join('/');
      out.push({ path: rel, size: buf.length, sha256: createHash('sha256').update(buf).digest('hex') });
    }
  }
  return out;
}
const gameFiles = walk(join(outDir, 'game'), outDir);
const shotFiles = walk(join(outDir, 'screenshots'), outDir);
const coverFile = shotFiles.find((f) => /(^|\/)cover\.(jpg|png)$/.test(f.path)) || null;
const totalBytes = [...gameFiles, ...shotFiles].reduce((sum, f) => sum + f.size, 0);
const isFileEntry = (f) => typeof f.path === 'string' && typeof f.size === 'number' && /^[0-9a-f]{64}$/.test(f.sha256);

const dossier = {
  competition: 'gta6-01',
  entry: 'SOLMAR BAY',
  round: 19,
  blurb: BLURB,
  cover: coverFile ? coverFile.path : null,
  game: gameFiles,
  screenshots: shotFiles,
  totals: { files: gameFiles.length + shotFiles.length, bytes: totalBytes },
  checks: {},
};
// Checks are computed after the dossier exists (the schema check reads
// the dossier's own fields, so it cannot live inside its literal).
dossier.checks = {
  schema:
    typeof dossier.competition === 'string' &&
    typeof dossier.entry === 'string' &&
    typeof dossier.round === 'number' &&
    typeof dossier.blurb === 'string' &&
    (dossier.cover === null || typeof dossier.cover === 'string') &&
    Array.isArray(dossier.game) &&
    Array.isArray(dossier.screenshots) &&
    dossier.game.every(isFileEntry) &&
    dossier.screenshots.every(isFileEntry) &&
    typeof dossier.totals.files === 'number' &&
    typeof dossier.totals.bytes === 'number',
  cover: coverFile ? coverFile.size <= MAX_IMAGE_BYTES : true,
  images: shotFiles.length >= 4 && shotFiles.every((f) => f.size <= MAX_IMAGE_BYTES),
  textCap: BLURB.length <= 280,
  sizeCap: totalBytes <= MAX_TOTAL_BYTES,
};

// The dossier's own bytes are NOT hashed into it: write it after the walk.
writeFileSync(join(outDir, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');

console.log(`SOLMAR BAY round 19: ${dossier.totals.files} files (${gameFiles.length} game, ${shotFiles.length} screenshots), ${totalBytes} bytes -> ${outDir}`);
console.log(`checks: schema=${dossier.checks.schema} cover=${dossier.checks.cover} images=${dossier.checks.images} textCap=${dossier.checks.textCap} sizeCap=${dossier.checks.sizeCap}`);
if (!Object.values(dossier.checks).every(Boolean)) {
  console.error('main.ts: checks failed');
  process.exit(1);
}
