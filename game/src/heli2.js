// heli2.js — the police helicopter over Solmar Bay.
//
// Once the heat reaches three stars the air unit lifts off, circles
// above the player with its spotlight pinned on them, and stays up
// while the chase is hot. When the heat cools below three stars it
// peels away and the sky goes quiet again.

import * as THREE from '../vendor/three.module.min.js';

const ORBIT_RADIUS = 26;
const ORBIT_HEIGHT = 38;

function buildHeliMesh(THREE) {
  const group = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.4, metalness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 0.15, metalness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 3.6), hull);
  group.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.2), glass);
  nose.position.set(0, 0.1, 2.0);
  group.add(nose);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.4), hull);
  tail.position.set(0, 0.3, -3.2);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.9), hull);
  fin.position.set(0, 0.8, -4.7);
  group.add(fin);
  const skidL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 3.0), dark);
  skidL.position.set(-0.9, -0.95, 0);
  group.add(skidL);
  const skidR = skidL.clone();
  skidR.position.x = 0.9;
  group.add(skidR);
  const rotor = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(7.5, 0.08, 0.42);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
  const b1 = new THREE.Mesh(bladeGeo, bladeMat);
  const b2 = new THREE.Mesh(bladeGeo, bladeMat);
  b2.rotation.y = Math.PI / 2;
  rotor.add(b1, b2);
  rotor.position.y = 0.95;
  group.add(rotor);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xcc9900 })
  );
  lamp.position.set(0, -0.75, 1.2);
  group.add(lamp);
  group.userData.rotor = rotor;
  return group;
}

export function init(ctx) {
  const S = ctx.state;
  const scene = ctx.scene;
  if (typeof S.heli === 'undefined') S.heli = null;

  let angle = Math.random() * Math.PI * 2;

  function spawnHeli() {
    if (!scene || !ctx.THREE) return;
    const mesh = buildHeliMesh(ctx.THREE);
    const px = S.player.pos.x;
    const pz = S.player.pos.z;
    mesh.position.set(px + Math.cos(angle) * ORBIT_RADIUS, ORBIT_HEIGHT, pz + Math.sin(angle) * ORBIT_RADIUS);
    scene.add(mesh);

    const spot = new THREE.SpotLight(0xfff2c0, 100, 160, 0.38, 0.45, 1.0);
    spot.position.copy(mesh.position);
    spot.target = new THREE.Object3D();
    spot.target.position.set(px, 0, pz);
    scene.add(spot);
    scene.add(spot.target);

    // A soft pool of light on the street under the beam.
    const poolGeo = new THREE.CircleGeometry(7, 24);
    const poolMat = new THREE.MeshBasicMaterial({
      color: 0xfff2c0, transparent: true, opacity: 0.16, depthWrite: false,
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(px, 0.06, pz);
    scene.add(pool);

    S.heli = { pos: mesh.position, mesh, spot, pool, angle, kind: 'heli' };
  }

  function removeHeli() {
    const h = S.heli;
    if (!h) return;
    if (scene) {
      if (h.mesh) scene.remove(h.mesh);
      if (h.spot) scene.remove(h.spot);
      if (h.spot && h.spot.target) scene.remove(h.spot.target);
      if (h.pool) scene.remove(h.pool);
    }
    S.heli = null;
  }

  ctx.updates.push((dt, t) => {
    const w = typeof S.wanted === 'number' ? S.wanted : 0;
    if (w >= 3 && !S.heli) spawnHeli();
    else if (w < 3 && S.heli) removeHeli();

    const h = S.heli;
    if (!h) return;
    const step = Math.min(dt || 0, 0.05);
    angle += step * 0.45;
    h.angle = angle;
    const px = S.player.pos.x;
    const pz = S.player.pos.z;
    const tx = px + Math.cos(angle) * ORBIT_RADIUS;
    const tz = pz + Math.sin(angle) * ORBIT_RADIUS;
    const ease = Math.min(1, step * 1.5);
    h.pos.x += (tx - h.pos.x) * ease;
    h.pos.z += (tz - h.pos.z) * ease;
    h.pos.y += (ORBIT_HEIGHT - h.pos.y) * ease;
    h.mesh.rotation.y = -angle + Math.PI / 2;
    if (h.mesh.userData.rotor) h.mesh.userData.rotor.rotation.y += step * 22;
    if (h.spot) {
      h.spot.position.copy(h.pos);
      h.spot.target.position.set(px, 0, pz);
    }
    if (h.pool) h.pool.position.set(px, 0.06, pz);
  });

  ctx.api.heli = {
    spawn: spawnHeli,
    remove: removeHeli,
    active: () => !!S.heli,
  };
}
