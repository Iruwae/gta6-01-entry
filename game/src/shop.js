// SOLMAR BAY — shop.js
// ShopDirector: the 24/7 MART at (-72, -66), on the garage forecourt
// strip. A real shop, not a sign: walk up, press F, buy with real
// money, and the effect lands immediately.
//
// Stock (prices in cash, all effects instant):
// - Ammo Box $40 — refills the equipped weapon's magazine.
// - Full Restock $120 — refills every magazine in the loadout.
// - Burger $15 — +25 HP (street food, street prices).
// - Medkit $60 — full HP.
// - Car Repair $100 — restores the driven car to full condition
//   (only while driving; the button is disabled on foot).
//
// The panel is a DOM overlay (built once, rows rebuilt on open). It
// closes itself when Marco walks away, and F toggles it while near.
// Every purchase checks the wallet first — no credit in Solmar Bay.

import { S } from './state.js';
import { CFG } from './config.js';

function $(id) {
  const el = document.getElementById(id);
  return el || null;
}

const SHOP_POS = { x: -72, z: -66, r: 7, name: '24/7 MART' };

const STOCK = [
  {
    id: 'ammo', name: 'Ammo Box', price: 40,
    desc: 'Refill the equipped weapon magazine',
    canBuy: () => !!S.player,
    apply: () => {
      const slot = S.player.loadout.current();
      slot.ammo = slot.def.mag;
      S.player.ammo = slot.ammo;
    },
  },
  {
    id: 'restock', name: 'Full Restock', price: 120,
    desc: 'Refill every magazine in the loadout',
    canBuy: () => !!S.player,
    apply: () => {
      for (const slot of S.player.loadout.slots) slot.ammo = slot.def.mag;
      S.player.ammo = S.player.loadout.current().ammo;
    },
  },
  {
    id: 'burger', name: 'Burger', price: 15,
    desc: '+25 HP — street food, street prices',
    canBuy: () => !!S.player && S.player.health < 100,
    apply: () => {
      if (S.player && typeof S.player.heal === 'function') S.player.heal(25);
      if (S.fx && typeof S.fx.healSparkle === 'function') S.fx.healSparkle(S.player.pos);
    },
  },
  {
    id: 'medkit', name: 'Medkit', price: 60,
    desc: 'Full HP, patched up on the spot',
    canBuy: () => !!S.player && S.player.health < 100,
    apply: () => {
      if (S.player && typeof S.player.heal === 'function') S.player.heal(100);
      if (S.fx && typeof S.fx.healSparkle === 'function') S.fx.healSparkle(S.player.pos);
    },
  },
  {
    id: 'repair', name: 'Car Repair', price: 100,
    desc: 'Restore the driven car to full condition',
    canBuy: () => !!S.car && !S.car.dead,
    apply: () => {
      S.car.health = S.car.maxHealth || 100;
      if (S.fx && typeof S.fx.burst === 'function') {
        S.fx.burst(S.car.pos, 0x7fd4ff, 18, 6, 0.7);
      }
    },
  },
  {
    id: 'coffee', name: 'Black Coffee', price: 10,
    desc: '+10 HP and a steady hand for the next job',
    canBuy: () => !!S.player && S.player.health < 100,
    apply: () => {
      if (S.player && typeof S.player.heal === 'function') S.player.heal(10);
    },
  },
  {
    id: 'vest', name: 'Kevlar Vest', price: 150,
    desc: 'One free hit — the next 25 damage is ignored',
    canBuy: () => !!S.player && !(S.player.armor || 0),
    apply: () => {
      if (S.player) S.player.armor = 25;
      if (S.hud && typeof S.hud.toast === 'function') S.hud.toast('Vest on — the next 25 damage bounces off.');
    },
  },
  {
    id: 'noscan', name: 'NOS Can', price: 80,
    desc: 'Refill the nitrous bottle of the driven car',
    canBuy: () => !!S.car && !S.car.dead && !!S.car.tune && !!S.car.tune.nos,
    apply: () => {
      if (S.car) S.car.nosCharge = 100;
      if (S.fx && typeof S.fx.burst === 'function') {
        S.fx.burst(S.car.pos, 0x2ed573, 14, 5, 0.6);
      }
    },
  },
  {
    id: 'spare', name: 'Spare Tire', price: 50,
    desc: 'Patch the driven car back to 60% condition',
    canBuy: () => !!S.car && !S.car.dead && S.car.health < (S.car.maxHealth || 100) * 0.6,
    apply: () => {
      if (S.car) S.car.health = Math.max(S.car.health, (S.car.maxHealth || 100) * 0.6);
    },
  },
];

