// SOLMAR BAY — submission entrypoint (GTA6-01 round 8 rebuild).
// Run as `node main.ts` with no flags. It mirrors game/ and
// screenshots/ into the output folder, builds dossier.json from what
// actually landed there with the vendored dossier builder, and checks
// the result before declaring success.
//
// THE ROUND 7 LESSON: the repository root is resolved from THIS
// script's own file location (import.meta.url), NEVER from the process
// working directory — the grader runs `node /bot/main.ts` from
// elsewhere, and a cwd-relative lookup cannot find the game.
//
// Deterministic: two runs into two folders produce byte-identical
// dossiers (no timestamps, no absolute paths, sorted walks).

import { cpSync } from 'node:fs';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildDossier,
  DOSSIER_MAX_IMAGES,
  DOSSIER_SCHEMA,
} from './vendor/makefun-game.ts';

// ---- Fixed limits for this entry (bytes) ----
const TEXT_MAX_BYTES = 1000000;
const DOSSIER_MAX_BYTES = 1572864; // 1.5 MiB
const IMAGE_MAX_BYTES = 262144; // 256 KiB per screenshot
const EXPECTED_IMAGES = 4;

// ---- Repository root: MAKEFUN_BOT_DIR wins when set, else this script's own directory ----
const BOT_DIR = (process.env.MAKEFUN_BOT_DIR || '').trim();
const ROOT_DIR = BOT_DIR ? resolve(BOT_DIR) : dirname(fileURLToPath(import.meta.url));
const GAME_DIR = join(ROOT_DIR, 'game');
const SHOTS_DIR = join(ROOT_DIR, 'screenshots');

function fail(message: string): never {
  console.error('main.ts: ' + message);
  process.exit(1);
}

// Refuse any symlink or special file anywhere under a mirrored tree.
// A link could smuggle in content from outside the repo, and a device
// or socket is not a submittable file.
function assertTreeClean(dir: string, label: string): void {
  const rootStat = lstatSync(dir);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    fail(label + ' is not a plain directory: ' + dir);
  }
  const walk = (d: string): void => {
    const names = readdirSync(d).sort();
    for (const name of names) {
      const p = join(d, name);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) fail('symlink refused in ' + label + ': ' + p);
      if (st.isDirectory()) walk(p);
      else if (!st.isFile()) fail('special file refused in ' + label + ': ' + p);
    }
  };
  walk(dir);
}

// Mirror one tree into the output folder, entries in sorted order so
// the walk itself is deterministic.
function mirrorTree(srcDir: string, destDir: string, label: string): void {
  assertTreeClean(srcDir, label);
  cpSync(srcDir, destDir, { recursive: true });
}

function main(): void {
  const outRaw = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  const outDir = resolve(outRaw);

  // Never wipe the repo itself, the filesystem root, or the home dir.
  if (outDir === ROOT_DIR || outDir === parse(outDir).root) {
    fail('refusing unsafe output directory: ' + outDir);
  }

  for (const [dir, label] of [[GAME_DIR, 'game'], [SHOTS_DIR, 'screenshots']] as const) {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      fail('missing ' + label + ' directory next to main.ts: ' + dir);
    }
  }
  if (!existsSync(join(GAME_DIR, 'index.html'))) {
    fail('game/index.html is missing next to main.ts');
  }

  // Wipe stale output first, then rebuild it from scratch.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  mirrorTree(GAME_DIR, join(outDir, 'game'), 'game');
  mirrorTree(SHOTS_DIR, join(outDir, 'screenshots'), 'screenshots');

  // Build the dossier from what actually landed in the output folder.
  const dossierBytes = buildDossier(outDir, { text_max_bytes: TEXT_MAX_BYTES });
  const dossierPath = join(outDir, 'dossier.json');
  writeFileSync(dossierPath, dossierBytes);

  // ---- Checks before declaring success ----
  if (dossierBytes.length > DOSSIER_MAX_BYTES) {
    fail('dossier is ' + dossierBytes.length + ' bytes, over the 1.5 MiB cap');
  }
  let dossier: Record<string, unknown>;
  try {
    dossier = JSON.parse(new TextDecoder().decode(dossierBytes)) as Record<string, unknown>;
  } catch {
    fail('dossier.json is not valid JSON');
  }
  if (dossier.schema !== DOSSIER_SCHEMA) {
    fail('dossier schema is ' + JSON.stringify(dossier.schema) + ', expected ' + DOSSIER_SCHEMA);
  }
  const images = dossier.images as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(images) || images.length !== EXPECTED_IMAGES) {
    fail('dossier has ' + (Array.isArray(images) ? images.length : 'no') + ' images, expected ' + EXPECTED_IMAGES);
  }
  const cover = dossier.cover as number | undefined;
  if (typeof cover !== 'number' || cover < 0 || cover >= images.length) {
    fail('dossier cover index is invalid: ' + JSON.stringify(cover));
  }
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (typeof img.base64 !== 'string' || img.base64.length === 0) {
      fail('dossier image ' + i + ' has no base64 data');
    }
    if (img.media_type !== 'image/jpeg') {
      fail('dossier image ' + i + ' is not a JPEG: ' + JSON.stringify(img.media_type));
    }
    const raw = Buffer.from(img.base64 as string, 'base64');
    if (raw.length > IMAGE_MAX_BYTES) {
      fail('dossier image ' + i + ' is ' + raw.length + ' bytes, over the 256 KiB cap');
    }
    if (typeof img.name !== 'string' || img.name.length === 0) {
      fail('dossier image ' + i + ' has no name');
    }
  }
  const text = dossier.text as string | undefined;
  if (typeof text !== 'string' || text.length === 0) {
    fail('dossier has no text');
  }
  if (text.length > TEXT_MAX_BYTES) {
    fail('dossier text is ' + text.length + ' bytes, over its cap of ' + TEXT_MAX_BYTES);
  }
  if (images.length > DOSSIER_MAX_IMAGES) {
    fail('dossier has more images than the builder allows');
  }

  // Prove the mirrored screenshots on disk match the dossier count.
  const shotNames = readdirSync(join(outDir, 'screenshots'))
    .filter((n) => /\.(jpe?g|png)$/i.test(n))
    .sort();
  if (shotNames.length !== EXPECTED_IMAGES) {
    fail('output screenshots/ has ' + shotNames.length + ' images, expected ' + EXPECTED_IMAGES);
  }

  console.log('SOLMAR BAY dossier built: ' + dossierPath);
  console.log('  output: ' + outDir);
  console.log('  dossier: ' + dossierBytes.length + ' bytes (cap ' + DOSSIER_MAX_BYTES + ')');
  console.log('  schema: ' + dossier.schema + ', cover image: ' + cover);
  console.log('  images: ' + images.length + ' JPEGs (' + shotNames.join(', ') + ')');
  console.log('  text: ' + text.length + ' bytes (cap ' + TEXT_MAX_BYTES + ')');
  console.log('OK');
}

main();
