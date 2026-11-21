// banter.js — SOLMAR BAY crew banter.
// Lena and Vic talk over the toast line while the player works. Every
// line carries a speaker tag up front ("LENA: ..." / "VIC: ..."). A short
// cooldown keeps the crew from talking over each other.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const $ = (id) => dom[id] || document.getElementById(id);

  const LINES = {
    raceWin: [
      'LENA: "That was clean — Vic is going to hear about this one."',
      'LENA: "Told you my lines were faster. Pay up, champ."',
      'VIC: "Now that is how you drive a getaway. Beautiful."',
    ],
    taxiDone: [
      'LENA: "Five stars, easy. The bay loves a smooth driver."',
      'VIC: "Fare money is honest money. Keep stacking it."',
    ],
    missionDone: [
      'LENA: "Job done, no scratches. We are getting good at this."',
      'VIC: "That is how you build a name in Solmar Bay."',
    ],
    packageFound: [
      'LENA: "Nice — another stash tucked away. Keep looking."',
      'VIC: "The bay hides its money well. You found some of it."',
    ],
    greeting: [
      'LENA: "Sun is down, streets are ours. What are we doing first?"',
      'VIC: "Solmar Bay does not wait for anyone, kid. Move."',
    ],
  };

  function toast(msg) {
    if (ctx.api && ctx.api.toast) { ctx.api.toast(msg, 5000); return; }
    const el = $('toast');
    if (el) el.textContent = msg;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  const director = {
    _cooldown: 0,
    raceWin() {
      if (this._cooldown > 0) return;
      this._cooldown = 9;
      toast(pick(LINES.raceWin));
    },
    taxiDone() {
      if (this._cooldown > 0) return;
      this._cooldown = 9;
      toast(pick(LINES.taxiDone));
    },
    missionDone() {
      if (this._cooldown > 0) return;
      this._cooldown = 9;
      toast(pick(LINES.missionDone));
    },
    packageFound() {
      if (this._cooldown > 0) return;
      this._cooldown = 9;
      toast(pick(LINES.packageFound));
    },
    greeting() {
      if (this._cooldown > 0) return;
      this._cooldown = 9;
      toast(pick(LINES.greeting));
    },
    say(speaker, text) {
      if (this._cooldown > 0) return;
      this._cooldown = 9;
      toast(speaker + ': "' + text + '"');
    },
  };

  S.banterDirector = director;
  ctx.api = ctx.api || {};
  ctx.api.banter = director;

  ctx.updates = ctx.updates || [];
  ctx.updates.push((dt) => {
    if (director._cooldown > 0) {
      director._cooldown = Math.max(0, director._cooldown - (dt || 0));
    }
  });
}
