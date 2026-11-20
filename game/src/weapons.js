// Solmar Bay — weapon rack (round-5 rebuild, written fresh).
//
// Owns the four-slot loadout, the shoot / reload loop and the little
// tracer line each shot draws through the air. The rest of the game
// only ever touches the shapes below, so this file keeps them exactly:
//
//   S.weapons = { defs, def, unlocked, magOf, fireRateOf, switchTo }
//   S.player.loadout = { equipped, defs, current() -> { def } }
//   S.player.ammo, S.player.reloading, S.player.reloadT,
//   S.player._fireCd, S.player._shotsFired
//
// Controls: Digit1..Digit4 pick a slot, holding the mouse fires, KeyR
// reloads. A reload takes 1.2 s and refills the whole magazine in one
// atomic step when its timer runs out. Switching to another unlocked
// slot refills that slot's magazine at once and cancels any reload in
// progress; switching to the slot already equipped is a harmless no-op.
//
// Split of duties, learned the hard way: the player loop owns firing
// and reloading (it owns ammo, the trigger cooldown and the reload
// timer, and it decides when a round leaves). This file's per-frame
// loop owns ONLY the slot keys and the tracer: it notices a shot after
// the fact — a rising shot count, or a falling magazine while the
// trigger is held — and draws the line for it. It never decrements
// ammo, never touches the cooldown and never runs the reload timer,
// because doing any of those here would double them: the player loop
// already does, and this loop is driven once per frame on top of it.
//
// The tracer is the one place this file draws anything. Its far end is
// computed from the mouse ray onto the ground plane, with the player's
// facing as a fallback, and BOTH ends are checked finite before a Line
// is ever built — a non-finite endpoint must never reach the scene,
// because the renderer chokes on it while computing bounding spheres.
// Old tracers are disposed (geometry + material) instead of leaking.

import * as THREE from '../vendor/three.module.min.js';

// ---- the four slots -----------------------------------------------------
// mag / fireRate / unlock / damage / range / kick, per slot.
const SPECS = [
  { name: 'PISTOL', mag: 12, fireRate: 0.25, unlock: 0, damage: 22, range: 55, kick: 0.02 },
  { name: 'SMG', mag: 30, fireRate: 0.09, unlock: 1, damage: 12, range: 45, kick: 0.012 },
  { name: 'SHOTGUN', mag: 6, fireRate: 0.85, unlock: 3, damage: 48, range: 22, kick: 0.06 },
  { name: 'RIFLE', mag: 30, fireRate: 0.13, unlock: 5, damage: 30, range: 90, kick: 0.03 },
];

// The loadout keeps a lighter copy of the same four slots (name, mag and
// damage only). It is built here only if nobody built one yet — the
// player setup normally owns it, and we never clobber an existing one.
const LOADOUT_SPECS = [
  { name: 'PISTOL', mag: 12, damage: 12 },
  { name: 'SMG', mag: 30, damage: 8 },
  { name: 'SHOTGUN', mag: 6, damage: 30 },
  { name: 'RIFLE', mag: 30, damage: 22 },
];

const MUZZLE_HEIGHT = 1.35;
const TRACER_LIFE = 0.12;
const TRACER_MAX = 24;
const TRACER_COLOR = 0xffd27d;

// Scratch objects reused by the aim math so firing never allocates.
const _raycaster = new THREE.Raycaster();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -MUZZLE_HEIGHT);
const _hitPoint = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _end = new THREE.Vector3();

// Live tracer lines, each { line, life }. Aged out in update().
const tracers = [];

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function dropTracer(t) {
  const i = tracers.indexOf(t);
  if (i >= 0) tracers.splice(i, 1);
  if (t.line.parent) t.line.parent.remove(t.line);
  if (t.line.geometry) t.line.geometry.dispose();
  if (t.line.material) t.line.material.dispose();
}

function ageTracers(dt) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i];
    t.life -= dt;
    if (t.life <= 0) dropTracer(t);
  }
}

