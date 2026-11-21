// SOLMAR BAY — HUD, police roster and minimap.
import { CONFIG } from './config.js';

function fmtClock(S) {
  const total = CONFIG.dayStartHour * 60 + CONFIG.dayStartMinute + Math.floor(S.time);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `DAY ${S.day} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${S.dayNight.phase}`;
}

function gearFor(speedMph) {
  if (speedMph < 1) return 'N';
  if (speedMph < 18) return '1';
  if (speedMph < 32) return '2';
  if (speedMph < 46) return '3';
  if (speedMph < 60) return '4';
  return '5';
}

export function init(ctx) {
  const S = ctx.state;
  const dom = ctx.dom;
  const input = ctx.input;
  let rosterTimer = 0;
  let minimapTimer = 0;

  function districtName(id) {
    const d = CONFIG.districts.find((x) => x.id === id);
    return d ? d.name : id.toUpperCase();
  }

  function updateHUD() {
    dom.cash.textContent = '$' + Math.floor(S.cash).toLocaleString('en-US');
    dom.district.textContent = districtName(S.district);
    dom['day-time'].textContent = fmtClock(S);
    dom['respect-num'].textContent = String(Math.floor(S.respect));
    dom['respect-rank'].textContent = S.respectDirector.rank.title;
    dom.objective.textContent = S.missions.current ? S.missions.current.desc : CONFIG.defaultObjective;
    const hp = Math.max(0, Math.min(100, S.player.health));
    dom['health-fill'].style.width = hp + '%';
    const station = CONFIG.radio[S.radioStation];
    dom['radio-station'].textContent = station.name;
    const trackIdx = Math.floor(S.time / 45) % station.tracks.length;
    const track = station.tracks[trackIdx];
    dom['radio-track'].textContent = `${track.title} — ${track.artist}`;
    if (S.wanted > 0) {
      dom.wanted.classList.remove('hidden');
      dom.wanted.textContent = '★'.repeat(S.wanted) + '☆'.repeat(5 - S.wanted);
    } else {
      dom.wanted.classList.add('hidden');
    }
    // Weapon slots.
    const slots = dom.weapons.querySelectorAll('.slot');
    S.player.loadout.slots.forEach((slot, i) => {
      const el = slots[i];
      if (!el) return;
      const nameEl = el.querySelector('.slot-name');
      const ammoEl = el.querySelector('.slot-ammo');
      if (nameEl) nameEl.textContent = slot.def.name;
      if (ammoEl) ammoEl.textContent = String(slot.mag);
      el.classList.toggle('on', i === S.player.loadout.equipped);
      el.classList.toggle('locked', slot.def.unlock > S.missionIndex);
    });
    // Speedometer.
    let mph = 0;
    if (S.car) {
      mph = Math.abs(S.car.speed) * 2.237;
    } else {
      const moving = input.isDown('KeyW') || input.isDown('ArrowUp') || input.isDown('KeyS') || input.isDown('ArrowDown')
        || input.isDown('KeyA') || input.isDown('ArrowLeft') || input.isDown('KeyD') || input.isDown('ArrowRight');
      if (moving) {
        const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
        mph = (sprint ? CONFIG.player.sprintSpeed : CONFIG.player.walkSpeed) * 2.237;
      }
    }
    dom['speed-num'].textContent = String(Math.round(mph));
    dom['speed-gear'].textContent = gearFor(mph);
    dom['speed-car'].textContent = S.car ? S.car.kind.toUpperCase() : 'ON FOOT';
  }

  function updateRoster() {
    const cops = S.cops.length > 0 ? S.cops : S.cars.filter((c) => c.aiPolice);
    if (cops.length === 0 || S.wanted === 0) {
      dom.roster.classList.add('hidden');
      return;
    }
    dom.roster.classList.remove('hidden');
    dom['roster-code'].textContent = `DISPATCH 10-80 — ${S.wanted} STAR${S.wanted > 1 ? 'S' : ''}`;
    dom['roster-rows'].innerHTML = '';
    for (const cop of cops) {
      const row = document.createElement('div');
      row.className = 'roster-row';
      const dist = Math.round(Math.hypot(cop.pos.x - S.player.pos.x, cop.pos.z - S.player.pos.z));
      const call = document.createElement('b');
      call.textContent = cop.callsign;
      const tactic = document.createElement('span');
      tactic.textContent = ` ${cop.brain ? cop.brain.tactic : 'PURSUIT'} — ${dist}m`;
      row.append(call, tactic);
      dom['roster-rows'].appendChild(row);
    }
  }

  function updateMinimap() {
    const canvas = dom.minimap;
    const g = canvas.getContext('2d');
    if (!g) return;
    const W = 180;
    const H = 180;
    const scale = 0.45;
    const cx = 90;
    const cy = 90;
    const toMap = (x, z) => [cx + x * scale, cy + z * scale];
    g.fillStyle = 'rgba(10,6,20,0.9)';
    g.fillRect(0, 0, W, H);
    // District dots.
    for (const d of CONFIG.districts) {
      const [mx, my] = toMap(d.x, d.z);
      g.fillStyle = d.color;
      g.beginPath();
      g.arc(mx, my, 4, 0, Math.PI * 2);
      g.fill();
    }
    // Last known position while wanted.
    if (S.wanted > 0 && S.lastKnown) {
      const [mx, my] = toMap(S.lastKnown.x, S.lastKnown.z);
      g.strokeStyle = '#ff4444';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(mx, my, 10, 0, Math.PI * 2);
      g.stroke();
    }
    // Untaken packages: yellow squares.
    g.fillStyle = '#f2d492';
    for (const pkg of S.packages) {
      if (pkg.taken) continue;
      const [mx, my] = toMap(pkg.x, pkg.z);
      g.fillRect(mx - 2, my - 2, 4, 4);
    }
    // Cars: police blue, others light.
    for (const car of S.cars) {
      const [mx, my] = toMap(car.pos.x, car.pos.z);
      g.fillStyle = car.aiPolice ? '#4a86ff' : '#dddddd';
      g.fillRect(mx - 2, my - 2, 4, 4);
    }
    // Heli: red dot.
    if (S.heli) {
      const [mx, my] = toMap(S.heli.pos.x, S.heli.pos.z);
      g.fillStyle = '#ff4444';
      g.beginPath();
      g.arc(mx, my, 4, 0, Math.PI * 2);
      g.fill();
    }
    // Player: amber dot.
    const [px, py] = toMap(S.player.pos.x, S.player.pos.z);
    g.fillStyle = '#ffb347';
    g.beginPath();
    g.arc(px, py, 4, 0, Math.PI * 2);
    g.fill();
  }

  ctx.hudUpdate = (dt) => {
    updateHUD();
    rosterTimer += dt;
    if (rosterTimer >= 0.25) {
      rosterTimer = 0;
      updateRoster();
    }
    minimapTimer += dt;
    if (minimapTimer >= 0.14) {
      minimapTimer = 0;
      updateMinimap();
    }
  };

  // Refresh on a timer too: at headless speed rAF can stall for seconds,
  // and the HUD, roster and minimap must follow teleports promptly.
  setInterval(() => {
    updateHUD();
    updateRoster();
    updateMinimap();
  }, 500);

  return { updateHUD, updateRoster, updateMinimap, fmtClock };
}

export default init;
