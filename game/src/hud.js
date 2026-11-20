// hud.js — everything on the screen that is not a world object.
//
// This module owns the whole HUD: the top-left block (clock, district,
// cash, respect), the minimap canvas, the speedometer, the four weapon
// slots, the wanted stars, the PD roster, the toast line, the health
// bar and the objective line (whose text comes from S.missions).
// main.js drives it through S.hud.update(dt) once per frame.
//
// All writes are cached: a DOM node is only touched when its text
// actually changes, so the headless loop stays cheap.

const WORLD_EDGE = 185;
const ROSTER_REFRESH = 0.25;
const MINIMAP_REFRESH = 0.25;
const TOAST_LINGER_MS = 6000;

const GEAR_BANDS = [
  { under: 8, gear: '1' },
  { under: 15, gear: '2' },
  { under: 22, gear: '3' },
  { under: 30, gear: '4' },
];

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function gearFor(speed) {
  if (Math.abs(speed) < 0.5) return 'N';
  if (speed < 0) return 'R';
  for (const band of GEAR_BANDS) {
    if (speed < band.under) return band.gear;
  }
  return '5';
}

export function init(S) {
  const minimap = document.getElementById('minimap');
  const ctx = minimap ? minimap.getContext('2d') : null;
  const speedNum = document.getElementById('speed-num');
  const speedGear = document.getElementById('speed-gear');
  const speedCar = document.getElementById('speed-car');
  const wantedEl = document.getElementById('wanted');
  const roster = document.getElementById('roster');
  const rosterCode = document.getElementById('roster-code');
  const rosterRows = document.getElementById('roster-rows');
  const toast = document.getElementById('toast');
  const objective = document.getElementById('objective');
  const healthFill = document.getElementById('health-fill');
  const dayTimeEl = document.getElementById('day-time');
  const districtEl = document.getElementById('district');
  const cashEl = document.getElementById('cash');
  const respectNumEl = document.getElementById('respect-num');
  const respectRankEl = document.getElementById('respect-rank');
  const slots = [...document.querySelectorAll('#weapons .slot')];

  // Last values written, so unchanged frames cost nothing.
  const last = {
    speed: '', gear: '', car: '', wanted: '', objective: '',
    health: '', toastText: '', toastSince: 0,
    dayTime: '', district: '', cash: '', respectNum: '', respectRank: '',
  };
  let rosterTimer = 0;
  let mapTimer = 0;

  // --- minimap ---------------------------------------------------------
  // World ±185 maps onto the 180x180 canvas. North is up.
  function toMap(x, z) {
    const px = ((x + WORLD_EDGE) / (WORLD_EDGE * 2)) * 180;
    const py = ((z + WORLD_EDGE) / (WORLD_EDGE * 2)) * 180;
    return [px, py];
  }

  function drawMinimap() {
    if (!ctx || !minimap) return;
    ctx.clearRect(0, 0, 180, 180);
    ctx.fillStyle = 'rgba(8, 16, 30, 0.92)';
    ctx.fillRect(0, 0, 180, 180);

    // Street grid, one line every 40 m, faint enough to sit behind dots.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    for (let g = -160; g <= 160; g += 40) {
      const [ax] = toMap(g, 0);
      const [, bz] = toMap(0, g);
      ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, 180); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, bz); ctx.lineTo(180, bz); ctx.stroke();
    }

    // Active mission target: a gold diamond that is easy to spot.
    const job = S.missions && S.missions.current;
    if (job && job.target) {
      const [tx, ty] = toMap(job.target.x, job.target.z);
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.moveTo(tx, ty - 6); ctx.lineTo(tx + 5, ty);
      ctx.lineTo(tx, ty + 6); ctx.lineTo(tx - 5, ty);
      ctx.closePath(); ctx.fill();
    }

    // Uncollected packages: small green ticks.
    const side = S.sideActivities;
    if (side && side.packages && Array.isArray(side.packages.spots)) {
      ctx.fillStyle = '#4ade80';
      for (const spot of side.packages.spots) {
        if (spot.taken) continue;
        const [px, py] = toMap(spot.x, spot.z);
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      }
    }

    // Police search zone: a dashed ring around the last known position.
    if (S.wanted > 0 && S.lastKnown) {
      const [lx, ly] = toMap(S.lastKnown.x, S.lastKnown.z);
      ctx.strokeStyle = '#ff7a3c';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(lx, ly, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Police cars in red, other cars in grey, the crew in cyan.
    for (const car of S.cars || []) {
      if (!car || !car.pos) continue;
      const [px, py] = toMap(car.pos.x, car.pos.z);
      ctx.fillStyle = car.aiPolice ? '#ff4a4a' : '#9aa4b8';
      ctx.beginPath(); ctx.arc(px, py, car.aiPolice ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fill();
    }
    if (S.crew && S.crew.active && S.crew.mesh && S.crew.mesh.position) {
      const [cx, cy] = toMap(S.crew.mesh.position.x, S.crew.mesh.position.z);
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
    }

    // The player: a white dot with a short heading tick, always on top.
    const anchor = S.car ? S.car.pos : (S.player && S.player.pos);
    if (anchor) {
      const [px, py] = toMap(anchor.x, anchor.z);
      const heading = S.car ? S.car.heading : (S.player ? S.player.heading : 0);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.sin(heading) * 8, py + Math.cos(heading) * 8);
      ctx.stroke();
    }
  }

  // --- police roster ---------------------------------------------------
  function refreshRoster() {
    const cops = (S.cars || []).filter((c) => c && c.aiPolice);
    const wanted = S.wanted || 0;
    if (wanted < 1 || cops.length === 0) {
      if (roster) roster.classList.add('hidden');
      return;
    }
    if (roster) roster.classList.remove('hidden');
    if (rosterCode) {
      rosterCode.textContent = 'CODE ' + wanted + ' — ' + cops.length + ' UNIT' + (cops.length === 1 ? '' : 'S');
    }
    if (rosterRows) {
      const anchor = S.car ? S.car.pos : (S.player && S.player.pos);
      rosterRows.innerHTML = '';
      for (const cop of cops) {
        const row = document.createElement('div');
        row.className = 'roster-row';
        const dx = anchor ? cop.pos.x - anchor.x : 0;
        const dz = anchor ? cop.pos.z - anchor.z : 0;
        const dist = Math.round(Math.sqrt(dx * dx + dz * dz));
        const tactic = (cop.brain && cop.brain.tactic) || 'PURSUIT';
        const state = (cop.brain && cop.brain.state) || tactic;
        const left = document.createElement('span');
        left.textContent = (cop.callsign || 'PD-??') + ' · ' + tactic;
        const right = document.createElement('span');
        right.textContent = state + ' · ' + dist + 'm';
        row.appendChild(left);
        row.appendChild(right);
        rosterRows.appendChild(row);
      }
    }
  }

  // --- per-frame refresh ------------------------------------------------
  function tick(dt) {
    // Speedometer: the car's speed while driving, the player's on foot.
    const speed = S.car ? S.car.speed : (S.player ? (S.player.speed || 0) : 0);
    const shown = String(Math.round(Math.abs(speed)));
    if (shown !== last.speed && speedNum) {
      speedNum.textContent = shown;
      last.speed = shown;
    }
    const gear = gearFor(speed);
    if (gear !== last.gear && speedGear) {
      speedGear.textContent = gear;
      last.gear = gear;
    }
    const label = S.car
      ? ((S.config && S.config.vehicles && S.config.vehicles[S.car.kind] && S.config.vehicles[S.car.kind].label) || S.car.kind || 'CAR').toUpperCase()
      : 'ON FOOT';
    if (label !== last.car && speedCar) {
      speedCar.textContent = label;
      last.car = label;
    }

    // Weapon slots: the equipped slot shows live ammo, the rest a dash.
    const equipped = S.player && S.player.loadout ? S.player.loadout.equipped : 0;
    slots.forEach((slot, i) => {
      const isActive = i === equipped;
      slot.classList.toggle('active', isActive);
      const ammoEl = slot.querySelector('.slot-ammo');
      if (!ammoEl) return;
      const want = isActive ? String(S.player ? S.player.ammo : 0) : '—';
      if (ammoEl.textContent !== want) ammoEl.textContent = want;
    });

    // Wanted stars: filled for the level, hollow for the rest.
    const wanted = S.wanted || 0;
    const stars = '★'.repeat(wanted) + '☆'.repeat(Math.max(0, 5 - wanted));
    if (stars !== last.wanted && wantedEl) {
      wantedEl.textContent = stars;
      last.wanted = stars;
    }

    // Health bar width follows the player's health.
    const hp = S.player ? clamp(Math.round(S.player.health || 0), 0, 100) : 100;
    const hpText = hp + '%';
    if (hpText !== last.health && healthFill) {
      healthFill.style.width = hpText;
      last.health = hpText;
    }

    // Clock, district, cash and respect: the top-left block. The
    // clock starts at 18:28 on day 1 and runs on S.time, so jumping
    // the clock to 21:48 reads as night here as well as in dayNight.
    const totalMin = 18 * 60 + 28 + (S.time || 0);
    const day = 1 + Math.floor(totalMin / 1440);
    const clockMin = ((totalMin % 1440) + 1440) % 1440;
    const hh = String(Math.floor(clockMin / 60)).padStart(2, '0');
    const mm = String(Math.floor(clockMin % 60)).padStart(2, '0');
    const phase = (S.dayNight && S.dayNight.phase) || 'SUNSET';
    const dayLine = 'DAY ' + day + ' ' + hh + ':' + mm + ' ' + phase;
    if (dayLine !== last.dayTime && dayTimeEl) {
      dayTimeEl.textContent = dayLine;
      last.dayTime = dayLine;
    }
    const dName = S.districtName ? S.districtName(S.district) : String(S.district || '').toUpperCase();
    if (dName !== last.district && districtEl) {
      districtEl.textContent = dName;
      last.district = dName;
    }
    const cashText = '$' + Math.floor(S.cash || 0).toLocaleString('en-US');
    if (cashText !== last.cash && cashEl) {
      cashEl.textContent = cashText;
      last.cash = cashText;
    }
    const respectText = String(S.respect || 0);
    if (respectText !== last.respectNum && respectNumEl) {
      respectNumEl.textContent = respectText;
      last.respectNum = respectText;
    }
    const rankTitle = (S.respectDirector && S.respectDirector.rank) ? S.respectDirector.rank.title : '';
    if (rankTitle !== last.respectRank && respectRankEl) {
      respectRankEl.textContent = rankTitle;
      last.respectRank = rankTitle;
    }

    // Objective line: written by the mission module, rendered here.
    const objText = (S.missions && typeof S.missions.objectiveText === 'function')
      ? S.missions.objectiveText()
      : '';
    if (objText !== last.objective && objective) {
      objective.textContent = objText;
      last.objective = objText;
    }

    // Toast: reveal it while it carries text, tuck it away after a
    // while. The text itself is never cleared — other modules read it.
    if (toast) {
      const text = toast.textContent || '';
      if (text !== last.toastText) {
        last.toastText = text;
        last.toastSince = performance.now();
        if (text.length > 0) toast.classList.remove('hidden');
      } else if (text.length > 0 && performance.now() - last.toastSince > TOAST_LINGER_MS) {
        toast.classList.add('hidden');
      }
    }

    // The roster and the minimap refresh on a game-time heartbeat, not
    // every frame: at 4 Hz the numbers stay live without churning DOM.
    rosterTimer += dt;
    if (rosterTimer >= ROSTER_REFRESH) {
      rosterTimer = 0;
      refreshRoster();
    }
    mapTimer += dt;
    if (mapTimer >= MINIMAP_REFRESH) {
      mapTimer = 0;
      drawMinimap();
    }
  }

  // main.js drives the HUD through S.hud.update(dt) once per frame
  // (playing and menu alike), so this module does NOT also register
  // on S._tick — that would run the same refresh twice per frame.
  S.hud = { tick, update: tick, refreshRoster, drawMinimap };
  drawMinimap();
  return S.hud;
}

export default init;
