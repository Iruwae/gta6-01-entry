// radio2.js — SOLMAR BAY, round 8 rebuild.
// Six original radio stations, all invented names and tracks. Q cycles
// to the next station; the first is the sunset station the game opens
// on. The current station lives on S.radioStation as an index (0-5),
// the HUD reads the name and track through ctx.api.radio, and the track
// rolls on to the next one in the list every little while on its own.

const STATIONS = [
  {
    name: 'SUNSET FM',
    tracks: [
      'Golden Hour Drive — Marisol Vega',
      'Amber Skyline — The Palmettos',
      'Last Light — Cora Del Mar',
      'Dusk on the Bay — Sol Reyes',
    ],
  },
  {
    name: 'BAYLINE FM',
    tracks: [
      'Bayline Nights — DJ Marlo',
      "Cruisin' Coral — The Tides",
      'Harbor Lights — Lena Vale',
      'Freeway Hearts — Nico Sands',
    ],
  },
  {
    name: 'PALM TALK',
    tracks: [
      'The Morning Palms — talk radio',
      'Bay City Sports Desk — talk radio',
      'Night Owls Call-In — talk radio',
    ],
  },
  {
    name: 'REEF RADIO',
    tracks: [
      'Undertow — Blue Current',
      'Salt Air — Marina Skye',
      'Reef Runner — The Breakers',
    ],
  },
  {
    name: 'CORAL COAST',
    tracks: [
      'Coral Coastline — Isla Dawn',
      'Seaside Static — The Waveriders',
      'Pink Horizon — Alba Mar',
    ],
  },
  {
    name: 'DUSK DRIVE',
    tracks: [
      'Midnight Meridian — Vega Noir',
      'Purple Hour — The Duskers',
      'Afterglow — Sol Marlow',
    ],
  },
];

const TRACK_SECONDS = 45;

function keyDown(ctx, code) {
  const inp = ctx.input;
  if (!inp) return false;
  if (typeof inp.isDown === 'function') {
    try { return !!inp.isDown(code); } catch (e) { /* fall through */ }
  }
  const k = inp.keys;
  if (k) {
    if (typeof k.has === 'function') return k.has(code);
    if (Array.isArray(k)) return k.includes(code);
    if (typeof k === 'object') return !!k[code];
  }
  if (typeof inp[code] !== 'undefined') return !!inp[code];
  return false;
}

export function init(ctx) {
  const S = ctx.state;
  const prev = {};
  let trackIdx = 0;
  let trackT = 0;

  // The station is an index. If state ever holds a name instead, map it.
  if (typeof S.radioStation !== 'number') {
    let idx = 0;
    if (typeof S.radioStation === 'string') {
      const found = STATIONS.findIndex(
        (s) => s.name.toLowerCase() === String(S.radioStation).toLowerCase()
      );
      if (found >= 0) idx = found;
    }
    S.radioStation = idx;
  }

  function current() {
    const st = STATIONS[S.radioStation] || STATIONS[0];
    const track = st.tracks[trackIdx % st.tracks.length];
    return { name: st.name, track };
  }

  function next() {
    S.radioStation = ((S.radioStation | 0) + 1) % STATIONS.length;
    trackIdx = 0;
    trackT = 0;
    const cur = current();
    if (ctx.api.toast) ctx.api.toast(cur.name + ' — ' + cur.track);
    if (ctx.api.audio && typeof ctx.api.audio.click === 'function') {
      try { ctx.api.audio.click(); } catch (e) { /* audio is best-effort */ }
    }
  }

  ctx.api.radio = {
    stations: STATIONS,
    current,
    next,
    index: () => S.radioStation,
    track: () => current().track,
  };

  ctx.updates.push((dt) => {
    const down = keyDown(ctx, 'KeyQ');
    const was = !!prev.KeyQ;
    prev.KeyQ = down;
    if (down && !was && S.mode === 'playing') next();

    const st = STATIONS[S.radioStation] || STATIONS[0];
    trackT += dt;
    if (trackT >= TRACK_SECONDS) {
      trackT = 0;
      trackIdx = (trackIdx + 1) % st.tracks.length;
    }
  });
}
