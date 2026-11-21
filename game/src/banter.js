// Crew banter for SOLMAR BAY. Lena and Vic talk over the toast line
// while the player works; every line carries a speaker tag up front
// ("LENA: ..." / "VIC: ..."). A short cooldown keeps the crew from
// talking over each other. This module installs the director; crew.js
// installs its own right after, and that one is the live one.
export function makeBanterDirector(S, toast) {
  const lines = {
    raceWin: [
      ['LENA', 'Told you. Nobody outdrives us on this bay.'],
      ['LENA', 'That was clean. Vic is going to love this.'],
      ['VIC', 'Not bad, kid. The bay is starting to notice you.'],
    ],
    pickup: [
      ['LENA', 'Package is in the bag. Keep it smooth.'],
      ['VIC', 'Good hands. That is how you stay alive out here.'],
    ],
    heatUp: [
      ['LENA', 'Cops on us! Drive like you mean it!'],
      ['VIC', 'Heat is climbing. Lose them or pay for it.'],
    ],
  };
  const director = {
    _cooldown: 0,
    say(speaker, text) {
      if (director._cooldown > 0) return false;
      toast(`${speaker}: "${text}"`);
      director._cooldown = 9;
      return true;
    },
    raceWin() {
      const line = lines.raceWin[Math.floor(Math.random() * lines.raceWin.length)];
      return director.say(line[0], line[1]);
    },
    pickup() {
      const line = lines.pickup[Math.floor(Math.random() * lines.pickup.length)];
      return director.say(line[0], line[1]);
    },
    heatUp() {
      const line = lines.heatUp[Math.floor(Math.random() * lines.heatUp.length)];
      return director.say(line[0], line[1]);
    },
  };
  return director;
}

export function init(ctx) {
  ctx.state.banterDirector = makeBanterDirector(ctx.state, ctx.api.toast);
}
