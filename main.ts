// SOLMAR BAY — make.fun entrypoint (round 8, pass 1).
//
// Builds the submission dossier: mirrors game/ and screenshots/ into the
// output folder and validates the entry (schema, cover, four images,
// text cap, dossier size).
//
// The repo root is resolved from THIS file's own location
// (import.meta.url -> fileURLToPath), never from process.cwd(): the
// grader runs `node /bot/main.ts` from an unrelated working directory,
// and resolving from cwd was exactly what killed round 7. When the
// grader sets MAKEFUN_BOT_DIR, that directory is the bot root instead.
// Output goes to MAKEFUN_OUTPUT_DIR, or /output when unset.

import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.MAKEFUN_BOT_DIR
  ? resolve(process.env.MAKEFUN_BOT_DIR)
  : dirname(fileURLToPath(import.meta.url));
const GAME_DIR = join(ROOT, 'game');
const SHOTS_DIR = join(ROOT, 'screenshots');
const OUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

const MAX_IMAGE_BYTES = 256 * 1024;
const MAX_DOSSIER_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 20000;
const MAX_TOTAL_TEXT_CHARS = 50000;
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png']);

function fail(msg) {
  throw new Error('[solmar dossier] ' + msg);
}

async function sha256File(path) {
  const data = await readFile(path);
  return createHash('sha256').update(data).digest('hex');
}

async function walk(dir, base) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const full = join(dir, e.name);
    const rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) {
      out.push(...(await walk(full, rel)));
    } else if (e.isFile()) {
      out.push({ rel, full });
    }
  }
  return out;
}

async function checkEntrySchema() {
  if (!existsSync(join(GAME_DIR, 'index.html'))) {
    fail('game/index.html is missing');
  }
  if (!existsSync(join(GAME_DIR, 'src', 'main.js'))) {
    fail('game/src/main.js is missing');
  }
  if (!existsSync(SHOTS_DIR)) {
    fail('screenshots/ folder is missing');
  }
}

async function checkImages() {
  const names = (await readdir(SHOTS_DIR)).filter((n) =>
    IMAGE_EXTS.has(extname(n).toLowerCase()),
  );
  names.sort();
  if (names.length < 4) {
    fail('need at least 4 screenshots, found ' + names.length);
  }
  for (const n of names) {
    const s = await stat(join(SHOTS_DIR, n));
    if (s.size > MAX_IMAGE_BYTES) {
      fail('screenshot ' + n + ' is ' + s.size + ' bytes (cap ' + MAX_IMAGE_BYTES + ')');
    }
  }
  const cover = names.includes('cover.jpg') ? 'cover.jpg' : names[0];
  return { images: names, cover };
}

async function checkText() {
  const readmePath = join(ROOT, 'README.md');
  if (!existsSync(readmePath)) fail('README.md is missing');
  const readme = await readFile(readmePath, 'utf8');
  if (readme.length > MAX_TEXT_CHARS) {
    fail('README.md is ' + readme.length + ' chars (cap ' + MAX_TEXT_CHARS + ')');
  }
  let total = readme.length;
  const licensePath = join(ROOT, 'LICENSE');
  if (existsSync(licensePath)) {
    total += (await readFile(licensePath, 'utf8')).length;
  }
  if (total > MAX_TOTAL_TEXT_CHARS) {
    fail('total entry text is ' + total + ' chars (cap ' + MAX_TOTAL_TEXT_CHARS + ')');
  }
  return { readmeChars: readme.length, totalTextChars: total };
}

function validateManifest(m) {
  const required = ['entry', 'version', 'cover', 'images', 'files', 'textChars', 'totalBytes'];
  for (const k of required) {
    if (!(k in m)) fail('dossier manifest is missing field: ' + k);
  }
  if (m.entry !== 'solmar-bay') fail('dossier manifest entry must be solmar-bay');
  if (!Array.isArray(m.images) || m.images.length < 4) {
    fail('dossier manifest must list at least 4 images');
  }
  if (!Array.isArray(m.files) || m.files.length === 0) {
    fail('dossier manifest must list files');
  }
  if (typeof m.totalBytes !== 'number' || m.totalBytes > MAX_DOSSIER_BYTES) {
    fail('dossier is ' + m.totalBytes + ' bytes (cap ' + MAX_DOSSIER_BYTES + ')');
  }
  if (typeof m.textChars !== 'number' || m.textChars > MAX_TOTAL_TEXT_CHARS) {
    fail('dossier text is ' + m.textChars + ' chars (cap ' + MAX_TOTAL_TEXT_CHARS + ')');
  }
}

async function main() {
  await checkEntrySchema();
  const shots = await checkImages();
  const text = await checkText();

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  await cp(GAME_DIR, join(OUT_DIR, 'game'), { recursive: true });
  await cp(SHOTS_DIR, join(OUT_DIR, 'screenshots'), { recursive: true });
  for (const f of ['README.md', 'LICENSE']) {
    const src = join(ROOT, f);
    if (existsSync(src)) await cp(src, join(OUT_DIR, f));
  }

  const files = await walk(OUT_DIR, '');
  const listed = [];
  let totalBytes = 0;
  for (const f of files) {
    const s = await stat(f.full);
    totalBytes += s.size;
    listed.push({ path: f.rel, bytes: s.size, sha256: await sha256File(f.full) });
  }

  const manifest = {
    entry: 'solmar-bay',
    version: 8,
    cover: shots.cover,
    images: shots.images,
    files: listed,
    textChars: text.totalTextChars,
    totalBytes,
  };
  validateManifest(manifest);
  await writeFile(
    join(OUT_DIR, 'dossier.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );

  console.log('[solmar dossier] OK');
  console.log('  root: ' + ROOT);
  console.log('  output: ' + OUT_DIR);
  console.log('  cover: ' + shots.cover);
  console.log('  images: ' + shots.images.length + ' (' + shots.images.join(', ') + ')');
  console.log('  files: ' + listed.length);
  console.log('  text: ' + text.totalTextChars + ' chars');
  console.log('  total: ' + totalBytes + ' bytes');
}

main().catch((err) => {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
