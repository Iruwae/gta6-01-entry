// SOLMAR BAY — main.ts entrypoint (Node 22 stdlib only). Run as
// `node main.ts`. Mirrors game/ and screenshots/ into the output folder
// and writes a deterministic dossier.json describing the entry. The
// repository root resolves from THIS file's own location, never from the
// process working directory — the same command works from anywhere and
// produces a byte-identical dossier.
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  cpSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const BLURB = 'SOLMAR BAY — an original open-world sunset crime game for make.fun gta6-01.';
const MAX_IMAGE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

function fail(msg) {
  console.error('main.ts: ' + msg);
  process.exit(1);
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function walk(dir, base) {
  const out = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
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

const repoRoot = process.env.MAKEFUN_BOT_DIR
  ? resolve(process.env.MAKEFUN_BOT_DIR)
  : resolve(fileURLToPath(new URL('.', import.meta.url)));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : '/output';

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(gameDir)) fail('game/ is missing in ' + repoRoot);
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (!existsSync(join(gameDir, 'src', 'main.js'))) fail('game/src/main.js is missing');
if (!existsSync(shotsDir)) fail('screenshots/ is missing in ' + repoRoot);
if (outputDir === '/' || outputDir === repoRoot) fail('unsafe output dir: ' + outputDir);

// Mirror into a clean output folder: create it if needed, then clear ONLY
// its contents — NEVER remove the output directory itself, because at the
// grader /output is a mount point and removing it fails EBUSY.
mkdirSync(outputDir, { recursive: true });
for (const entry of readdirSync(outputDir)) {
  rmSync(join(outputDir, entry), { recursive: true, force: true });
}
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

const gameFiles = walk(join(outputDir, 'game'), outputDir);
const shotFiles = walk(join(outputDir, 'screenshots'), outputDir);
const totalBytes = [...gameFiles, ...shotFiles].reduce((n, f) => n + f.size, 0);
const coverFile = shotFiles.find((f) => /(^|\/)cover\.(jpg|png)$/i.test(f.path));
const cover = coverFile ? coverFile.path : null;

const hex64 = (s) => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);
const schemaOk =
  typeof BLURB === 'string' &&
  gameFiles.length > 0 &&
  Array.isArray(gameFiles) &&
  Array.isArray(shotFiles) &&
  gameFiles.every((f) => typeof f.path === 'string' && typeof f.size === 'number' && hex64(f.sha256)) &&
  shotFiles.every((f) => typeof f.path === 'string' && typeof f.size === 'number' && hex64(f.sha256)) &&
  (cover === null || (typeof cover === 'string' && cover.startsWith('screenshots/')));
const imagesOk = shotFiles.length >= 4 && shotFiles.every((f) => f.size <= MAX_IMAGE_BYTES);
const coverOk = !coverFile || coverFile.size <= MAX_IMAGE_BYTES;
const textCapOk = BLURB.length <= 280;
const sizeCapOk = totalBytes <= MAX_TOTAL_BYTES;

const dossier = {
  competition: 'gta6-01',
  entry: 'SOLMAR BAY',
  round: 17,
  blurb: BLURB,
  cover,
  game: gameFiles,
  screenshots: shotFiles,
  totals: { files: gameFiles.length + shotFiles.length, bytes: totalBytes },
  checks: { schema: schemaOk, cover: coverOk, images: imagesOk, textCap: textCapOk, sizeCap: sizeCapOk },
};

writeFileSync(join(outputDir, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');
console.log(`SOLMAR BAY round 17: ${dossier.totals.files} files, ${totalBytes} bytes -> ${outputDir}`);
console.log(
  `checks: schema=${schemaOk} cover=${coverOk} images=${imagesOk} textCap=${textCapOk} sizeCap=${sizeCapOk}`
);
if (!schemaOk || !coverOk || !imagesOk || !textCapOk || !sizeCapOk) {
  fail('one or more dossier checks failed');
}
