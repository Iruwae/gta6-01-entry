// Seeded RNG + small helpers for SOLMAR BAY.
export function makeRng(seed) {
  let s = seed >>> 0;
  if (s === 0) s = 0x9e3779b9;
  return function rng() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function rand(a = 1, b) {
  if (b === undefined) return Math.random() * a;
  return a + Math.random() * (b - a);
}

export function randInt(a, b) {
  return Math.floor(rand(a, b + 1));
}

export function pick(arr, rng) {
  const r = rng || Math.random;
  return arr[Math.floor(r() * arr.length)];
}

export function pickRng(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

export function chance(p, rng) {
  const r = rng || Math.random;
  return r() < p;
}

export function shuffle(arr, rng) {
  const r = rng || Math.random;
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist2D(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}
