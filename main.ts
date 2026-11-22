// SOLMAR BAY — main.ts entrypoint for make.fun gta6-01, round 18.
// Run as `node main.ts`. Mirrors game/ and screenshots/ into the output
// folder and writes a deterministic dossier.json describing the entry.
// Node 22 standard library only. The repository root resolves from THIS
// file's own location (import.meta.url), never from the working directory,
// so the same command works from anywhere and produces a byte-identical
// dossier. Env vars: MAKEFUN_BOT_DIR (repo root override),
// MAKEFUN_OUTPUT_DIR (output dir, else /output).
import { createHash } from 'node:crypto';
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  mkdirSync,
  copyFileSync,
  rmSync,
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

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function clearDirContents(dir) {
  // Clear ONLY the contents — never remove the output directory itself,
  // because at the grader /output is a mount point and removing it
  // fails EBUSY and exits 1.
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dest, entry);
    if (statSync(s).isDirectory()) copyTree(s, d);
    else copyFileSync(s, d);
  }
}

function walkFiles(dir, base) {
  const out = [];
  const entries = readdirSync(dir).sort();
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkFiles(full, base));
    } else {
      out.push({
        path: relative(base, full).split(sep).join('/'),
        size: statSync(full).size,
        sha256: sha256(full),
      });
    }
  }
  return out;
}

function main() {
  const repoRoot = process.env.MAKEFUN_BOT_DIR
    ? resolve(process.env.MAKEFUN_BOT_DIR)
    : resolve(dirname(fileURLToPath(import.meta.url)));
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR
    ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
    : '/output';

  const gameDir = join(repoRoot, 'game');
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) fail('game/ is missing');
  if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
  if (!existsSync(join(gameDir, 'src', 'main.js'))) fail('game/src/main.js is missing');
  if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) fail('screenshots/ is missing');
  if (outputDir === '/' || outputDir === repoRoot) {
    fail(`refusing unsafe output dir: ${outputDir}`);
  }

  mkdirSync(outputDir, { recursive: true });
  clearDirContents(outputDir);
  copyTree(gameDir, join(outputDir, 'game'));
  copyTree(shotsDir, join(outputDir, 'screenshots'));

  const gameFiles = walkFiles(join(outputDir, 'game'), outputDir);
  const shotFiles = walkFiles(join(outputDir, 'screenshots'), outputDir);
  const totalBytes = [...gameFiles, ...shotFiles].reduce((n, f) => n + f.size, 0);
  const totalFiles = gameFiles.length + shotFiles.length;

  const images = shotFiles.filter((f) => /\.(png|jpe?g)$/i.test(f.path));
  const coverFile = shotFiles.find((f) => /(^|\/)cover\.(png|jpe?g)$/i.test(f.path)) || null;
  const cover = coverFile ? coverFile.path : null;

  const schemaOk =
    typeof BLURB === 'string' &&
    Array.isArray(gameFiles) &&
    Array.isArray(shotFiles) &&
    gameFiles.every((f) => typeof f.path === 'string' && typeof f.size === 'number' && /^[0-9a-f]{64}$/.test(f.sha256)) &&
    shotFiles.every((f) => typeof f.path === 'string' && typeof f.size === 'number' && /^[0-9a-f]{64}$/.test(f.sha256));
  const checks = {
    schema: schemaOk,
    cover: coverFile ? coverFile.size <= MAX_IMAGE_BYTES : true,
    images: images.length >= 4 && images.every((f) => f.size <= MAX_IMAGE_BYTES),
    textCap: BLURB.length <= 280,
    sizeCap: totalBytes <= MAX_TOTAL_BYTES,
  };

  const dossier = {
    competition: 'gta6-01',
    entry: 'SOLMAR BAY',
    round: 18,
    blurb: BLURB,
    cover,
    game: gameFiles,
    screenshots: shotFiles,
    totals: { files: totalFiles, bytes: totalBytes },
    checks,
  };
  writeFileSync(join(outputDir, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');

  const allOk = Object.values(checks).every(Boolean);
  console.log(`SOLMAR BAY round 18: ${totalFiles} files (${gameFiles.length} game, ${shotFiles.length} screenshots incl. ${images.length} images), ${totalBytes} bytes -> ${outputDir}`);
  console.log(`checks: schema=${checks.schema} cover=${checks.cover} images=${checks.images} textCap=${checks.textCap} sizeCap=${checks.sizeCap}`);
  if (!allOk) fail('one or more dossier checks failed');
}

main();
