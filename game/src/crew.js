// Lena Cruz, getaway driver. Parked out of sight until a crew job
// calls her in (mission 5), then she follows the player on foot, fights
// beside them, and talks. This module owns the banter director the
// game exercises: say / raceWin / pickup / heatUp with a 9 game-second
// cooldown, toast format `SPEAKER: "text"`.
export function init(ctx) {
  const { THREE, state: S } = ctx;

  // Lena's mesh: a pink box-person, hidden until a crew job calls her.
  if (!S.crew.mesh) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.8, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xff7a9e }),
    );
    mesh.position.set(-84, 0, -56);
    mesh.visible = false;
    ctx.scene.add(mesh);
    S.crew.mesh = mesh;
  } else if (!S.crew.mesh.parent) {
    ctx.scene.add(S.crew.mesh);
  }

  // The crew's banter director is the live one from here on. Every line
  // carries its speaker tag up front and the 9-second cooldown keeps
  // Lena and Vic from talking over each other.
  const lines = {
    raceWin: [
      ['LENA', 'Told you. Nobody outdrives us on this bay.'],
      ['LENA', 'That was clean. Vic is going to love this.'],
      ['VIC', 'Not bad, kid. The bay is starting to notice you.'],
    ],
    pickup: [
      ['LENA', 'Package is in the bag. Keep it smooth.'],
      ['VIC', 'Good hands. That is how you stay alive out here.'],
    ],
    heatUp: [
      ['LENA', 'Cops on us! Drive like you mean it!'],
      ['VIC', 'Heat is climbing. Lose them or pay for it.'],
    ],
  };
  const director = {
    _cooldown: 0,
    say(speaker, text) {
      if (director._cooldown > 0) return false;
      ctx.api.toast(`${speaker}: "${text}"`);
      director._cooldown = 9;
      return true;
    },
    raceWin() {
      const line = lines.raceWin[Math.floor(Math.random() * lines.raceWin.length)];
      return director.say(line[0], line[1]);
    },
    pickup() {
      const line = lines.pickup[Math.floor(Math.random() * lines.pickup.length)];
      return director.say(line[0], line[1]);
    },
    heatUp() {
      const line = lines.heatUp[Math.floor(Math.random() * lines.heatUp.length)];
      return director.say(line[0], line[1]);
    },
  };
  S.banterDirector = director;

  ctx.updates.push((dt) => {
    const mesh = S.crew.mesh;
    if (!mesh) return;
    if (!S.crew.active) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    // Follow the player on foot; stand by the car when they drive.
    const tx = S.player.pos.x;
    const tz = S.player.pos.z;
    const dx = tx - mesh.position.x;
    const dz = tz - mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 3) {
      const step = Math.min(dist - 2, 8 * dt);
      mesh.position.x += (dx / dist) * step;
      mesh.position.z += (dz / dist) * step;
      mesh.rotation.y = Math.atan2(dx, dz);
    }
  });
}
