// SOLMAR BAY — the HUD: health bar, cash, wanted stars, clock, mission
// objective, waypoint compass, and the live minimap drawn on a 2D canvas.
export class HUD {
  constructor() {
    this.el = (id) => document.getElementById(id);
    this.map = this.el('minimap');
    this.mapCtx = this.map.getContext('2d');
    this.toastT = null;
    this.bannerT = null;
  }
  show() { this.el('hud').style.display = 'block'; }
  hide() { this.el('hud').style.display = 'none'; }
  setHealth(hp, max) {
    const pct = Math.max(0, Math.round((hp / max) * 100));
    const fill = this.el('hp-fill');
    fill.style.width = pct + '%';
    fill.classList.toggle('low', pct < 30);
    this.el('hp-text').textContent = 'HEALTH ' + pct + '%';
  }
  setCarHealth(hp) {
    const row = this.el('car-row');
    if (hp === null) { row.style.display = 'none'; return; }
    row.style.display = 'block';
    this.el('car-fill').style.width = Math.max(0, Math.round(hp)) + '%';
  }
  setCash(cash) { this.el('cash-text').textContent = '$' + cash.toLocaleString('en-US'); }
  setWanted(stars) {
    const el = this.el('wanted');
    el.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    el.classList.toggle('hot', stars > 0);
  }
  setClock(seconds) {
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    this.el('clock').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  setObjective(text) { this.el('objective').textContent = text || ''; }
  setMissionTitle(text) { this.el('mission-title').textContent = text || ''; }
  setSpeed(kmh, inCar) {
    this.el('speed').textContent = inCar ? Math.round(kmh) + ' km/h' : '';
  }
  setPrompt(text) {
    const el = this.el('prompt');
    el.textContent = text || '';
    el.style.display = text ? 'block' : 'none';
  }
  setTimer(seconds) {
    const el = this.el('timer');
    if (seconds > 0) {
      el.style.display = 'block';
      el.textContent = '⏱ ' + Math.ceil(seconds) + 's';
      el.classList.toggle('urgent', seconds < 20);
    } else el.style.display = 'none';
  }
  showToast(text) {
    const el = this.el('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => el.classList.remove('show'), 4200);
  }
  showBanner(title, sub) {
    const b = this.el('banner');
    this.el('banner-title').textContent = title;
    this.el('banner-sub').textContent = sub || '';
    b.classList.add('show');
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => b.classList.remove('show'), 2600);
  }
  // Minimap: roads + blocks + water, player arrow, traffic dots, police
  // flashing dots, mission marker, all in Solmar Bay colours.
  drawMinimap(game) {
    const ctx = this.mapCtx;
    const W = this.map.width, S = 420;
    const toMap = (x, z) => [((x + S / 2) / S) * W, ((z + S / 2) / S) * W];
    ctx.clearRect(0, 0, W, W);
    ctx.fillStyle = '#20242c'; ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = '#2a7fa8'; ctx.fillRect(0, 0, ((S / 2 - 196) / S) * W, W);
    ctx.fillStyle = '#d9b380'; ctx.fillRect(((S / 2 - 196) / S) * W, 0, ((196 - 178) / S) * W, W);
    ctx.fillStyle = '#555550';
    for (const r of game.city.roadLines) {
      const [rx] = toMap(r, 0); const [_, rz] = toMap(0, r);
      ctx.fillRect(rx - 3, 0, 6, W);
      ctx.fillRect(0, rz - 3, W, 6);
    }
    ctx.fillStyle = '#3a3f4a';
    for (const c of game.city.colliders) {
      const [x, y] = toMap(c.x - c.hx, c.z - c.hz);
      const [x2, y2] = toMap(c.x + c.hx, c.z + c.hz);
      ctx.fillRect(x, y, x2 - x, y2 - y);
    }
    const dot = (x, z, color, r) => {
      const [mx, my] = toMap(x, z);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
    };
    // Mission marker: pulsing yellow diamond.
    const target = game.missions.targetPos();
    if (target || game.missions.markerAvailable()) {
      const t = target || { x: 100, z: -100 };
      const [mx, my] = toMap(t.x, t.z);
      const pulse = 6 + Math.sin(performance.now() / 250) * 2;
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.moveTo(mx, my - pulse); ctx.lineTo(mx + pulse, my);
      ctx.lineTo(mx, my + pulse); ctx.lineTo(mx - pulse, my);
      ctx.closePath(); ctx.fill();
    }
    for (const car of game.traffic.cars) {
      if (car.kind === 'police') {
        dot(car.pos.x, car.pos.z, Math.floor(performance.now() / 300) % 2 ? '#ff4040' : '#4080ff', 3.5);
      } else if (car.kind !== 'player') dot(car.pos.x, car.pos.z, '#c8c8c8', 2);
    }
    for (const e of game.people.enemies) dot(e.pos.x, e.pos.z, '#ff4040', 3);
    for (const p of game.people.peds) dot(p.pos.x, p.pos.z, '#7ac8ff', 1.5);
    // Player arrow, rotated to heading.
    const [px, py] = toMap(game.playerPos().x, game.playerPos().z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(game.playerHeading());
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(-5, 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // North + range ring.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('N', 6, 14);
  }
}
