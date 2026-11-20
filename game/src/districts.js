// SOLMAR BAY — districts (round 8, written fresh from the spec).
// Seven named districts, each with its own look. Four are fixed by the
// contract: HARBOR (120,120), BEACH (0,165), UPTOWN (120,-90) and
// THE STRIP (0,135). The other three are invented here. A lookup on
// ctx.api answers "which district is this map position in", and the
// player's current district is kept on S.district (lowercase id) with
// the display name on the HUD district element.
import * as THREE from '../vendor/three.module.min.js';

const DISTRICTS = [
  { id: 'downtown', name: 'DOWNTOWN', x: 0, z: 0, radius: 55,
    tint: 0x8a6a3a, blurb: 'glass towers and the plaza' },
  { id: 'harbor', name: 'HARBOR', x: 120, z: 120, radius: 48,
    tint: 0x3a7a8a, blurb: 'cranes, containers and the bay' },
  { id: 'beach', name: 'BEACH', x: 0, z: 165, radius: 42,
    tint: 0xd9b380, blurb: 'sand, palms and the boardwalk' },
  { id: 'uptown', name: 'UPTOWN', x: 120, z: -90, radius: 48,
    tint: 0x7a8ab0, blurb: 'quiet avenues and tall apartments' },
  { id: 'strip', name: 'THE STRIP', x: 0, z: 135, radius: 42,
    tint: 0xff4ad8, blurb: 'neon signs and late-night crowds' },
  { id: 'oldtown', name: 'OLD TOWN', x: -120, z: -60, radius: 52,
    tint: 0xb08040, blurb: 'low brick rows and corner cafes' },
  { id: 'palmrow', name: 'PALM ROW', x: -110, z: 90, radius: 50,
    tint: 0x5a9a5a, blurb: 'palm-lined streets and small hotels' },
];

function districtAt(x, z) {
  let best = DISTRICTS[0], bestD = Infinity;
  for (const d of DISTRICTS) {
    const dx = x - d.x, dz = z - d.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < bestD) { bestD = dist; best = d; }
  }
  return best;
}

