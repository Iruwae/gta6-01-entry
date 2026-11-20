// SOLMAR BAY — day/night cycle (round 8, written fresh from the spec).
// S.time is minutes since the 18:28 sunset start of day 1, so setting
// S.time = 200 lands the clock at 21:48 and night engages. The phase
// logic reads S.time every frame (the test sets it directly), the night
// value ramps toward its target each frame, and the HUD day/time text
// is kept in step: "DAY 1 18:28 SUNSET" at the start, "NIGHT" after dark.
const START_MINUTES = 18 * 60 + 28; // 18:28
const NIGHT_MINUTES = 21 * 60 + 48; // 21:48 — night engages here
const MINUTES_PER_SECOND = 1.0;     // one game minute per real second
const NIGHT_RAMP = 1.2;             // night value units per second

function phaseFor(minutesOfDay) {
  if (minutesOfDay >= NIGHT_MINUTES || minutesOfDay < 5 * 60 + 30) return 'NIGHT';
  if (minutesOfDay < 7 * 60) return 'DAWN';
  if (minutesOfDay < 17 * 60) return 'DAY';
  return 'SUNSET';
}

function nightTargetFor(minutesOfDay) {
  // Fade in from 20:28 to 21:48, fade out from 05:30 to 07:00.
  if (minutesOfDay >= NIGHT_MINUTES || minutesOfDay < 5 * 60 + 30) return 1;
  if (minutesOfDay >= 20 * 60 + 28) return (minutesOfDay - (20 * 60 + 28)) / 80;
  if (minutesOfDay >= 5 * 60 + 30 && minutesOfDay < 7 * 60) {
    return 1 - (minutesOfDay - (5 * 60 + 30)) / 90;
  }
  return 0;
}

export function init(ctx) {
  const S = ctx.state;
  if (!S) return;

  if (typeof S.time !== 'number') S.time = 0;
  if (typeof S.day !== 'number') S.day = 1;
  if (!S.dayNight) S.dayNight = {};
  const dn = S.dayNight;
  if (typeof dn.night !== 'number') dn.night = 0;
  if (!dn.phase) dn.phase = 'SUNSET';
  if (!dn.label) dn.label = 'SUNSET';
  if (!dn.clock) dn.clock = '18:28';

  function dom(id) {
    if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
    try { return document.getElementById(id); } catch (e) { return null; }
  }

  ctx.api.dayNight = dn;
  ctx.api.clock = function clock() {
    return { day: S.day, time: S.time, phase: dn.phase, night: dn.night, label: dn.label };
  };

  ctx.updates.push(function daynightUpdate(dt) {
    // Advance the clock. Guard the step so a hitch never jumps hours.
    const step = Math.max(0, Math.min(dt, 0.25)) * MINUTES_PER_SECOND;
    S.time += step;

    const total = START_MINUTES + S.time;
    const dayOffset = Math.floor(total / 1440);
    const minutesOfDay = ((total % 1440) + 1440) % 1440;
    S.day = 1 + dayOffset;

    const phase = phaseFor(minutesOfDay);
    dn.phase = phase;
    dn.label = phase;
    const hh = String(Math.floor(minutesOfDay / 60)).padStart(2, '0');
    const mm = String(Math.floor(minutesOfDay % 60)).padStart(2, '0');
    dn.clock = hh + ':' + mm;
    dn.minutesOfDay = minutesOfDay;

    const target = nightTargetFor(minutesOfDay);
    const rate = NIGHT_RAMP * Math.max(0, Math.min(dt, 0.25));
    if (dn.night < target) dn.night = Math.min(target, dn.night + rate);
    else if (dn.night > target) dn.night = Math.max(target, dn.night - rate);

    const el = dom('day-time');
    if (el) el.textContent = 'DAY ' + S.day + ' ' + dn.clock + ' ' + phase;
  });
}
