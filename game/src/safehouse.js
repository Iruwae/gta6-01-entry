// SOLMAR BAY — safehouse.js
// SafehouseDirector: the Sunset Motel at (120, -120), on the north-east
// road crossing (the motel courtyard hideout corner). A real rest stop:
//
// - Press H inside the radius: HP restores to full, heat sheds 60 (two
//   stars), and the game saves to localStorage — all three at once.
// - 30 s rest cooldown so the motel is a breather, not a button mash.
// - Resting when already full and cold does nothing (and says so).
// - The motel is marked 'S' on the minimap (hud.js reads this position).
//
// Resting is the safe way to cool off: no money changes hands, but it
// costs time — the PD keeps patrolling while Marco sleeps it off.

import { S, saveGame } from './state.js';

function $(id) {
  const el = document.getElementById(id);
  return el || null;
}

const MOTEL_POS = { x: 120, z: -120, r: 8, name: 'Sunset Motel' };
const REST_COOLDOWN = 30;
const REST_HEAT_SHED = 60;

export class SafehouseDirector {
  constructor() {
    this.pos = MOTEL_POS;
    this.cooldown = 0;
    this.rests = 0; // rests taken this run (menu stats)
    this._hintT = 0;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH' && S && S.mode === 'playing' && this._near()) {
        this.rest();
      }
    });
  }

  _near() {
    if (!S || !S.player) return false;
    return Math.hypot(S.player.pos.x - this.pos.x, S.player.pos.z - this.pos.z) <= this.pos.r;
  }

  rest() {
    if (!S || !S.player) return;
    if (this.cooldown > 0) {
      if (S.hud && typeof S.hud.toast === 'function') {
        S.hud.toast('The motel room needs ' + Math.ceil(this.cooldown) + 's to air out.');
      }
      return;
    }
    const hpMissing = 100 - (S.player.health || 0);
    const heatNow = S.heat || 0;
    if (hpMissing <= 0 && heatNow <= 0) {
      if (S.hud && typeof S.hud.toast === 'function') {
        S.hud.toast('Already rested — full HP, no heat. The city is yours.');
      }
      return;
    }
    S.player.heal(100);
    S.heat = Math.max(0, heatNow - REST_HEAT_SHED);
    this.cooldown = REST_COOLDOWN;
    this.rests++;
    saveGame();
    if (S.fx && typeof S.fx.healSparkle === 'function') S.fx.healSparkle(S.player.pos);
    if (S.audio && typeof S.audio.rest === 'function') S.audio.rest();
    if (S.hud && typeof S.hud.toast === 'function') {
      S.hud.toast('Rested at the Sunset Motel — HP full, heat down two stars, game saved.');
    }
    if (S.banterDirector) S.banterDirector.safehouse();
  }

  update(dt) {
    if (!S || S.mode !== 'playing') return;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this._hintT -= dt;
    if (this._near() && this._hintT <= 0) {
      this._hintT = 10;
      if (S.hud && typeof S.hud.toast === 'function') {
        S.hud.toast('Sunset Motel safehouse — press H to rest (heal + cool off + save).');
      }
    }
  }
}
