// SOLMAR BAY — small random helpers (GTA6-01 round 8 rebuild).
// A tiny seeded generator plus the everyday picks the world modules use
// for traffic, pedestrians, banter and loot. Nothing here touches the
// DOM or the game state; it is pure number-shaping.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A module-level stream for casual use; deterministic per page load.
const stream = mulberry32(0x5eed1234);

export function rand(min = 0, max = 1) {
  return min + stream() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

export function pick(list) {
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(stream() * list.length)];
}

export function chance(p) {
  return stream() < p;
}

export function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(stream() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist2d(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export const random = { mulberry32, rand, randInt, pick, chance, shuffle, clamp, lerp, dist2d };

export default random;

// Publish the helpers onto the shared context so any module can call
// ctx.random.pick(...) without importing this file.
export function init(ctx) {
  ctx.random = random;
}
