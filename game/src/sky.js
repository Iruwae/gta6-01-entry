// SOLMAR BAY — sky.js
// Sunset art direction, fully procedural: gradient sky dome with sun disc,
// animated water shader, PMREM environment for car-paint reflections, and
// shared canvas textures (soft glow, asphalt noise). No external assets,
// no network at runtime. All original code, written fresh.

import * as THREE from 'three';

// Sun direction (from origin toward the sun): low in the west-southwest,
// so the whole city gets long warm shadows at golden hour.
export const SUN_DIR = new THREE.Vector3(-0.62, 0.30, 0.42).normalize();

// ---------------------------------------------------------------------------
// Canvas textures
// ---------------------------------------------------------------------------

// Soft radial glow (lamp halos, particle sprites, clouds).
export function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Subtle grey noise for ground / sand (tileable-ish speckle).
export function makeNoiseTexture(base, speckA, speckB, seed) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 5200; i++) {
    g.fillStyle = next() < 0.5 ? speckA : speckB;
    g.globalAlpha = 0.05 + next() * 0.12;
    const s = 1 + next() * 2.5;
    g.fillRect(next() * 256, next() * 256, s, s);
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Sky dome: sunset gradient + sun disc + wide warm haze.
// ---------------------------------------------------------------------------

export function makeSkyDome() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uSunDir: { value: SUN_DIR.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform vec3 uSunDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.08, 1.0);
        vec3 zen = vec3(0.10, 0.10, 0.30);   // deep indigo overhead
        vec3 mid = vec3(0.52, 0.22, 0.42);   // purple-pink band
        vec3 hor = vec3(1.00, 0.52, 0.24);   // orange horizon
        vec3 col = mix(hor, mid, smoothstep(0.0, 0.22, h));
        col = mix(col, zen, smoothstep(0.18, 0.65, h));
        col = mix(vec3(0.14, 0.09, 0.13), col, smoothstep(-0.08, 0.02, d.y));
        float s = max(dot(d, uSunDir), 0.0);
        col += vec3(1.0, 0.78, 0.50) * pow(s, 350.0) * 3.0;  // sun disc
        col += vec3(1.0, 0.55, 0.25) * pow(s, 24.0) * 0.55;  // near glow
        col += vec3(0.90, 0.35, 0.25) * pow(s, 6.0) * 0.22;   // wide haze
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(760, 32, 18), mat);
  mesh.frustumCulled = false;
  return mesh;
}

// Soft sunset clouds: big tinted glow sprites drifting high above the city.
// Positions come from their own seeded stream so the city layout never moves.
export function makeClouds(scene) {
  let a = 20240 >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const tex = makeGlowTexture();
  const tints = [0xffb08a, 0xff9a7a, 0xe88aa0, 0xffc49a];
  for (let i = 0; i < 9; i++) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: tints[i % tints.length],
      transparent: true,
      opacity: 0.28 + next() * 0.14,
      depthWrite: false,
      fog: false,
    });
    const sp = new THREE.Sprite(mat);
    sp.position.set(-320 + next() * 640, 150 + next() * 90, -300 + next() * 380);
    sp.scale.set(110 + next() * 90, 26 + next() * 18, 1);
    scene.add(sp);
  }
}

// ---------------------------------------------------------------------------
// Water: animated vertex waves + fresnel sky reflection + sun glitter + foam.
// ---------------------------------------------------------------------------

export function makeWaterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: SUN_DIR.clone() },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.15 + uTime * 1.1) * 0.12
                + sin(p.y * 0.11 - uTime * 0.8) * 0.10
                + sin((p.x + p.y) * 0.05 + uTime * 0.5) * 0.14;
        p.z += w;
        float dwdx = 0.15 * 0.12 * cos(p.x * 0.15 + uTime * 1.1)
                   + 0.05 * 0.14 * cos((p.x + p.y) * 0.05 + uTime * 0.5);
        float dwdy = 0.11 * 0.10 * cos(p.y * 0.11 - uTime * 0.8)
                   + 0.05 * 0.14 * cos((p.x + p.y) * 0.05 + uTime * 0.5);
        vNormal = normalize(normalMatrix * vec3(-dwdx, -dwdy, 1.0));
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 N = normalize(vNormal);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 deep = vec3(0.05, 0.23, 0.33);
        vec3 skyRef = vec3(1.0, 0.55, 0.30);
        vec3 col = mix(deep, skyRef, fres * 0.85);
        vec3 R = reflect(-V, N);
        float g = pow(max(dot(R, uSunDir), 0.0), 220.0);
        col += vec3(1.0, 0.8, 0.5) * g * 2.0;
        float foam = smoothstep(178.0, 181.0, vWorldPos.z)
          * (0.5 + 0.5 * sin(vWorldPos.x * 0.8 + uTime * 1.5));
        col = mix(col, vec3(0.9, 0.95, 0.9), foam * 0.35);
        gl_FragColor = vec4(col, 0.92);
      }
    `,
  });
}

// ---------------------------------------------------------------------------
// Environment map: PMREM from a tiny gradient scene, so car paint and glass
// get warm sunset reflections without any external HDR asset.
// ---------------------------------------------------------------------------

export function makeEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const dome = makeSkyDome();
  dome.scale.setScalar(0.06);
  envScene.add(dome);
  const sunBall = new THREE.Mesh(
    new THREE.SphereGeometry(3, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0 }),
  );
  sunBall.position.copy(SUN_DIR).multiplyScalar(45);
  envScene.add(sunBall);
  const tex = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  return tex;
}
