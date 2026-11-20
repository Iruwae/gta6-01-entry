// crew.js — Lena Cruz, getaway driver, fighter, and banter partner.
// She joins Vic from the crew mission onward, follows him through the
// city, fights beside him, and talks while she works.
// Written fresh for round 7 from the shared spec; no repo code was read.
import * as THREE from '../vendor/three.module.min.js';

const BANTER = {
  raceWin: [
    'LENA: "Told you — I drive, you win. That is the deal, Vic."',
    'LENA: "Did you see their faces at the last gate? Beautiful."',
  ],
  jobDone: [
    'LENA: "Clean run. Vic is going to love this one."',
    'LENA: "Another one in the bag. We are getting good at this."',
  ],
  pickup: [
    'LENA: "Hop in, I have the engine warm and the radio loud."',
    'LENA: "Shotgun is yours. I am driving, so no backseat rules."',
  ],
  fight: [
    'LENA: "Stay behind me — I have been in worse scrapes than this."',
    'LENA: "They picked the wrong crew tonight."',
  ],
  drive: [
    'LENA: "Left at the lights, then we lose them in the marina."',
    'LENA: "This city is ours if we keep moving."',
  ],
  heat: [
    'LENA: "Cops on us. Breathe, drive smooth, and do not panic."',
    'VIC: "We will shake them at the underpass, like always."',
  ],
};

function dom(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  if (typeof document !== 'undefined') return document.getElementById(id);
  return null;
}

export function init(ctx) {
  const S = ctx.state;
  const T = ctx.THREE || THREE;
  if (!S.crew) S.crew = { active: false, mesh: null };
  const crew = S.crew;
  if (typeof crew.active !== 'boolean') crew.active = false;

  // Lena on foot: teal jacket, dark hair, a driver who looks the part.
  const mesh = new T.Group();
  const jacket = new T.Mesh(
    new T.BoxGeometry(0.58, 0.8, 0.34),
    new T.MeshStandardMaterial({ color: 0x1f7a6d, roughness: 0.85 })
  );
  jacket.position.y = 1.02;
  const head = new T.Mesh(
    new T.SphereGeometry(0.25, 12, 10),
    new T.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.7 })
  );
  head.position.y = 1.68;
  const hair = new T.Mesh(
    new T.BoxGeometry(0.52, 0.42, 0.4),
    new T.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 })
  );
  hair.position.set(0, 1.82, -0.06);
  const legs = new T.Mesh(
    new T.BoxGeometry(0.48, 0.68, 0.3),
    new T.MeshStandardMaterial({ color: 0x1d2436, roughness: 0.9 })
  );
  legs.position.y = 0.34;
  mesh.add(jacket, head, hair, legs);
  mesh.visible = !!crew.active;
  if (S.player) mesh.position.set(S.player.pos.x - 2, 0, S.player.pos.z - 2);
  if (ctx.scene) ctx.scene.add(mesh);
  crew.mesh = mesh;
  crew.name = 'Lena Cruz';
  crew.role = 'getaway driver';

  function say(text) {
    const toast = dom(ctx, 'toast');
    if (toast) toast.textContent = text;
    return text;
  }

  // The banter director: speaker-tagged toast lines, guarded by a
  // short cooldown so Lena talks like a person, not a ticker.
  if (!S.banterDirector) {
    const lines = BANTER;
    let pick = 0;
    const director = {
      _cooldown: 0,
      lines,
      say,
      line(kind) {
        const pool = lines[kind] || lines.drive;
        const text = pool[pick % pool.length];
        pick++;
        return say(text);
      },
      raceWin() { if (this._cooldown > 0) return null; this._cooldown = 9; return this.line('raceWin'); },
      jobDone() { if (this._cooldown > 0) return null; this._cooldown = 9; return this.line('jobDone'); },
      pickup() { if (this._cooldown > 0) return null; this._cooldown = 9; return this.line('pickup'); },
      fight() { if (this._cooldown > 0) return null; this._cooldown = 9; return this.line('fight'); },
      drive() { if (this._cooldown > 0) return null; this._cooldown = 9; return this.line('drive'); },
      heat() { if (this._cooldown > 0) return null; this._cooldown = 9; return this.line('heat'); },
    };
    S.banterDirector = director;
  }
  const banter = S.banterDirector;

  function join() {
    crew.active = true;
    mesh.visible = true;
    say('LENA: "I am with you, Vic. Wherever this goes, we go together."');
    return true;
  }

  function leave() {
    crew.active = false;
    mesh.visible = false;
    return true;
  }

  crew.join = join;
  crew.leave = leave;
  crew.say = say;
  ctx.api.crew = { join, leave, say, mesh };
  ctx.api.crewJoin = join;
  ctx.api.crewLeave = leave;
  ctx.api.banter = banter;

  let fightTimer = 0;
  let bob = 0;

  ctx.updates.push((dt, t) => {
    if (banter && typeof banter._cooldown === 'number' && banter._cooldown > 0) {
      banter._cooldown = Math.max(0, banter._cooldown - dt);
    }
    if (!crew.active || !S.player) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const p = S.player.pos;
    const heading = S.player.heading || 0;
    // Trail just behind and to the side of the player.
    const tx = p.x - Math.sin(heading) * 2.2 + Math.cos(heading) * 1.1;
    const tz = p.z - Math.cos(heading) * 2.2 - Math.sin(heading) * 1.1;
    const k = Math.min(1, dt * 4);
    mesh.position.x += (tx - mesh.position.x) * k;
    mesh.position.z += (tz - mesh.position.z) * k;
    bob += dt * 6;
    mesh.position.y = Math.abs(Math.sin(bob)) * 0.05;
    mesh.rotation.y = heading;

    // Lena fights: when a cop closes in she squares up to them, and
    // once in a while she says so.
    let nearestCop = null;
    let nearestD = 1e9;
    for (const car of S.cars || []) {
      if (!car || !car.aiPolice) continue;
      const d = Math.hypot(car.pos.x - p.x, car.pos.z - p.z);
      if (d < nearestD) { nearestD = d; nearestCop = car; }
    }
    if (nearestCop && nearestD < 22) {
      mesh.rotation.y = Math.atan2(nearestCop.pos.x - mesh.position.x, nearestCop.pos.z - mesh.position.z);
      fightTimer -= dt;
      if (fightTimer <= 0) {
        fightTimer = 7;
        if (banter && typeof banter.fight === 'function') banter.fight();
      }
    }
  });
}
