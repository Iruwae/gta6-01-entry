// hud.js — SOLMAR BAY, round 8 rebuild.
// Owns every HUD readout and refreshes it from ctx.state each frame:
// cash, district, day/time clock, respect, health bar, radio, wanted
// stars, the police roster, the minimap canvas, weapon slots, the
// speedometer, the objective line, and toast timing. It never writes a
// toast line it did not set itself, so banter and mission toasts placed
// by other modules stay on screen until they are meant to clear.

const DISTRICT_NAMES = {
  harbor: 'HARBOR',
  beach: 'BEACH',
  uptown: 'UPTOWN',
  strip: 'THE STRIP',
  downtown: 'DOWNTOWN',
  marina: 'MARINA',
  palmrow: 'PALM ROW',
};

const FALLBACK_STATIONS = [
  { name: 'SUNSET FM', track: 'Golden Hour Drive' },
  { name: 'BAYLINE FM', track: 'Bayline Nights' },
  { name: 'PALM TALK', track: 'The Morning Palms' },
  { name: 'REEF RADIO', track: 'Undertow' },
  { name: 'CORAL COAST', track: 'Coral Coastline' },
  { name: 'DUSK DRIVE', track: 'Midnight Meridian' },
];

const SLOT_NAMES = ['PISTOL', 'SMG', 'SHOTGUN', 'RIFLE'];

const MINIMAP_ZONES = [
  { key: 'harbor', x: 120, z: 120, color: '#e8873a' },
  { key: 'beach', x: 0, z: 165, color: '#e8c85a' },
  { key: 'uptown', x: 120, z: -90, color: '#7a6fd0' },
  { key: 'strip', x: 0, z: 135, color: '#d06fa8' },
  { key: 'downtown', x: 0, z: 0, color: '#5a8fd0' },
  { key: 'marina', x: -120, z: 60, color: '#4fb3a9' },
  { key: 'palmrow', x: -120, z: -120, color: '#8fb45a' },
];

function el(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  return document.getElementById(id);
}

function money(n) {
  const v = Math.floor(Number(n) || 0);
  return '$' + v.toLocaleString('en-US');
}

function clockText(S) {
  const t = Number(S.time) || 0;
  const base = 18 * 60 + 28; // day 1 opens at sunset, 18:28
  const total = base + t;
  const day = (Number(S.day) || 1) + Math.floor(total / 1440);
  const mins = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  let phase = S.dayNight && S.dayNight.phase;
  if (!phase) {
    const h = Math.floor(mins / 60);
    if (h >= 21 || h < 5) phase = 'NIGHT';
    else if (h >= 18) phase = 'SUNSET';
    else phase = 'DAY';
  }
  return 'DAY ' + day + ' ' + hh + ':' + mm + ' ' + phase;
}

function districtDisplay(S) {
  const raw = String(S.district || 'downtown');
  const key = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (DISTRICT_NAMES[key]) return DISTRICT_NAMES[key];
  return raw.toUpperCase();
}

function wantedLevel(S) {
  if (typeof S.wanted === 'number') return Math.max(0, Math.min(5, S.wanted));
  const heat = Number(S.heat) || 0;
  if (heat <= 0) return 0;
  if (heat < 20) return 1;
  if (heat < 40) return 2;
  if (heat < 60) return 3;
  if (heat < 80) return 4;
  return 5;
}

