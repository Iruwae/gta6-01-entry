// SOLMAR BAY — main.ts entrypoint for make.fun gta6-01 (round 13).
// Run as: node main.ts
// Mirrors game/ and screenshots/ into the output folder and writes a
// deterministic dossier.json describing the entry. Node 22 stdlib only.
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMPETITION = 'gta6-01';
const ENTRY = 'SOLMAR BAY';
const ROUND = 13;
const BLURB = 'SOLMAR BAY — an original open-world sunset crime game for make.fun gta6-01.';
const MAX_IMAGE_BYTES = 262144; // 256 KiB
const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20 MiB
const MAX_BLURB_CHARS = 280;

function fail(message: string): never {
  console.error('main.ts: ' + message);
  process.exit(1);
}

function sha256(file: string): string {
  const hash = createHash('sha256');
  hash.update(readFileSync(file));
  return hash.digest('hex');
}

interface FileEntry {
  path: string;
  size: number;
  sha256: string;
}

function walkSorted(rootDir: string, baseDir: string, out: FileEntry[]): void {
  const entries = readdirSync(rootDir).sort();
  for (const name of entries) {
    const full = join(rootDir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkSorted(full, baseDir, out);
    } else if (st.isFile()) {
      const rel = relative(baseDir, full).split(sep).join('/');
      out.push({ path: rel, size: st.size, sha256: sha256(full) });
    }
  }
}

function copyTree(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src).sort()) {
    const s = join(src, name);
    const d = join(dest, name);
    const st = statSync(s);
    if (st.isDirectory()) {
      copyTree(s, d);
    } else if (st.isFile()) {
      copyFileSync(s, d);
    }
  }
}

function clearContents(dir: string): void {
  // Clear ONLY the contents — never remove the directory itself, because
  // at the grader /output is a mount point and removing it fails EBUSY.
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

function main(): void {
  // The repository root resolves from THIS file's own location, never cwd.
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = process.env.MAKEFUN_BOT_DIR
    ? resolve(process.env.MAKEFUN_BOT_DIR)
    : resolve(thisDir);
  const gameDir = join(repoRoot, 'game');
  const shotsDir = join(repoRoot, 'screenshots');
  const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

  if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
    fail('game/ is missing in ' + repoRoot);
  }
  if (!existsSync(join(gameDir, 'index.html'))) {
    fail('game/index.html is missing');
  }
  if (!existsSync(join(gameDir, 'src', 'main.js'))) {
    fail('game/src/main.js is missing');
  }
  if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) {
    fail('screenshots/ is missing in ' + repoRoot);
  }
  // Refuse unsafe output dirs: the filesystem root, the repo root itself,
  // or anywhere inside the repo (a mirror must never eat the source tree).
  if (outputDir === resolve('/') || outputDir === repoRoot
    || outputDir.startsWith(repoRoot + '/')) {
    fail('refusing unsafe output dir: ' + outputDir);
  }

  mkdirSync(outputDir, { recursive: true });
  clearContents(outputDir);
  copyTree(gameDir, join(outputDir, 'game'));
  copyTree(shotsDir, join(outputDir, 'screenshots'));

  const gameFiles: FileEntry[] = [];
  const shotFiles: FileEntry[] = [];
  walkSorted(join(outputDir, 'game'), outputDir, gameFiles);
  walkSorted(join(outputDir, 'screenshots'), outputDir, shotFiles);

  const totalFiles = gameFiles.length + shotFiles.length;
  const totalBytes = [...gameFiles, ...shotFiles].reduce((n, f) => n + f.size, 0);

  // Cover: the screenshots path matching cover.jpg/png, or null.
  const coverEntry = shotFiles.find(
    (f) => /(^|\/)cover\.(jpg|png)$/i.test(f.path),
  ) || null;
  const cover = coverEntry ? coverEntry.path : null;

  const dossier = {
    competition: COMPETITION,
    entry: ENTRY,
    round: ROUND,
    blurb: BLURB,
    cover,
    game: gameFiles,
    screenshots: shotFiles,
    totals: { files: totalFiles, bytes: totalBytes },
    checks: {
      schema: false,
      cover: false,
      images: false,
      textCap: false,
      sizeCap: false,
    },
  };

  // Checks.
  const hex64 = /^[0-9a-f]{64}$/;
  const shapeOk = (list: FileEntry[]): boolean =>
    list.every(
      (f) => typeof f.path === 'string' && f.path.length > 0
        && Number.isInteger(f.size) && f.size >= 0
        && typeof f.sha256 === 'string' && hex64.test(f.sha256),
    );
  dossier.checks.schema = typeof dossier.competition === 'string'
    && typeof dossier.entry === 'string'
    && typeof dossier.round === 'number'
    && typeof dossier.blurb === 'string'
    && (dossier.cover === null || typeof dossier.cover === 'string')
    && Array.isArray(dossier.game) && Array.isArray(dossier.screenshots)
    && shapeOk(dossier.game) && shapeOk(dossier.screenshots)
    && Number.isInteger(dossier.totals.files) && Number.isInteger(dossier.totals.bytes);
  dossier.checks.cover = coverEntry === null || coverEntry.size <= MAX_IMAGE_BYTES;
  dossier.checks.images = shotFiles.length >= 4
    && shotFiles.every((f) => f.size <= MAX_IMAGE_BYTES);
  dossier.checks.textCap = BLURB.length <= MAX_BLURB_CHARS;
  dossier.checks.sizeCap = totalBytes <= MAX_TOTAL_BYTES;

  const dossierPath = join(outputDir, 'dossier.json');
  writeFileSync(dossierPath, JSON.stringify(dossier, null, 2) + '\n', 'utf8');

  const checks = dossier.checks;
  console.log(
    `${ENTRY} round ${ROUND}: ${totalFiles} files (${gameFiles.length} game, ${shotFiles.length} screenshots), ${totalBytes} bytes -> ${outputDir}`,
  );
  console.log(
    `checks: schema=${checks.schema} cover=${checks.cover} images=${checks.images} textCap=${checks.textCap} sizeCap=${checks.sizeCap}`,
  );

  if (!checks.schema || !checks.cover || !checks.images || !checks.textCap || !checks.sizeCap) {
    process.exit(1);
  }
}

main();
