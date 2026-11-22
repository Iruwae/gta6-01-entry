// SOLMAR BAY — make.fun gta6-01 entrypoint (round 20).
// Run as `node main.ts`. Mirrors game/ and screenshots/ into the output
// folder and writes a deterministic dossier.json describing the entry.
// Node 22 standard library only. The repository root resolves from THIS
// file's own location (import.meta.url), never from the process working
// directory — the same command works from anywhere and produces a
// byte-identical dossier.
import {
  readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync,
  statSync, existsSync, copyFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve, sep, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = process.env.MAKEFUN_BOT_DIR
  ? resolve(process.env.MAKEFUN_BOT_DIR)
  : dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : '/output';
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

function copyTree(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const e of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, e.name);
    const d = join(dst, e.name);
    if (e.isDirectory()) copyTree(s, d);
    else if (e.isFile()) copyFileSync(s, d);
  }
}

function main() {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(gameDir)) fail('game/ is missing');
  if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
  if (!existsSync(join(gameDir, 'src', 'main.js'))) fail('game/src/main.js is missing');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');

  const outAbs = resolve(OUTPUT_DIR);
  if (outAbs === '/' || outAbs === resolve(REPO_ROOT)) {
    fail('refusing unsafe output dir: ' + outAbs);
  }
  // Mirror into a clean output folder: create it if needed, then clear
  // ONLY its contents (loop over readdirSync and remove each entry) —
  // NEVER remove the output directory itself, because at the grader
  // /output is a mount point and removing it fails EBUSY.
  mkdirSync(outAbs, { recursive: true });
  for (const e of readdirSync(outAbs)) {
    rmSync(join(outAbs, e), { recursive: true, force: true });
  }
  copyTree(gameDir, join(outAbs, 'game'));
  copyTree(shotsDir, join(outAbs, 'screenshots'));

  const gameFiles = walk(join(outAbs, 'game'), outAbs);
  const shotFiles = walk(join(outAbs, 'screenshots'), outAbs);
  const allFiles = [...gameFiles, ...shotFiles].sort((a, b) => a.path.localeCompare(b.path));
  const totalBytes = allFiles.reduce((n, f) => n + f.size, 0);

  // Cover: a screenshots file named cover.jpg / cover.png, or null.
  const cover = shotFiles.find((f) => /(^|\/)cover\.(jpg|png)$/.test(f.path)) || null;

  const checks = {
    schema: true,
    cover: cover ? cover.size <= MAX_IMAGE_BYTES : true,
    images: shotFiles.length >= 4 && shotFiles.every((f) => f.size <= MAX_IMAGE_BYTES),
    textCap: BLURB.length <= 280,
    sizeCap: totalBytes <= MAX_TOTAL_BYTES,
  };
  // Schema: every required field present with the right shape, and the
  // mirrored trees are non-empty.
  if (typeof BLURB !== 'string' || !Array.isArray(gameFiles) || !Array.isArray(shotFiles)
    || gameFiles.length === 0 || shotFiles.length === 0) {
    checks.schema = false;
  }
  for (const f of allFiles) {
    if (typeof f.path !== 'string' || typeof f.size !== 'number' || !/^[0-9a-f]{64}$/.test(f.sha256)) {
      checks.schema = false;
    }
  }

  const dossier = {
    competition: 'gta6-01',
    entry: 'SOLMAR BAY',
    round: 20,
    blurb: BLURB,
    cover: cover ? cover.path : null,
    game: gameFiles,
    screenshots: shotFiles,
    totals: { files: allFiles.length, bytes: totalBytes },
    checks,
  };
  writeFileSync(join(outAbs, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');
  console.log(`SOLMAR BAY round 20: ${allFiles.length} files, ${totalBytes} bytes -> ${outAbs}`);
  console.log(`checks: schema=${checks.schema} cover=${checks.cover} images=${checks.images} textCap=${checks.textCap} sizeCap=${checks.sizeCap}`);
  if (!Object.values(checks).every(Boolean)) {
    fail('one or more dossier checks failed');
  }
}

main();