export function init(ctx) {
  const S = ctx.state;
  let toastUntil = 0;
  let rosterT = 0;
  let mapT = 0;
  let mapCtx = null;

  const grab = (id) => el(ctx, id);

  // Toasts other modules raise through this call get an expiry; toasts
  // written straight to the DOM by other modules are left alone.
  ctx.api.toast = (msg, ms) => {
    const t = grab('toast');
    if (!t) return;
    t.textContent = String(msg);
    toastUntil = performance.now() + (ms || 2600);
  };

  function drawMinimap() {
    const canvas = grab('minimap');
    if (!canvas) return;
    if (!mapCtx) {
      canvas.width = 180;
      canvas.height = 180;
      mapCtx = canvas.getContext('2d');
    }
    if (!mapCtx) return;
    const g = mapCtx;
    const W = 180;
    const px = (x) => (x + 180) * 0.5;
    const pz = (z) => (z + 180) * 0.5;
    g.clearRect(0, 0, W, W);
    g.fillStyle = '#14101f';
    g.fillRect(0, 0, W, W);
    // District blocks.
    for (const zone of MINIMAP_ZONES) {
      g.fillStyle = zone.color;
      g.globalAlpha = 0.28;
      g.fillRect(px(zone.x) - 23, pz(zone.z) - 15, 46, 30);
      g.globalAlpha = 1;
      g.fillStyle = '#f5e9d0';
      g.font = '7px sans-serif';
      g.textAlign = 'center';
      g.fillText(DISTRICT_NAMES[zone.key], px(zone.x), pz(zone.z) + 3);
    }
    // Roads: a loose grid so the city reads as streets.
    g.strokeStyle = 'rgba(245,233,208,0.16)';
    g.lineWidth = 1;
    for (let v = -120; v <= 120; v += 60) {
      g.beginPath(); g.moveTo(px(v), 0); g.lineTo(px(v), W); g.stroke();
      g.beginPath(); g.moveTo(0, pz(v)); g.lineTo(W, pz(v)); g.stroke();
    }
    // Search zone around the last known position.
    if (S.lastKnown) {
      g.strokeStyle = '#ffb347';
      g.setLineDash([4, 3]);
      g.beginPath();
      g.arc(px(S.lastKnown.x), pz(S.lastKnown.z), 11, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
    // Traffic cars.
    const cars = Array.isArray(S.cars) ? S.cars : [];
    for (const c of cars) {
      if (!c || !c.pos || c.aiPolice) continue;
      g.fillStyle = '#cfd6e4';
      g.fillRect(px(c.pos.x) - 1.5, pz(c.pos.z) - 1.5, 3, 3);
    }
    // Police.
    for (const c of cars) {
      if (!c || !c.pos || !c.aiPolice) continue;
      g.fillStyle = '#ff4d4d';
      g.beginPath();
      g.arc(px(c.pos.x), pz(c.pos.z), 3, 0, Math.PI * 2);
      g.fill();
    }
    // Player arrow.
    if (S.player && S.player.pos) {
      const x = px(S.player.pos.x);
      const y = pz(S.player.pos.z);
      const heading = typeof S.player.heading === 'number' ? S.player.heading : 0;
      g.save();
      g.translate(x, y);
      g.rotate(-heading);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(-4.5, 5); g.closePath();
      g.fill();
      g.restore();
    }
  }

  function rebuildRoster() {
    const roster = grab('roster');
    const rowsBox = grab('roster-rows') || roster;
    const codeEl = grab('roster-code');
    if (!roster || !rowsBox) return;
    const w = wantedLevel(S);
    let cops = [];
    if (Array.isArray(S.cops) && S.cops.length) cops = S.cops;
    else if (Array.isArray(S.cars)) cops = S.cars.filter((c) => c && c.aiPolice);
    if (w <= 0 && cops.length === 0) {
      roster.classList.add('hidden');
      rowsBox.innerHTML = '';
      return;
    }
    roster.classList.remove('hidden');
    if (codeEl) codeEl.textContent = 'DISPATCH 10-90 — ' + w + (w === 1 ? ' STAR' : ' STARS');
    const pp = S.player && S.player.pos;
    rowsBox.innerHTML = '';
    for (const cop of cops) {
      const row = document.createElement('div');
      row.className = 'roster-row';
      const callsign = cop.callsign || 'PD-??';
      let dist = '—';
      if (pp && cop.pos) {
        const dx = cop.pos.x - pp.x;
        const dz = cop.pos.z - pp.z;
        dist = Math.round(Math.sqrt(dx * dx + dz * dz)) + 'm';
      }
      const tactic = (cop.brain && (cop.brain.tactic || cop.brain.state)) || 'PURSUIT';
      row.textContent = callsign + '  •  ' + dist + '  •  ' + tactic;
      rowsBox.appendChild(row);
    }
  }

  function updateWeapons() {
    const box = grab('weapons');
    if (!box) return;
    const slots = box.querySelectorAll('.slot');
    const L = S.player && S.player.loadout;
    if (!L) return;
    const list = L.weapons || L.slots || [];
    slots.forEach((slot, i) => {
      const w = list[i];
      const nameEl = slot.querySelector('.slot-name');
      const ammoEl = slot.querySelector('.slot-ammo');
      const name = (w && w.def && w.def.name) || (w && w.name) || SLOT_NAMES[i];
      if (nameEl) nameEl.textContent = name;
      let ammo = '';
      if (i === L.equipped) ammo = String(S.player.ammo);
      else if (w && typeof w.ammo === 'number') ammo = String(w.ammo);
      else if (w && typeof w.mag === 'number') ammo = String(w.mag);
      if (ammoEl) ammoEl.textContent = ammo;
      slot.classList.toggle('active', i === L.equipped);
      slot.classList.toggle('locked', !!(w && w.locked));
    });
  }

  function updateSpeedo() {
    const numEl = grab('speed-num');
    const gearEl = grab('speed-gear');
    const carEl = grab('speed-car');
    let speed = 0;
    if (S.car) {
      if (typeof S.car.speed === 'number') speed = S.car.speed;
      else if (S.car.velocity) speed = Math.hypot(S.car.velocity.x || 0, S.car.velocity.z || 0);
      else if (S.car.vel) speed = Math.hypot(S.car.vel.x || 0, S.car.vel.z || 0);
    }
    if (numEl) numEl.textContent = String(Math.round(Math.abs(speed)));
    if (gearEl) {
      if (!S.car) gearEl.textContent = 'N';
      else if (speed < 0.5) gearEl.textContent = 'N';
      else if (speed < 10) gearEl.textContent = '1';
      else if (speed < 20) gearEl.textContent = '2';
      else if (speed < 30) gearEl.textContent = '3';
      else if (speed < 45) gearEl.textContent = '4';
      else gearEl.textContent = '5';
    }
    if (carEl) {
      carEl.textContent = S.car
        ? String(S.car.name || S.car.kind || 'CAR').toUpperCase()
        : 'ON FOOT';
    }
  }

  function updateObjective() {
    const o = grab('objective');
    if (!o) return;
    const race = S.sideActivities && S.sideActivities.race;
    const taxi = S.sideActivities && S.sideActivities.taxi;
    if (race && race.active) {
      o.textContent = 'RACE — GATE ' + ((race.gate || 0) + 1) + ' / 4';
      return;
    }
    if (taxi && taxi.active) {
      o.textContent = 'TAXI — DROP OFF THE FARE';
      return;
    }
    const cur = S.missions && S.missions.current;
    if (cur) {
      o.textContent = String(cur.objective || cur.title || 'COMPLETE THE JOB');
      return;
    }
    if ((S.missionIndex || 0) === 0) {
      o.textContent = 'NEXT JOB — SEE LENA AT THE GARAGE';
      return;
    }
    o.textContent = 'EXPLORE SOLMAR BAY';
  }

  ctx.updates.push((dt) => {
    const cashEl = grab('cash');
    if (cashEl) cashEl.textContent = money(S.cash);

    const dEl = grab('district');
    if (dEl) dEl.textContent = districtDisplay(S);

    const dtEl = grab('day-time');
    if (dtEl) dtEl.textContent = clockText(S);

    const rankTitle = (S.respectDirector && S.respectDirector.rank && S.respectDirector.rank.title)
      || 'NOBODY';
    const rNum = grab('respect-num');
    if (rNum) rNum.textContent = String(S.respect || 0);
    const rRank = grab('respect-rank');
    if (rRank) rRank.textContent = rankTitle;
    const rLine = grab('respect-line');
    if (rLine) rLine.textContent = 'RESPECT ' + (S.respect || 0) + ' · ' + rankTitle;
    // The line above replaces the line's children with plain text,
    // which deletes the respect spans this HUD and the checks read —
    // put them back whenever they are gone, carrying the live values.
    // (The container itself is never removed, so it stays a good home.)
    if (!document.getElementById('respect-num') || !document.getElementById('respect-rank')) {
      const line = grab('respect-line');
      if (line) {
        line.innerHTML = '';
        line.appendChild(document.createTextNode('RESPECT '));
        const n = document.createElement('span');
        n.id = 'respect-num';
        n.textContent = String(S.respect || 0);
        line.appendChild(n);
        line.appendChild(document.createTextNode(' · '));
        const r = document.createElement('span');
        r.id = 'respect-rank';
        r.textContent = rankTitle;
        line.appendChild(r);
      }
    }

    const hp = S.player ? (S.player.health ?? S.health ?? 100) : 100;
    const fill = grab('health-fill');
    if (fill) fill.style.width = Math.max(0, Math.min(100, hp)) + '%';

    const radioApi = ctx.api.radio;
    const idx = typeof S.radioStation === 'number' ? S.radioStation : 0;
    let stationName = FALLBACK_STATIONS[idx % FALLBACK_STATIONS.length].name;
    let trackName = FALLBACK_STATIONS[idx % FALLBACK_STATIONS.length].track;
    if (radioApi && typeof radioApi.current === 'function') {
      try {
        const cur = radioApi.current();
        if (cur) {
          if (cur.name) stationName = cur.name;
          if (cur.track) trackName = cur.track;
        }
      } catch (e) { /* keep fallback names */ }
    }
    const rsEl = grab('radio-station');
    if (rsEl) rsEl.textContent = stationName;
    const rtEl = grab('radio-track');
    if (rtEl) rtEl.textContent = trackName;

    const w = wantedLevel(S);
    const wEl = grab('wanted');
    if (wEl) {
      wEl.textContent = '★'.repeat(w) + '☆'.repeat(5 - w);
      wEl.classList.toggle('hot', w >= 3);
    }

    rosterT += dt;
    if (rosterT >= 0.25) {
      rosterT = 0;
      rebuildRoster();
    }

    mapT += dt;
    if (mapT >= 0.12) {
      mapT = 0;
      drawMinimap();
    }

    updateWeapons();
    updateSpeedo();
    updateObjective();

    if (toastUntil && performance.now() > toastUntil) {
      const t = grab('toast');
      if (t) t.textContent = '';
      toastUntil = 0;
    }
  });
}
