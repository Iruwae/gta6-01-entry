// Tiny WebAudio synth for SOLMAR BAY: UI blips, gunshots, reloads and
// cash. No audio files, no network. If the browser has no audio
// context, every call silently does nothing.
export function init(ctx) {
  let audioCtx = null;
  let muted = false;

  function ac() {
    if (muted) return null;
    if (!audioCtx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) {
          muted = true;
          return null;
        }
        audioCtx = new AC();
      } catch (e) {
        muted = true;
        return null;
      }
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function blip(freq, dur, type = 'sine', gain = 0.08) {
    const c = ac();
    if (!c) return;
    try {
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
    } catch (e) { /* never let sound break the game */ }
  }

  function noise(dur, gain = 0.15) {
    const c = ac();
    if (!c) return;
    try {
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = c.createGain();
      g.gain.value = gain;
      src.connect(g);
      g.connect(c.destination);
      src.start();
    } catch (e) { /* never let sound break the game */ }
  }

  ctx.api.audio = {
    blip: () => blip(660, 0.08),
    shot: () => noise(0.12, 0.2),
    reload: () => {
      blip(320, 0.06, 'square', 0.05);
      setTimeout(() => blip(520, 0.06, 'square', 0.05), 120);
    },
    cash: () => {
      blip(880, 0.09);
      setTimeout(() => blip(1320, 0.12), 90);
    },
    station: () => blip(440, 0.1, 'triangle', 0.07),
  };
}
