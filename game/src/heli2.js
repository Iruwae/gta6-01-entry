// Solmar Bay — police helicopter director.
//
// Owns the pursuit helicopter end to end: it lifts off once the heat
// reaches three stars, shadows the player from about thirty-five metres
// up, spins its rotor, throws a spotlight pool on the street below, and
// lifts off again (despawns) as soon as the heat drops under three stars.
//
// It also owns the overhead camera tilt. The chase camera re-aims itself
// every single frame, so pitching the camera after the fact never sticks
// (verified live: a lookAt issued at the end of the heli update is gone
// by the next frame). Instead this module wraps the camera's own lookAt
// once, at init, and lifts whatever aim target the chase camera asks for
// toward the sky whenever the heli is sitting overhead. When the heli
// leaves, the wrapper passes targets through untouched and the camera
// drops back to its normal street-level framing on its own.
import * as THREE from '../vendor/three.module.min.js';

const HOVER_HEIGHT = 22;
const ORBIT_RADIUS = 34;
const ORBIT_RATE = 0.9;
const OVERHEAD_RADIUS = 6;
const SPAWN_WANTED = 3;
const AIM_FRACTION = 0.22;
const TILT_RATE = 3.0;
const FOLLOW_RATE = 2.5;
const ROTOR_SPEED = 22;

function buildAirframe() {
  const group = new THREE.Group();

  const paint = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 0.55, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a2436, metalness: 0.6, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0e1a26, metalness: 0.9, roughness: 0.15 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.05, 3.1), paint);
  body.position.y = 0.1;
  group.add(body);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.28, 3.12), dark);
  stripe.position.y = -0.12;
  group.add(stripe);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 1.1), glass);
  cabin.position.set(0, 0.35, 0.9);
  group.add(cabin);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.7), paint);
  tail.position.set(0, 0.25, -2.6);
  group.add(tail);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.7), dark);
  fin.position.set(0, 0.7, -3.8);
  group.add(fin);

  const lightBar = new THREE.Group();
  const red = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.18, 0.3),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a })
  );
  red.position.x = -0.45;
  const blue = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.18, 0.3),
    new THREE.MeshBasicMaterial({ color: 0x2a6bff })
  );
  blue.position.x = 0.45;
  lightBar.add(red);
  lightBar.add(blue);
  lightBar.position.set(0, 0.72, 0.4);
  group.add(lightBar);

  const skidMat = dark;
  for (const side of [-0.7, 0.7]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 2.4), skidMat);
    skid.position.set(side, -0.62, 0.2);
    group.add(skid);
    for (const strutZ of [-0.7, 0.9]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), skidMat);
      strut.position.set(side, -0.38, strutZ);
      group.add(strut);
    }
  }

  const rotor = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.4, roughness: 0.6 });
  for (const angle of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.06, 0.42), bladeMat);
    blade.rotation.y = angle;
    rotor.add(blade);
  }
  const hub = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.3), dark);
  rotor.add(hub);
  rotor.position.y = 0.85;
  group.add(rotor);

  const tailRotor = new THREE.Group();
  for (const angle of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), bladeMat);
    blade.rotation.z = angle;
    tailRotor.add(blade);
  }
  tailRotor.position.set(0.32, 0.7, -3.8);
  group.add(tailRotor);

  return { group, rotor, tailRotor };
}

function buildPool() {
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 28),
    new THREE.MeshBasicMaterial({
      color: 0xfff2c0, transparent: true, opacity: 0.28, depthWrite: false,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.06;
  return pool;
}

function buildBeam() {
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(6.5, HOVER_HEIGHT, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff6c8, transparent: true, opacity: 0.07,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    })
  );
  return beam;
}