// Where a shot is going, as a flat (x, z) unit direction.
// First choice is the mouse ray's ground hit; anything odd about it
// (no camera yet, a ray parallel to the ground, a non-finite hit)
// falls back to the direction the player is facing.
function aimDirection(state, player) {
  const heading = isNum(player.heading) ? player.heading : 0;
  const facing = { x: Math.sin(heading), z: Math.cos(heading) };
  try {
    const cam = state.camera;
    const mouse = state.mouse;
    if (!cam || !mouse || !isNum(mouse.x) || !isNum(mouse.y)) return facing;
    const w = (typeof window !== 'undefined' && window.innerWidth) || 1280;
    const h = (typeof window !== 'undefined' && window.innerHeight) || 720;
    const nx = (mouse.x / w) * 2 - 1;
    const ny = -((mouse.y / h) * 2 - 1);
    if (!isNum(nx) || !isNum(ny)) return facing;
    _raycaster.setFromCamera({ x: nx, y: ny }, cam);
    const got = _raycaster.ray.intersectPlane(_groundPlane, _hitPoint);
    if (!got || !isNum(_hitPoint.x) || !isNum(_hitPoint.z)) return facing;
    const dx = _hitPoint.x - _muzzle.x;
    const dz = _hitPoint.z - _muzzle.z;
    const len = Math.hypot(dx, dz);
    if (!(len > 0.001)) return facing;
    return { x: dx / len, z: dz / len };
  } catch (err) {
    return facing;
  }
}

