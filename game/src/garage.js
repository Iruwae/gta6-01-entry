// Garage: G stores the car at the door; G on foot opens the panel where
// a stored car can be spawned back or tuned.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { scene, state: S, input, dom } = ctx;
  const panel = dom['garage-panel'];
  const list = dom['garage-list'];

  function buildPanel() {
    list.innerHTML = '';
    if (S.garageCars.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'garage-empty';
      empty.textContent = 'No cars stored. Drive a car to the garage door and press G.';
      list.appendChild(empty);
    }
    S.garageCars.forEach((rec, idx) => {
      const row = document.createElement('div');
      row.className = 'garage-row';
      const name = document.createElement('span');
      name.className = 'garage-name';
      name.textContent = `${rec.kind.toUpperCase()} — perf ${perfOf(rec)}`;
      row.appendChild(name);
      const spawn = document.createElement('button');
      spawn.className = 'garage-spawn';
      spawn.textContent = 'SPAWN';
      spawn.addEventListener('click', () => {
        const car = ctx.api.spawnCar(rec.kind, rec.tune, CONFIG.garageDoor.x + 4, CONFIG.garageDoor.z + 4, 0);
        car.health = rec.health ?? car.maxHealth;
        S.garageCars.splice(idx, 1);
        S.car = car;
        S.player.pos.copy(car.pos);
        panel.classList.add('hidden');
        if (ctx.api.toast) ctx.api.toast(`${rec.kind} is back on the street.`);
        buildPanel();
      });
      row.appendChild(spawn);
      for (const part of ['engine', 'armor', 'nos']) {
        const tuneBtn = document.createElement('button');
        tuneBtn.className = 'garage-tune';
        tuneBtn.dataset.tune = part;
        tuneBtn.textContent = `${part.toUpperCase()} +1`;
        tuneBtn.addEventListener('click', () => {
          rec.tune[part] = (rec.tune[part] || 0) + 1;
          name.textContent = `${rec.kind.toUpperCase()} — perf ${perfOf(rec)}`;
          if (ctx.api.toast) ctx.api.toast(`${rec.kind} ${part} tuned.`);
        });
        row.appendChild(tuneBtn);
      }
      const paintBtn = document.createElement('button');
      paintBtn.className = 'garage-tune';
      paintBtn.dataset.tune = 'paint';
      paintBtn.textContent = 'REPAINT';
      paintBtn.addEventListener('click', () => {
        const paints = ['default', 'sunset', 'midnight', 'lime'];
        const cur = paints.indexOf(rec.tune.paint || 'default');
        rec.tune.paint = paints[(cur + 1) % paints.length];
        if (ctx.api.toast) ctx.api.toast(`${rec.kind} repainted: ${rec.tune.paint}.`);
      });
      row.appendChild(paintBtn);
      list.appendChild(row);
    });
    // Tuning for the car currently being driven.
    if (S.car) {
      const cur = document.createElement('div');
      cur.className = 'garage-row garage-current';
      const name = document.createElement('span');
      name.className = 'garage-name';
      name.textContent = `CURRENT: ${S.car.kind.toUpperCase()} — perf ${S.car.perf()}`;
      cur.appendChild(name);
      for (const part of ['engine', 'armor', 'nos']) {
        const tuneBtn = document.createElement('button');
        tuneBtn.className = 'garage-tune';
        tuneBtn.dataset.tune = part;
        tuneBtn.textContent = `${part.toUpperCase()} +1`;
        tuneBtn.addEventListener('click', () => {
          S.car.tune[part] = (S.car.tune[part] || 0) + 1;
          name.textContent = `CURRENT: ${S.car.kind.toUpperCase()} — perf ${S.car.perf()}`;
          if (ctx.api.toast) ctx.api.toast(`${S.car.kind} ${part} tuned.`);
        });
        cur.appendChild(tuneBtn);
      }
      list.appendChild(cur);
    }
  }

  function perfOf(rec) {
    const base = CONFIG.vehicleBase[rec.kind] || CONFIG.vehicleBase.sedan;
    return base.perf + (rec.tune.engine || 0) * 4 + (rec.tune.nos || 0) * 6;
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (!input.wasPressed('KeyG')) return;
    const door = CONFIG.garageDoor;
    const px = S.car ? S.car.pos.x : S.player.pos.x;
    const pz = S.car ? S.car.pos.z : S.player.pos.z;
    const dx = px - door.x;
    const dz = pz - door.z;
    if (Math.sqrt(dx * dx + dz * dz) >= door.radius) return;
    if (S.car) {
      // Store the car.
      const car = S.car;
      S.garageCars.push({
        kind: car.kind,
        tune: { ...car.tune },
        health: car.health,
        maxHealth: car.maxHealth,
      });
      const i = S.cars.indexOf(car);
      if (i >= 0) S.cars.splice(i, 1);
      if (car.mesh) scene.remove(car.mesh);
      S.car = null;
      if (ctx.api.toast) ctx.api.toast(`${car.kind} stored in the garage.`);
      buildPanel();
    } else {
      // On foot: open the panel.
      buildPanel();
      panel.classList.remove('hidden');
    }
  });
}

export default init;
