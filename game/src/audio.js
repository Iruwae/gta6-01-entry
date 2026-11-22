// SOLMAR BAY — tiny WebAudio synth for UI blips, gunshots, reloads and
// cash. No audio files, no network. If the browser has no audio context,
// every call silently does nothing.
export function init(ctx) {
  let audioCtx = null;
  function ac() {
    if (audioCtx) return audioCtx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    } catch (e) {
      return null;
    }
    return audioCtx;
  }
  function blip(freq, dur, type, vol) {
    const c = ac();
    if (!c) return;
    try {
      if (c.state === 'suspended') c.resume();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.06, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur);
    } catch (e) {
      // Audio is decoration; never break the game over it.
    }
  }
  ctx.api.audio = {
    blip: () => blip(660, 0.07, 'square', 0.05),
    shot: () => blip(160, 0.09, 'sawtooth', 0.09),
    reload: () => blip(440, 0.12, 'triangle', 0.06),
    cash: () => {
      blip(880, 0.08, 'sine', 0.07);
      setTimeout(() => blip(1320, 0.12, 'sine', 0.07), 90);
    },
  };
  ctx.flags.audio = true;
}
