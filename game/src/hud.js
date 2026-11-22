// HUD, police roster and minimap. Runs every frame via ctx.updates.
import { CONFIG } from './config.js';
import { districtName } from './districts.js';

export function clockText(S) {
  const total = CONFIG.dayStartHour * 60 + CONFIG.dayStartMinute + Math.floor(S.time);
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `DAY ${S.day} ${hh}:${mm} ${S.dayNight.phase}`;
}

export function init(ctx) {
  const { state: S, dom } = ctx;
  const slotEls = [...dom.weapons.querySelectorAll('.slot')];
  const mapCtx = dom.minimap.getContext('2d');
  let rosterAcc = 1;
  let mapAcc = 1;

  function drawMinimap() {
    const w = 180;
    const h = 180;
    mapCtx.fillStyle = '#160d24';
    mapCtx.fillRect(0, 0, w, h);
    const mx = (x) => 90 + x * 0.45;
    const my = (z) => 90 + z * 0.45;
    for (const d of CONFIG.districts) {
      mapCtx.fillStyle = d.color;
      mapCtx.fillRect(mx(d.x) - 2, my(d.z) - 2, 4, 4);
    }
    if (S.wanted > 0 && S.lastKnown) {
      mapCtx.strokeStyle = '#ff4444';
      mapCtx.beginPath();
      mapCtx.arc(mx(S.lastKnown.x), my(S.lastKnown.z), 8, 0, Math.PI * 2);
      mapCtx.stroke();
    }
    for (const pkg of S.packages) {
      if (pkg.taken) continue;
      mapCtx.fillStyle = '#ffd34c';
      mapCtx.fillRect(mx(pkg.x) - 2, my(pkg.z) - 2, 4, 4);
    }
    for (const car of S.cars) {
      mapCtx.fillStyle = car.aiPolice ? '#4488ff' : '#dddddd';
      mapCtx.fillRect(mx(car.pos.x) - 2, my(car.pos.z) - 2, 4, 4);
    }
    if (S.heli) {
      mapCtx.fillStyle = '#ff2222';
      mapCtx.beginPath();
      mapCtx.arc(mx(S.heli.pos.x), my(S.heli.pos.z), 3, 0, Math.PI * 2);
      mapCtx.fill();
    }
    mapCtx.fillStyle = '#ffb347';
    mapCtx.beginPath();
    mapCtx.arc(mx(S.player.pos.x), my(S.player.pos.z), 3.5, 0, Math.PI * 2);
    mapCtx.fill();
  }

  function updateRoster() {
    const cops = S.cops.length > 0 ? S.cops : S.cars.filter((c) => c.aiPolice);
    if (cops.length === 0) {
      dom.roster.classList.add('hidden');
      return;
    }
    dom.roster.classList.remove('hidden');
    dom['roster-code'].textContent = `DISPATCH 10-80 — ${S.wanted} STAR${S.wanted === 1 ? '' : 'S'}`;
    dom['roster-rows'].innerHTML = '';
    for (const cop of cops) {
      const row = document.createElement('div');
      row.className = 'roster-row';
      const dx = cop.pos.x - S.player.pos.x;
      const dz = cop.pos.z - S.player.pos.z;
      const dist = Math.round(Math.sqrt(dx * dx + dz * dz));
      const call = document.createElement('b');
      call.textContent = cop.callsign;
      const tac = document.createElement('span');
      tac.textContent = (cop.brain && cop.brain.tactic) || 'PURSUIT';
      const d = document.createElement('span');
      d.textContent = `${dist}m`;
      row.append(call, tac, d);
      dom['roster-rows'].appendChild(row);
    }
  }

  ctx.updates.push((dt) => {
    dom.cash.textContent = '$' + Math.floor(S.cash).toLocaleString('en-US');
    dom.district.textContent = districtName(S.district);
    dom['day-time'].textContent = clockText(S);
    dom['respect-num'].textContent = String(S.respect);
    dom['respect-rank'].textContent = S.respectDirector.rank.title;
    dom['health-fill'].style.width = `${Math.max(0, Math.min(100, S.player.health))}%`;
    const station = CONFIG.radio[S.radioStation];
    dom['radio-station'].textContent = station.name;
    const track = station.tracks[Math.floor(S.time / 45) % station.tracks.length];
    dom['radio-track'].textContent = `${track.title} — ${track.artist}`;
    if (S.wanted > 0) {
      dom.wanted.classList.remove('hidden');
      dom.wanted.textContent = '★'.repeat(S.wanted) + '☆'.repeat(5 - S.wanted);
    } else {
      dom.wanted.classList.add('hidden');
    }
    slotEls.forEach((el, i) => {
      const slot = S.player.loadout.slots[i];
      if (!slot) return;
      const nameEl = el.querySelector('.slot-name');
      const ammoEl = el.querySelector('.slot-ammo');
      if (nameEl) nameEl.textContent = slot.def.name;
      if (ammoEl) ammoEl.textContent = String(slot.mag);
      el.classList.toggle('on', S.player.loadout.equipped === i);
    });
    const speed = S.car ? Math.abs(S.car.speed) : Math.hypot(S.player.vel.x, S.player.vel.z);
    const mph = Math.round(speed * 2.237);
    dom['speed-num'].textContent = String(mph);
    dom['speed-gear'].textContent = mph === 0 ? 'N' : mph < 15 ? '1' : mph < 30 ? '2' : mph < 45 ? '3' : mph < 60 ? '4' : '5';
    dom['speed-car'].textContent = S.car ? S.car.kind.toUpperCase() : 'ON FOOT';
    dom.objective.textContent = S.missions.current ? S.missions.current.desc : 'Explore Solmar Bay — find work.';
    rosterAcc += dt;
    if (rosterAcc >= 0.25) {
      rosterAcc = 0;
      updateRoster();
    }
    mapAcc += dt;
    if (mapAcc >= 0.14) {
      mapAcc = 0;
      drawMinimap();
    }
  });
}

export default init;
