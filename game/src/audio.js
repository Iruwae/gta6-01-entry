// Tiny WebAudio synth for UI blips, gunshots, reloads and cash.
// No audio files, no network. If the browser has no audio context,
// every call silently does nothing.
export function init(ctx) {
  let ac = null;
  function ensure() {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (e) {
      return null;
    }
  }
  function blip(freq, dur, type = 'square', vol = 0.08) {
    const c = ensure();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur);
    } catch (e) { /* silent */ }
  }
  ctx.api.audio = {
    blip: () => blip(660, 0.07),
    shot: () => blip(180, 0.12, 'sawtooth', 0.12),
    reload: () => blip(440, 0.09, 'triangle', 0.1),
    cash: () => { blip(880, 0.08); setTimeout(() => blip(1320, 0.1), 70); },
  };
}
