// The police helicopter. It appears once the wanted level hits 3
// stars, circles overhead above the player, and leaves (S.heli back to
// null) as soon as wanted drops below 3.
export function init(ctx) {
  const { THREE, state: S } = ctx;
  let angle = 0;

  function buildHeli() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a4a8a });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1426 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 4.5), bodyMat);
    group.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.5), darkMat);
    tail.position.set(0, 0.2, -4);
    group.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 0.5), darkMat);
    rotor.position.y = 0.9;
    group.add(rotor);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4444 }));
    light.position.set(0, -0.8, 1.5);
    group.add(light);
    ctx.scene.add(group);
    return { pos: new THREE.Vector3(S.player.pos.x, 45, S.player.pos.z), mesh: group, rotor };
  }

  ctx.updates.push((dt) => {
    if (S.wanted >= 3) {
      if (!S.heli) S.heli = buildHeli();
      angle += dt * 0.55;
      S.heli.pos.set(
        S.player.pos.x + Math.cos(angle) * 20,
        45,
        S.player.pos.z + Math.sin(angle) * 20,
      );
      if (S.heli.mesh) {
        S.heli.mesh.position.copy(S.heli.pos);
        S.heli.mesh.rotation.y = -angle;
        if (S.heli.rotor) S.heli.rotor.rotation.y += dt * 18;
      }
    } else if (S.heli) {
      if (S.heli.mesh) ctx.scene.remove(S.heli.mesh);
      S.heli = null;
    }
  });
}
