// heli2.js — the police helicopter (round-6 rebuild).
// Spawns at 3+ wanted stars, stations itself ahead of and above the
// player so it stays inside the chase camera's frame, follows with a
// slow lag, tilts its nose up while holding station, and leaves the
// moment the heat drops. S.heli = { pos, mesh, ... } and
// S.heliOverhead flags when it is roughly above the player.
import * as THREE from '../vendor/three.module.min.js';

const SPAWN_STARS = 3;
const STATION_AHEAD = 26;  // metres in front of the player, on the camera axis
const STATION_HEIGHT = 12; // metres up — lands near the top of the frame

function fwd(heading) { return { x: Math.sin(heading), z: Math.cos(heading) }; }

function buildHeliMesh() {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.3 });
  const navy = new THREE.MeshStandardMaterial({ color: 0x16222e, roughness: 0.4, metalness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0e2233, roughness: 0.1, metalness: 0.8 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.4), white);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 3.6), navy);
  belly.position.y = -0.8;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.0, 1.2), glass);
  nose.position.set(0, 0.1, 2.4);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 3.6), white);
  boom.position.set(0, 0.3, -3.6);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 1.0), navy);
  fin.position.set(0, 0.9, -5.2);
  const skidL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.4), navy);
  skidL.position.set(-0.9, -1.25, 0.2);
  const skidR = skidL.clone();
  skidR.position.x = 0.9;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), navy);
  mast.position.y = 1.0;
  group.add(body, belly, nose, boom, fin, skidL, skidR, mast);

  const rotor = new THREE.Group();
  rotor.position.y = 1.4;
  const blade1 = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.06, 0.45), bladeMat);
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 8.5), bladeMat);
  rotor.add(blade1, blade2);
  group.add(rotor);

  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.45, 0.9, -5.2);
  tailRotor.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.2), bladeMat));
  group.add(tailRotor);

  const redMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2222, emissiveIntensity: 2 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x000055, emissive: 0x2266ff, emissiveIntensity: 2 });
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.4), redMat);
  red.position.set(-0.6, -1.1, 0.5);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.4), blueMat);
  blue.position.set(0.6, -1.1, 0.5);
  group.add(red, blue);

  // Searchlight: a real spotlight on the street below plus a faint
  // visible cone so the beam reads on camera, brighter after dark.
  const spot = new THREE.SpotLight(0xfff2c0, 0.6, 60, 0.35, 0.5, 1.2);
  spot.position.set(0, -1, 0);
  const spotTarget = new THREE.Object3D();
  spot.target = spotTarget;
  group.add(spot);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2c0, transparent: true, opacity: 0.05,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 12, 16, 1, true), coneMat);
  cone.position.y = -6.8; // apex at the belly, base on the street
  group.add(cone);

  return { group, rotor, tailRotor, redMat, blueMat, spot, spotTarget, coneMat };
}

export function init(S) {
  function stationFor() {
    const anchor = S.car ? S.car.pos : (S.player && S.player.pos);
    const heading = S.car ? S.car.heading : (S.player ? S.player.heading : 0);
    if (!anchor) return null;
    const f = fwd(heading || 0);
    return {
      x: anchor.x + f.x * STATION_AHEAD,
      y: STATION_HEIGHT + Math.sin((S.time || 0) * 0.9) * 1.2,
      z: anchor.z + f.z * STATION_AHEAD,
      heading: heading || 0,
    };
  }

  function spawn() {
    const st = stationFor();
    if (!st) return null;
    const built = buildHeliMesh();
    const pos = new THREE.Vector3(st.x, st.y, st.z);
    built.group.position.copy(pos);
    if (S.scene) {
      S.scene.add(built.group);
      S.scene.add(built.spotTarget);
    }
    const heli = {
      pos,
      mesh: built.group,
      rotor: built.rotor,
      tailRotor: built.tailRotor,
      redMat: built.redMat,
      blueMat: built.blueMat,
      spot: built.spot,
      spotTarget: built.spotTarget,
      coneMat: built.coneMat,
    };
    S.heli = heli;
    S.heliOverhead = true;
    return heli;
  }

  function despawn() {
    const heli = S.heli;
    if (!heli) return;
    if (heli.mesh && heli.mesh.parent) heli.mesh.parent.remove(heli.mesh);
    if (heli.spotTarget && heli.spotTarget.parent) heli.spotTarget.parent.remove(heli.spotTarget);
    S.heli = null;
    S.heliOverhead = false;
  }

  function update(dt) {
    const wanted = S.wanted || 0;
    if (wanted >= SPAWN_STARS && !S.heli) spawn();
    else if (wanted < SPAWN_STARS && S.heli) { despawn(); return; }
    const heli = S.heli;
    if (!heli) return;
    const st = stationFor();
    if (!st) return;

    // Slow lag toward the station — a helicopter lumbers, it never snaps.
    const k = 1 - Math.exp(-dt * 1.6);
    const bx = heli.pos.x, bz = heli.pos.z;
    heli.pos.x += (st.x - heli.pos.x) * k;
    heli.pos.y += (st.y - heli.pos.y) * k;
    heli.pos.z += (st.z - heli.pos.z) * k;
    const vx = (heli.pos.x - bx) / Math.max(dt, 0.001);
    const vz = (heli.pos.z - bz) / Math.max(dt, 0.001);

    const anchor = S.car ? S.car.pos : (S.player && S.player.pos);
    // Nose toward the player, tilted up while holding station, banking
    // gently into whatever lateral drift the chase is giving it.
    const yaw = anchor ? Math.atan2(anchor.x - heli.pos.x, anchor.z - heli.pos.z) : st.heading;
    const fwdSpeed = vx * Math.sin(yaw) + vz * Math.cos(yaw);
    const latSpeed = vx * Math.cos(yaw) - vz * Math.sin(yaw);
    heli.mesh.position.copy(heli.pos);
    heli.mesh.rotation.set(0, 0, 0);
    heli.mesh.rotation.y = yaw;
    heli.mesh.rotation.x = -0.12 + Math.max(-0.08, Math.min(0.12, fwdSpeed * 0.004));
    heli.mesh.rotation.z = Math.max(-0.2, Math.min(0.2, -latSpeed * 0.005));

    heli.rotor.rotation.y += dt * 28;
    heli.tailRotor.rotation.x += dt * 30;
    const flash = Math.floor((S.time || 0) * 3) % 2 === 0;
    heli.redMat.emissiveIntensity = flash ? 2.5 : 0.2;
    heli.blueMat.emissiveIntensity = flash ? 0.2 : 2.5;

    const night = S.dayNight ? (S.dayNight.night || 0) : 0;
    heli.spot.intensity = 0.4 + night * 2.2;
    heli.coneMat.opacity = 0.04 + night * 0.10;
    if (anchor) heli.spotTarget.position.set(anchor.x, 0, anchor.z);
    const hd = anchor ? Math.hypot(anchor.x - heli.pos.x, anchor.z - heli.pos.z) : 999;
    S.heliOverhead = hd < 45;
  }

  S.heli = S.heli || null;
  S.heliOverhead = false;
  if (Array.isArray(S._tick)) S._tick.push(update);
  return { update };
}
