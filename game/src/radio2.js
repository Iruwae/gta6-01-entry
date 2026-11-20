// radio2.js — SOLMAR BAY radio.
// Six original stations. Q cycles them. The state holds the station as
// a NUMBER index into the list; the HUD shows the station NAME.
// Tracks rotate inside the current station on a slow timer.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const el = (id) => dom[id] || document.getElementById(id);

  const STATIONS = [
    { name: 'SUNSET FM', tracks: ['Golden Hour Drive', 'Amber Skyline', 'Last Light Radio'] },
    { name: 'BAYLINE 101', tracks: ['Harbor Nights', 'Cruise Control', 'Neon Palms'] },
    { name: 'PALM TALK', tracks: ['The Bay Report', 'Sunset Call-In', 'Street Voices'] },
    { name: 'DUSK ROCK', tracks: ['Purple Horizon', 'Engine Roar', 'Midnight Overpass'] },
    { name: 'MARINA BEATS', tracks: ['Tide Runner', 'Dockside Groove', 'Salt Air'] },
    { name: 'NIGHT DRIVE', tracks: ['After Dark', 'City of Lights', 'Slow Burn'] },
  ];

  // Normalise the state to a numeric index. If an older save stored the
  // station name as a string, resolve it back to its index.
  if (typeof S.radioStation === 'string') {
    const found = STATIONS.findIndex((s) => s.name === S.radioStation);
    S.radioStation = found >= 0 ? found : 0;
  } else if (typeof S.radioStation !== 'number') {
    S.radioStation = 0;
  }
  let trackIdx = 0;
  let trackTimer = 0;

  function current() {
    return STATIONS[((S.radioStation % STATIONS.length) + STATIONS.length) % STATIONS.length];
  }

  function paint() {
    const st = current();
    const rs = el('radio-station');
    if (rs) rs.textContent = st.name;
    const rt = el('radio-track');
    if (rt) rt.textContent = st.tracks[trackIdx % st.tracks.length];
  }

  function next() {
    S.radioStation = (S.radioStation + 1) % STATIONS.length;
    trackIdx = 0;
    trackTimer = 0;
    paint();
    try {
      if (ctx.api && ctx.api.audio && typeof ctx.api.audio.jingle === 'function') ctx.api.audio.jingle();
    } catch (e) { /* audio is optional */ }
  }

  function prev() {
    S.radioStation = (S.radioStation - 1 + STATIONS.length) % STATIONS.length;
    trackIdx = 0;
    trackTimer = 0;
    paint();
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code !== 'KeyQ') return;
    if (S.mode && S.mode !== 'playing') return;
    if (S.cutscene) return;
    next();
  });

  ctx.api.radio = {
    stations: STATIONS,
    names: STATIONS.map((s) => s.name),
    current,
    name: () => current().name,
    track: () => current().tracks[trackIdx % current().tracks.length],
    next,
    prev,
  };
  ctx.api.nextStation = next;

  paint();

  if (Array.isArray(ctx.updates)) {
    ctx.updates.push((dt) => {
      if (!S || S.mode !== 'playing') return;
      trackTimer += dt || 0.016;
      if (trackTimer > 28) {
        trackTimer = 0;
        trackIdx = (trackIdx + 1) % current().tracks.length;
        paint();
      }
    });
  }
}
