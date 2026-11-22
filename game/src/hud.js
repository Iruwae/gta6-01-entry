// SOLMAR BAY — the HUD module. The on-screen readouts (cash, district,
// clock, respect, health, radio, wanted stars, police roster, minimap,
// weapon slots, speedometer, objective) are updated by the boot hub's
// frame loop; this module owns the roster + minimap painters the hub
// calls, so the readouts stay in one place.
import { CONFIG } from './config.js';

export function paintRoster(ctx) {
  const S = ctx.state;
  const dom = ctx.dom;
  const cops = S.cops.length > 0 ? S.cops : S.cars.filter((c) => c.aiPolice);
  const roster = dom.roster;
  if (!roster) return;
  if (cops.length === 0) {
    roster.classList.add('hidden');
    return;
  }
  roster.classList.remove('hidden');
  if (dom['roster-code']) {
    dom['roster-code'].textContent = `DISPATCH 10-80 — ${S.wanted} STAR(S)`;
  }
  const rows = dom['roster-rows'];
  if (rows) {
    rows.innerHTML = '';
    for (const cop of cops) {
      const row = document.createElement('div');
      row.className = 'roster-row';
      const call = document.createElement('strong');
      call.textContent = cop.callsign || 'PD-??';
      const tactic = document.createElement('span');
      tactic.textContent = (cop.brain && cop.brain.tactic) || 'PURSUIT';
      const dist = document.createElement('span');
      const d = Math.hypot(cop.pos.x - S.player.pos.x, cop.pos.z - S.player.pos.z);
      dist.textContent = `${Math.round(d)}m`;
      row.append(call, tactic, dist);
      rows.appendChild(row);
    }
  }
}

export function paintMinimap(ctx) {
  const S = ctx.state;
  const canvas = ctx.dom.minimap;
  if (!canvas) return;
  const g = canvas.getContext('2d');
  if (!g) return;
  const W = 180;
  const H = 180;
  const scale = 0.45;
  const cx = 90;
  const cy = 90;
  const mx = (x) => cx + x * scale;
  const my = (z) => cy + z * scale;
  g.fillStyle = 'rgba(10,6,20,0.85)';
  g.fillRect(0, 0, W, H);
  for (const d of CONFIG.districts) {
    g.fillStyle = d.color;
    g.beginPath();
    g.arc(mx(d.x), my(d.z), 4, 0, Math.PI * 2);
    g.fill();
  }
  if (S.wanted > 0 && S.lastKnown) {
    g.strokeStyle = '#ff2a2a';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(mx(S.lastKnown.x), my(S.lastKnown.z), 9, 0, Math.PI * 2);
    g.stroke();
  }
  for (const p of S.packages) {
    if (p.taken) continue;
    g.fillStyle = '#ffd24a';
    g.fillRect(mx(p.x) - 3, my(p.z) - 3, 6, 6);
  }
  for (const car of S.cars) {
    g.fillStyle = car.aiPolice ? '#4aa3ff' : '#dddddd';
    g.fillRect(mx(car.pos.x) - 3, my(car.pos.z) - 3, 6, 6);
  }
  if (S.heli) {
    g.fillStyle = '#ff2a2a';
    g.beginPath();
    g.arc(mx(S.heli.pos.x), my(S.heli.pos.z), 4, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#ffb347';
  g.beginPath();
  g.arc(mx(S.player.pos.x), my(S.player.pos.z), 4, 0, Math.PI * 2);
  g.fill();
}

export function init(ctx) {
  ctx.api.paintRoster = () => paintRoster(ctx);
  ctx.api.paintMinimap = () => paintMinimap(ctx);
  ctx.flags.hud = true;
}
