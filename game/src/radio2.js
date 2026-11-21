// radio2.js — SOLMAR BAY radio.
// Six stations, Q cycles them. S.radioStation is a NUMBER index into the
// station list; the station NAME is what the HUD radio element shows.
// The first station is the sunset station.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const $ = (id) => dom[id] || document.getElementById(id);

  const STATIONS = [
    { name: 'SUNSET FM', tracks: ['Golden Hour Drive', 'Amber Skyline', 'Last Light'] },
    { name: 'BAYLINE FM', tracks: ['Bayline Nights', 'Cruise Control', 'Harbor Lights FM'] },
    { name: 'PALM 98', tracks: ['Palm Shadows', 'Boardwalk Breeze', 'Neon Palms'] },
    { name: 'STRIP TALK', tracks: ['The Strip at Dusk', 'Midnight Callers', 'Bay City Beat'] },
    { name: 'HARBOR NIGHTS', tracks: ['Fog Over the Water', 'Dockside Blues', 'Slow Tide'] },
    { name: 'VICEROY CLASSICS', tracks: ['Old Bay Anthem', 'Sunset Boulevard', 'Golden Era'] },
  ];

  // Normalise: whatever the state held before, the station is an index.
  if (typeof S.radioStation !== 'number') {
    const found = STATIONS.findIndex((s) => s.name === S.radioStation);
    S.radioStation = found >= 0 ? found : 0;
  }
  S.radioStation = ((S.radioStation % STATIONS.length) + STATIONS.length) % STATIONS.length;
  S.radioStations = STATIONS.map((s) => s.name);

  let trackIdx = 0;
  let lastShownStation = -1;
  let lastShownTrack = '';
  let trackClock = 0;

  function stationName() { return STATIONS[S.radioStation].name; }
  function trackName() { return STATIONS[S.radioStation].tracks[trackIdx % STATIONS[S.radioStation].tracks.length]; }

  function refresh(force) {
    const stEl = $('radio-station');
    const trEl = $('radio-track');
    const name = stationName();
    const track = trackName();
    if (force || name !== lastShownStation || track !== lastShownTrack) {
      if (stEl) stEl.textContent = name;
      if (trEl) trEl.textContent = track;
      lastShownStation = name;
      lastShownTrack = track;
    }
  }

  function next() {
    S.radioStation = (S.radioStation + 1) % STATIONS.length;
    trackIdx = 0;
    trackClock = 0;
    refresh(true);
    if (ctx.api && ctx.api.audio && typeof ctx.api.audio.blip === 'function') {
      try { ctx.api.audio.blip(); } catch (e) { /* radio stays quiet */ }
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code !== 'KeyQ') return;
    if (S.mode !== 'playing') return;
    next();
  });

  ctx.api = ctx.api || {};
  ctx.api.radio = {
    stations: STATIONS.map((s) => s.name),
    name: stationName,
    track: trackName,
    next, cycle: next,
  };
  S.radioDirector = ctx.api.radio;

  refresh(true);
  ctx.updates = ctx.updates || [];
  ctx.updates.push((dt) => {
    // A track runs about forty seconds, then the station moves on.
    trackClock += dt || 0;
    if (trackClock > 40) {
      trackClock = 0;
      trackIdx = (trackIdx + 1) % STATIONS[S.radioStation].tracks.length;
    }
    refresh(false);
  });
}
