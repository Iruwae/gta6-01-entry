// The garage at Vic's yard. Drive a car to the garage door and press G
// to store it; press G on foot near the door to open the panel, where a
// stored car can be spawned back or tuned (engine, armor, paint, NOS —
// tuning changes perf() and is kept on the stored record).
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input, api, dom } = ctx;

  function nearDoor(x, z) {
    const dx = x - CONFIG.garageDoor.x;
    const dz = z - CONFIG.garageDoor.z;
    return dx * dx + dz * dz < CONFIG.garageDoor.radius * CONFIG.garageDoor.radius;
  }

  function storeCar() {
    const car = S.car;
    if (!car) return;
    const record = {
      kind: car.kind,
      tune: { ...car.tune },
      health: car.health,
      maxHealth: car.maxHealth,
      paint: car.tune.paint,
    };
    S.garageCars.push(record);
    const idx = S.cars.indexOf(car);
    if (idx >= 0) S.cars.splice(idx, 1);
    if (car.mesh) ctx.scene.remove(car.mesh);
    S.player.pos.set(car.pos.x + 2, 0, car.pos.z + 2);
    S.car = null;
    api.toast(`Stored the ${record.kind} in the garage.`);
  }

  function buildList() {
    dom.garageList.innerHTML = '';
    if (S.garageCars.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'garage-row';
      empty.textContent = 'No cars stored yet. Drive one to the door and press G.';
      dom.garageList.appendChild(empty);
      return;
    }
    S.garageCars.forEach((rec, i) => {
      const row = document.createElement('div');
      row.className = 'garage-row';
      const perf = (CONFIG.vehicleStats[rec.kind] || CONFIG.vehicleStats.sedan).perf
        + rec.tune.engine * 2 + rec.tune.nos * 4;
      row.innerHTML = `<span><b>${rec.kind.toUpperCase()}</b> — perf ${perf} · paint ${rec.tune.paint}</span>`;
      const spawn = document.createElement('button');
      spawn.className = 'garage-spawn';
      spawn.textContent = 'SPAWN';
      spawn.addEventListener('click', () => {
        const car = ctx.api.makeCar(rec.kind, CONFIG.garageDoor.x + 4, CONFIG.garageDoor.z, 0);
        car.tune = { ...rec.tune };
        car.health = rec.health;
        S.cars.push(car);
        S.garageCars.splice(i, 1);
        S.car = car;
        S.player.pos.copy(car.pos);
        dom.garagePanel.classList.add('hidden');
        api.toast(`Took the ${rec.kind} out of the garage.`);
      });
      row.appendChild(spawn);
      const tuneRow = document.createElement('div');
      tuneRow.className = 'garage-row';
      tuneRow.style.borderTop = 'none';
      const tuneBtns = [
        ['+ENGINE', () => { rec.tune.engine += 1; }],
        ['+ARMOR', () => { rec.tune.armor += 1; }],
        ['+NOS', () => { rec.tune.nos += 1; }],
        ['PAINT', () => { rec.tune.paint = rec.tune.paint === 'sunset' ? 'midnight' : 'sunset'; }],
      ];
      for (const [label, fn] of tuneBtns) {
        const b = document.createElement('button');
        b.className = 'tune-btn';
        b.textContent = label;
        b.addEventListener('click', () => {
          fn();
          api.toast(`${rec.kind} tuned: engine ${rec.tune.engine}, armor ${rec.tune.armor}, NOS ${rec.tune.nos}, paint ${rec.tune.paint}.`);
          buildList();
        });
        tuneRow.appendChild(b);
      }
      dom.garageList.appendChild(row);
      dom.garageList.appendChild(tuneRow);
    });
  }

  function openPanel() {
    buildList();
    dom.garagePanel.classList.remove('hidden');
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (!input.wasPressed('KeyG')) return;
    if (S.car) {
      if (nearDoor(S.car.pos.x, S.car.pos.z)) storeCar();
    } else if (nearDoor(S.player.pos.x, S.player.pos.z)) {
      openPanel();
    }
  });

  ctx.api.openGarage = openPanel;
}
