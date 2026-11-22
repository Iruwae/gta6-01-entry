// Tiny WebAudio synth: UI blips, gunshots, reloads, cash. No audio files,
// no network. If the browser has no audio context, every call is silent.
export function init(ctx) {
  let ac = null;
  function ensure() {
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
  function tone(freq, dur, type = 'sine', gain = 0.08) {
    const c = ensure();
    if (!c) return;
    try {
      if (c.state === 'suspended') c.resume().catch(() => {});
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      osc.connect(g);
      g.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + dur);
    } catch (e) {
      /* silent */
    }
  }
  ctx.audio = {
    blip() {
      tone(660, 0.08, 'square', 0.04);
    },
    shot() {
      tone(140, 0.12, 'sawtooth', 0.12);
    },
    reload() {
      tone(440, 0.06, 'square', 0.05);
      setTimeout(() => tone(520, 0.06, 'square', 0.05), 90);
    },
    cash() {
      tone(880, 0.09, 'sine', 0.07);
      setTimeout(() => tone(1320, 0.12, 'sine', 0.07), 90);
    },
  };
}

export default init;
