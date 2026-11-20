// Solmar Bay — day/night clock (round 7 rebuild).
// S.time is minutes since the day opened at 18:28, so S.time = 200
// is exactly 21:48. The phase is recomputed from S.time every
// frame (the test sets S.time directly), the night value ramps
// smoothly toward its target, and the HUD day/time line follows.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};

  const OPEN_MIN = 18 * 60 + 28; // day opens at sunset, 18:28
  const NIGHT_MIN = 21 * 60 + 30; // night from 21:30
  const DAWN_MIN = 5 * 60 + 30; // dawn until 05:30
  const SUNSET_MIN = 17 * 60; // golden hour from 17:00
  const MIN_PER_SEC = 0.5; // game minutes per real second

  if (typeof S.time !== 'number') S.time = 0;
  if (typeof S.day !== 'number') S.day = 1;
  if (!S.dayNight || typeof S.dayNight !== 'object') {
    S.dayNight = { phase: 'SUNSET', night: 0 };
  }
  if (typeof S.dayNight.night !== 'number') S.dayNight.night = 0;

  function phaseFor(clockMin) {
    if (clockMin >= NIGHT_MIN || clockMin < DAWN_MIN) return 'NIGHT';
    if (clockMin >= SUNSET_MIN) return 'SUNSET';
    if (clockMin < 6 * 60 + 30) return 'DAWN';
    return 'DAY';
  }
  function nightTargetFor(phase) {
    if (phase === 'NIGHT') return 1;
    if (phase === 'SUNSET') return 0.18;
    if (phase === 'DAWN') return 0.4;
    return 0;
  }
  function clockFor(time) {
    const total = OPEN_MIN + time;
    return {
      day: 1 + Math.floor(total / 1440),
      min: ((total % 1440) + 1440) % 1440,
    };
  }

  ctx.api.dayNight = { phaseFor, nightTargetFor, clockFor };

  let lastText = '';
  ctx.updates.push((dt) => {
    // Advance the clock; the phase below always re-reads S.time.
    S.time += dt * MIN_PER_SEC;
    const c = clockFor(S.time);
    S.day = c.day;
    const phase = phaseFor(c.min);
    const target = nightTargetFor(phase);
    const cur = typeof S.dayNight.night === 'number' ? S.dayNight.night : 0;
    // Smooth ramp: ~0.09 of the remaining gap per frame at dt 0.05,
    // so a jump to night lands well inside a few dozen frames.
    const k = 1 - Math.exp(-dt * 1.8);
    S.dayNight.night = Math.max(0, Math.min(1, cur + (target - cur) * k));
    S.dayNight.phase = phase;
    S.dayNight.clockMinutes = c.min;

    const hh = String(Math.floor(c.min / 60)).padStart(2, '0');
    const mm = String(c.min % 60).padStart(2, '0');
    const text = 'DAY ' + S.day + ' ' + hh + ':' + mm + ' ' + phase;
    if (text !== lastText) {
      lastText = text;
      const el = dom['day-time'] || document.getElementById('day-time');
      if (el) el.textContent = text;
    }
  });
}
