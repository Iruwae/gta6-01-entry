// SOLMAR BAY — the garage. Driving a car to the garage door and
// pressing G stores it (S.garageCars gets a record {kind, tune, ...});
// pressing G on foot near the door opens the garage panel, where a
// stored car can be spawned back (button class garage-spawn) and the
// current car can be tuned (engine, armor, paint, NOS — tuning changes
// perf() and is kept on the stored record).
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;
  const { input, dom } = ctx;
  const toast = (m) => ctx.api.toast && ctx.api.toast(m);

  function buildPanel() {
    const list = dom['garage-list'];
    if (!list) return;
    list.innerHTML = '';
    if (S.garageCars.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'garage-empty';
      empty.textContent = 'No cars stored. Drive a car to the door and press G.';
      list.appendChild(empty);
      return;
    }
    S.garageCars.forEach((rec, idx) => {
      const row = document.createElement('div');
      row.className = 'garage-row';
      const name = document.createElement('span');
      name.className = 'garage-name';
      name.textContent = `${rec.kind.toUpperCase()} — perf ${perfOf(rec)}`;
      row.appendChild(name);
      for (const kind of ['engine', 'armor', 'nos', 'paint']) {
        const b = document.createElement('button');
        b.className = 'garage-tune';
        b.dataset.tune = kind;
        b.textContent = kind === 'paint' ? 'PAINT' : `${kind.toUpperCase()} +1`;
        b.addEventListener('click', () => {
          if (kind === 'paint') {
            const paints = ['default', 'sunset', 'midnight', 'lime'];
            const cur = paints.indexOf(rec.tune.paint || 'default');
            rec.tune.paint = paints[(cur + 1) % paints.length];
            toast(`Paint changed to ${rec.tune.paint}.`);
          } else {
            rec.tune[kind] = (rec.tune[kind] || 0) + 1;
            toast(`${rec.kind} ${kind} upgraded to ${rec.tune[kind]}.`);
          }
          buildPanel();
        });
        row.appendChild(b);
      }
      const spawn = document.createElement('button');
      spawn.className = 'garage-spawn';
      spawn.textContent = 'SPAWN';
      spawn.addEventListener('click', () => {
        const makeCar = ctx.api.makeCar;
        if (!makeCar) return;
        const car = makeCar(rec.kind, CONFIG.locations.garage.x + 4, CONFIG.locations.garage.z, {
          tune: { ...rec.tune },
          health: rec.health,
        });
        S.cars.push(car);
        S.car = car;
        S.garageCars.splice(idx, 1);
        dom['garage-panel'].classList.add('hidden');
        toast(`${rec.kind} rolled out of the garage.`);
      });
      row.appendChild(spawn);
      list.appendChild(row);
    });
  }

  function perfOf(rec) {
    const base = (CONFIG.vehicleStats[rec.kind] || { perf: 30 }).perf;
    return base + (rec.tune.engine || 0) * 4 + (rec.tune.nos || 0) * 6;
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing' || S.cutscene) return;
    if (!input.justPressed('KeyG')) return;
    const loc = CONFIG.locations.garage;
    const ref = S.car ? S.car.pos : S.player.pos;
    const d = Math.hypot(ref.x - loc.x, ref.z - loc.z);
    if (d >= loc.radius) return;
    if (S.car) {
      const car = S.car;
      S.garageCars.push({
        kind: car.kind,
        tune: { ...car.tune },
        health: car.health,
        maxHealth: car.maxHealth,
        color: car.color,
      });
      const i = S.cars.indexOf(car);
      if (i >= 0) S.cars.splice(i, 1);
      if (car.mesh) ctx.scene.remove(car.mesh);
      S.car = null;
      toast('Car stored in the garage.');
    } else {
      buildPanel();
      dom['garage-panel'].classList.remove('hidden');
    }
  });

  ctx.api.openGarage = () => {
    buildPanel();
    dom['garage-panel'].classList.remove('hidden');
  };
  ctx.flags.garage = true;
}
