// SOLMAR BAY — make.fun gta6-01 entrypoint (round 9 rebuild).
// Run as `node main.ts`. It mirrors game/ and screenshots/ into the
// output folder and writes a deterministic dossier.json describing the
// entry. The repository root is resolved from THIS file's own location
// (import.meta.url), never from the process working directory, so the
// same command works from anywhere and produces a byte-identical dossier.
//
//   MAKEFUN_BOT_DIR     — when set, this directory is the repo root.
//   MAKEFUN_OUTPUT_DIR  — when set, the dossier lands here, else /output.

import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative, sep } from 'node:path';
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
import { createHash } from 'node:crypto';

interface DossierFile {
  path: string;
  size: number;
  sha256: string;
}

interface Dossier {
  competition: string;
  entry: string;
  round: number;
  blurb: string;
  cover: string | null;
  game: DossierFile[];
  screenshots: DossierFile[];
  totals: { files: number; bytes: number };
  checks: { schema: boolean; cover: boolean; images: boolean; textCap: boolean; sizeCap: boolean };
}

const BLURB =
  'SOLMAR BAY — an original open-world sunset crime game for make.fun gta6-01.';
const TEXT_CAP = 280;
const IMAGE_MAX_BYTES = 256 * 1024;
const DOSSIER_MAX_BYTES = 20 * 1024 * 1024;
const MIN_IMAGES = 4;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = process.env.MAKEFUN_BOT_DIR
  ? resolve(process.env.MAKEFUN_BOT_DIR)
  : scriptDir;
const gameDir = join(root, 'game');
const shotsDir = join(root, 'screenshots');
const outDir = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : '/output';

function fail(message: string): never {
  console.error('main.ts: ' + message);
  process.exit(1);
}

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function walk(dir: string, base: string, out: DossierFile[]): void {
  const names = readdirSync(dir).sort();
  for (const name of names) {
    const full = join(dir, name);
    const rel = relative(base, full).split(sep).join('/');
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, base, out);
    } else if (st.isFile()) {
      out.push({ path: rel, size: st.size, sha256: sha256(full) });
    }
  }
}

function main(): void {
  if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
    fail('game/ not found under repo root: ' + root);
  }
  if (!existsSync(join(gameDir, 'index.html'))) {
    fail('game/index.html missing');
  }
  if (!existsSync(join(gameDir, 'src', 'main.js'))) {
    fail('game/src/main.js missing');
  }
  if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) {
    fail('screenshots/ not found under repo root: ' + root);
  }

  const resolvedOut = resolve(outDir);
  if (resolvedOut === '/' || resolvedOut === resolve(root)) {
    fail('refusing to use an unsafe output directory: ' + resolvedOut);
  }

  // Mirror the entry into a clean output folder.
  // Clear only the *contents*: /output is a mount point at the grader,
  // so removing the directory itself fails EBUSY and exits 1.
  mkdirSync(resolvedOut, { recursive: true });
  for (const name of readdirSync(resolvedOut)) {
    rmSync(join(resolvedOut, name), { recursive: true, force: true });
  }
  cpSync(gameDir, join(resolvedOut, 'game'), { recursive: true });
  cpSync(shotsDir, join(resolvedOut, 'screenshots'), { recursive: true });

  const gameFiles: DossierFile[] = [];
  walk(join(resolvedOut, 'game'), resolvedOut, gameFiles);
  const shotFiles: DossierFile[] = [];
  walk(join(resolvedOut, 'screenshots'), resolvedOut, shotFiles);
  gameFiles.sort((a, b) => (a.path < b.path ? -1 : 1));
  shotFiles.sort((a, b) => (a.path < b.path ? -1 : 1));

  // Checks: four images, each under the cap; a cover when one is shipped;
  // the blurb inside its text cap; the whole dossier inside its size cap.
  const images = shotFiles.filter((f) => /\.(jpe?g|png)$/i.test(f.path));
  const imagesOk = images.length >= MIN_IMAGES && images.every((f) => f.size <= IMAGE_MAX_BYTES);
  const coverFile =
    shotFiles.find((f) => /(^|\/)cover\.(jpe?g|png)$/i.test(f.path)) || null;
  const coverOk = coverFile === null || coverFile.size <= IMAGE_MAX_BYTES;
  const textOk = BLURB.length <= TEXT_CAP;
  const totalBytes =
    gameFiles.reduce((n, f) => n + f.size, 0) +
    shotFiles.reduce((n, f) => n + f.size, 0);
  const sizeOk = totalBytes <= DOSSIER_MAX_BYTES;

  const dossier: Dossier = {
    competition: 'gta6-01',
    entry: 'SOLMAR BAY',
    round: 10,
    blurb: BLURB,
    cover: coverFile ? coverFile.path : null,
    game: gameFiles,
    screenshots: shotFiles,
    totals: { files: gameFiles.length + shotFiles.length, bytes: totalBytes },
    checks: {
      schema: true,
      cover: coverOk,
      images: imagesOk,
      textCap: textOk,
      sizeCap: sizeOk,
    },
  };

  // Schema check: every required field present with the right shape.
  const schemaOk =
    typeof dossier.competition === 'string' &&
    typeof dossier.entry === 'string' &&
    typeof dossier.blurb === 'string' &&
    Array.isArray(dossier.game) &&
    Array.isArray(dossier.screenshots) &&
    dossier.game.every((f) => typeof f.path === 'string' && typeof f.size === 'number' && /^[0-9a-f]{64}$/.test(f.sha256));
  dossier.checks.schema = schemaOk;

  // The dossier itself is part of the output, but its own bytes are not
  // hashed into it — otherwise no two runs could ever agree.
  const text = JSON.stringify(dossier, null, 2) + '\n';
  writeFileSync(join(resolvedOut, 'dossier.json'), text, 'utf8');

  const allOk = schemaOk && coverOk && imagesOk && textOk && sizeOk;
  console.log(`SOLMAR BAY dossier: ${gameFiles.length} game files, ${shotFiles.length} screenshots (${images.length} images), ${totalBytes} bytes -> ${resolvedOut}`);
  console.log(
    `checks: schema=${schemaOk} cover=${coverOk} images=${imagesOk} textCap=${textOk} sizeCap=${sizeOk}`
  );
  if (!allOk) {
    fail('one or more dossier checks failed');
  }
}

main();
