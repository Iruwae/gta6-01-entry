// Solmar Bay — Vic's fence yard (round 7 rebuild).
// A marked yard at (110, 140) where the player sells the car they
// are driving: press V inside the yard and the car is gone, the
// quoted cash lands in the wallet, and fencesSold counts up. The
// quote depends on the kind of car and its condition; a hot car
// (high heat) earns a small wanted bonus on top.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const T = ctx.THREE || THREE;
  const dom = ctx.dom || {};

  const YARD = { x: 110, z: 140, r: 14 };
  const BASE = { bike: 150, sedan: 220, pickup: 260, sport: 450 };

  // ---- the yard: fenced patch, posts, painted sign --------------------
  const pad = new T.Mesh(
    new T.PlaneGeometry(YARD.r * 2, YARD.r * 2),
    new T.MeshLambertMaterial({ color: 0x4a4038 })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(YARD.x, 0.04, YARD.z);
  scene.add(pad);

  const postMat = new T.MeshLambertMaterial({ color: 0x8a7a5a });
  const postGeo = new T.BoxGeometry(0.4, 2.2, 0.4);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    // Leave the south side open so cars can drive in.
    if (a > Math.PI * 0.75 && a < Math.PI * 1.25) continue;
    const p = new T.Mesh(postGeo, postMat);
    p.position.set(YARD.x + Math.cos(a) * YARD.r, 1.1, YARD.z + Math.sin(a) * YARD.r);
    scene.add(p);
  }

  // Painted sign: "VIC'S FENCE — CASH FOR CARS"
  const sc = document.createElement('canvas');
  sc.width = 512;
  sc.height = 128;
  const sg = sc.getContext('2d');
  sg.fillStyle = '#1d1a22';
  sg.fillRect(0, 0, 512, 128);
  sg.strokeStyle = '#e8a33d';
  sg.lineWidth = 6;
  sg.strokeRect(6, 6, 500, 116);
  sg.fillStyle = '#e8a33d';
  sg.font = 'bold 44px sans-serif';
  sg.textAlign = 'center';
  sg.fillText("VIC'S FENCE", 256, 56);
  sg.fillStyle = '#ffffff';
  sg.font = 'bold 28px sans-serif';
  sg.fillText('CASH FOR CARS — PRESS V', 256, 100);
  const signTex = new T.CanvasTexture(sc);
  signTex.colorSpace = T.SRGBColorSpace;
  const sign = new T.Mesh(
    new T.PlaneGeometry(12, 3),
    new T.MeshBasicMaterial({ map: signTex })
  );
  sign.position.set(YARD.x, 4.2, YARD.z - YARD.r - 1);
  scene.add(sign);
  const signPost = new T.Mesh(new T.BoxGeometry(0.5, 4.2, 0.5), postMat);
  signPost.position.set(YARD.x, 2.1, YARD.z - YARD.r - 1);
  scene.add(signPost);

  // ---- pricing ---------------------------------------------------------
  function conditionOf(car) {
    if (!car) return 1;
    if (typeof car.health === 'number' && typeof car.maxHealth === 'number' && car.maxHealth > 0) {
      return Math.max(0, Math.min(1, car.health / car.maxHealth));
    }
    return 1;
  }
  function priceFor(car) {
    if (!car) return 0;
    const base = BASE[car.kind] || 180;
    const cond = conditionOf(car);
    return Math.round(base * (0.55 + 0.45 * cond));
  }
  function wantedBonus(car) {
    if (!car) return 0;
    const heat = typeof S.heat === 'number' ? S.heat : 0;
    if (heat >= 60) return 40;
    if (heat >= 30) return 20;
    return 0;
  }
  function quoteFor(car) {
    return priceFor(car) + wantedBonus(car);
  }
  function inYard(car) {
    if (!car || !car.pos) return false;
    const dx = car.pos.x - YARD.x;
    const dz = car.pos.z - YARD.z;
    return dx * dx + dz * dz <= YARD.r * YARD.r;
  }

  function sell(car) {
    const target = car || S.car;
    if (!target) return false;
    if (!inYard(target)) return false;
    const quote = quoteFor(target);
    S.cash = (typeof S.cash === 'number' ? S.cash : 0) + quote;
    if (Array.isArray(S.cars)) {
      const i = S.cars.indexOf(target);
      if (i >= 0) S.cars.splice(i, 1);
    }
    if (target.mesh && target.mesh.parent) target.mesh.parent.remove(target.mesh);
    if (S.car === target) S.car = null;
    if (S.stats && typeof S.stats.fencesSold === 'number') S.stats.fencesSold += 1;
    const cashEl = dom.cash || document.getElementById('cash');
    if (cashEl) cashEl.textContent = '$' + S.cash;
    const toast = dom.toast || document.getElementById('toast');
    if (S.banterDirector && S.banterDirector.show) {
      S.banterDirector.show('VIC', 'Pleasure doing business. Bring me the next one.', true);
    } else if (toast) {
      toast.textContent = 'VIC: "Sold for $' + quote + '. Pleasure doing business."';
      if (toast.classList) toast.classList.remove('hidden');
    }
    return true;
  }

  const director = {
    yard: YARD,
    priceFor,
    wantedBonus,
    quoteFor,
    sell,
    inYard,
  };
  S.fenceDirector = director;
  ctx.api.fence = director;
  ctx.api.fenceDirector = director;

  // ---- key V: window listener + polled input fallback ------------------
  function trySell() {
    if (S.mode && S.mode !== 'playing') return;
    if (S.cutscene) return;
    if (S.car && inYard(S.car)) sell(S.car);
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyV' && !e.repeat) trySell();
  });

  function inputDown(code) {
    const inp = ctx.input;
    if (!inp) return false;
    if (inp.keys instanceof Set) return inp.keys.has(code);
    if (Array.isArray(inp.keys)) return inp.keys.includes(code);
    if (typeof inp.isDown === 'function') return !!inp.isDown(code);
    return !!inp[code];
  }
  let prevV = false;
  ctx.updates.push(() => {
    const down = inputDown('KeyV');
    if (down && !prevV) trySell();
    prevV = down;
  });
}
