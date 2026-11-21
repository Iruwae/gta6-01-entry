// SOLMAR BAY — the police helicopter. Appears once wanted hits 3 stars,
// circles overhead above the player (S.heli with pos), and leaves —
// S.heli back to null — as soon as wanted drops below 3.
export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  let angle = 0;

  ctx.updates.push((dt) => {
    if (S.wanted >= 3) {
      if (!S.heli) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(3, 1.2, 6),
          new THREE.MeshStandardMaterial({ color: 0x22335e, metalness: 0.4, roughness: 0.5 }),
        );
        g.add(body);
        const tail = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.8, 4),
          new THREE.MeshStandardMaterial({ color: 0x22335e, metalness: 0.4, roughness: 0.5 }),
        );
        tail.position.set(0, 0.2, -4.5);
        g.add(tail);
        const rotor = new THREE.Mesh(
          new THREE.BoxGeometry(9, 0.12, 0.7),
          new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }),
        );
        rotor.position.y = 1.0;
        g.add(rotor);
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.45, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffffff }),
        );
        lamp.position.y = -0.9;
        g.add(lamp);
        scene.add(g);
        S.heli = {
          pos: new THREE.Vector3(S.player.pos.x, 42, S.player.pos.z),
          mesh: g,
          rotor,
        };
      }
      angle += dt * 0.5;
      const h = S.heli;
      h.pos.set(
        S.player.pos.x + Math.cos(angle) * 18,
        42,
        S.player.pos.z + Math.sin(angle) * 18,
      );
      h.mesh.position.copy(h.pos);
      h.rotor.rotation.y += dt * 20;
    } else if (S.heli) {
      if (S.heli.mesh && S.heli.mesh.parent) S.heli.mesh.parent.remove(S.heli.mesh);
      S.heli = null;
    }
  });
}
