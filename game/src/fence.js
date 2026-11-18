// SOLMAR BAY — fence.js
// FenceDirector: Vic's fence at the harbor. A stolen car is worth
// nothing sitting in a garage — Vic buys wheels, no questions, cash
// on the hood. Drive any stolen car into the fence yard at (110, 138),
// press V, and the car is gone and the money is yours. The price is
// the kind, not the condition: a sport car pays, a taxi barely does,
// and a cop car pays nothing at all — Vic does not touch PD steel,
// and he says so. Selling is the other half of the steal loop (the
// garage keeps, the fence cashes out), and it is wired to the same
// money the shop spends, so the economy is one circle: steal, sell,
// spend, repeat.
//
// Prices: sedan $300, sport $600, bike $250, pickup $450, taxi $200,
// van $350, police $0 (refused). A tuned car pays its upgrades back
// at half: engine +$250, armor +$200, NOS +$300. Respect +20 a sale.
// The yard is marked on the minimap with a gold V, and the hint line
// reminds the player when they are in a car near the yard.

import { S, saveGame } from './state.js';
import { CAR_NAMES } from './weapons.js';

const FENCE_POS = { x: 110, z: 138, r: 10, name: "Vic's Fence" };

const PRICES = {
  sedan: 300,
  sport: 600,
  bike: 250,
  pickup: 450,
  taxi: 200,
  van: 350,
  police: 0,
};

const TUNE_BACK = { engine: 250, armor: 200, nos: 300 };

// Wanted board: every day Vic wants three specific rides, and he pays
// a bonus on top of the fence price for a match. The board is seeded
// by the game day, so the whole bay chases the same three cars. A
// wanted car is a kind plus a colour — a gold sport car is not the
// same job as a red one, and Vic can tell from across the yard.
const WANTED_POOL = [
  { kind: 'sport', color: 0xf2c200, bonus: 400, label: 'Gold sport car' },
  { kind: 'sport', color: 0xd83a2e, bonus: 350, label: 'Sunset Red sport car' },
  { kind: 'sport', color: 0x2e6fd8, bonus: 350, label: 'Bay Blue sport car' },
  { kind: 'pickup', color: 0x8a6a42, bonus: 300, label: 'Desert pickup truck' },
  { kind: 'pickup', color: 0x2ed573, bonus: 300, label: 'Mint pickup truck' },
  { kind: 'bike', color: 0xcc2222, bonus: 250, label: 'Red street bike' },
  { kind: 'bike', color: 0x2ed573, bonus: 250, label: 'Mint street bike' },
  { kind: 'sedan', color: 0xf2f2f2, bonus: 200, label: 'Pearl sedan' },
  { kind: 'sedan', color: 0x222226, bonus: 200, label: 'Midnight sedan' },
  { kind: 'taxi', color: 0xf7c948, bonus: 150, label: 'Yellow cab' },
  { kind: 'van', color: 0x8899aa, bonus: 250, label: 'Grey cargo van' },
  { kind: 'van', color: 0x7e3fd8, bonus: 300, label: 'Vice Purple van' },
];

function boardSeed(day) {
  let h = 2166136261;
  const str = 'vic-wanted-' + day;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function boardRng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class FenceDirector {
  constructor(scene) {
    this.scene = scene;
    this.pos = FENCE_POS;
    this._hintT = 0;
    this._boardDay = -1;
    this.board = [];
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyV' || !S || S.mode !== 'playing') return;
      if (!this._near()) return;
      this.sellCurrent();
    });
  }

  // Roll the three wanted rides for the current game day.
  rollBoard(day) {
    const d = Math.max(1, Math.floor(day) || 1);
    if (d === this._boardDay) return;
    this._boardDay = d;
    const rng = boardRng(boardSeed(d));
    const deck = WANTED_POOL.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    this.board = deck.slice(0, 3);
    // A fresh board is news: Vic says so once, when the day turns.
    if (S && S.banterDirector) S.banterDirector.wantedBoard();
  }

  // The bonus for this exact car, or 0 when Vic is not looking for it.
  wantedBonus(car) {
    if (!car) return 0;
    const day = S ? (S.day || 1) : 1;
    this.rollBoard(day);
    for (const w of this.board) {
      if (w.kind === car.kind && w.color === car.color) return w.bonus;
    }
    return 0;
  }

  // Rows for the HUD / menu: what Vic wants today.
  boardRows() {
    const day = S ? (S.day || 1) : 1;
    this.rollBoard(day);
    return this.board.map((w) => ({ label: w.label, bonus: w.bonus }));
  }

  _near() {
    if (!S || !S.player) return false;
    return Math.hypot(S.player.pos.x - this.pos.x, S.player.pos.z - this.pos.z) <= this.pos.r;
  }

  priceFor(car) {
    if (!car) return 0;
    let price = PRICES[car.kind] || 150;
    if (car.tune) {
      for (const key of Object.keys(TUNE_BACK)) {
        if (car.tune[key]) price += TUNE_BACK[key];
      }
    }
    return price;
  }

  // Sell the car the player is sitting in. Returns the cash paid, or 0.
  sellCurrent() {
    const car = S && S.car;
    if (!car || car.dead) {
      if (S.hud && typeof S.hud.toast === 'function') {
        S.hud.toast("Vic's fence — bring a car to sell, on wheels.");
      }
      return 0;
    }
    if (car.kind === 'police') {
      if (S.hud && typeof S.hud.toast === 'function') {
        S.hud.toast('Vic: "A cop car? Are you out of your mind? Get that out of my yard."');
      }
      return 0;
    }
    const price = this.priceFor(car);
    const bonus = this.wantedBonus(car);
    const paid = price + bonus;
    const name = CAR_NAMES[car.kind] || car.kind.toUpperCase();
    if (S.player) S.player.exitCar();
    const ci = S.cars.indexOf(car);
    if (ci >= 0) S.cars.splice(ci, 1);
    car.remove();
    S.cash = (S.cash || 0) + paid;
    if (S.stats) {
      S.stats.fencesSold = (S.stats.fencesSold || 0) + 1;
      S.stats.cashEarned = (S.stats.cashEarned || 0) + paid;
    }
    if (S.respectDirector) S.respectDirector.fenceSale();
    saveGame();
    if (S.audio && typeof S.audio.purchase === 'function') S.audio.purchase();
    if (S.hud && typeof S.hud.toast === 'function') {
      S.hud.toast('Vic bought the ' + name + ' for $' + paid +
        (bonus > 0 ? ' — that one was on his wanted board, bonus $' + bonus + ' included' : '') +
        '. Cash: $' + Math.floor(S.cash) + '. No questions, no receipt.');
    }
    if (S.banterDirector) S.banterDirector.fenceSale();
    return paid;
  }

  update(dt) {
    if (!S || S.mode !== 'playing') return;
    this._hintT -= dt;
    if (this._near() && this._hintT <= 0) {
      this._hintT = 8;
      if (S.hud && typeof S.hud.toast === 'function') {
        const car = S.car;
        if (car && !car.dead) {
          const price = this.priceFor(car);
          S.hud.toast(price > 0
            ? "Vic's fence — press V to sell this " + (CAR_NAMES[car.kind] || 'car') + ' for $' + price + '.'
            : "Vic's fence — Vic does not buy cop cars.");
        } else {
          S.hud.toast("Vic's fence — bring a stolen car here and press V to sell it.");
        }
      }
    }
  }
}
