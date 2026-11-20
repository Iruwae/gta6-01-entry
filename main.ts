// SOLMAR BAY — submission handoff for the GTA6-01 round 7 rebuild.
//
// Run from the repo root with `node main.ts` (Node 22, stdlib only, no
// flags). It mirrors game/ and screenshots/ into the output folder,
// builds dossier.json from what actually landed using the vendored
// dossier builder, and checks the result before declaring success.
// Two runs into two folders produce byte-identical outputs.

import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO = resolve('.');
const OUT = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
const TEXT_MAX_BYTES = 163840;
const DOSSIER_MAX_BYTES = 1536 * 1024;

function fail(message) {
  console.error('main.ts: ' + message);
  process.exit(1);
}

function isSafeEntry(path) {
  const st = lstatSync(path);
  if (st.isSymbolicLink()) return false;
  if (!st.isFile() && !st.isDirectory()) return false;
  return true;
}

function walk(dir, base) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const rel = base ? base + '/' + name : name;
    if (!isSafeEntry(full)) fail('refusing symlink or special file: ' + rel);
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else out.push(rel);
  }
  return out;
}

function mirror(srcDir, destDir) {
  if (!existsSync(srcDir)) fail('missing source folder: ' + srcDir);
  const files = walk(srcDir, '');
  for (const rel of files) {
    const dest = join(destDir, rel);
    mkdirSync(join(dest, '..'), { recursive: true });
    cpSync(join(srcDir, rel), dest);
  }
  return files;
}

function main() {
  // Wipe stale output first so nothing from an old run survives.
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const gameFiles = mirror(join(REPO, 'game'), join(OUT, 'game'));
  const shotFiles = mirror(join(REPO, 'screenshots'), join(OUT, 'screenshots'));
  if (gameFiles.length === 0) fail('no game files mirrored');
  if (shotFiles.length === 0) fail('no screenshots mirrored');

  // The vendored builder reads OUT/game and OUT/screenshots itself
  // and returns the dossier as canonical JSON bytes.
  const dossierBytes = buildDossier(OUT, {
    text_max_bytes: TEXT_MAX_BYTES,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  const dossierPath = join(OUT, 'dossier.json');
  writeFileSync(dossierPath, dossierBytes);

  // ---- checks before declaring success ---------------------------
  if (dossierBytes.length >= DOSSIER_MAX_BYTES) {
    fail('dossier.json too large: ' + dossierBytes.length + ' bytes');
  }
  const dossier = JSON.parse(new TextDecoder().decode(dossierBytes));
  if (dossier.schema !== 'makefun/dossier/v1') fail('bad dossier schema: ' + dossier.schema);
  if (!Array.isArray(dossier.images) || dossier.images.length !== 4) {
    fail('expected 4 dossier images, found ' + (dossier.images ? dossier.images.length : 0));
  }
  if (typeof dossier.cover !== 'number' || !dossier.images[dossier.cover]) fail('no cover image');
  const textBytes = Buffer.byteLength(dossier.text || '', 'utf8');
  if (textBytes > TEXT_MAX_BYTES) fail('dossier text over cap: ' + textBytes + ' > ' + TEXT_MAX_BYTES);
  const coverBytes = readFileSync(join(OUT, 'screenshots', dossier.images[dossier.cover].name));
  if (coverBytes.length === 0) fail('cover image is empty');

  console.log('SOLMAR BAY dossier built OK');
  console.log('output: ' + OUT);
  console.log('game files: ' + gameFiles.length + ', screenshots: ' + shotFiles.length);
  console.log('cover: ' + dossier.images[dossier.cover].name);
  console.log('dossier.json: ' + dossierBytes.length + ' bytes, text: ' + textBytes + ' bytes');
}

main();
