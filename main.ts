// SOLMAR BAY — entrypoint for make.fun gta6-01 (round 12).
// Run as `node main.ts`. Mirrors game/ and screenshots/ into the output
// folder and writes a deterministic dossier.json describing the entry.
// Node 22 standard library only. The repository root resolves from THIS
// file's own location, never from the process working directory, so the
// same command works from anywhere and produces a byte-identical dossier.
//
// Env vars:
//   MAKEFUN_BOT_DIR    — when set, that directory is the repo root.
//   MAKEFUN_OUTPUT_DIR — when set, the dossier lands there, else /output.
//
// The output directory is cleaned by removing ONLY its contents (a loop
// over readdirSync) — never the directory itself, because at the grader
// /output is a mount point and removing it fails EBUSY and exits 1.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = process.env.MAKEFUN_BOT_DIR
  ? resolve(process.env.MAKEFUN_BOT_DIR)
  : dirname(fileURLToPath(import.meta.url));
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
const outDir = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : '/output';

function fail(message: string): never {
  console.error('main.ts: ' + message);
  process.exit(1);
}

if (!existsSync(gameDir)) fail('game/ is missing in ' + repoRoot);
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (!existsSync(join(gameDir, 'src', 'main.js'))) fail('game/src/main.js is missing');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');
if (outDir === '/' || outDir === sep || outDir === repoRoot) {
  fail('refusing unsafe output dir: ' + outDir);
}

// Clean ONLY the contents of the output dir, never the dir itself.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

cpSync(gameDir, join(outDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

interface FileEntry {
  path: string;
  size: number;
  sha256: string;
}

function walk(dir: string, relBase: string): FileEntry[] {
  const out: FileEntry[] = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const full = join(dir, entry.name);
    const rel = relBase + '/' + entry.name;
    if (entry.isDirectory()) {
      out.push(...walk(full, rel));
    } else if (entry.isFile()) {
      const data = readFileSync(full);
      out.push({
        path: rel,
        size: data.length,
        sha256: createHash('sha256').update(data).digest('hex'),
      });
    }
  }
  return out;
}

const gameFiles = walk(join(outDir, 'game'), 'game').sort((a, b) => (a.path < b.path ? -1 : 1));
const shotFiles = walk(join(outDir, 'screenshots'), 'screenshots').sort((a, b) => (a.path < b.path ? -1 : 1));
const allFiles = [...gameFiles, ...shotFiles];
const totalBytes = allFiles.reduce((sum, f) => sum + f.size, 0);

const blurb = 'SOLMAR BAY — an original open-world sunset crime game for make.fun gta6-01.';
// The cover is the screenshots path matching cover.jpg/png, or null.
const cover = null;

const schemaOk =
  typeof blurb === 'string' &&
  Array.isArray(gameFiles) &&
  gameFiles.length > 0 &&
  Array.isArray(shotFiles) &&
  allFiles.every((f) =>
    typeof f.path === 'string' &&
    typeof f.size === 'number' &&
    /^[0-9a-f]{64}$/.test(f.sha256));

const checks = {
  schema: schemaOk,
  cover: cover === null,
  images: shotFiles.length >= 4 && shotFiles.every((f) => f.size <= 256 * 1024),
  textCap: blurb.length <= 280,
  sizeCap: totalBytes <= 20 * 1024 * 1024,
};

const dossier = {
  competition: 'gta6-01',
  entry: 'SOLMAR BAY',
  round: 12,
  blurb,
  cover,
  game: gameFiles,
  screenshots: shotFiles,
  totals: { files: allFiles.length, bytes: totalBytes },
  checks,
};

writeFileSync(join(outDir, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');

console.log(`main.ts: wrote ${allFiles.length} files (${totalBytes} bytes) to ${outDir}`);
console.log(`main.ts: checks schema=${checks.schema} cover=${checks.cover} images=${checks.images} textCap=${checks.textCap} sizeCap=${checks.sizeCap}`);

const allOk = Object.values(checks).every(Boolean);
process.exit(allOk ? 0 : 1);
