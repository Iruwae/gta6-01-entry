// SOLMAR BAY — crew banter. Lena and Vic talk over the toast line while
// the player works. Every line carries a speaker tag up front
// ("LENA: ..." / "VIC: ..."). A short cooldown keeps the crew from
// talking over each other. The director the game actually uses is the
// one crew.js installs (banter loads just before crew); this module
// makes sure a working director exists and fires contextual lines.
import { pick } from './random.js';

const LINES = {
  raceWin: ['LENA: "Told you. Nobody outdrives us on this bay."'],
  pickup: ['LENA: "Package secured. You make this look easy."'],
  heatUp: ['VIC: "You lit the whole bay up. Cool it down, kid."'],
};

export function init(ctx) {
  const S = ctx.state;
  if (!S.banterDirector) {
    S.banterDirector = {
      _cooldown: 0,
      say(speaker, text) {
        if (this._cooldown > 0) return false;
        if (ctx.api.toast) ctx.api.toast(`${speaker}: "${text}"`);
        this._cooldown = 9;
        return true;
      },
      raceWin() {
        return this.say('LENA', pick(LINES.raceWin).replace(/^LENA: "/, '').replace(/"$/, ''));
      },
      pickup() {
        return this.say('LENA', 'Package secured. You make this look easy.');
      },
      heatUp() {
        return this.say('VIC', 'You lit the whole bay up. Cool it down, kid.');
      },
    };
  }
  let lastPackages = S.stats.packages;
  let lastHeat = S.heat;
  ctx.updates.push(() => {
    if (S.stats.packages > lastPackages) {
      lastPackages = S.stats.packages;
      return; // side.js already fires the pickup line
    }
    lastPackages = S.stats.packages;
    if (S.heat >= 60 && lastHeat < 60 && S.banterDirector) {
      S.banterDirector.heatUp();
    }
    lastHeat = S.heat;
  });
  ctx.flags.banter = true;
}
