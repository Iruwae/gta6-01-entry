// SOLMAR BAY — seven districts, decided by one pure function of
// position so the HUD, the minimap and the missions can never
// disagree. Beach owns the far south, the Strip sits just above it,
// the Harbor takes the south-east corner, Uptown the north-east,
// Downtown the middle, Old Town the north-west, and whatever is
// left over is Industrial.
export function init(S) {
  const defs = [
    { id: 'beach', name: 'BEACH' },
    { id: 'strip', name: 'THE STRIP' },
    { id: 'harbor', name: 'HARBOR' },
    { id: 'uptown', name: 'UPTOWN' },
    { id: 'downtown', name: 'DOWNTOWN' },
    { id: 'oldtown', name: 'OLD TOWN' },
    { id: 'industrial', name: 'INDUSTRIAL' },
  ];
  S.districtDefs = defs;

  S.districtAt = (x, z) => {
    if (z >= 150) return 'beach';
    if (z >= 120 && z < 150 && x < 100) return 'strip';
    if (x >= 100 && z >= 100) return 'harbor';
    if (x >= 100 && z < 0) return 'uptown';
    if (Math.abs(x) < 100 && Math.abs(z) < 120) return 'downtown';
    if (x <= -100 && z < 0) return 'oldtown';
    return 'industrial';
  };

  S.districtName = (id) => {
    const d = defs.find((row) => row.id === id);
    return d ? d.name : String(id || '').toUpperCase();
  };

  const tick = () => {
    const anchor = S.car ? S.car.pos : S.player.pos;
    if (!anchor) return;
    const id = S.districtAt(anchor.x, anchor.z);
    if (id !== S.district) {
      S.district = id;
      const el = document.getElementById('district');
      if (el) el.textContent = S.districtName(id);
    }
  };

  S._tick.push(tick);
  S.districtTick = tick;
  return tick;
}
