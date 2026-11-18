// Tiny deterministic PRNG helpers. No imports, no globals, no Math.random().
// One seeded stream per system keeps generation reproducible: same seed,
// same city, same spawns, every load (see procedural-gen skill).

// mulberry32: small, fast, good-enough 32-bit PRNG.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Float in [min, max).
export function rand(rng, min, max) {
  return min + rng() * (max - min);
}

// Integer in [min, max] inclusive.
export function randInt(rng, min, max) {
  return Math.floor(rand(rng, min, max + 1));
}

// One element from a non-empty array.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// True with probability p (0..1).
export function chance(rng, p) {
  return rng() < p;
}

// One element, weighted by a parallel weights array (weights need not sum
// to 1 — they are normalised here). Used for weighted spawns and drops.
export function pickWeighted(rng, arr, weights) {
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total <= 0) return arr[0];
  let roll = rng() * total;
  for (let i = 0; i < arr.length; i++) {
    roll -= Math.max(0, weights[i]);
    if (roll <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

// In-place Fisher-Yates shuffle of a copy (the caller's array is untouched).
export function shuffle(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
