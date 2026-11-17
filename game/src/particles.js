// SOLMAR BAY — one pooled burst system: sparks, smoke, blood puffs and
// muzzle flashes, all from a single Points-free set of small boxes.
import * as THREE from 'three';

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    for (let i = 0; i < 320; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
      m.visible = false;
      scene.add(m);
      this.pool.push({ mesh: m, vel: new THREE.Vector3(), life: 0, max: 1, grav: 0 });
    }
  }
  burst(pos, color, n, speed, life, grav) {
    let made = 0;
    for (const p of this.pool) {
      if (made >= n) break;
      if (p.life > 0) continue;
      made++;
      p.life = p.max = life * (0.6 + Math.random() * 0.8);
      p.grav = grav === undefined ? 6 : grav;
      p.mesh.visible = true;
      p.mesh.position.copy(pos);
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = 1;
      p.mesh.scale.setScalar(0.6 + Math.random() * 1.2);
      p.vel.set((Math.random() - 0.5) * 2, Math.random() * 1.2, (Math.random() - 0.5) * 2)
        .normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
    }
  }
  sparks(pos) { this.burst(pos, 0xffd24a, 14, 9, 0.5, 4); }
  smoke(pos) { this.burst(pos, 0x555555, 10, 3, 1.1, -1.5); }
  blood(pos) { this.burst(pos, 0xc02020, 12, 6, 0.6, 8); }
  crash(pos) { this.burst(pos, 0xff8040, 22, 12, 0.8, 6); this.smoke(pos); }
  update(dt) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.vel.y -= p.grav * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = p.life / p.max;
      p.mesh.rotation.x += dt * 6; p.mesh.rotation.y += dt * 5;
    }
  }
}
