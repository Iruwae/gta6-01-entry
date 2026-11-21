// SOLMAR BAY — the on-screen readouts: cash, district, clock, respect,
// health, radio, wanted stars, police roster, minimap, weapon slots,
// speedometer and objective. The boot hub drives these every frame;
// this module owns the roster + minimap painters it calls.
export function init(ctx) {
  const { state: S, dom } = ctx;

  function paintRoster() {
    const roster = dom.roster;
    if (!roster) return;
    const cops = (S.cops && S.cops.length > 0)
      ? S.cops
      : S.cars.filter((c) => c.aiPolice);
    if (cops.length === 0) {
      roster.classList.add('hidden');
      return;
    }
    roster.classList.remove('hidden');
    const code = dom['roster-code'];
    if (code) code.textContent = `DISPATCH 10-80 — ${S.wanted} STAR(S)`;
    const rows = dom['roster-rows'];
    if (rows) {
      rows.innerHTML = '';
      for (const cop of cops) {
        const d = Math.round(Math.hypot(cop.pos.x - S.player.pos.x, cop.pos.z - S.player.pos.z));
        const row = document.createElement('div');
        row.className = 'roster-row';
        const cs = document.createElement('b');
        cs.textContent = cop.callsign || 'PD-??';
        row.appendChild(cs);
        const span = document.createElement('span');
        span.textContent = ` ${(cop.brain && cop.brain.tactic) || 'PURSUIT'} · ${d}m`;
        row.appendChild(span);
        rows.appendChild(row);
      }
    }
  }

  function paintMinimap() {
    const cv = dom.minimap;
    if (!cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    const W = 180;
    const H = 180;
    const scale = 0.45;
    const cx = 90;
    const cy = 90;
    const mx = (x) => cx + x * scale;
    const my = (z) => cy + z * scale;
    g.fillStyle = 'rgba(12,8,24,0.85)';
    g.fillRect(0, 0, W, H);
    // District dots.
    for (const d of ctx.config.districts) {
      g.fillStyle = d.color;
      g.beginPath();
      g.arc(mx(d.x), my(d.z), 4, 0, Math.PI * 2);
      g.fill();
    }
    // Last known position while wanted.
    if (S.wanted > 0 && S.lastKnown) {
      g.strokeStyle = '#ff2244';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(mx(S.lastKnown.x), my(S.lastKnown.z), 10, 0, Math.PI * 2);
      g.stroke();
    }
    // Untaken packages.
    g.fillStyle = '#ffd24d';
    for (const p of S.packages) {
      if (!p.taken) g.fillRect(mx(p.x) - 3, my(p.z) - 3, 6, 6);
    }
    // Cars.
    for (const c of S.cars) {
      g.fillStyle = c.aiPolice ? '#4da6ff' : '#dddddd';
      g.fillRect(mx(c.pos.x) - 3, my(c.pos.z) - 3, 6, 6);
    }
    // Heli.
    if (S.heli) {
      g.fillStyle = '#ff2244';
      g.beginPath();
      g.arc(mx(S.heli.pos.x), my(S.heli.pos.z), 4, 0, Math.PI * 2);
      g.fill();
    }
    // Player.
    g.fillStyle = '#ffb347';
    g.beginPath();
    g.arc(mx(S.player.pos.x), my(S.player.pos.z), 4, 0, Math.PI * 2);
    g.fill();
  }

  ctx.api.paintRoster = paintRoster;
  ctx.api.paintMinimap = paintMinimap;
  ctx.hudReady = true;
}
