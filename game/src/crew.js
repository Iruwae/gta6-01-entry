// SOLMAR BAY — crew.js (round 8 rebuild, written blind from the spec)
// Lena Cruz, getaway driver and banter partner: she joins on the crew
// mission, follows the player, takes pot shots at nearby cops, and
// speaks through the banter director (speaker-tagged toast lines).
// Talks to the game only through ctx.
import * as THREE from '../vendor/three.module.min.js';

const LINES = {
  raceWin: [
    'LENA: "Told you — nobody outruns us on these streets."',
    'LENA: "Clean run. Vic is going to love hearing about this one."',
  ],
  jobDone: [
    'LENA: "Another job in the bag. You are getting good at this."',
  ],
  chase: [
    'LENA: "Cops on our tail — keep it smooth and lose them in the marina."',
    'VIC: "Do not bring the heat to my door. Lose them first."',
  ],
  idle: [
    'LENA: "Sun is going down. Perfect time for a job, dont you think?"',
  ],
};

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const dom = ctx.dom || {};

  const $ = (id) => dom[id] || document.getElementById(id);

  // Lena's figure: teal jacket, dark jeans, dark hair.
  const figure = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.95, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x2a7f7f })
  );
  torso.position.y = 1.05;
  figure.add(torso);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xc98d5f })
  );
  head.position.y = 1.82;
  figure.add(head);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x1a1210 })
  );
  hair.position.set(0, 1.9, -0.06);
  hair.scale.set(1, 0.8, 1);
  figure.add(hair);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.8, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x232c3d })
  );
  legs.position.y = 0.4;
  figure.add(legs);
  figure.visible = false;
  scene.add(figure);

  const crew = {
    active: false,
    name: 'LENA CRUZ',
    mesh: figure,
  };
  S.crew = crew;

  function toast(msg) {
    const el = $('toast');
    if (el) el.textContent = msg;
  }

  const banter = {
    _cooldown: 0,
    say(speaker, text) {
      toast(speaker + ': "' + text + '"');
    },
    line(kind) {
      const pool = LINES[kind] || LINES.idle;
      const text = pool[Math.floor(Math.random() * pool.length)];
      toast(text);
    },
    raceWin() {
      if (this._cooldown > 0) return;
      this._cooldown = 9;
      this.line('raceWin');
    },
    jobDone() {
      if (this._cooldown > 0) return;
      this._cooldown = 9;
      this.line('jobDone');
    },
    chase() {
      if (this._cooldown > 0) return;
      this._cooldown = 9;
      this.line('chase');
    },
  };
  S.banterDirector = banter;

  ctx.api = ctx.api || {};
  ctx.api.crewJoin = () => {
    crew.active = true;
  };
  ctx.api.crewLeave = () => {
    crew.active = false;
  };

  const tmp = new THREE.Vector3();
  let shootT = 0;

  ctx.updates.push((dt) => {
    if (banter._cooldown > 0) banter._cooldown -= dt;
    if (S.mode && S.mode !== 'playing') return;
    figure.visible = !!crew.active;
    if (!crew.active) return;

    // Follow the player, a step behind and to the side.
    const pp = S.player.pos;
    const heading = S.player.heading || 0;
    tmp.set(
      pp.x - Math.sin(heading) * 2.2 + Math.cos(heading) * 1.4,
      0,
      pp.z - Math.cos(heading) * 2.2 - Math.sin(heading) * 1.4
    );
    const d = Math.hypot(tmp.x - figure.position.x, tmp.z - figure.position.z);
    if (d > 18) {
      figure.position.copy(tmp);
    } else if (d > 0.4) {
      const step = Math.min(d, 5.5 * dt);
      figure.position.x += ((tmp.x - figure.position.x) / d) * step;
      figure.position.z += ((tmp.z - figure.position.z) / d) * step;
    }
    figure.rotation.y = Math.atan2(pp.x - figure.position.x, pp.z - figure.position.z);

    // Fight: pot shots at the nearest cruiser.
    shootT -= dt;
    if (shootT <= 0) {
      shootT = 1.0;
      let best = null;
      let bestD = 30;
      for (const cop of S.cops || []) {
        const dd = Math.hypot(cop.pos.x - figure.position.x, cop.pos.z - figure.position.z);
        if (dd < bestD) {
          bestD = dd;
          best = cop;
        }
      }
      if (best) {
        best.health -= 10;
        if (best.health <= 0) {
          const i = (S.cars || []).indexOf(best);
          if (i >= 0) S.cars.splice(i, 1);
          const j = (S.cops || []).indexOf(best);
          if (j >= 0) S.cops.splice(j, 1);
          scene.remove(best.mesh);
        }
      }
    }
  });
}
