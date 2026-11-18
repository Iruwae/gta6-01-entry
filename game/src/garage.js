// SOLMAR BAY — garage.js
// GarageDirector: the Bayline Garage at (-90, -66) — Lena's garage is
// not just a mission prop, it is Marco's garage. Three real systems in
// one building:
//
// - Store: drive any car into the garage zone and press G — the car is
//   lifted off the street and stored as Marco's (a stolen car becomes
//   owned the moment it is stored). Four bays, first come first served.
// - Switch: open the garage panel (G on foot) and SPAWN any stored car
//   at the garage door, tuned exactly as you left it.
// - Upgrade: Engine $500 (+20% top speed, +15% accel), Armor $400
//   (+50 max HP, healed to full), NOS $600 (hold Shift for a nitrous
//   surge), Paint $100 (cycle the paint job). Upgrades live on the
//   stored record and are applied when the car spawns.
//
// Everything is paid from S.cash and everything persists in the save
// shape (garageCars) — the garage is a second wallet for the car
// collection, not a menu skin.

import { S, saveGame } from './state.js';
import { Car } from './vehicles.js';
import { CAR_NAMES } from './weapons.js';

function $(id) {
  const el = document.getElementById(id);
  return el || null;
}

const GARAGE_POS = { x: -90, z: -66, r: 12, name: 'Bayline Garage' };
const MAX_BAYS = 4;

const PAINTS = [
  { name: 'Sunset Red', color: 0xd83a2e },
  { name: 'Bay Blue', color: 0x2e6fd8 },
  { name: 'Taxi Gold', color: 0xf2c200 },
  { name: 'Mint', color: 0x2ed573 },
  { name: 'Pearl', color: 0xf2f2f2 },
  { name: 'Midnight', color: 0x222226 },
  { name: 'Ember Orange', color: 0xd86a1e },
  { name: 'Vice Purple', color: 0x7e3fd8 },
];

const UPGRADES = [
  {
    id: 'engine', name: 'Engine', price: 500, desc: '+20% top speed',
    has: (t) => !!t.engine,
    apply: (t) => { t.engine = true; },
  },
  {
    id: 'armor', name: 'Armor', price: 400, desc: '+50 max HP',
    has: (t) => !!t.armor,
    apply: (t) => { t.armor = true; },
  },
  {
    id: 'nos', name: 'NOS', price: 600, desc: 'Shift = nitrous surge',
    has: (t) => !!t.nos,
    apply: (t) => { t.nos = true; },
  },
  {
    id: 'paint', name: 'Paint', price: 100, desc: 'Next paint job',
    has: () => false, // paint is repeatable — it cycles, never "owned"
    apply: (t) => { t.paint = ((t.paint || 0) + 1) % PAINTS.length; },
  },
];

