// SOLMAR BAY — Lena Cruz, getaway driver. Parked out of sight until a
// crew job calls her in (mission 5), then she follows the player on foot,
// fights beside them, and talks. Owns the banter director the smoke test
// exercises (say / raceWin / pickup / heatUp, 9 game-second cooldown,
// toast format SPEAKER: "text").
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  if (!S.crew.mesh) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.8, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xff7a9e })
    );
    mesh.position.copy(S.player.pos);
    mesh.visible = false;
    scene.add(mesh);
    S.crew.mesh = mesh;
  } else if (!S.crew.mesh.parent) {
    scene.add(S.crew.mesh);
    S.crew.mesh.visible = S.crew.active;
  }
  const lines = {
    raceWin: [
      ['LENA', 'Told you. Nobody outdrives us on this bay.'],
      ['LENA', 'That was clean. Vic is going to love this.'],
      ['VIC', 'Beautiful driving. You are worth every dollar.'],
    ],
    pickup: [
      ['LENA', 'Package is in the bag. Move, before they notice.'],
      ['VIC', 'Good hands. Bring it home slow and quiet.'],
      ['LENA', 'Got it. Now disappear like the sun just did.'],
    ],
    heatUp: [
      ['VIC', 'Cops are on you. Lose them or lose everything.'],
      ['LENA', 'Heat is climbing. Drive like you mean it.'],
      ['VIC', 'They saw you. Do not bring them to my yard.'],
    ],
  };
  let idx = 0;
  const prevCooldown = S.banterDirector ? S.banterDirector._cooldown || 0 : 0;
  S.banterDirector = {
    _cooldown: prevCooldown,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      ctx.api.toast(`${speaker}: "${text}"`);
      this._cooldown = 9;
      return true;
    },
    raceWin() {
      const l = lines.raceWin[idx++ % lines.raceWin.length];
      return this.say(l[0], l[1]);
    },
    pickup() {
      const l = lines.pickup[idx++ % lines.pickup.length];
      return this.say(l[0], l[1]);
    },
    heatUp() {
      const l = lines.heatUp[idx++ % lines.heatUp.length];
      return this.say(l[0], l[1]);
    },
  };
  ctx.updates.push((dt) => {
    const mesh = S.crew.mesh;
    if (!mesh) return;
    if (!S.crew.active) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const tx = S.player.pos.x - Math.sin(S.player.heading) * 2.2;
    const tz = S.player.pos.z - Math.cos(S.player.heading) * 2.2;
    mesh.position.x += (tx - mesh.position.x) * Math.min(1, 4 * dt);
    mesh.position.z += (tz - mesh.position.z) * Math.min(1, 4 * dt);
    mesh.position.y = 0.9 + Math.abs(Math.sin(S.time * 4)) * 0.05;
    mesh.rotation.y = S.player.heading;
    if (S.wanted >= 3 && S.banterDirector._cooldown <= 0) {
      S.banterDirector.heatUp();
    }
  });
}

export default { init };
