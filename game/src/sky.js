// SOLMAR BAY — sky dome, stars, moon and drifting clouds
// (round 9 rebuild, builder B / world).
// A gradient shader dome holds the sunset look: orange horizon melting
// into purple dusk, sliding to deep night blue as uNight rises. The
// day/night module owns uNight; this module only builds the sky and
// animates the stars, moon and clouds from it. Written fresh from the
// build contract; no other game module is imported.
import * as THREE from '../vendor/three.module.min.js';

function starField(scene) {
  const count = 500;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Random point on the upper hemisphere of a big sphere.
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * Math.PI * 0.48 + 0.03;
    const r = 840;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    pos[i * 3 + 1] = Math.sin(e) * r;
    pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.8,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const stars = new THREE.Points(geo, mat);
  stars.frustumCulled = false;
  scene.add(stars);
  return mat;
}

function moonDisc(scene) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xe8ecff,
    transparent: true,
    opacity: 0,
    fog: false,
  });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(26, 24), mat);
  moon.position.set(-420, 400, -520);
  moon.lookAt(0, 0, 0);
  scene.add(moon);
  return mat;
}

function cloudBank(scene) {
  const mat = new THREE.MeshLambertMaterial({
    color: 0xffe8d8,
    transparent: true,
    opacity: 0.3,
  });
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat);
    puff.scale.set(26 + Math.random() * 22, 4.5, 12 + Math.random() * 8);
    puff.position.set(
      -380 + Math.random() * 760,
      120 + Math.random() * 60,
      -320 + Math.random() * 480,
    );
    scene.add(puff);
    clouds.push({ mesh: puff, speed: 1 + Math.random() * 1.6 });
  }
  return clouds;
}

export function init(ctx) {
  const { scene } = ctx;
  const S = ctx.state || ctx.S;

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uNight: { value: 0 },
      uSunDir: { value: new THREE.Vector3(-0.7, 0.12, 0.3).normalize() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uNight;
      uniform vec3 uSunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.1, 1.0);
        vec3 dayLow = vec3(1.0, 0.52, 0.20);
        vec3 dayHigh = vec3(0.45, 0.22, 0.55);
        vec3 nightLow = vec3(0.05, 0.07, 0.16);
        vec3 nightHigh = vec3(0.01, 0.01, 0.05);
        vec3 low = mix(dayLow, nightLow, uNight);
        vec3 high = mix(dayHigh, nightHigh, uNight);
        vec3 col = mix(low, high, smoothstep(0.0, 0.55, h));
        vec3 sunDir = normalize(uSunDir);
        float glow = pow(max(dot(d, sunDir), 0.0), 24.0);
        col += vec3(1.0, 0.75, 0.4) * glow * (1.0 - uNight) * 0.9;
        float disc = smoothstep(0.9993, 0.9997, dot(d, sunDir));
        col += vec3(1.0, 0.9, 0.7) * disc * (1.0 - uNight);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(880, 28, 18), skyMat);
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  scene.add(dome);
  S.skyDome = dome;

  const starMat = starField(scene);
  const moonMat = moonDisc(scene);
  const clouds = cloudBank(scene);

  ctx.updates.push((dt) => {
    const night = (S.dayNight && S.dayNight.night) || 0;
    // The dome follows the player so its edge is never reached.
    const p = S.player && S.player.pos;
    if (p) dome.position.set(p.x, 0, p.z);
    starMat.opacity = night * 0.9;
    moonMat.opacity = night * 0.95;
    for (const c of clouds) {
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > 430) c.mesh.position.x = -430;
    }
  });
}