function makePalm(T, scene, x, z, s) {
  const g = new T.Group();
  const trunk = new T.Mesh(
    new T.CylinderGeometry(0.12 * s, 0.2 * s, 2.6 * s, 6),
    new T.MeshLambertMaterial({ color: 0x7a5a38 })
  );
  trunk.position.y = 1.3 * s; g.add(trunk);
  const top = new T.Mesh(
    new T.ConeGeometry(1.1 * s, 1.4 * s, 7),
    new T.MeshLambertMaterial({ color: 0x3f8a4a })
  );
  top.position.y = 3.1 * s; g.add(top);
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

export function init(ctx) {
  const T = ctx.THREE || THREE;
  const scene = ctx.scene;
  const S = ctx.state;

  // A soft ground tint per district so each area reads differently
  // from the air and from the street.
  for (const d of DISTRICTS) {
    const tint = new T.Mesh(
      new T.CircleGeometry(d.radius * 0.95, 24),
      new T.MeshBasicMaterial({
        color: d.tint, transparent: true, opacity: 0.13, depthWrite: false,
      })
    );
    tint.rotation.x = -Math.PI / 2;
    tint.position.set(d.x, 0.012, d.z);
    scene.add(tint);
  }

  // HARBOR: stacked shipping containers and a simple crane.
  const contCols = [0xb0503a, 0x3a6ab0, 0x4a9a5a, 0xc9a03a];
  for (let i = 0; i < 9; i++) {
    const c = new T.Mesh(
      new T.BoxGeometry(6, 2.6, 2.6),
      new T.MeshLambertMaterial({ color: contCols[i % contCols.length] })
    );
    c.position.set(96 + (i % 3) * 14, 1.3 + (i >= 6 ? 2.6 : 0), 96 + Math.floor(i / 3) * 12);
    c.rotation.y = (i % 2) * 0.12;
    scene.add(c);
  }
  const craneLeg = new T.Mesh(
    new T.BoxGeometry(2, 26, 2),
    new T.MeshLambertMaterial({ color: 0xc9a03a })
  );
  craneLeg.position.set(140, 13, 100); scene.add(craneLeg);
  const craneArm = new T.Mesh(
    new T.BoxGeometry(22, 1.6, 1.6),
    new T.MeshLambertMaterial({ color: 0xc9a03a })
  );
  craneArm.position.set(132, 25, 100); scene.add(craneArm);

  // BEACH + PALM ROW: palms and beach umbrellas.
  for (const [x, z] of [[-24, 158], [-10, 164], [8, 158], [22, 164], [-38, 152], [36, 152]]) {
    makePalm(T, scene, x, z, 1.1);
  }
  for (const [x, z] of [[-128, 78], [-96, 104], [-118, 112], [-88, 66]]) {
    makePalm(T, scene, x, z, 1.0);
  }
  for (const [x, z, col] of [[-16, 170, 0xff6b6b], [14, 170, 0x37e6ff], [0, 174, 0xffb347]]) {
    const um = new T.Mesh(
      new T.ConeGeometry(2.4, 1.2, 8),
      new T.MeshLambertMaterial({ color: col })
    );
    um.position.set(x, 2.2, z); scene.add(um);
    const pole = new T.Mesh(
      new T.CylinderGeometry(0.07, 0.07, 2.2, 5),
      new T.MeshLambertMaterial({ color: 0xd8d0c0 })
    );
    pole.position.set(x, 1.1, z); scene.add(pole);
  }

  // UPTOWN: a few tall pale apartment slabs.
  for (const [x, z, h] of [[102, -108, 34], [138, -72, 28], [108, -66, 24]]) {
    const t = new T.Mesh(
      new T.BoxGeometry(14, h, 14),
      new T.MeshLambertMaterial({ color: 0x9ab0c0, emissive: 0xffe9a8, emissiveIntensity: 0.12 })
    );
    t.position.set(x, h / 2, z); scene.add(t);
  }

  // OLD TOWN: low warm brick rows.
  for (const [x, z] of [[-138, -78], [-102, -42], [-138, -42], [-102, -84]]) {
    const b = new T.Mesh(
      new T.BoxGeometry(16, 7, 12),
      new T.MeshLambertMaterial({ color: 0x8a5a44 })
    );
    b.position.set(x, 3.5, z); scene.add(b);
  }

  // DOWNTOWN plaza: pale paving and benches around the centre.
  const plaza = new T.Mesh(
    new T.CircleGeometry(14, 20),
    new T.MeshLambertMaterial({ color: 0x9a8a72 })
  );
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.014, 0);
  scene.add(plaza);
  for (const [x, z] of [[-10, -8], [10, 8], [-10, 8], [10, -8]]) {
    const bench = new T.Mesh(
      new T.BoxGeometry(3, 0.7, 1),
      new T.MeshLambertMaterial({ color: 0x5a4632 })
    );
    bench.position.set(x, 0.35, z); scene.add(bench);
  }

  // THE STRIP: extra neon blocks (ambient.js flickers these).
  const stripNeon = [];
  const neonCols = [0xff4ad8, 0x37e6ff, 0xffb347];
  for (let i = 0; i < 5; i++) {
    const mat = new T.MeshBasicMaterial({ color: neonCols[i % neonCols.length] });
    const sign = new T.Mesh(new T.BoxGeometry(7, 1.2, 0.5), mat);
    sign.position.set(-40 + i * 20, 12 + (i % 2) * 3, 142);
    scene.add(sign); stripNeon.push(mat);
  }

  const api = {
    list: DISTRICTS,
    at: districtAt,
    getDistrict: districtAt,
    byId(id) { return DISTRICTS.find((d) => d.id === id) || null; },
    neonMaterials: stripNeon,
  };
  ctx.api.districts = DISTRICTS;
  ctx.api.districtAt = districtAt;
  ctx.api.getDistrict = districtAt;
  ctx.api.districtInfo = api;
  if (S) S.districts = DISTRICTS;

  // Starting district: downtown, until the player moves.
  if (S && !S.district) S.district = 'downtown';

  function dom(id) {
    if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
    try { return document.getElementById(id); } catch (e) { return null; }
  }

  let lastId = null;
  ctx.updates.push(function districtsUpdate() {
    if (!S || !S.player || !S.player.pos) return;
    let px = S.player.pos.x, pz = S.player.pos.z;
    if (S.car && S.car.pos && px === 0 && pz === 0) { px = S.car.pos.x; pz = S.car.pos.z; }
    const d = districtAt(px, pz);
    S.district = d.id;
    if (d.id !== lastId) {
      lastId = d.id;
      const el = dom('district');
      if (el) el.textContent = d.name;
    }
  });
}
