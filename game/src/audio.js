// SOLMAR BAY — tiny WebAudio synth: UI blips, gunshots, reloads, cash.
// No audio files, no network. Silent when the browser has no audio.
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

  function blip(freq, dur, type = 'square', vol = 0.08, slideTo = null) {
    const c = context();
    if (!c) return;
    try {
      if (c.state === 'suspended') void c.resume();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur);
    } catch (e) { /* audio is best-effort */ }
  }

  function noise(dur, vol = 0.12) {
    const c = context();
    if (!c) return;
    try {
      if (c.state === 'suspended') void c.resume();
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      src.connect(g);
      g.connect(c.destination);
      src.start();
    } catch (e) { /* audio is best-effort */ }
  }

  ctx.api.audio = (name) => {
    switch (name) {
      case 'shot':
        noise(0.09, 0.14);
        blip(160, 0.08, 'square', 0.06, 60);
        break;
      case 'reload':
        blip(700, 0.05, 'square', 0.05);
        setTimeout(() => blip(900, 0.05, 'square', 0.05), 120);
        break;
      case 'cash':
        blip(880, 0.09, 'sine', 0.08);
        setTimeout(() => blip(1320, 0.12, 'sine', 0.08), 90);
        break;
      case 'dry':
        blip(220, 0.04, 'square', 0.04);
        break;
      case 'blip':
      default:
        blip(520, 0.06, 'sine', 0.06);
        break;
    }
  };

  return {};
}

export default init;
