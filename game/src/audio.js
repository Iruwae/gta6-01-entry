// audio.js — synthesized sound, no audio files (round-5 rebuild, B2).
// A tiny WebAudio rig: an engine hum that follows speed and a short
// jingle arpeggio whenever the radio station changes. Everything is
// wrapped in try/catch and the context is created lazily on the first
// user gesture, so a missing AudioContext can never crash the game.

const JINGLE_NOTES = {
  0: [523.25, 659.25, 783.99, 1046.5],
  1: [440.0, 554.37, 659.25, 880.0],
  2: [466.16, 587.33, 698.46, 932.33],
  3: [392.0, 493.88, 587.33, 783.99],
  4: [329.63, 415.3, 493.88, 659.25],
  5: [261.63, 329.63, 392.0, 523.25],
};

export function init(S) {
  const audio = {
    ctx: null,
    master: null,
    engineOsc: null,
    engineOsc2: null,
    engineGain: null,
    enabled: true,

    ensure() {
      if (audio.ctx) {
        if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
        return true;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        audio.ctx = new AC();
        audio.master = audio.ctx.createGain();
        audio.master.gain.value = 0.14;
        audio.master.connect(audio.ctx.destination);
        const filter = audio.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        filter.connect(audio.master);
        audio.engineGain = audio.ctx.createGain();
        audio.engineGain.gain.value = 0.0;
        audio.engineGain.connect(filter);
        audio.engineOsc = audio.ctx.createOscillator();
        audio.engineOsc.type = 'sawtooth';
        audio.engineOsc.frequency.value = 55;
        audio.engineOsc.connect(audio.engineGain);
        audio.engineOsc.start();
        audio.engineOsc2 = audio.ctx.createOscillator();
        audio.engineOsc2.type = 'square';
        audio.engineOsc2.frequency.value = 110;
        audio.engineOsc2.connect(audio.engineGain);
        audio.engineOsc2.start();
        return true;
      } catch (e) {
        audio.ctx = null;
        return false;
      }
    },

    setSpeed(v) {
      try {
        if (!audio.ctx || !audio.engineOsc) return;
        const speed = Math.max(0, v || 0);
        const f = 52 + speed * 2.4;
        audio.engineOsc.frequency.setTargetAtTime(f, audio.ctx.currentTime, 0.08);
        if (audio.engineOsc2) {
          audio.engineOsc2.frequency.setTargetAtTime(f * 2, audio.ctx.currentTime, 0.08);
        }
        if (audio.engineGain) {
          const g = S.car ? 0.05 + Math.min(0.1, speed * 0.002) : 0.0;
          audio.engineGain.gain.setTargetAtTime(g, audio.ctx.currentTime, 0.1);
        }
      } catch (e) { /* synth is best-effort */ }
    },

    blip(freq, when, dur) {
      try {
        if (!audio.ctx || !audio.master) return;
        const o = audio.ctx.createOscillator();
        const g = audio.ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(0.22, when + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        o.connect(g);
        g.connect(audio.master);
        o.start(when);
        o.stop(when + dur + 0.05);
      } catch (e) { /* synth is best-effort */ }
    },

    jingle(station) {
      try {
        if (!audio.ensure()) return;
        const notes = JINGLE_NOTES[station] || JINGLE_NOTES[0];
        const t0 = audio.ctx.currentTime + 0.03;
        notes.forEach((n, i) => audio.blip(n, t0 + i * 0.09, 0.16));
      } catch (e) { /* synth is best-effort */ }
    },

    update(dt) {
      try {
        if (!audio.ctx) return;
        const v = S.car ? (S.car.speed || 0) : 0;
        audio.setSpeed(v);
      } catch (e) { /* synth is best-effort */ }
    },
  };

  S.audio = audio;

  // Autoplay policy: the context may only start after a gesture.
  const wake = () => { try { audio.ensure(); } catch (e) {} };
  window.addEventListener('keydown', wake);
  window.addEventListener('pointerdown', wake);

  setInterval(() => {
    try { audio.update(0.2); } catch (e) { /* never break the page */ }
  }, 200);
  if (Array.isArray(S._moduleTicks)) S._moduleTicks.push((dt) => audio.update(dt));

  return audio;
}

export default init;
