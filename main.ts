// SOLMAR BAY — make.fun gta6-01 entrypoint (Node 22 stdlib only).
// Run as: node main.ts
// Mirrors game/ and screenshots/ into the output folder and writes a
// deterministic dossier.json describing the entry. The repository root
// resolves from THIS file's own location, never from the working
// directory, so the same command works from anywhere and produces a
// byte-identical dossier.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = process.env.MAKEFUN_BOT_DIR
  ? resolve(process.env.MAKEFUN_BOT_DIR)
  : dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
const BLURB = 'SOLMAR BAY — an original open-world sunset crime game for make.fun gta6-01.';
const MAX_IMAGE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

function fail(msg) {
  console.error(`main.ts: ${msg}`);
  process.exit(1);
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
    else if (e.isFile()) out.push(full);
  }
  return out;
}

function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const e of readdirSync(src, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const from = join(src, e.name);
    const to = join(dest, e.name);
    if (e.isDirectory()) copyTree(from, to);
    else if (e.isFile()) copyFileSync(from, to);
  }
}

function main() {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(gameDir)) fail('game/ is missing');
  if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
  if (!existsSync(join(gameDir, 'src', 'main.js'))) fail('game/src/main.js is missing');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');
  if (OUTPUT_DIR === sep || OUTPUT_DIR === REPO_ROOT) {
    fail(`refusing unsafe output dir: ${OUTPUT_DIR}`);
  }

  // Mirror into a clean output folder: create it if needed, then clear
  // ONLY its contents — never remove the output directory itself, because
  // at the grader /output is a mount point and removing it fails EBUSY.
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const entry of readdirSync(OUTPUT_DIR)) {
    rmSync(join(OUTPUT_DIR, entry), { recursive: true, force: true });
  }
  copyTree(gameDir, join(OUTPUT_DIR, 'game'));
  copyTree(shotsDir, join(OUTPUT_DIR, 'screenshots'));

  // Walk both mirrored trees (sorted) and record every file.
  const record = (relDir) => {
    const root = join(OUTPUT_DIR, relDir);
    return walk(root, root).map((full) => {
      const rel = relative(OUTPUT_DIR, full).split(sep).join('/');
      return { path: rel, size: statSync(full).size, sha256: sha256(full) };
    });
  };
  const gameFiles = record('game');
  const shotFiles = record('screenshots');

  // Cover: the screenshots path matching cover.jpg/png, or null.
  let cover = null;
  for (const f of shotFiles) {
    if (/^screenshots\/cover\.(jpg|png)$/i.test(f.path)) { cover = f.path; break; }
  }
  const coverEntry = cover ? shotFiles.find((f) => f.path === cover) : null;

  const totalFiles = gameFiles.length + shotFiles.length;
  const totalBytes = gameFiles.reduce((a, f) => a + f.size, 0)
    + shotFiles.reduce((a, f) => a + f.size, 0);

  const schemaOk = typeof BLURB === 'string'
    && Array.isArray(gameFiles) && Array.isArray(shotFiles)
    && gameFiles.length > 0
    && gameFiles.some((f) => f.path === 'game/index.html')
    && gameFiles.some((f) => f.path === 'game/src/main.js')
    && gameFiles.every((f) => typeof f.path === 'string' && typeof f.size === 'number' && /^[0-9a-f]{64}$/.test(f.sha256))
    && shotFiles.every((f) => typeof f.path === 'string' && typeof f.size === 'number' && /^[0-9a-f]{64}$/.test(f.sha256))
    && totalFiles === gameFiles.length + shotFiles.length;
  const checks = {
    schema: schemaOk,
    cover: coverEntry ? coverEntry.size <= MAX_IMAGE_BYTES : true,
    images: shotFiles.length >= 4 && shotFiles.every((f) => f.size <= MAX_IMAGE_BYTES),
    textCap: BLURB.length <= 280,
    sizeCap: totalBytes <= MAX_TOTAL_BYTES,
  };

  const dossier = {
    competition: 'gta6-01',
    entry: 'SOLMAR BAY',
    round: 15,
    blurb: BLURB,
    cover,
    game: gameFiles,
    screenshots: shotFiles,
    totals: { files: totalFiles, bytes: totalBytes },
    checks,
  };
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');

  console.log(`SOLMAR BAY: ${gameFiles.length} game files + ${shotFiles.length} screenshots, ${totalBytes} bytes -> ${OUTPUT_DIR}`);
  console.log(`checks: schema=${checks.schema} cover=${checks.cover} images=${checks.images} textCap=${checks.textCap} sizeCap=${checks.sizeCap}`);
  if (!Object.values(checks).every(Boolean)) process.exit(1);
}

main();
