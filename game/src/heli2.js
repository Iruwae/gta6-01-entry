// heli2.js — the police helicopter over Solmar Bay.
// Lifts off at three wanted stars, circles the player with a
// spotlight, and stands down when the heat cools off.
// Written fresh for round 7 from the shared spec; no repo code was read.
import * as THREE from '../vendor/three.module.min.js';

const FLY_HEIGHT = 38;
const ORBIT_RADIUS = 18;

function wantedLevel(S) {
  if (typeof S.wanted === 'number') return Math.max(0, Math.min(5, Math.floor(S.wanted)));
  if (typeof S.heat === 'number') return Math.max(0, Math.min(5, Math.floor(S.heat / 20)));
  return 0;
}

export function init(ctx) {
  const S = ctx.state;
  const T = ctx.THREE || THREE;
  if (typeof S.heli === 'undefined') S.heli = null;

  let angle = 0;
  let rotor = null;

  function buildHeli() {
    const g = new T.Group();
    const body = new T.Mesh(
      new T.BoxGeometry(2.2, 1.4, 4.2),
      new T.MeshStandardMaterial({ color: 0x1c2b4a, roughness: 0.5, metalness: 0.4 })
    );
    const glass = new T.Mesh(
      new T.BoxGeometry(1.9, 0.8, 1.2),
      new T.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.15, metalness: 0.7 })
    );
    glass.position.set(0, 0.2, 1.6);
    const tail = new T.Mesh(
      new T.BoxGeometry(0.5, 0.5, 4.5),
      new T.MeshStandardMaterial({ color: 0x1c2b4a, roughness: 0.5, metalness: 0.4 })
    );
    tail.position.set(0, 0.2, -4);
    rotor = new T.Mesh(
      new T.BoxGeometry(9, 0.08, 0.5),
      new T.MeshStandardMaterial({ color: 0x222228, roughness: 0.6 })
    );
    rotor.position.y = 1.1;
    const skidL = new T.Mesh(new T.BoxGeometry(0.15, 0.15, 3.4), new T.MeshStandardMaterial({ color: 0x33333a }));
    skidL.position.set(-0.9, -0.9, 0);
    const skidR = skidL.clone();
    skidR.position.x = 0.9;
    const beam = new T.Mesh(
      new T.ConeGeometry(4.5, FLY_HEIGHT, 20, 1, true),
      new T.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.13, side: T.DoubleSide, depthWrite: false })
    );
    beam.position.y = -FLY_HEIGHT / 2;
    beam.rotation.x = Math.PI;
    g.add(body, glass, tail, rotor, skidL, skidR, beam);
    return g;
  }

  function spawn() {
    if (S.heli) return S.heli;
    const p = S.player ? S.player.pos : { x: 0, z: 0 };
    const mesh = buildHeli();
    const heli = {
      kind: 'heli',
      pos: new T.Vector3(p.x + ORBIT_RADIUS, FLY_HEIGHT, p.z),
      heading: 0,
      mesh,
    };
    mesh.position.copy(heli.pos);
    if (ctx.scene) ctx.scene.add(mesh);
    S.heli = heli;
    return heli;
  }

  function dismiss() {
    if (!S.heli) return;
    if (S.heli.mesh && ctx.scene) ctx.scene.remove(S.heli.mesh);
    S.heli = null;
  }

  ctx.api.heli = { spawn, dismiss, up: () => !!S.heli };

  ctx.updates.push((dt, t) => {
    const wanted = wantedLevel(S);
    if (wanted >= 3 && S.mode === 'playing') {
      const heli = spawn();
      const p = S.player ? S.player.pos : { x: 0, z: 0 };
      angle += dt * 0.45;
      heli.pos.set(
        p.x + Math.cos(angle) * ORBIT_RADIUS,
        FLY_HEIGHT,
        p.z + Math.sin(angle) * ORBIT_RADIUS
      );
      heli.heading = angle + Math.PI / 2;
      if (heli.mesh) {
        heli.mesh.position.copy(heli.pos);
        heli.mesh.rotation.y = -heli.heading;
      }
      if (rotor) rotor.rotation.y += dt * 18;
    } else if (S.heli) {
      dismiss();
    }
  });
}
