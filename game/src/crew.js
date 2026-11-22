// Lena Cruz, getaway driver. Parked out of sight until a crew job calls
// her in (mission 5), then she follows the player, fights beside them,
// and talks. Owns the banter director the smoke test exercises.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  // Lena's mesh: a small pink box-person, parked out of sight.
  const group = new THREE.Group();
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xff7a9e, roughness: 0.7 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: 0.7 });
  const legsMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 0.4), pinkMat);
  body.position.y = 1.05;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), skinMat);
  head.position.y = 1.75;
  group.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.35), legsMat);
  legs.position.y = 0.3;
  group.add(legs);
  group.position.set(500, 0, 500);
  group.visible = false;
  scene.add(group);
  S.crew.mesh = group;

  // The live banter director: say / raceWin / pickup / heatUp with a
  // 9 game-second cooldown; toast format `SPEAKER: "text"`.
  S.banterDirector = {
    _cooldown: 0,
    say(speaker, text) {
      if (S.banterDirector._cooldown > 0) return false;
      if (ctx.api.toast) ctx.api.toast(`${speaker}: "${text}"`);
      S.banterDirector._cooldown = 9;
      return true;
    },
    raceWin() {
      return S.banterDirector.say('LENA', "That was clean driving. Vic's gonna love this.");
    },
    pickup() {
      return S.banterDirector.say('LENA', 'Package secured. Now don\'t get cute with it.');
    },
    heatUp() {
      return S.banterDirector.say('VIC', 'You lit up the whole bay, kid. Cool it down.');
    },
  };

  // Wrap missions.start so Lena's mesh appears the moment crew work starts.
  const origStart = S.missions.start.bind(S.missions);
  S.missions.start = function start(idOrIndex) {
    const job = origStart(idOrIndex);
    if (job && job.index === 4) {
      S.crew.active = true;
      if (S.crew.mesh) {
        S.crew.mesh.visible = true;
        S.crew.mesh.position.set(S.player.pos.x + 2, 0, S.player.pos.z + 2);
      }
    }
    return job;
  };

  ctx.updates.push((dt) => {
    if (!S.crew.active || !S.crew.mesh) return;
    S.crew.mesh.visible = true;
    // Follow the player on foot, a couple of metres off their shoulder.
    const tx = S.player.pos.x + 2;
    const tz = S.player.pos.z + 2;
    const dx = tx - S.crew.mesh.position.x;
    const dz = tz - S.crew.mesh.position.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > 0.5) {
      const step = Math.min(d, 11 * dt);
      S.crew.mesh.position.x += (dx / d) * step;
      S.crew.mesh.position.z += (dz / d) * step;
      S.crew.mesh.rotation.y = Math.atan2(dx, dz);
    }
  });
}

export default init;
