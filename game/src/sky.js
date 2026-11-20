// SOLMAR BAY — sunset sky (round 8, written fresh from the spec).
// A gradient sky dome with a low sun, drifting clouds, and lighting
// that follows the day/night phase: warm orange at sunset, deep purple
// at night, with the street lights coming on after dark.
import * as THREE from '../vendor/three.module.min.js';

const SKY_VERT = [
  'varying vec3 vDir;',
  'void main() {',
  '  vDir = normalize(position);',
  '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
  '  gl_Position = projectionMatrix * mv;',
  '}',
].join('\n');

const SKY_FRAG = [
  'uniform float uNight;',
  'uniform vec3 uSunDir;',
  'varying vec3 vDir;',
  'void main() {',
  '  float h = clamp(vDir.y, -0.05, 1.0);',
  '  vec3 dayZen = vec3(0.98, 0.45, 0.25);',
  '  vec3 dayHor = vec3(1.00, 0.62, 0.30);',
  '  vec3 nightZen = vec3(0.05, 0.04, 0.14);',
  '  vec3 nightHor = vec3(0.22, 0.10, 0.32);',
  '  vec3 zen = mix(dayZen, nightZen, uNight);',
  '  vec3 hor = mix(dayHor, nightHor, uNight);',
  '  vec3 col = mix(hor, zen, pow(max(h, 0.0), 0.55));',
  '  float sunAmt = pow(max(dot(normalize(vDir), normalize(uSunDir)), 0.0), 90.0);',
  '  float glow = pow(max(dot(normalize(vDir), normalize(uSunDir)), 0.0), 6.0);',
  '  col += vec3(1.0, 0.75, 0.35) * sunAmt * (1.0 - uNight * 0.85);',
  '  col += vec3(1.0, 0.45, 0.20) * glow * 0.35 * (1.0 - uNight * 0.7);',
  '  gl_FragColor = vec4(col, 1.0);',
  '}',
].join('\n');

export function init(ctx) {
  const T = ctx.THREE || THREE;
  const scene = ctx.scene;
  const S = ctx.state;

  if (S && !S.dayNight) S.dayNight = { phase: 'SUNSET', night: 0, label: 'SUNSET', clock: '18:28' };

  // ---- sky dome ----
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uNight: { value: 0 },
      uSunDir: { value: new THREE.Vector3(-0.55, 0.22, 0.35).normalize() },
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(700, 24, 16), skyMat);
  skyDome.renderOrder = -10;
  scene.add(skyDome);
  if (S) S.skyDome = skyDome;

  // ---- sun + sky fill lights ----
  const sunLight = new THREE.DirectionalLight(0xffb060, 2.3);
  sunLight.position.set(-160, 60, 100);
  scene.add(sunLight);
  scene.add(sunLight.target);
  if (S) S.sunLight = sunLight;

  const hemi = new THREE.HemisphereLight(0xff9a5a, 0x3a2a4a, 0.85);
  scene.add(hemi);
  if (S) S.hemiLight = hemi;

  // Low visible sun disc + a pale moon that fades in at night.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd28a, fog: false })
  );
  sunDisc.position.set(-420, 95, 260);
  sunDisc.lookAt(0, 40, 0);
  scene.add(sunDisc);
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(14, 20),
    new THREE.MeshBasicMaterial({ color: 0xe8e8f8, fog: false, transparent: true, opacity: 0 })
  );
  moon.position.set(380, 260, -300);
  moon.lookAt(0, 40, 0);
  scene.add(moon);

  // ---- clouds: flat pink puffs drifting slowly ----
  const clouds = [];
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffc9a8, transparent: true, opacity: 0.5, fog: false,
  });
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group();
    const puffs = 2 + (i % 3);
    for (let p = 0; p < puffs; p++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(9 + p * 3, 8, 6), cloudMat);
      m.scale.y = 0.32;
      m.position.set(p * 10 - puffs * 5, (p % 2) * 2, (p % 3) * 4 - 4);
      g.add(m);
    }
    g.position.set(-260 + i * 55, 95 + (i % 4) * 14, -220 + (i * 47) % 320);
    scene.add(g);
    clouds.push({ g, speed: 0.6 + (i % 3) * 0.35 });
  }

  // ---- street-light glows along the avenues (lit at night) ----
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffc46b, transparent: true, opacity: 0,
  });
  const glows = [];
  for (let d = -150; d <= 150; d += 60) {
    for (const [x, z] of [[-6, d], [6, d], [d, -6], [d, 6]]) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), glowMat);
      s.position.set(x, 6.1, z);
      scene.add(s); glows.push(s);
    }
  }

  ctx.api.sky = {
    dome: skyDome,
    sun: sunLight,
    hemi,
    setNight(n) {
      skyMat.uniforms.uNight.value = n;
    },
  };

  ctx.updates.push(function skyUpdate(dt, t) {
    const dn = (S && S.dayNight) || { night: 0, phase: 'SUNSET' };
    const night = Math.max(0, Math.min(1, dn.night || 0));
    skyMat.uniforms.uNight.value = night;
    sunLight.intensity = 2.3 * (1 - night) + 0.22;
    sunLight.color.setHex(night > 0.6 ? 0x8a9ac8 : 0xffb060);
    hemi.intensity = 0.85 * (1 - night) + 0.22;
    sunDisc.material.opacity = 1 - night;
    sunDisc.visible = night < 0.9;
    moon.material.opacity = Math.max(0, night - 0.4) * 1.6;
    moon.visible = night > 0.4;
    cloudMat.opacity = 0.5 * (1 - night * 0.75);
    cloudMat.color.setHex(night > 0.5 ? 0x5a5478 : 0xffc9a8);
    glowMat.opacity = night * 0.85;
    for (const c of clouds) {
      c.g.position.x += c.speed * dt;
      if (c.g.position.x > 300) c.g.position.x = -300;
    }
    // City lamp heads + lamp material brighten after dark (lazy: the
    // city module may or may not have registered them yet).
    try {
      const city = ctx.api.city;
      if (city) {
        if (city.lampMaterial) city.lampMaterial.emissiveIntensity = 0.15 + night * 1.8;
        if (city.lampHeadMaterial) city.lampHeadMaterial.color.setHex(night > 0.4 ? 0xffe9a8 : 0x8a7a5a);
      }
    } catch (e) { /* lamps are cosmetic; never break the frame */ }
  });
}
