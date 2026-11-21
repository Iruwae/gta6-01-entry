// The on-screen readouts for SOLMAR BAY: cash, district, clock,
// respect, health, radio, wanted stars, weapon slots, speedometer,
// objective — plus the police roster (4×/second) and the minimap
// (about 7×/second).
import { CONFIG } from './config.js';

function clockText(S) {
  const total = CONFIG.clockStartHour * 60 + CONFIG.clockStartMinute + S.time;
  const hh = Math.floor(total / 60) % 24;
  const mm = Math.floor(total % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return `DAY ${S.day} ${pad(hh)}:${pad(mm)} ${S.dayNight.phase}`;
}

function districtName(S) {
  const d = CONFIG.districts.find((x) => x.id === S.district);
  return d ? d.name : S.district.toUpperCase();
}

export function init(ctx) {
  const { state: S, dom } = ctx;
  const slots = [...dom.weapons.querySelectorAll('.slot')];
  const mapCtx = dom.minimap.getContext('2d');
  let rosterT = 0;
  let mapT = 0;

  function updateHud() {
    dom.cash.textContent = '$' + S.cash.toLocaleString('en-US');
    dom.district.textContent = districtName(S);
    dom.dayTime.textContent = clockText(S);
    dom.respectNum.textContent = String(S.respect);
    dom.respectRank.textContent = S.respectDirector.rank.title;
    dom.healthFill.style.width = `${Math.max(0, Math.min(100, S.player.health))}%`;
    const station = CONFIG.radio[S.radioStation] || CONFIG.radio[0];
    dom.radioStation.textContent = station.name;
    const track = station.tracks[Math.floor(S.time / 45) % station.tracks.length];
    dom.radioTrack.textContent = `${track.title} — ${track.artist}`;
    if (S.wanted > 0) {
      dom.wanted.textContent = '★'.repeat(S.wanted) + '☆'.repeat(5 - S.wanted);
      dom.wanted.classList.remove('hidden');
    } else {
      dom.wanted.classList.add('hidden');
    }
    slots.forEach((slot, i) => {
      const s = S.player.loadout.slots[i];
      if (!s) return;
      const nameEl = slot.querySelector('.slot-name');
      const ammoEl = slot.querySelector('.slot-ammo');
      if (nameEl) nameEl.textContent = s.def.name;
      if (ammoEl) ammoEl.textContent = String(s.mag);
      slot.classList.toggle('on', i === S.player.loadout.equipped);
    });
    const speed = S.car ? Math.abs(S.car.speed) : S.player.vel.length();
    dom.speedNum.textContent = String(Math.round(speed * 2.2));
    const mph = Math.round(speed * 2.2);
    dom.speedGear.textContent = mph < 1 ? 'N' : mph < 12 ? '1' : mph < 24 ? '2' : mph < 36 ? '3' : mph < 48 ? '4' : '5';
    dom.speedCar.textContent = S.car ? S.car.kind.toUpperCase() : 'ON FOOT';
    dom.objective.textContent = S.missions.current ? S.missions.current.desc : CONFIG.defaultObjective;
  }

  function updateRoster() {
    const cops = S.cops.length ? S.cops : S.cars.filter((c) => c.aiPolice);
    if (!cops.length) {
      dom.roster.classList.add('hidden');
      return;
    }
    dom.roster.classList.remove('hidden');
    dom.rosterCode.textContent = `DISPATCH 10-80 — ${S.wanted} STAR${S.wanted === 1 ? '' : 'S'}`;
    dom.rosterRows.innerHTML = '';
    for (const cop of cops) {
      const row = document.createElement('div');
      row.className = 'roster-row';
      const d = Math.round(Math.hypot(cop.pos.x - S.player.pos.x, cop.pos.z - S.player.pos.z));
      const tactic = (cop.brain && cop.brain.tactic) || 'PURSUIT';
      row.innerHTML = `<b>${cop.callsign}</b><span>${tactic}</span><span>${d}m</span>`;
      dom.rosterRows.appendChild(row);
    }
  }

  function updateMinimap() {
    const w = 180;
    const h = 180;
    const scale = 0.45;
    const cx = 90;
    const cy = 90;
    const toMap = (x, z) => [cx + x * scale, cy + z * scale];
    mapCtx.fillStyle = '#12081f';
    mapCtx.fillRect(0, 0, w, h);
    // District dots.
    for (const d of CONFIG.districts) {
      const [mx, mz] = toMap(d.x, d.z);
      mapCtx.fillStyle = d.color;
      mapCtx.beginPath();
      mapCtx.arc(mx, mz, 3, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Last known position while wanted.
    if (S.wanted > 0 && S.lastKnown) {
      const [mx, mz] = toMap(S.lastKnown.x, S.lastKnown.z);
      mapCtx.strokeStyle = '#ff4444';
      mapCtx.beginPath();
      mapCtx.arc(mx, mz, 8, 0, Math.PI * 2);
      mapCtx.stroke();
    }
    // Untaken packages: yellow squares.
    mapCtx.fillStyle = '#ffd97a';
    for (const p of S.packages) {
      if (p.taken) continue;
      const [mx, mz] = toMap(p.x, p.z);
      mapCtx.fillRect(mx - 2, mz - 2, 4, 4);
    }
    // Cars: police blue, the rest light.
    for (const car of S.cars) {
      const [mx, mz] = toMap(car.pos.x, car.pos.z);
      mapCtx.fillStyle = car.aiPolice ? '#4a8aff' : '#e8e8e8';
      mapCtx.fillRect(mx - 2, mz - 2, 4, 4);
    }
    // The helicopter: a red dot.
    if (S.heli) {
      const [mx, mz] = toMap(S.heli.pos.x, S.heli.pos.z);
      mapCtx.fillStyle = '#ff2222';
      mapCtx.beginPath();
      mapCtx.arc(mx, mz, 3.5, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // The player: an amber dot.
    const [px, pz] = toMap(S.player.pos.x, S.player.pos.z);
    mapCtx.fillStyle = '#ffb347';
    mapCtx.beginPath();
    mapCtx.arc(px, pz, 4, 0, Math.PI * 2);
    mapCtx.fill();
  }

  ctx.updates.push((dt) => {
    updateHud();
    rosterT += dt;
    if (rosterT >= 0.25) {
      rosterT = 0;
      updateRoster();
    }
    mapT += dt;
    if (mapT >= 0.14) {
      mapT = 0;
      updateMinimap();
    }
  });
}
