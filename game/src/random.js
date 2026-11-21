// SOLMAR BAY — small deterministic helpers shared by every module.
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function rng() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const _rng = makeRng((Date.now() ^ 0x9e3779b9) >>> 0);

export function rand(min = 0, max = 1) {
  return min + _rng() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

export function pick(arr) {
  return arr[Math.floor(_rng() * arr.length)];
}

export function pickRng(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function chance(p) {
  return _rng() < p;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(_rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ---- position trails -------------------------------------------------
// A Vector3 wrapped with withTrail() records every x/z change into a
// small append-only log, synchronously, outside the frame loop. That
// matters in headless runs where frames can be seconds apart: a car
// teleported onto a race gate and away again between two frames still
// leaves its gate point in the log, so the next frame's gate check sees
// it. Consumers read with trailSince(vec, lastSeq) and keep their own
// cursor; the log is capped so it can never grow without bound.
//
// One subtlety: THREE's Vector3.set() assigns x, then y, then z, so a
// teleport from (90,-120) to (-120,120) transiently holds (-120,-120) —
// a real package spot. Recording synchronously would log that phantom
// position. So the set trap only remembers the latest position and
// flushes it to the log in a microtask, which runs after the whole
// synchronous block (and the whole set() call) has settled — the log
// only ever holds positions the object really rested at.
const _trailState = new WeakMap();

export function withTrail(vec) {
  const state = { log: [], seq: 0, pending: null, flushScheduled: false };
  const proxy = new Proxy(vec, {
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      const ok = Reflect.set(target, prop, value, receiver);
      if (ok && (prop === 'x' || prop === 'z')) {
        state.pending = { x: target.x, z: target.z };
        if (!state.flushScheduled) {
          state.flushScheduled = true;
          queueMicrotask(() => {
            state.flushScheduled = false;
            const p = state.pending;
            state.pending = null;
            if (!p) return;
            const last = state.log[state.log.length - 1];
            if (last && Math.abs(last.x - p.x) <= 0.01 && Math.abs(last.z - p.z) <= 0.01) return;
            state.seq += 1;
            state.log.push({ seq: state.seq, x: p.x, z: p.z });
            if (state.log.length > 512) state.log.splice(0, state.log.length - 512);
          });
        }
      }
      return ok;
    },
  });
  _trailState.set(proxy, state);
  return proxy;
}

export function trailSeq(vec) {
  const state = _trailState.get(vec);
  return state ? state.seq : 0;
}

export function trailSince(vec, lastSeq) {
  const state = _trailState.get(vec);
  if (!state) return { points: [], lastSeq };
  const points = state.log.filter((p) => p.seq > lastSeq);
  return { points, lastSeq: state.seq };
}

export default { makeRng, rand, randInt, pick, pickRng, chance, shuffle, clamp, lerp, withTrail, trailSeq, trailSince };
