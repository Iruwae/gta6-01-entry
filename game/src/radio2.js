// radio2.js — six stations on the dial (round-5 rebuild, builder B2).
// S.radioStation cycles 0..5 on KeyQ; station 1 is BAYLINE. The HUD
// shows the station name in #radio-station and the current track in
// #radio-track, and the synth plays a little jingle on every switch.

const STATIONS = [
  { name: 'SUNSET FM', tracks: ['Golden Hour Drive', 'Palm Shadows', 'Last Light Avenue'] },
  { name: 'BAYLINE', tracks: ['Harbor Nights', 'Neon Tide', 'Ferry Lights'] },
  { name: 'NEON NIGHTS', tracks: ['Midnight Chrome', 'Laser Rain', 'After Dark'] },
  { name: 'STREET SOUNDS', tracks: ['Block Party', 'Corner Hustle', 'Bassline Alley'] },
  { name: 'CLASSIC CRUISE', tracks: ['Vinyl Sunset', 'Old Town Radio', 'Chrome Bumper'] },
  { name: 'TALK BAY', tracks: ['The Morning Bay', 'Sports Desk Live', 'Night Callers'] },
];

export function init(S) {
  if (typeof S.radioStation !== 'number') S.radioStation = 0;
  if (!S.radio2state) S.radio2state = { track: 0 };

  function current() {
    const i = ((S.radioStation % STATIONS.length) + STATIONS.length) % STATIONS.length;
    return STATIONS[i];
  }

  function refresh() {
    const st = current();
    const track = st.tracks[S.radio2state.track % st.tracks.length];
    const nameEl = document.getElementById('radio-station');
    const trackEl = document.getElementById('radio-track');
    if (nameEl) nameEl.textContent = st.name;
    if (trackEl) trackEl.textContent = track;
  }

  function nextStation() {
    S.radioStation = (S.radioStation + 1) % STATIONS.length;
    const st = current();
    S.radio2state.track = (S.radio2state.track + 1) % st.tracks.length;
    refresh();
    if (S.audio && typeof S.audio.jingle === 'function') {
      try { S.audio.jingle(S.radioStation); } catch (e) {}
    }
  }

  S.radio = { stations: STATIONS, current, next: nextStation, refresh };

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyQ' || e.repeat) return;
    if (S.mode === 'paused') return;
    nextStation();
  });

  refresh();
  setInterval(() => {
    try { refresh(); } catch (e) { /* never break the page */ }
  }, 500);
  if (Array.isArray(S._moduleTicks)) S._moduleTicks.push(() => refresh());

  return S.radio;
}

export default init;
