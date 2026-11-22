// Vic's fence yard at (110,138) — the yard itself plus the quote logic
// through fenceDirector (the sale action lives in side.js).
export function init(ctx) {
  const { THREE, scene } = ctx;
  const yard = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 20),
    new THREE.MeshStandardMaterial({ color: 0x2a1a10 }),
  );
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(110, 0.02, 138);
  scene.add(yard);
  for (let i = 0; i < 6; i++) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 2.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x8a6a4a }),
    );
    post.position.set(100 + i * 4, 1.2, 128);
    scene.add(post);
  }
  ctx.fence = { yard: { x: 110, z: 138 } };
}
