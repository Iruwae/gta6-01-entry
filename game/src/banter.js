// Solmar Bay — crew banter (round 7 rebuild).
// Speaker-tagged one-liners from Lena, Vic, Marco and the street,
// shown in the toast area as e.g. LENA: "...". A 9 game-second
// cooldown keeps the chatter from stacking; direct calls (race
// wins, mission beats) can force a line through.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};

  const LINES = {
    raceWin: [
      { speaker: 'LENA', text: 'Told you — nobody outruns us on the Strip.' },
      { speaker: 'LENA', text: 'That was clean. Vic is going to love this one.' },
      { speaker: 'VIC', text: 'You drive like that, the whole bay hears about it.' },
      { speaker: 'MARCO', text: 'I had money on you. Easy money, too.' },
    ],
    raceLose: [
      { speaker: 'LENA', text: 'Shake it off. We go again, and this time we win.' },
      { speaker: 'MARCO', text: 'That one stung. Do not let it happen twice.' },
    ],
    taxiDone: [
      { speaker: 'LENA', text: 'Fare delivered, cash in hand. The bay pays when you move.' },
      { speaker: 'VIC', text: 'Small money, steady money. Keep the wheels turning.' },
    ],
    packageFound: [
      { speaker: 'LENA', text: 'Nice spot. That package was just sitting there for us.' },
      { speaker: 'MARCO', text: 'Fifty bucks for a pickup. I will take that all day.' },
    ],
    missionStart: [
      { speaker: 'VIC', text: 'Listen close. This job pays, but only if you keep your head.' },
      { speaker: 'LENA', text: 'I am riding with you on this one. Do not make me regret it.' },
    ],
    missionComplete: [
      { speaker: 'VIC', text: 'Job done. The money is yours, and so is my respect.' },
      { speaker: 'LENA', text: 'We did that. The bay is starting to know our names.' },
    ],
    heatUp: [
      { speaker: 'LENA', text: 'Cops are on us! Drive like you mean it!' },
      { speaker: 'VIC', text: 'Lay low or lose them — your call, but make it fast.' },
    ],
    heatDown: [
      { speaker: 'LENA', text: 'We are clear. Breathe. The bay is ours again.' },
      { speaker: 'MARCO', text: 'Clean getaway. That is how you stay free out here.' },
    ],
    fence: [
      { speaker: 'VIC', text: 'Pleasure doing business. Bring me the next one.' },
      { speaker: 'LENA', text: 'Sold. That car was never ours anyway.' },
    ],
    idle: [
      { speaker: 'LENA', text: 'Sun is going down. The bay looks good tonight, huh?' },
      { speaker: 'LENA', text: 'Vic has work if you want it. Just say the word.' },
      { speaker: 'MARCO', text: 'Heard the Strip is crawling tonight. Could be fun.' },
      { speaker: 'VIC', text: 'A quiet bay is a bay waiting to be taken. Keep moving.' },
      { speaker: 'PED', text: 'You see that sunset? The bay never misses.' },
    ],
  };

  function toastEl() {
    return dom.toast || document.getElementById('toast');
  }

  let toastTimer = 0;
  let idleTimer = 18;

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  const director = {
    _cooldown: 0,
    lines: LINES,
    show(speaker, text, force) {
      if (!force && this._cooldown > 0) return false;
      const el = toastEl();
      if (!el) return false;
      el.textContent = speaker + ': "' + text + '"';
      if (el.classList) el.classList.remove('hidden');
      this._cooldown = 9;
      toastTimer = 6;
      return true;
    },
    say(speaker, text, force) {
      return this.show(speaker, text, force);
    },
    line(kind, force) {
      const list = LINES[kind] || LINES.idle;
      const l = pick(list);
      return this.show(l.speaker, l.text, force);
    },
    raceWin() { return this.line('raceWin'); },
    raceLose() { return this.line('raceLose'); },
    taxiDone() { return this.line('taxiDone'); },
    packageFound() { return this.line('packageFound'); },
    missionStart() { return this.line('missionStart'); },
    missionComplete() { return this.line('missionComplete'); },
    heatUp() { return this.line('heatUp'); },
    heatDown() { return this.line('heatDown'); },
    fenceSold() { return this.line('fence'); },
    idle() { return this.line('idle'); },
    random() { return this.line('idle'); },
  };

  S.banterDirector = director;
  ctx.api.banter = director;
  ctx.api.banterDirector = director;

  ctx.updates.push((dt) => {
    if (director._cooldown > 0) director._cooldown = Math.max(0, director._cooldown - dt);
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) {
        const el = toastEl();
        if (el && el.classList) el.classList.add('hidden');
      }
    }
    // Occasional idle chatter while playing, never during cutscenes.
    idleTimer -= dt;
    if (idleTimer <= 0) {
      idleTimer = 22 + Math.random() * 14;
      if (S.mode === 'playing' && !S.cutscene) director.idle();
    }
  });
}
