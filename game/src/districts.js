// SOLMAR BAY — district system (round 9 rebuild, builder B / world).
// Seven named districts, each with its own centre and colour. Every frame
// the player's position is matched to the nearest centre and S.district
// plus the HUD district label follow it. Four centres are fixed by the
// contract (HARBOR, BEACH, UPTOWN, THE STRIP); the other three are ours.
// Written fresh from the build contract; no other game module is imported.
const DISTRICTS = [
  { id: 'downtown', name: 'DOWNTOWN', x: 0, z: 0, r: 75, color: '#ffb347' },
  { id: 'harbor', name: 'HARBOR', x: 120, z: 120, r: 60, color: '#4fc3f7' },
  { id: 'beach', name: 'BEACH', x: 0, z: 165, r: 55, color: '#ffe082' },
  { id: 'uptown', name: 'UPTOWN', x: 120, z: -90, r: 65, color: '#ce93d8' },
  { id: 'strip', name: 'THE STRIP', x: 0, z: 135, r: 45, color: '#ff80ab' },
  { id: 'oldtown', name: 'OLD TOWN', x: -120, z: -40, r: 60, color: '#a5d6a7' },
  { id: 'palmrow', name: 'PALM ROW', x: -120, z: 120, r: 60, color: '#80cbc4' },
];

// Nearest centre wins. The fixed test spots are all exactly on their own
// centre, and the strip (0,135) sits 30 from the beach centre, so nearest
// never confuses the two.
function nearestDistrict(x, z) {
  let best = DISTRICTS[0];
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dx = d.x - x;
    const dz = d.z - z;
    const dd = dx * dx + dz * dz;
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best;
}

export function init(ctx) {
  const S = ctx.state || ctx.S;

  ctx.api.districts = { list: DISTRICTS, at: nearestDistrict };

  function districtEl() {
    return (ctx.dom && ctx.dom.district) || document.getElementById('district');
  }

  function apply(d) {
    S.district = d.id;
    const el = districtEl();
    if (el) el.textContent = d.name;
  }

  // Seed the starting district right away so the HUD is never blank.
  const startPos = S.player && S.player.pos;
  let current = startPos ? nearestDistrict(startPos.x, startPos.z) : DISTRICTS[0];
  apply(current);

  ctx.updates.push(() => {
    const p = S.player && S.player.pos;
    if (!p) return;
    const d = nearestDistrict(p.x, p.z);
    if (d.id !== current.id) {
      current = d;
      apply(d);
    }
  });
}
