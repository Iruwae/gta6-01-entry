// SOLMAR BAY — the garage. G while driving at the door stores the car;
// G on foot near the door opens the panel to spawn a stored car or tune it.
import { CONFIG } from './config.js';

const TUNE_DEFS = [
  { key: 'engine', label: 'ENGINE +', cost: 50 },
  { key: 'armor', label: 'ARMOR +', cost: 50 },
  { key: 'nos', label: 'NOS +', cost: 50 },
  { key: 'paint', label: 'REPAINT', cost: 30 },
];
const PAINTS = ['sunset', 'midnight', 'candy', 'chrome'];

export function init(ctx) {
  const { scene, state: S, input, dom } = ctx;

  function buildPanel() {
    const list = dom['garage-list'];
    if (!list) return;
    list.innerHTML = '';
    if (S.garageCars.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'garage-empty';
      empty.textContent = 'No cars stored. Drive one to the door and press G.';
      list.appendChild(empty);
      return;
    }
    S.garageCars.forEach((rec, idx) => {
      const row = document.createElement('div');
      row.className = 'garage-row';
      const tune = rec.tune || { nos: 0, engine: 0, armor: 0, paint: 'sunset' };
      row.innerHTML = `<span class="garage-name">${rec.kind.toUpperCase()}</span>` +
        `<span class="garage-info">ENG ${tune.engine} NOS ${tune.nos} ARM ${tune.armor} · ${tune.paint}</span>` +
        `<button class="garage-spawn" type="button">SPAWN</button>`;
      row.querySelector('.garage-spawn').addEventListener('click', () => {
        const car = ctx.api.spawnCar(rec.kind, rec.tune, S.player.pos.x + 3, S.player.pos.z + 3, S.player.heading);
        S.car = car;
        S.player.pos.copy(car.pos);
        dom['garage-panel'].classList.add('hidden');
        ctx.api.toast(`Spawned your ${rec.kind}.`);
      });
      for (const t of TUNE_DEFS) {
        const b = document.createElement('button');
        b.className = 'garage-tune';
        b.type = 'button';
        b.textContent = `${t.label} ($${t.cost})`;
        b.addEventListener('click', () => {
          if (S.cash < t.cost) { ctx.api.toast('Not enough cash.'); return; }
          S.cash -= t.cost;
          if (t.key === 'paint') {
            const cur = PAINTS.indexOf(rec.tune.paint);
            rec.tune.paint = PAINTS[(cur + 1) % PAINTS.length];
          } else {
            rec.tune[t.key] = (rec.tune[t.key] || 0) + 1;
          }
          ctx.api.toast(`${rec.kind} tuned: ${t.label}`);
          buildPanel();
        });
        row.appendChild(b);
      }
      list.appendChild(row);
    });
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (!input.wasPressed('KeyG')) return;
    const door = CONFIG.garageDoor;
    if (S.car) {
      const d = Math.hypot(S.car.pos.x - door.x, S.car.pos.z - door.z);
      if (d <= door.radius) {
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
        ctx.api.toast(`Stored the ${car.kind} in your garage.`);
      }
    } else {
      const d = Math.hypot(S.player.pos.x - door.x, S.player.pos.z - door.z);
      if (d <= door.radius) {
        buildPanel();
        dom['garage-panel'].classList.remove('hidden');
      }
    }
  });
  ctx.garageReady = true;
}
