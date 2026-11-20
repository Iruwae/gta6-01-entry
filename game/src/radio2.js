// SOLMAR BAY — radio (round 7 rebuild, builder D).
// Six invented stations, no licensed music, no audio files: the HUD
// shows the station name and the current track. Q cycles to the next
// station. S.radioStation is the station index (0–5); the first station
// is the sunset station, SUNSET FM.

const STATIONS = [
  {
    name: 'SUNSET FM',
    tag: 'the sunset station',
    tracks: ['Golden Hour Drive', 'Amber Skyline', 'Last Light Lovers'],
  },
  {
    name: 'BAYLINE FM',
    tag: 'harbor talk and tides',
    tracks: ['Harbor Lights', 'Tidewater Blues', 'Ferry Song'],
  },
  {
    name: 'PALM SHADE RADIO',
    tag: 'slow songs for hot days',
    tracks: ['Shade Tree Shuffle', 'Coconut Radio', 'Slow Palm Sunday'],
  },
  {
    name: 'SOLMAR SOUL',
    tag: 'smooth bay soul',
    tracks: ['Bayfront Groove', 'Velvet Dusk', 'Marina Nights'],
  },
  {
    name: 'TROPICANA 88',
    tag: 'island rhythms',
    tracks: ['Mango Tango', 'Island Static', 'Sunset Salsa'],
  },
  {
    name: 'NIGHT DRIVE FM',
    tag: 'after-dark cruising',
    tracks: ['Coastline After Dark', 'Headlights Home', 'Midnight Marina'],
  },
];

const TRACK_SECONDS = 40;

export function init(ctx) {
  const S = ctx.state;
  const pick = (id) => (ctx.dom && ctx.dom[id]) || document.getElementById(id);
  let trackIndex = 0;
  let trackTimer = 0;

  if (typeof S.radioStation !== 'number' || S.radioStation < 0 || S.radioStation > 5) {
    S.radioStation = 0;
  }

  function currentStation() {
    return STATIONS[S.radioStation] || STATIONS[0];
  }

  function currentTrack() {
    const station = currentStation();
    return station.tracks[trackIndex % station.tracks.length];
  }

  function paintHud() {
    try {
      const stationEl = pick('radio-station');
      if (stationEl) stationEl.textContent = currentStation().name;
      const trackEl = pick('radio-track');
      if (trackEl) trackEl.textContent = currentTrack();
    } catch (e) { /* the HUD module repaints these too */ }
  }

  function nextStation() {
    S.radioStation = (S.radioStation + 1) % STATIONS.length;
    trackIndex = 0;
    trackTimer = 0;
    paintHud();
    try { if (ctx.api.audio && ctx.api.audio.click) ctx.api.audio.click(); } catch (e) { /* silent */ }
    return S.radioStation;
  }

  function setStation(i) {
    const n = ((Math.floor(i) % STATIONS.length) + STATIONS.length) % STATIONS.length;
    S.radioStation = n;
    trackIndex = 0;
    trackTimer = 0;
    paintHud();
    return S.radioStation;
  }

  ctx.api.radioStations = STATIONS;
  ctx.api.nextStation = nextStation;
  ctx.api.setStation = setStation;
  ctx.api.currentStation = currentStation;
  ctx.api.stationName = () => currentStation().name;
  ctx.api.currentTrack = currentTrack;

  paintHud();

  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.code !== 'KeyQ') return;
    if (S.mode !== 'playing') return;
    nextStation();
  });

  // Tracks roll on while driving; the HUD always shows the current one.
  ctx.updates.push((dt) => {
    try {
      trackTimer += dt || 0;
      if (trackTimer >= TRACK_SECONDS) {
        trackTimer = 0;
        const station = currentStation();
        trackIndex = (trackIndex + 1) % station.tracks.length;
        paintHud();
      }
    } catch (e) { /* radio must never break the loop */ }
  });
}
