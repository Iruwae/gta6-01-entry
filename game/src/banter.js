// banter.js — crew chatter toasts (round-5 rebuild, builder B2).
// S.banterDirector = { _cooldown, raceWin(), fenceSale(), missionWin(),
//   say(speaker, text), update(dt) }.
// Lines are speaker-tagged (`LENA: "..."`) and guarded by a 9-second
// cooldown that ticks down every frame, so the crew talks — but never
// talks over itself.

const COOLDOWN = 9;

const LENA_LINES = [
  'That was clean driving, bro. Textbook.',
  'Did you see their faces? Priceless.',
  'Told you we had this. Told you!',
  'Smooth. Real smooth. Vic is going to love this one.',
];
const VIC_LINES = [
  'Ha! The kid delivers again. Beautiful.',
  'That is how you run Solmar, my friend.',
  'Money in hand, no cops in sight. Perfect.',
];

export function init(S) {
  let lineIndex = 0;
  let hideTimer = 0;

  const director = {
    _cooldown: 0,

    say(speaker, text) {
      const toast = document.getElementById('toast');
      if (!toast) return false;
      toast.textContent = speaker + ': "' + text + '"';
      toast.classList.remove('hidden');
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => toast.classList.add('hidden'), 8000);
      return true;
    },

    raceWin() {
      if (director._cooldown > 0) return false;
      director._cooldown = COOLDOWN;
      const line = LENA_LINES[lineIndex % LENA_LINES.length];
      lineIndex += 1;
      return director.say('LENA', line);
    },

    fenceSale() {
      if (director._cooldown > 0) return false;
      director._cooldown = COOLDOWN;
      const line = VIC_LINES[lineIndex % VIC_LINES.length];
      lineIndex += 1;
      return director.say('VIC', line);
    },

    missionWin() {
      if (director._cooldown > 0) return false;
      director._cooldown = COOLDOWN;
      const line = LENA_LINES[lineIndex % LENA_LINES.length];
      lineIndex += 1;
      return director.say('LENA', line);
    },

    update(dt) {
      if (director._cooldown > 0) {
        director._cooldown = Math.max(0, director._cooldown - (dt || 0.12));
      }
    },
  };

  S.banterDirector = director;

  setInterval(() => {
    try { director.update(0.12); } catch (e) { /* never break the page */ }
  }, 120);
  if (Array.isArray(S._moduleTicks)) S._moduleTicks.push((dt) => director.update(dt));

  return director;
}

export default init;
