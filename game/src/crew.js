// crew.js — Lena Cruz, riding with Vic.
//
// Lena is the getaway driver, the fighter in the passenger seat and
// the voice in Vic's ear. She joins the crew from mission 5 onward:
// a visible companion who follows a couple of paces behind, faces the
// same way Vic does, and drops a banter line now and then while the
// two of them work the bay together.

import * as THREE from '../vendor/three.module.min.js';

const BANTER = [
  'You drive like my grandma. Faster, Vic.',
  "Cops behind us? Cute. Watch this.",
  'Remind me why I let you pick the music.',
  'That was clean. Almost too clean.',
  'Next time, I drive. You navigate. Deal?',
  "Bay's ours tonight. I can feel it.",
  'If we get pinched, I was never here.',
  'Nice line through that corner. Do it again.',
];

function showToast(ctx, msg) {
  const api = ctx.api || {};
  if (typeof api.toast === 'function') {
    try { api.toast(msg); return; } catch (e) { /* fall through */ }
  }
  const el = (ctx.dom && ctx.dom.toast) ||
    (typeof document !== 'undefined' ? document.getElementById('toast') : null);
  if (el) el.textContent = msg;
}

function buildLenaMesh(THREE) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0x0e7c7b, roughness: 0.8 });
  const denim = new THREE.MeshStandardMaterial({ color: 0x1f2a3a, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98a5a, roughness: 0.7 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x191411, roughness: 0.85 });

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.24), denim);
  legL.position.set(-0.15, 0.28, 0);
  const legR = legL.clone();
  legR.position.x = 0.15;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.66, 0.32), jacket);
  torso.position.y = 0.9;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.58, 0.19), jacket);
  armL.position.set(-0.37, 0.88, 0);
  const armR = armL.clone();
  armR.position.x = 0.37;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), skin);
  head.position.y = 1.44;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), hairMat);
  hair.position.set(0, 1.5, -0.05);
  hair.scale.set(1, 0.9, 0.95);
  const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.36),
    new THREE.MeshStandardMaterial({ color: 0xe8b13c, roughness: 0.8 }));
  scarf.position.y = 1.26;

  group.add(legL, legR, torso, armL, armR, head, hair, scarf);
  return group;
}

export function init(ctx) {
  const S = ctx.state;
  const scene = ctx.scene;
  if (!S.crew) S.crew = { active: false, name: 'Lena Cruz' };

  function ensureMesh() {
    if (S.crew.mesh) return S.crew.mesh;
    if (!scene || !ctx.THREE) return null;
    const mesh = buildLenaMesh(ctx.THREE);
    mesh.visible = false;
    mesh.position.set(S.player.pos.x - 2, 0, S.player.pos.z - 2);
    scene.add(mesh);
    S.crew.mesh = mesh;
    S.crew.pos = mesh.position;
    return mesh;
  }
  ensureMesh();

  function sayLine(line) {
    const b = S.banterDirector;
    if (b && typeof b.say === 'function') { b.say('LENA', line); return; }
    if (b && typeof b.line === 'function') { b.line('LENA', line); return; }
    showToast(ctx, 'LENA: "' + line + '"');
  }

  function join() {
    S.crew.active = true;
    const mesh = ensureMesh();
    if (mesh) mesh.visible = true;
    showToast(ctx, "Lena's riding with you now.");
  }

  function leave() {
    S.crew.active = false;
    if (S.crew.mesh) S.crew.mesh.visible = false;
  }

  let banterT = 20;
  let lastLine = -1;

  ctx.updates.push((dt, t) => {
    const mesh = ensureMesh();
    if (!mesh) return;
    mesh.visible = !!S.crew.active;
    if (!S.crew.active) return;

    // A couple of paces behind Vic's shoulder; snap back beside him if
    // the chase ever leaves her far behind.
    const h = S.player.heading || 0;
    const tx = S.player.pos.x - Math.sin(h) * 2.2 - Math.cos(h) * 1.2;
    const tz = S.player.pos.z - Math.cos(h) * 2.2 + Math.sin(h) * 1.2;
    const d = Math.hypot(tx - mesh.position.x, tz - mesh.position.z);
    const step = Math.min(dt || 0, 0.05);
    if (d > 18) {
      mesh.position.set(tx, 0, tz);
    } else {
      const ease = Math.min(1, step * 2.5);
      mesh.position.x += (tx - mesh.position.x) * ease;
      mesh.position.z += (tz - mesh.position.z) * ease;
    }
    mesh.position.y = 0;
    mesh.rotation.y = h;
    S.crew.pos = mesh.position;

    // A line now and then while the two of them work.
    banterT -= dt || 0;
    if (banterT <= 0) {
      banterT = 40 + Math.random() * 30;
      let pick = Math.floor(Math.random() * BANTER.length);
      if (pick === lastLine) pick = (pick + 1) % BANTER.length;
      lastLine = pick;
      sayLine(BANTER[pick]);
    }
  });

  ctx.api.crew = { join, leave, say: sayLine };
}
