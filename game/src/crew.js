// crew.js — Lena Cruz, getaway driver and banter partner. She stays
// parked out of sight until a crew job calls her in (mission 5), then
// follows the player on foot, fights beside them, and talks. This file
// also owns the banter director: speaker-tagged toast lines on a short
// cooldown, so a line never stomps another module's toast twice.
import * as THREE from '../vendor/three.module.min.js';

const LINES = {
  raceWin: [
    { speaker: 'LENA', text: 'Told you — nobody outruns us on these streets.' },
    { speaker: 'LENA', text: 'That was clean. Vic is going to love hearing about this one.' },
  ],
  jobDone: [
    { speaker: 'LENA', text: 'Another job, another payday. We make a good team, kid.' },
    { speaker: 'VIC', text: 'Good work out there. The bay notices people who deliver.' },
  ],
  idle: [
    { speaker: 'LENA', text: 'Keep your eyes on the mirrors. Solmar PD never sleeps.' },
    { speaker: 'LENA', text: 'One day this whole bay is ours. Just keep driving.' },
  ],
};

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const dom = ctx.dom || {};
  let lineIndex = 0;

  // Build Lena's figure: simple, warm-jacketed, visible from a distance.
  let mesh = null;
  if (scene && THREE) {
    const group = new THREE.Group();
    const jacket = new THREE.MeshStandardMaterial({ color: 0xe07840, roughness: 0.7 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.6 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x2a2a38, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.3), jacket);
    body.position.y = 1.05;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), skin);
    head.position.y = 1.65;
    group.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.38), new THREE.MeshStandardMaterial({ color: 0x241812 }));
    hair.position.y = 1.86;
    group.add(hair);
    for (const x of [-0.18, 0.18]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), pants);
      leg.position.set(x, 0.3, 0);
      group.add(leg);
    }
    group.visible = false;
    group.position.set(S.player.pos.x + 2, 0, S.player.pos.z + 2);
    scene.add(group);
    mesh = group;
  }

  if (!S.crew) S.crew = {};
  S.crew.active = !!S.crew.active;
  S.crew.mesh = mesh;
  S.crew.name = 'LENA CRUZ';
  if (mesh) mesh.visible = S.crew.active;

  function say(speaker, text) {
    const toast = dom.toast || document.getElementById('toast');
    if (!toast) return;
    toast.textContent = speaker + ': "' + text + '"';
  }

  const banter = {
    _cooldown: 0,
    _last: 0,
    say,
    line(kind) {
      const pool = LINES[kind] || LINES.idle;
      const pick = pool[lineIndex % pool.length];
      lineIndex += 1;
      say(pick.speaker, pick.text);
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
    idle() {
      if (this._cooldown > 0) return;
      this._cooldown = 9;
      this.line('idle');
    },
  };
  S.banterDirector = banter;
  if (ctx.api) {
    ctx.api.banter = banter;
    ctx.api.crewJoin = () => {
      S.crew.active = true;
      if (S.crew.mesh) S.crew.mesh.visible = true;
    };
  }

  let idleT = 0;
  (ctx.updates || []).push((dt) => {
    if (!S || !S.player || !S.player.pos) return;
    if (banter._cooldown > 0) banter._cooldown -= dt;
    if (!S.crew.active) {
      if (mesh) mesh.visible = false;
      return;
    }
    if (mesh) {
      mesh.visible = true;
      // Trail a couple of metres behind the player, catching up fast.
      const tx = S.player.pos.x - Math.sin(S.player.heading || 0) * 2.5;
      const tz = S.player.pos.z - Math.cos(S.player.heading || 0) * 2.5;
      const dx = tx - mesh.position.x;
      const dz = tz - mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.4) {
        const step = Math.min(d, 9 * dt);
        mesh.position.x += (dx / d) * step;
        mesh.position.z += (dz / d) * step;
      }
      mesh.position.y = 0;
      mesh.rotation.y = Math.atan2(S.player.pos.x - mesh.position.x, S.player.pos.z - mesh.position.z);
    }
    // An idle line now and then while the crew is out together.
    idleT += dt;
    if (idleT > 45) {
      idleT = 0;
      if (S.mode === 'playing') banter.idle();
    }
  });
}