export class ShopDirector {
  constructor() {
    this.pos = SHOP_POS;
    this.open = false;
    this._hintT = 0;
    this.elPanel = $('shop-panel');
    this.elItems = $('shop-items');
    this.elClose = $('shop-close');
    this.elCash = $('shop-cash');
    if (this.elClose) {
      this.elClose.addEventListener('click', () => this.close());
    }
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF' && S && S.mode === 'playing') {
        if (this.open) this.close();
        else if (this._near()) this.toggle();
      }
    });
  }

  _near() {
    if (!S || !S.player) return false;
    return Math.hypot(S.player.pos.x - this.pos.x, S.player.pos.z - this.pos.z) <= this.pos.r;
  }

  _buildRows() {
    if (!this.elItems) return;
    this.elItems.innerHTML = '';
    for (const item of STOCK) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      const name = document.createElement('span');
      name.className = 'shop-name';
      name.textContent = item.name;
      const desc = document.createElement('span');
      desc.className = 'shop-desc';
      desc.textContent = item.desc;
      const price = document.createElement('span');
      price.className = 'shop-price';
      price.textContent = '$' + item.price;
      const btn = document.createElement('button');
      btn.className = 'btn shop-buy';
      btn.textContent = 'BUY';
      const usable = item.canBuy();
      btn.disabled = !usable || (S.cash || 0) < item.price;
      if (!usable) btn.textContent = 'N/A';
      btn.addEventListener('click', () => this.buy(item));
      row.appendChild(name);
      row.appendChild(desc);
      row.appendChild(price);
      row.appendChild(btn);
      this.elItems.appendChild(row);
    }
    if (this.elCash) this.elCash.textContent = 'Cash: $' + Math.floor(S.cash || 0);
  }

  buy(item) {
    if (!item) return;
    if ((S.cash || 0) < item.price) {
      if (S.hud && typeof S.hud.toast === 'function') S.hud.toast('Not enough cash for the ' + item.name + '.');
      return;
    }
    if (!item.canBuy()) {
      if (S.hud && typeof S.hud.toast === 'function') S.hud.toast('You cannot use that right now.');
      return;
    }
    S.cash -= item.price;
    item.apply();
    if (S.audio && typeof S.audio.purchase === 'function') S.audio.purchase();
    if (S.hud && typeof S.hud.toast === 'function') {
      S.hud.toast('Bought ' + item.name + ' — $' + item.price + '. Cash: $' + Math.floor(S.cash) + '.');
    }
    if (S.banterDirector) S.banterDirector.shopBuy();
    this._buildRows(); // refresh affordability + wallet display
  }

  toggle() {
    if (this.open) { this.close(); return; }
    this.open = true;
    this._buildRows();
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
      // Walked away from the counter: the shop closes itself.
      if (!this._near()) this.close();
      else if (this.elCash) this.elCash.textContent = 'Cash: $' + Math.floor(S.cash || 0);
      return;
    }
    if (this._near() && this._hintT <= 0) {
      this._hintT = 8;
      if (S.hud && typeof S.hud.toast === 'function') {
        S.hud.toast('24/7 MART — press F to shop (ammo, food, car repair).');
      }
    }
  }
}
