// districts.js — SOLMAR BAY's seven districts.
// Each has a centre, a name the HUD shows, and a tint for the minimap.
// District lookup is nearest-centre, so the four fixed test spots
// (harbor, beach, uptown, strip) always resolve exactly.
// Written fresh for round 8 from the shared contract.
export function init(ctx) {
  const S = ctx.state;

  const DISTRICTS = [
    { id: 'downtown', name: 'DOWNTOWN', x: 0, z: 0, r: 70, tint: 0xff9a5c, note: 'High-rises, hustle, and everybody watching.' },
    { id: 'harbor', name: 'HARBOR', x: 120, z: 120, r: 62, tint: 0x5fb8c8, note: 'Containers, cranes, and cargo nobody checks.' },
    { id: 'beach', name: 'BEACH', x: 0, z: 165, r: 46, tint: 0xffd9a0, note: 'Sand, surf, and sunset crowds.' },
    { id: 'strip', name: 'THE STRIP', x: 0, z: 135, r: 40, tint: 0xff6a9a, note: 'Neon signs, loud music, louder promises.' },
    { id: 'uptown', name: 'UPTOWN', x: 120, z: -90, r: 60, tint: 0x9ab8ff, note: 'Money lives here. It does not like visitors.' },
    { id: 'oldtown', name: 'OLD TOWN', x: -120, z: 55, r: 58, tint: 0xc8a06a, note: 'Brick lanes and old scores, still unpaid.' },
    { id: 'westside', name: 'WESTSIDE', x: -120, z: -95, r: 60, tint: 0x8ab86a, note: 'Quiet streets, loud engines, cheap gas.' },
  ];

  function districtAt(x, z) {
    let best = DISTRICTS[0];
    let bd = Infinity;
    for (const d of DISTRICTS) {
      const dx = x - d.x, dz = z - d.z;
      const dd = dx * dx + dz * dz;
      if (dd < bd) { bd = dd; best = d; }
    }
    return best;
  }

  function districtById(id) {
    for (const d of DISTRICTS) if (d.id === id) return d;
    return DISTRICTS[0];
  }

  S.districts = DISTRICTS;
  ctx.api.districtAt = districtAt;
  ctx.api.districtById = districtById;

  function refresh() {
    const p = S.player && S.player.pos;
    if (!p) return;
    const d = districtAt(p.x, p.z);
    if (S.district !== d.id) {
      S.district = d.id;
      const el = ctx.dom && ctx.dom.district;
      if (el) el.textContent = d.name;
    }
  }

  refresh();
  ctx.updates.push(() => refresh());
}
