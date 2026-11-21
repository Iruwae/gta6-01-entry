// SOLMAR BAY — entrypoint for make.fun gta6-01 (round 11).
// Mirrors game/ and screenshots/ into the output folder and writes a
// deterministic dossier.json describing the entry. Node 22 standard
// library only, no build step. Run as: node main.ts
// Env: MAKEFUN_BOT_DIR (repo root override), MAKEFUN_OUTPUT_DIR
// (output dir override, default /output).
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

const here = fileURLToPath(import.meta.url);
const hereDir = resolve(here, '..');
const repoRoot = process.env.MAKEFUN_BOT_DIR
  ? resolve(process.env.MAKEFUN_BOT_DIR)
  : hereDir;
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

// Refuse unsafe output dirs: the filesystem root, or the repo itself.
if (outputDir === resolve('/') || outputDir === repoRoot) {
  fail(`unsafe output directory: ${outputDir}`);
}

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) fail('game/ is missing');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (!existsSync(join(gameDir, 'src', 'main.js'))) fail('game/src/main.js is missing');
if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) fail('screenshots/ is missing');

// Mirror into a clean output folder. Only the CONTENTS are cleared —
// the output directory itself is never removed, because at the grader
// /output is a mount point and removing it fails EBUSY.
mkdirSync(outputDir, { recursive: true });
for (const entry of readdirSync(outputDir)) {
  rmSync(join(outputDir, entry), { recursive: true, force: true });
}
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

// Walk a mirrored tree (sorted) and record every file.
function walk(dir, base) {
  const out = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
  for (const entry of entries) {
    const full = join(dir, entry.name);
    const rel = (base ? `${base}/` : '') + entry.name;
    if (entry.isDirectory()) {
      out.push(...walk(full, rel));
    } else if (entry.isFile()) {
      const data = readFileSync(full);
      out.push({
        path: rel.split(sep).join('/'),
        size: data.length,
        sha256: createHash('sha256').update(data).digest('hex'),
      });
    }
  }
  return out;
}

const gameFiles = walk(join(outputDir, 'game'), 'game');
const shotFiles = walk(join(outputDir, 'screenshots'), 'screenshots');
const allFiles = [...gameFiles, ...shotFiles];
const totalBytes = allFiles.reduce((sum, f) => sum + f.size, 0);

const BLURB = 'SOLMAR BAY — an original open-world sunset crime game for make.fun gta6-01.';
const coverFile = shotFiles.find((f) => /(^|\/)cover\.(jpg|png)$/.test(f.path));
const cover = coverFile ? coverFile.path : null;

const checks = {
  schema: true,
  cover: cover ? coverFile.size <= 256 * 1024 : true,
  images: shotFiles.length >= 4 && shotFiles.every((f) => f.size <= 256 * 1024),
  textCap: BLURB.length <= 280,
  sizeCap: totalBytes <= 20 * 1024 * 1024,
};
// Schema check: every required field present with the right shape, and
// the mirrored game tree still holds its entrypoint files.
const gamePaths = new Set(gameFiles.map((f) => f.path));
checks.schema = typeof BLURB === 'string'
  && Array.isArray(gameFiles) && gameFiles.length > 0
  && Array.isArray(shotFiles)
  && gamePaths.has('game/index.html')
  && gamePaths.has('game/src/main.js')
  && gameFiles.every((f) => typeof f.path === 'string' && typeof f.size === 'number' && /^[0-9a-f]{64}$/.test(f.sha256))
  && shotFiles.every((f) => typeof f.path === 'string' && typeof f.size === 'number' && /^[0-9a-f]{64}$/.test(f.sha256));

const dossier = {
  competition: 'gta6-01',
  entry: 'SOLMAR BAY',
  round: 11,
  blurb: BLURB,
  cover,
  game: gameFiles,
  screenshots: shotFiles,
  totals: { files: allFiles.length, bytes: totalBytes },
  checks,
};

writeFileSync(join(outputDir, 'dossier.json'), `${JSON.stringify(dossier, null, 2)}\n`);
console.log(`SOLMAR BAY: ${allFiles.length} files, ${totalBytes} bytes -> ${outputDir}`);
console.log(`checks: schema=${checks.schema} cover=${checks.cover} images=${checks.images} textCap=${checks.textCap} sizeCap=${checks.sizeCap}`);

if (!Object.values(checks).every(Boolean)) {
  fail('one or more dossier checks failed');
}