export class GarageDirector {
  constructor(scene) {
    this.scene = scene;
    this.pos = GARAGE_POS;
    this.open = false;
    this._hintT = 0;
    this.elPanel = $('garage-panel');
    this.elList = $('garage-list');
    this.elClose = $('garage-close');
    if (this.elClose) {
      this.elClose.addEventListener('click', () => this.close());
    }
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyG' || !S || S.mode !== 'playing') return;
      if (!this._near()) return;
      if (S.car && !S.car.dead) this.storeCurrent();
      else if (this.open) this.close();
      else this.toggle();
    });
  }

  _near() {
    if (!S || !S.player) return false;
    return Math.hypot(S.player.pos.x - this.pos.x, S.player.pos.z - this.pos.z) <= this.pos.r;
  }

  _cars() {
    if (!S.garageCars) S.garageCars = [];
    return S.garageCars;
  }

  // Drive in and press G: the car becomes Marco's, tuned or not.
  storeCurrent() {
    const car = S.car;
    if (!car || car.dead) return;
    const stored = this._cars();
    if (stored.length >= MAX_BAYS) {
      if (S.hud && typeof S.hud.toast === 'function') {
        S.hud.toast('Garage full — 4 bays, all taken. Sell your way out first.');
      }
      return;
    }
    const record = {
      kind: car.kind,
      color: car.color,
      health: Math.max(1, Math.round(car.health || 100)),
      maxHealth: car.maxHealth || 100,
      tune: { ...(car.tune || {}), paint: 0 },
    };
    // Keep the paint index pointing at the car's current colour when it
    // is one of the palette colours; otherwise start at Sunset Red.
    const idx = PAINTS.findIndex((p) => p.color === car.color);
    record.tune.paint = idx >= 0 ? idx : 0;
    if (S.player) S.player.exitCar();
    const ci = S.cars.indexOf(car);
    if (ci >= 0) S.cars.splice(ci, 1);
    car.remove();
    stored.push(record);
    saveGame();
    if (S.audio && typeof S.audio.purchase === 'function') S.audio.purchase();
    if (S.hud && typeof S.hud.toast === 'function') {
      S.hud.toast('Stored the ' + (CAR_NAMES[car.kind] || 'car') + ' — it is yours now. (' + stored.length + '/' + MAX_BAYS + ' bays)');
    }
    if (S.banterDirector) S.banterDirector.garageStore();
  }

  // Spawn a stored car at the garage door, tuned as recorded.
  spawnStored(i) {
    const stored = this._cars();
    const rec = stored[i];
    if (!rec) return;
    if (S.car) {
      if (S.hud && typeof S.hud.toast === 'function') S.hud.toast('Get out of your current car first.');
      return;
    }
    const paint = PAINTS[(rec.tune && rec.tune.paint) || 0] || PAINTS[0];
    const car = new Car(this.scene, {
      x: this.pos.x, z: this.pos.z + 8, heading: Math.PI / 2,
      color: paint.color, kind: rec.kind,
    });
    car.tune = { ...(rec.tune || {}) };
    car.maxHealth = (rec.maxHealth || 100) + (car.tune.armor ? 50 : 0);
    car.health = car.maxHealth;
    car.nosCharge = 100;
    car.parked = true;
    if (S.cars) S.cars.push(car);
    Object.assign(car, { stolen: true }); // a stored car is already Marco's — taking it out is not a theft
    if (S.player) S.player.enterCar(car);
    if (S.hud && typeof S.hud.toast === 'function') {
      S.hud.toast('Your ' + (CAR_NAMES[rec.kind] || 'car') + ' is ready — ' + paint.name +
        (car.tune.engine ? ', tuned engine' : '') + (car.tune.nos ? ', NOS fitted' : '') + '.');
    }
    if (S.audio && typeof S.audio.blip === 'function') S.audio.blip();
    this.close();
  }

  buyUpgrade(i, up) {
    const stored = this._cars();
    const rec = stored[i];
    if (!rec) return;
    if ((S.cash || 0) < up.price) {
      if (S.hud && typeof S.hud.toast === 'function') {
        S.hud.toast('Not enough cash for ' + up.name + ' ($' + up.price + ').');
      }
      return;
    }
    if (!rec.tune) rec.tune = {};
    if (up.id !== 'paint' && up.has(rec.tune)) return;
    S.cash -= up.price;
    up.apply(rec.tune);
    if (up.id === 'armor') rec.maxHealth = (rec.maxHealth || 100) + 50;
    saveGame();
    if (S.audio && typeof S.audio.purchase === 'function') S.audio.purchase();
    if (S.hud && typeof S.hud.toast === 'function') {
      S.hud.toast(up.name + ' fitted — $' + up.price + '. Cash: $' + Math.floor(S.cash) + '.');
    }
    if (S.banterDirector) S.banterDirector.garageTune();
    this._buildList();
  }

  _buildList() {
    if (!this.elList) return;
    this.elList.innerHTML = '';
    const stored = this._cars();
    if (stored.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'garage-empty';
      empty.textContent = 'No cars stored yet — drive one into the garage and press G.';
      this.elList.appendChild(empty);
      return;
    }
    stored.forEach((rec, i) => {
      const paint = PAINTS[(rec.tune && rec.tune.paint) || 0] || PAINTS[0];
      const card = document.createElement('div');
      card.className = 'garage-card';
      const title = document.createElement('div');
      title.className = 'garage-title';
      title.textContent = (CAR_NAMES[rec.kind] || rec.kind.toUpperCase()) + ' · ' + paint.name;
      const cond = document.createElement('div');
      cond.className = 'garage-cond';
      cond.textContent = 'Condition ' + Math.round(rec.health || 100) + '/' + (rec.maxHealth || 100) +
        (rec.tune && rec.tune.engine ? ' · Tuned engine' : '') +
        (rec.tune && rec.tune.nos ? ' · NOS' : '');
      const spawnBtn = document.createElement('button');
      spawnBtn.className = 'btn garage-spawn';
      spawnBtn.textContent = 'SPAWN';
      spawnBtn.addEventListener('click', () => this.spawnStored(i));
      card.appendChild(title);
      card.appendChild(cond);
      card.appendChild(spawnBtn);
      for (const up of UPGRADES) {
        const owned = up.id !== 'paint' && rec.tune && up.has(rec.tune);
        const btn = document.createElement('button');
        btn.className = 'btn ghost garage-up';
        btn.textContent = up.name + ' $' + up.price + (owned ? ' ✓' : '');
        btn.disabled = owned || (S.cash || 0) < up.price;
        btn.title = up.desc;
        btn.addEventListener('click', () => this.buyUpgrade(i, up));
        card.appendChild(btn);
      }
      this.elList.appendChild(card);
    });
  }

  toggle() {
    if (this.open) { this.close(); return; }
    this.open = true;
    this._buildList();
    if (this.elPanel) this.elPanel.classList.remove('hidden');
  }

  close() {
    this.open = false;
    if (this.elPanel) this.elPanel.classList.add('hidden');
  }

  update(dt) {
    if (!S || S.mode !== 'playing') return;
    this._hintT -= dt;
    if (this.open) {
      if (!this._near()) this.close();
      return;
    }
    if (this._near() && this._hintT <= 0) {
      this._hintT = 8;
      if (S.hud && typeof S.hud.toast === 'function') {
        const inCar = !!S.car;
        S.hud.toast(inCar
          ? 'Bayline Garage — press G to store this car.'
          : 'Bayline Garage — press G to open your collection.');
      }
    }
  }
}
