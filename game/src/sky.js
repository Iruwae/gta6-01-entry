// Solmar Bay — sunset sky (round 7 rebuild).
// A gradient dome that slides from golden-hour orange into deep
// night purple, a low sun, drifting clouds, and the lights that
// follow the day/night phase: warm sun by day, dim blue at night,
// street lamps glowing once it gets dark.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const T = ctx.THREE || THREE;

  const SUN_DIR = new T.Vector3(-0.55, 0.16, -0.75).normalize();

  // ---- sky dome: shader gradient driven by uNight --------------------
  const domeMat = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: {
      uNight: { value: 0 },
      uSunDir: { value: SUN_DIR.clone() },
    },
    vertexShader: [
      'varying vec3 vDir;',
      'void main() {',
      '  vDir = position;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}',
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vDir;',
      'uniform float uNight;',
      'uniform vec3 uSunDir;',
      'void main() {',
      '  vec3 d = normalize(vDir);',
      '  float h = clamp(d.y, -0.05, 1.0);',
      '  vec3 dayTop = vec3(0.55, 0.32, 0.55);',
      '  vec3 dayHor = vec3(1.0, 0.48, 0.20);',
      '  vec3 nightTop = vec3(0.02, 0.02, 0.09);',
      '  vec3 nightHor = vec3(0.10, 0.06, 0.20);',
      '  vec3 top = mix(dayTop, nightTop, uNight);',
      '  vec3 hor = mix(dayHor, nightHor, uNight);',
      '  vec3 col = mix(hor, top, pow(h, 0.6));',
      '  float sunAmt = pow(max(dot(d, uSunDir), 0.0), 24.0);',
      '  col += vec3(1.0, 0.55, 0.2) * sunAmt * (1.0 - uNight * 0.85);',
      '  gl_FragColor = vec4(col, 1.0);',
      '}',
    ].join('\n'),
  });
  const dome = new T.Mesh(new T.SphereGeometry(620, 24, 14), domeMat);
  scene.add(dome);
  S.skyDome = dome;

  // ---- the low sun: a glowing disc + halo ----------------------------
  const sunDisc = new T.Mesh(
    new T.CircleGeometry(18, 24),
    new T.MeshBasicMaterial({ color: 0xffc46b, fog: false })
  );
  sunDisc.position.copy(SUN_DIR).multiplyScalar(560);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  const sunHalo = new T.Mesh(
    new T.CircleGeometry(42, 24),
    new T.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.28, fog: false })
  );
  sunHalo.position.copy(SUN_DIR).multiplyScalar(555);
  sunHalo.lookAt(0, 0, 0);
  scene.add(sunHalo);

  // ---- lights ----------------------------------------------------------
  const sunLight = new T.DirectionalLight(0xffb36b, 2.3);
  sunLight.position.copy(SUN_DIR).multiplyScalar(120);
  scene.add(sunLight);
  S.sunLight = sunLight;

  const hemi = new T.HemisphereLight(0x8a5a9a, 0x4a3428, 0.85);
  scene.add(hemi);
  S.hemiLight = hemi;

  // ---- clouds: flat pink puffs drifting over the bay ------------------
  const cloudMat = new T.MeshLambertMaterial({
    color: 0xffb8a0, transparent: true, opacity: 0.85,
  });
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const grp = new T.Group();
    const puffs = 2 + (i % 3);
    for (let p = 0; p < puffs; p++) {
      const s = new T.Mesh(new T.SphereGeometry(6 + p * 2.5, 8, 6), cloudMat);
      s.scale.y = 0.35;
      s.position.set(p * 7 - 7, p * 0.8, (p % 2) * 4 - 2);
      grp.add(s);
    }
    grp.position.set(-320 + i * 68, 55 + (i % 4) * 12, -260 + (i * 53) % 480);
    scene.add(grp);
    clouds.push(grp);
  }

  // ---- street lamps: poles with heads that glow at night --------------
  const lampHeadMat = new T.MeshLambertMaterial({
    color: 0xffe9b0, emissive: 0xffc46b, emissiveIntensity: 0.05,
  });
  const poleMat = new T.MeshLambertMaterial({ color: 0x2a2a30 });
  const lampSpots = [];
  for (let i = 0; i < 14; i++) {
    const along = -150 + i * 24;
    const side = i % 2 === 0 ? 1 : -1;
    const x = i % 3 === 0 ? along : side * 6;
    const z = i % 3 === 0 ? side * 6 : along;
    const pole = new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 6, 6), poleMat);
    pole.position.set(x, 3, z);
    scene.add(pole);
    const head = new T.Mesh(new T.SphereGeometry(0.45, 8, 6), lampHeadMat);
    head.position.set(x, 6.2, z);
    scene.add(head);
    lampSpots.push(head);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  ctx.api.sky = {
    dome,
    sunLight,
    hemi,
    setNight(n) {
      if (S.dayNight) S.dayNight.night = Math.max(0, Math.min(1, n));
    },
  };

  // ---- per-frame: follow S.dayNight.night ------------------------------
  ctx.updates.push((dt) => {
    const night = S.dayNight && typeof S.dayNight.night === 'number'
      ? Math.max(0, Math.min(1, S.dayNight.night)) : 0;
    domeMat.uniforms.uNight.value = night;
    sunLight.intensity = lerp(2.3, 0.35, night);
    sunLight.color.setHex(night > 0.6 ? 0x8a7aff : 0xffb36b);
    hemi.intensity = lerp(0.85, 0.4, night);
    sunDisc.material.opacity = 1 - night;
    sunDisc.visible = night < 0.95;
    sunHalo.material.opacity = 0.28 * (1 - night);
    sunHalo.visible = night < 0.95;
    lampHeadMat.emissiveIntensity = lerp(0.05, 1.6, night);
    cloudMat.opacity = lerp(0.85, 0.35, night);
    for (const c of clouds) {
      c.position.x += dt * 1.1;
      if (c.position.x > 340) c.position.x = -340;
    }
  });
}
