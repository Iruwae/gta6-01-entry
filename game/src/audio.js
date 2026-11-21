// SOLMAR BAY — tiny WebAudio synth for UI blips, gunshots, reloads and
// cash. No audio files, no network. Silent if the browser has no audio.
export function init(ctx) {
  let ac = null;
  function context() {
    if (ac) return ac;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    } catch (e) {
      ac = null;
    }
    return ac;
  }
  function beep(freq, dur, type = 'square', gain = 0.08) {
    const c = context();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur);
    } catch (e) {}
  }
  ctx.api.audio = {
    blip() {
      beep(660, 0.07, 'sine', 0.05);
    },
    shot() {
      beep(160, 0.09, 'square', 0.1);
    },
    reload() {
      beep(440, 0.06, 'sine', 0.06);
      setTimeout(() => beep(520, 0.06, 'sine', 0.06), 90);
    },
    cash() {
      beep(880, 0.08, 'sine', 0.07);
      setTimeout(() => beep(1320, 0.12, 'sine', 0.07), 90);
    },
  };
  ctx.api.audioLoaded = true;
}

export default { init };
