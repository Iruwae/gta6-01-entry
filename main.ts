// main.ts — submission handoff for the SOLMAR BAY entry (GTA6-01).
//
// This file is NOT the game boot (the game boots from game/src/main.js).
// It stages a clean submission folder and builds the dossier the
// scorer checks:
//
//   1. mirror game/ and screenshots/ into the output folder
//      ($MAKEFUN_OUTPUT_DIR, or /output when unset), wiping whatever
//      stale output was there first so repeat runs are clean;
//   2. refuse any symbolic link or special file on the way in — the
//      dossier builder refuses them too, and failing early here names
//      the offending path;
//   3. build dossier.json from what actually landed in the output
//      folder, with the bounty gate caps, and check the result
//      (schema, cover, four images, text under its cap, dossier under
//      1.5 MiB) before declaring the run a success.
//
// Node 22, standard library only, erasable TypeScript: run it as-is
// with `node main.ts`, no flags, no build, no install. Running it
// twice into two folders produces byte-identical outputs.

import * as dossierLib from './vendor/makefun-game.ts';
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(fileURLToPath(new URL('./main.ts', import.meta.url)));
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

const TEXT_MAX_BYTES = 163840;
const SCREENSHOT_MAX = 4;
const SCREENSHOT_MAX_BYTES = 262144;
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 48 * 1024 * 1024;
const GAME_PATH_MAX_BYTES = 1000;
const DOSSIER_MAX_BYTES = Math.floor(1.5 * 1024 * 1024);

function fail(message: string): never {
  console.error(`[main.ts] ERROR: ${message}`);
  process.exit(1);
}

// Copy one tree, entry by entry. Every entry is lstat'ed first: a
// symlink or anything that is not a plain file or directory stops the
// run with the path in the message, so a bad entry can never slip
// into the output silently.
function mirrorTree(sourceDir: string, targetDir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  const walk = (from: string, to: string): void => {
    mkdirSync(to, { recursive: true });
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      const src = join(from, entry.name);
      const dst = join(to, entry.name);
      const st = lstatSync(src);
      if (st.isSymbolicLink()) fail(`refusing symbolic link: ${src}`);
      if (st.isDirectory()) {
        walk(src, dst);
      } else if (st.isFile()) {
        copyFileSync(src, dst);
        files += 1;
        bytes += st.size;
      } else {
        fail(`refusing special file: ${src}`);
      }
    }
  };
  walk(sourceDir, targetDir);
  return { files, bytes };
}

function main(): void {
  if (OUTPUT_DIR === REPO_ROOT) fail('output folder must not be the repo root');
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  for (const dir of [gameDir, shotsDir]) {
    if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
      fail(`missing directory: ${dir}`);
    }
  }

  // Wipe stale output first, then rebuild it from scratch.
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const game = mirrorTree(gameDir, join(OUTPUT_DIR, 'game'));
  const shots = mirrorTree(shotsDir, join(OUTPUT_DIR, 'screenshots'));
  console.log(`[main.ts] staged ${game.files} game files (${game.bytes} bytes), ${shots.files} screenshots (${shots.bytes} bytes) -> ${OUTPUT_DIR}`);
  console.log(`[main.ts] ${dossierLib.dossierNote('solmar-bay', 'round-6')}`);

  const dossier = dossierLib.buildDossier(OUTPUT_DIR, {
    text_max_bytes: TEXT_MAX_BYTES,
    screenshots: { max: SCREENSHOT_MAX, max_bytes: SCREENSHOT_MAX_BYTES },
    game_max_files: GAME_MAX_FILES,
    game_max_bytes: GAME_MAX_BYTES,
    game_path_max_bytes: GAME_PATH_MAX_BYTES,
  });
  const dossierPath = join(OUTPUT_DIR, 'dossier.json');
  writeFileSync(dossierPath, dossier);

  // Checks on what was actually written: the dossier must name its
  // schema, point at the first image as the cover, hold all four
  // screenshots, keep its text under the cap, and stay under 1.5 MiB.
  if (dossier.length > DOSSIER_MAX_BYTES) {
    fail(`dossier.json is ${dossier.length} bytes, over the ${DOSSIER_MAX_BYTES} allowed`);
  }
  const doc = JSON.parse(new TextDecoder().decode(dossier)) as {
    schema: string;
    cover: number;
    text: string;
    images: { name: string }[];
  };
  const textBytes = Buffer.byteLength(doc.text, 'utf8');
  const problems: string[] = [];
  if (doc.schema !== dossierLib.DOSSIER_SCHEMA) problems.push(`schema is ${doc.schema}`);
  if (doc.cover !== 0) problems.push(`cover is ${doc.cover}, expected 0`);
  if (!Array.isArray(doc.images) || doc.images.length !== 4) {
    problems.push(`images: ${Array.isArray(doc.images) ? doc.images.length : 'none'}, expected 4`);
  }
  if (textBytes > TEXT_MAX_BYTES) problems.push(`text is ${textBytes} bytes, over the ${TEXT_MAX_BYTES} cap`);
  if (problems.length > 0) fail('dossier checks failed: ' + problems.join('; '));

  console.log(
    `[main.ts] dossier.json OK — schema ${doc.schema}, cover ${doc.cover}, ` +
      `${doc.images.length} images (${doc.images.map((i) => i.name).join(', ')}), ` +
      `text ${textBytes}/${TEXT_MAX_BYTES} bytes, dossier ${dossier.length} bytes`,
  );
}

main();
