// sky.js — the sunset sky dome, the sun, the stars, and the light
// that sells golden hour sliding into night.
// The day/night module owns S.dayNight; this module reads its night
// value each frame and grades the sky, sun, and fog to match.
// Written fresh for round 8 from the shared contract.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state;
  const scene = ctx.scene;

  // Big inverted sphere with a gradient shader: orange horizon at
  // sunset, deep purple overhead, near-black at night, plus a sun glow.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uNight: { value: 0 },
      uTopDay: { value: new THREE.Color(0x3a2a6e) },
      uTopNight: { value: new THREE.Color(0x05060f) },
      uHorizonDay: { value: new THREE.Color(0xff8a4a) },
      uHorizonNight: { value: new THREE.Color(0x141a33) },
    },
    vertexShader: [
      'varying vec3 vDir;',
      'void main() {',
      '  vDir = normalize(position);',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  gl_Position = projectionMatrix * mv;',
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform float uNight;',
      'uniform vec3 uTopDay; uniform vec3 uTopNight;',
      'uniform vec3 uHorizonDay; uniform vec3 uHorizonNight;',
      'varying vec3 vDir;',
      'void main() {',
      '  float h = clamp(vDir.y * 1.4 + 0.25, 0.0, 1.0);',
      '  vec3 top = mix(uTopDay, uTopNight, uNight);',
      '  vec3 hor = mix(uHorizonDay, uHorizonNight, uNight);',
      '  vec3 col = mix(hor, top, pow(h, 0.8));',
      '  float sunGlow = pow(max(dot(normalize(vDir), normalize(vec3(-0.55, 0.18, -0.35))), 0.0), 24.0);',
      '  col += vec3(1.0, 0.55, 0.25) * sunGlow * (1.0 - uNight) * 0.9;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}',
    ].join('\n'),
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(880, 28, 18), skyMat);
  scene.add(dome);
  S.skyDome = dome;

  // Low warm sun for the long sunset shadows.
  const sun = new THREE.DirectionalLight(0xffb36b, 2.6);
  sun.position.set(-140, 110, -60);
  scene.add(sun);
  scene.add(sun.target);
  S.sunLight = sun;

  const hemi = new THREE.HemisphereLight(0xff9a7a, 0x2a1e3f, 0.9);
  scene.add(hemi);
  S.hemiLight = hemi;

  // Stars: a shell of points, invisible by day, fading in at night.
  const starCount = 420;
  const pos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * Math.PI * 0.45 + 0.08;
    const r = 820;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    pos[i * 3 + 1] = Math.sin(e) * r;
    pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 2.2, transparent: true, opacity: 0,
    sizeAttenuation: false, depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
  S.stars = stars;

  // A pale moon that only shows after dark.
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(18, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xe8ecff, transparent: true, opacity: 0, fog: false }),
  );
  moon.position.set(260, 300, -620);
  scene.add(moon);
  S.moon = moon;

  scene.fog = new THREE.Fog(0x3a2036, 140, 780);
  const fogDay = new THREE.Color(0x3a2036);
  const fogNight = new THREE.Color(0x0a0d1e);

  ctx.updates.push((dt) => {
    const dn = S.dayNight;
    const n = dn ? dn.night : 0;
    skyMat.uniforms.uNight.value = n;
    sun.intensity = 2.6 + (0.35 - 2.6) * n;
    hemi.intensity = 0.9 + (0.28 - 0.9) * n;
    starMat.opacity = n * 0.9;
    moon.material.opacity = n * 0.95;
    scene.fog.color.copy(fogDay).lerp(fogNight, n);
    if (S.player && S.player.pos) {
      dome.position.set(S.player.pos.x, 0, S.player.pos.z);
      stars.position.set(S.player.pos.x, 0, S.player.pos.z);
    }
  });
}
