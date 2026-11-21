// SOLMAR BAY — tiny WebAudio synth for UI blips, gunshots, reloads and
// cash. No audio files, no network. If the browser has no audio context,
// every call silently does nothing.
let actx = null;

function ac() {
  if (actx) return actx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
  } catch (e) { return null; }
  return actx;
}

function blip(freq, dur, type, gain) {
  const c = ac();
  if (!c) return;
  try {
    if (c.state === 'suspended') c.resume();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch (e) { /* silent */ }
}

function noise(dur, gain) {
  const c = ac();
  if (!c) return;
  try {
    if (c.state === 'suspended') c.resume();
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = gain || 0.12;
    src.connect(g);
    g.connect(c.destination);
    src.start();
  } catch (e) { /* silent */ }
}

export const audio = {
  blip() { blip(660, 0.08, 'sine', 0.06); },
  shot() { noise(0.12, 0.14); },
  reload() { blip(320, 0.06, 'square', 0.05); setTimeout(() => blip(480, 0.06, 'square', 0.05), 90); },
  cash() { blip(880, 0.1, 'sine', 0.07); setTimeout(() => blip(1320, 0.14, 'sine', 0.07), 100); },
};

export function init(ctx) {
  ctx.api.audio = audio;
}
