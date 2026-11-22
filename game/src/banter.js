// Crew banter: Lena and Vic talk over the toast line while the player
// works. Every line carries a speaker tag up front. A short cooldown
// keeps the crew from talking over each other.
// (crew.js installs the live director afterwards — banter loads just
// before crew so the crew module's director is the one that stays live.)
export function init(ctx) {
  const { state: S } = ctx;
  S.banterDirector = {
    _cooldown: 0,
    say(speaker, text) {
      if (S.banterDirector._cooldown > 0) return false;
      if (ctx.api.toast) ctx.api.toast(`${speaker}: "${text}"`);
      S.banterDirector._cooldown = 9;
      return true;
    },
    raceWin() {
      return S.banterDirector.say('LENA', "That was clean driving. Vic's gonna love this.");
    },
    pickup() {
      return S.banterDirector.say('LENA', 'Package secured. Now don\'t get cute with it.');
    },
    heatUp() {
      return S.banterDirector.say('VIC', 'You lit up the whole bay, kid. Cool it down.');
    },
  };
}

export default init;
