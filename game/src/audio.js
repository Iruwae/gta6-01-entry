// SOLMAR BAY — tiny WebAudio synth for UI blips, gunshots, reloads and
// cash. No audio files, no network. If the browser has no audio context,
// every call silently does nothing.
export function init(ctx) {
  let audioCtx = null;
  function ensure() {
    if (audioCtx) return audioCtx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    } catch (e) {
      audioCtx = null;
    }
    return audioCtx;
  }
  function blip(freq, dur, type, gain) {
    const ac = ensure();
    if (!ac) return;
    try {
      if (ac.state === 'suspended') ac.resume();
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain || 0.08, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + dur);
    } catch (e) { /* silent */ }
  }
  function noise(dur, gain) {
    const ac = ensure();
    if (!ac) return;
    try {
      if (ac.state === 'suspended') ac.resume();
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const g = ac.createGain();
      g.gain.value = gain || 0.15;
      src.connect(g);
      g.connect(ac.destination);
      src.start();
    } catch (e) { /* silent */ }
  }
  ctx.api.audio = {
    blip: () => blip(660, 0.08, 'sine', 0.06),
    shot: () => noise(0.12, 0.2),
    reload: () => { blip(330, 0.06, 'square', 0.05); setTimeout(() => blip(440, 0.06, 'square', 0.05), 90); },
    cash: () => { blip(880, 0.09, 'sine', 0.07); setTimeout(() => blip(1320, 0.12, 'sine', 0.07), 100); },
  };
}
