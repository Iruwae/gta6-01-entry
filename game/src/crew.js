// crew.js — Lena Cruz, getaway-driver companion (round-5 rebuild, B2).
// S.crew = { active, mesh, update(dt) }. While a crew job is live she
// trails the player about three metres back; otherwise her mesh hides.
// The mesh is built from plain boxes/spheres so it needs no assets.

function makeStubMesh() {
  const pos = {
    x: 0, y: 0, z: 0,
    set(nx, ny, nz) { this.x = nx; this.y = ny; this.z = nz; },
    lerp(tx, k) { this.x += (tx.x - this.x) * k; this.y += (tx.y - this.y) * k; this.z += (tx.z - this.z) * k; },
  };
  return { visible: false, position: pos, rotation: { x: 0, y: 0, z: 0 } };
}

function buildLenaMesh(THREE) {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0x0e7490, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b48c, roughness: 0.7 });
  const hairM = new THREE.MeshStandardMaterial({ color: 0xff7a59, roughness: 0.9 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.3), jacket);
  torso.position.y = 1.05;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 14), skin);
  head.position.y = 1.62;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM);
  hair.position.y = 1.66;
  g.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.22), pants);
  legL.position.set(-0.14, 0.36, 0);
  g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.22), pants);
  legR.position.set(0.14, 0.36, 0);
  g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.16), jacket);
  armL.position.set(-0.34, 1.05, 0);
  g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.16), jacket);
  armR.position.set(0.34, 1.05, 0);
  g.add(armR);
  g.visible = false;
  return g;
}

export function init(S) {
  const crew = {
    active: false,
    mesh: makeStubMesh(),

    update(dt) {
      const mesh = crew.mesh;
      if (!mesh) return;
      if (!crew.active || !S.player || !S.player.pos) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      const p = S.player.pos;
      const heading = S.player.heading || 0;
      const tx = p.x - Math.sin(heading) * 3;
      const tz = p.z - Math.cos(heading) * 3;
      const k = Math.min(1, Math.max(0, (dt || 0.15) * 3.2));
      if (mesh.position && typeof mesh.position.lerp === 'function' && mesh.position.isVector3) {
        mesh.position.lerp({ x: tx, y: 0, z: tz }, k);
      } else if (mesh.position) {
        mesh.position.x += (tx - mesh.position.x) * k;
        mesh.position.z += (tz - mesh.position.z) * k;
        mesh.position.y = 0;
      }
      if (mesh.rotation) mesh.rotation.y = heading;
    },
  };

  S.crew = crew;

  // Upgrade the stub to a real THREE group as soon as the vendor
  // build loads; the stub keeps S.crew.mesh non-null until then.
  (async () => {
    try {
      let THREE = null;
      try {
        THREE = await import('../vendor/three.module.min.js');
      } catch (e1) {
        THREE = await import('three');
      }
      if (!THREE || !THREE.Group) return;
      const real = buildLenaMesh(THREE);
      const old = crew.mesh;
      if (old && old.position) real.position.set(old.position.x || 0, 0, old.position.z || 0);
      else if (S.player && S.player.pos) real.position.set(S.player.pos.x, 0, S.player.pos.z);
      real.visible = !!crew.active;
      crew.mesh = real;
      const scene = S.scene || S.world || null;
      if (scene && typeof scene.add === 'function') scene.add(real);
    } catch (e) { /* stub mesh keeps working */ }
  })();

  setInterval(() => {
    try { crew.update(0.12); } catch (e) { /* never break the page */ }
  }, 120);
  if (Array.isArray(S._moduleTicks)) S._moduleTicks.push((dt) => crew.update(dt));

  return crew;
}

export default init;
