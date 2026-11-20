// SOLMAR BAY — one seeded stream so the city layout is identical
// every boot. mulberry32: tiny, fast, and good enough for streets.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function init(S) {
  const seed = 20261120;
  const rng = mulberry32(seed);
  S.seed = seed;
  S.rng = rng;
  S.rand = (a, b) => {
    if (a === undefined) return rng();
    if (b === undefined) return rng() * a;
    return a + rng() * (b - a);
  };
  S.randInt = (a, b) => Math.floor(a + rng() * (b - a + 1));
  S.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  S.chance = (p) => rng() < p;
  return rng;
}