export function init(S) {
  if (S.__b1HeliInit) return;
  S.__b1HeliInit = true;

  let tilt = 0;
  let orbitAngle = 0;
  let bobClock = 0;

  const cam = S.camera;
  if (cam && typeof cam.lookAt === 'function' && !cam.lookAt.__solmarHeliWrapped) {
    const rawLookAt = cam.lookAt.bind(cam);
    const liftedLookAt = function (a, b, c) {
      let target;
      if (a !== null && typeof a === 'object' && typeof a.x === 'number') {
        target = a.clone();
      } else {
        target = new THREE.Vector3(a, b, c);
      }
      if (
        tilt > 0.02 && S.heli && S.player && S.player.pos &&
        S.mode === 'playing'
      ) {
        const rise = (S.heli.pos.y - S.player.pos.y) * AIM_FRACTION;
        const aim = new THREE.Vector3(
          S.player.pos.x, S.player.pos.y + rise, S.player.pos.z
        );
        target.lerp(aim, Math.min(1, tilt));
      }
      return rawLookAt(target);
    };
    liftedLookAt.__solmarHeliWrapped = true;
    cam.lookAt = liftedLookAt;
  }

  function spawnHeli() {
    if (!S.scene || !S.player || !S.player.pos) return;
    const airframe = buildAirframe();
    const pool = buildPool();
    const beam = buildBeam();
    airframe.group.position.set(S.player.pos.x, HOVER_HEIGHT, S.player.pos.z);
    S.scene.add(airframe.group);
    S.scene.add(pool);
    S.scene.add(beam);
    S.heli = {
      pos: airframe.group.position,
      mesh: airframe.group,
      rotor: airframe.rotor,
      pool,
      beam,
    };
    S.heli.tailRotor = airframe.tailRotor;
    S.heliOverhead = true;
  }

  function removeHeli() {
    if (!S.heli) return;
    if (S.scene) {
      S.scene.remove(S.heli.mesh);
      S.scene.remove(S.heli.pool);
      S.scene.remove(S.heli.beam);
    }
    S.heli = null;
    S.heliOverhead = false;
  }

  // Named `update` on purpose: the startup driver only picks up module
  // updates it can find by their function name, and an arrow assigned to
  // a property ends up anonymous — invisible to it.
  function update(dt) {
    const step = Math.min(Math.max(dt || 0.016, 0), 0.1);
    bobClock += step;

    if (!S.heli && S.wanted >= SPAWN_WANTED) spawnHeli();
    else if (S.heli && S.wanted < SPAWN_WANTED) removeHeli();

    if (S.heli && S.player && S.player.pos) {
      const px = S.player.pos.x;
      const pz = S.player.pos.z;
      const ease = Math.min(1, step * FOLLOW_RATE);
      orbitAngle += step * ORBIT_RATE;
      const ox = px + Math.cos(orbitAngle) * ORBIT_RADIUS;
      const oz = pz + Math.sin(orbitAngle) * ORBIT_RADIUS;
      const hx = S.heli.pos.x + (ox - S.heli.pos.x) * ease;
      const hz = S.heli.pos.z + (oz - S.heli.pos.z) * ease;
      const hy = HOVER_HEIGHT + Math.sin(bobClock * 0.9) * 1.0;
      S.heli.pos.set(hx, hy, hz);

      const dx = hx - px;
      const dz = hz - pz;
      S.heliOverhead = dx * dx + dz * dz < OVERHEAD_RADIUS * OVERHEAD_RADIUS;

      if (typeof S.player.heading === 'number') {
        S.heli.mesh.rotation.y = S.player.heading;
      }
      S.heli.mesh.rotation.z = Math.sin(bobClock * 0.7) * 0.03;
      S.heli.rotor.rotation.y += step * ROTOR_SPEED;
      if (S.heli.tailRotor) S.heli.tailRotor.rotation.x += step * ROTOR_SPEED * 1.6;

      S.heli.pool.position.set(hx, 0.06, hz);
      S.heli.beam.position.set(hx, hy / 2, hz);
      S.heli.beam.scale.y = hy / HOVER_HEIGHT;
    } else {
      S.heliOverhead = false;
    }

    let heliInFront = false;
    if (S.heli && S.player && S.player.pos && S.camera) {
      const fwdX = S.player.pos.x - S.camera.position.x;
      const fwdZ = S.player.pos.z - S.camera.position.z;
      const fwdLen = Math.hypot(fwdX, fwdZ) || 1;
      const offX = S.heli.pos.x - S.player.pos.x;
      const offZ = S.heli.pos.z - S.player.pos.z;
      const offLen = Math.hypot(offX, offZ);
      const facing = offLen > 1 ? (offX * fwdX + offZ * fwdZ) / (offLen * fwdLen) : 0;
      heliInFront = offLen > 8 && offLen < 48 && facing > 0.25;
    }
    const wantTilt = S.heli && S.mode === 'playing' && (S.heliOverhead || heliInFront) ? 1 : 0;
    tilt += (wantTilt - tilt) * Math.min(1, step * TILT_RATE);
    if (tilt < 0.001) tilt = 0;
    if (tilt > 1) tilt = 1;
  }

  S.heliUpdate = update;
  // The main loop iterates S._tick, so register the update there directly
  // instead of hoping the startup driver notices this module on its own.
  if (Array.isArray(S._tick) && !S._tick.includes(update)) S._tick.push(update);
}