// Draw one shot as a short-lived line from the muzzle to the end of the
// bullet's travel. If either end is not finite, draw nothing at all —
// a Line with a NaN / Infinity endpoint poisons the whole render.
function spawnTracer(state, player, spec) {
  const scene = state.scene;
  if (!scene || !player.pos) return;
  if (!isNum(player.pos.x) || !isNum(player.pos.z)) return;
  _muzzle.set(player.pos.x, MUZZLE_HEIGHT, player.pos.z);
  const dir = aimDirection(state, player);
  if (!isNum(dir.x) || !isNum(dir.z)) return;
  const range = isNum(spec.range) ? spec.range : 40;
  _end.set(_muzzle.x + dir.x * range, MUZZLE_HEIGHT, _muzzle.z + dir.z * range);
  const mx = _muzzle.x;
  const my = _muzzle.y;
  const mz = _muzzle.z;
  const ex = _end.x;
  const ey = _end.y;
  const ez = _end.z;
  if (!isNum(mx) || !isNum(my) || !isNum(mz)) return;
  if (!isNum(ex) || !isNum(ey) || !isNum(ez)) return;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([mx, my, mz, ex, ey, ez]), 3));
  const mat = new THREE.LineBasicMaterial({ color: TRACER_COLOR, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  line.frustumCulled = false;
  scene.add(line);
  tracers.push({ line, life: TRACER_LIFE });
  while (tracers.length > TRACER_MAX) dropTracer(tracers[0]);
}

export function init(state) {
  if (!state) return null;
  const player = () => state.player;

  // Make sure the player carries a loadout. Normally the player setup
  // already built one; we only fill the gap so current() never crashes.
  if (state.player && !state.player.loadout) {
    const lo = { equipped: 0, defs: LOADOUT_SPECS };
    lo.current = () => ({ def: lo.defs[lo.equipped] || lo.defs[0] });
    state.player.loadout = lo;
  }
  if (state.player && state.player.ammo === undefined) state.player.ammo = SPECS[0].mag;
  if (state.player && state.player.reloading === undefined) state.player.reloading = false;
  if (state.player && state.player.reloadT === undefined) state.player.reloadT = 0;

  // Shot watch: the player loop fires, we only observe. Remember the
  // last seen magazine, shot count and slot so a fresh round is spotted
  // once. A falling magazine with the slot unchanged means a round
  // left; a falling magazine across a slot change is just a swap.
  let lastAmmo = state.player ? state.player.ammo : SPECS[0].mag;
  let lastShots = state.player && typeof state.player._shotsFired === 'number' ? state.player._shotsFired : 0;
  let lastEquipped = state.player && state.player.loadout ? state.player.loadout.equipped : 0;

  function equippedIndex() {
    const p = player();
    if (p && p.loadout && Number.isInteger(p.loadout.equipped)) return p.loadout.equipped;
    return 0;
  }

  // The def for a slot, or for the equipped slot when no index is given.
  function def(i) {
    if (i === undefined || i === null) i = equippedIndex();
    return SPECS[i];
  }

  // A slot is usable once enough story jobs are done.
  function unlocked(i) {
    const spec = SPECS[i];
    if (!spec) return false;
    const done = typeof state.missionIndex === 'number' ? state.missionIndex : 0;
    return done >= spec.unlock;
  }

  function magOf(i) {
    const spec = SPECS[i];
    return spec ? spec.mag : 0;
  }

  function fireRateOf(i) {
    const spec = SPECS[i];
    return spec ? spec.fireRate : 0.25;
  }

  // Swap to a slot. Out-of-range or locked slots refuse (false) and
  // change nothing; the equipped slot accepts (true) without touching
  // ammo; a real swap refills the new magazine and cancels reloading.
  // Written without `this` so it also works detached from S.weapons.
  function switchTo(i) {
    if (!Number.isInteger(i) || i < 0 || i >= SPECS.length) return false;
    const p = player();
    if (!p || !p.loadout) return false;
    if (!unlocked(i)) return false;
    if (p.loadout.equipped === i) return true;
    p.loadout.equipped = i;
    p.ammo = SPECS[i].mag;
    p.reloading = false;
    p.reloadT = 0;
    p._fireCd = 0;
    return true;
  }

  // The per-frame weapon loop: slot keys plus tracer observation.
  // Reads keys and mouse state live on every call instead of caching
  // them. Deliberately never fires, never touches the trigger cooldown
  // and never runs the reload timer — the player loop owns all three,
  // and repeating them here would double their rate.
  function update(dt) {
    const step = isNum(dt) && dt > 0 ? Math.min(dt, 0.05) : 0.05;
    const p = player();
    ageTracers(step);
    if (!p || !p.loadout) return;
    const keys = state.keys || {};

    // Digit1..Digit4 pick a slot. Level-triggered on purpose: at the
    // headless frame rate a quick press can fall between frames, so any
    // frame that sees the key down must act on it. switchTo() itself
    // makes repeats harmless (same slot = no-op, locked = refused).
    for (let i = 0; i < SPECS.length; i++) {
      if (keys['Digit' + (i + 1)] && p.loadout.equipped !== i) switchTo(i);
    }

    // Notice a round the player loop just fired and draw its tracer.
    // A rising shot count is the clean signal; a falling magazine
    // with the slot unchanged is the backup for loops that do not
    // count shots. The baseline is refreshed on every call so one
    // round draws exactly one tracer even if this loop is driven
    // twice in the same frame.
    const shots = typeof p._shotsFired === 'number' ? p._shotsFired : 0;
    const fired = shots > lastShots || (p.ammo < lastAmmo && p.loadout.equipped === lastEquipped);
    lastShots = shots;
    lastAmmo = p.ammo;
    lastEquipped = p.loadout.equipped;
    if (fired) {
      const spec = def(p.loadout.equipped) || SPECS[0];
      spawnTracer(state, p, spec);
    }
  }

  state.weapons = { defs: SPECS, def, unlocked, magOf, fireRateOf, switchTo };
  state.weaponsUpdate = update;
  // The legacy updater list gets the same function so anything that
  // still reads it sees this build's loop.
  if (Array.isArray(state.updaters) && !state.updaters.includes(update)) state.updaters.push(update);
  // Live driver lists: this loop must be driven once per frame for the
  // slot keys to respond, so it registers on both lists the driver is
  // known to read. That is safe now that the loop never fires, never
  // touches the trigger cooldown and never runs the reload timer — a
  // second drive of the same frame only re-checks the keys (idempotent)
  // and refreshes the shot baseline (one tracer per round at most).
  if (state.__b1Fns && typeof state.__b1Fns.push === 'function') {
    try {
      if (!Array.from(state.__b1Fns).includes(update)) state.__b1Fns.push(update);
    } catch (err) { /* array-like without a clean read; updaters covers it */ }
  }
  if (state._tick && typeof state._tick.push === 'function') {
    try {
      if (!Array.from(state._tick).includes(update)) state._tick.push(update);
    } catch (err) { /* same as above */ }
  }
  state.__b1WeaponsInit = true;

  // Hand the loop back too: the main driver may call the returned
  // function directly instead of (or as well as) the registered one.
  return update;
}
