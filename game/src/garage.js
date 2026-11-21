// SOLMAR BAY — the garage. G is the garage key. Driving a car to the
// garage door and pressing G stores it (S.garageCars gets a record
// {kind, tune, …}); pressing G on foot near the door opens the garage
// panel, where a stored car can be spawned back (button .garage-spawn)
// and tuned (engine, armor, NOS — tuning changes perf() and is kept on
// the stored record).
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input, dom } = ctx;
  const panel = dom['garage-panel'];
  const list = dom['garage-list'];

  function nearDoor() {
    const px = S.car ? S.car.pos.x : S.player.pos.x;
    const pz = S.car ? S.car.pos.z : S.player.pos.z;
    const dx = px - CONFIG.garage.x;
    const dz = pz - CONFIG.garage.z;
    return dx * dx + dz * dz <= CONFIG.garage.radius * CONFIG.garage.radius;
  }

  function buildPanel() {
    if (!list) return;
    list.innerHTML = '';
    if (!S.garageCars.length) {
      list.innerHTML = '<div class="garage-empty">Garage is empty — park a car at the door and press G.</div>';
      return;
    }
    S.garageCars.forEach((rec) => {
      const row = document.createElement('div');
      row.className = 'garage-row';
      row.innerHTML = `<span class="garage-name">${rec.kind.toUpperCase()}</span> <span class="garage-tune">ENG ${rec.tune.engine || 0} · ARM ${rec.tune.armor || 0} · NOS ${rec.tune.nos || 0}</span>`;
      const spawn = document.createElement('button');
      spawn.className = 'garage-spawn';
      spawn.textContent = 'SPAWN';
      spawn.addEventListener('click', () => {
        const car = ctx.api.makeCar(rec.kind, CONFIG.garage.x, CONFIG.garage.z);
        car.tune = { ...rec.tune };
        if (typeof rec.health === 'number') car.health = rec.health;
        S.cars.push(car);
        S.car = car;
        S.player.pos.copy(car.pos);
        if (panel) panel.classList.add('hidden');
        ctx.api.toast(`Your ${rec.kind} is back on the street.`);
      });
      row.appendChild(spawn);
      for (const part of ['engine', 'armor', 'nos']) {
        const b = document.createElement('button');
        b.className = 'garage-tune-btn';
        b.textContent = '+' + part.toUpperCase();
        b.addEventListener('click', () => {
          rec.tune[part] = (rec.tune[part] || 0) + 1;
          buildPanel();
        });
        row.appendChild(b);
      }
      list.appendChild(row);
    });
  }

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    if (!input.wasPressed('KeyG')) return;
    if (!nearDoor()) return;
    if (S.car) {
      const car = S.car;
      S.garageCars.push({
        kind: car.kind,
        tune: { ...car.tune },
        health: car.health,
        maxHealth: car.maxHealth,
      });
      const idx = S.cars.indexOf(car);
      if (idx >= 0) S.cars.splice(idx, 1);
      if (car.mesh && car.mesh.parent) car.mesh.parent.remove(car.mesh);
      S.car = null;
      ctx.api.toast(`${car.kind} stored in the garage.`);
    } else {
      buildPanel();
      if (panel) panel.classList.remove('hidden');
    }
  });

  ctx.api.buildGaragePanel = buildPanel;
}
