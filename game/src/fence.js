// fence.js — Vic's fence yard at (110, 138).
// Drive a stolen car into the yard and press V to sell it. The quote is
// the car's condition-adjusted base price plus a small bonus per wanted
// star, and the sale is exactly that quote: cash in, car gone, one more
// fence sale on the stats. The yard itself is dressed with crates,
// fence posts, and a hand-painted sign.
// Written fresh for round 8 from the shared contract.
import * as THREE from '../vendor/three.module.min.js';

const YARD = { x: 110, z: 138, r: 12 };
const BASE_PRICE = { sedan: 400, bike: 300, pickup: 550, sport: 1200 };

// Input shapes differ between builds; accept a Set, a plain object of
// booleans, an isDown() function, or a pressed set — whichever is there.
function keyHeld(input, code) {
  if (!input) return false;
  if (typeof input.isDown === 'function') {
    try { return !!input.isDown(code); } catch (e) { return false; }
  }
  const keys = input.keys;
  if (keys) {
    if (typeof keys.has === 'function') return keys.has(code);
    if (typeof keys === 'object' && keys[code]) return true;
  }
  const pressed = input.pressed;
  if (pressed) {
    if (typeof pressed.has === 'function') return pressed.has(code);
    if (typeof pressed === 'object' && pressed[code]) return true;
  }
  if (typeof input[code] === 'boolean') return input[code];
  return false;
}

function makeSign(text, fg, bg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = fg; g.font = 'bold 62px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(c);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(8, 2),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
  );
}

export function init(ctx) {
  const S = ctx.state;
  const scene = ctx.scene;
  const dom = ctx.dom || {};

  // ---- yard dressing: crates, a ring of fence posts, a sign ----
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 1 });
  const crateMat2 = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 1 });
  for (const [cx, cz, s, m] of [
    [118, 144, 2.2, crateMat], [119.5, 142, 1.6, crateMat2],
    [103, 131, 2.0, crateMat2], [104.5, 133, 1.4, crateMat],
    [117, 131, 1.8, crateMat],
  ]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), m);
    crate.position.set(cx, s / 2, cz);
    crate.rotation.y = (cx + cz) % 1.2;
    scene.add(crate);
  }
  const postMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.6, 0.35), postMat);
    post.position.set(YARD.x + Math.cos(a) * 11, 0.8, YARD.z + Math.sin(a) * 11);
    scene.add(post);
  }
  const sign = makeSign("VIC'S YARD", '#ffd9a0', '#241a2e');
  sign.position.set(YARD.x, 2.8, YARD.z - 11.5);
  scene.add(sign);
  for (const px of [YARD.x - 4.2, YARD.x + 4.2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), postMat);
    post.position.set(px, 1.5, YARD.z - 11.5);
    scene.add(post);
  }

  // ---- the fence director: pricing + the sale ----
  const director = {
    yard: YARD,

    priceFor(car) {
      const base = BASE_PRICE[car.kind] || 250;
      const cond = car.maxHealth ? Math.max(0, Math.min(1, car.health / car.maxHealth)) : 1;
      return Math.round((base * (0.5 + 0.5 * cond)) / 5) * 5;
    },

    wantedBonus(car) {
      return (S.wanted || 0) * 25;
    },

    quote(car) {
      return this.priceFor(car) + this.wantedBonus(car);
    },
  };
  S.fenceDirector = director;
  ctx.api.fence = director;

  function toast(text) {
    const el = dom.toast;
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
  }

  // V sells the current car, but only inside the yard, only while
  // playing, and only once per key press.
  let prevV = false;
  ctx.updates.push((dt) => {
    const down = keyHeld(ctx.input, 'KeyV');
    const pressed = down && !prevV;
    prevV = down;
    if (!pressed) return;
    if (S.mode !== 'playing' || S.cutscene) return;
    const car = S.car;
    if (!car || car.aiPolice) return;
    const dx = car.pos.x - YARD.x;
    const dz = car.pos.z - YARD.z;
    if (dx * dx + dz * dz > YARD.r * YARD.r) return;
    const quote = director.quote(car);
    const kind = car.kind;
    S.cash += quote;
    S.stats.fencesSold = (S.stats.fencesSold || 0) + 1;
    const idx = (S.cars || []).indexOf(car);
    if (idx >= 0) S.cars.splice(idx, 1);
    if (car.mesh) scene.remove(car.mesh);
    S.car = null;
    toast("Sold the " + kind + " to Vic's fence for $" + quote + ".");
  });
}
