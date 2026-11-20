import * as THREE from '../vendor/three.module.min.js';

// SOLMAR BAY — the sky dome: a big inside-out sphere with a hand-written
// gradient shader. Golden-hour orange on the horizon melts into violet
// overhead; as uNight climbs the sky goes deep navy and stars fade in.
// The sun glow sits low in the west so the sunset look survives the
// whole opening hour.
export function init(S) {
  const geo = new THREE.SphereGeometry(620, 32, 18);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uNight: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      uniform float uNight;
      uniform float uTime;
      float hash3(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      }
      void main() {
        float h = clamp(vDir.y, -0.08, 1.0);
        vec3 duskHorizon = vec3(1.0, 0.52, 0.22);
        vec3 duskZenith = vec3(0.42, 0.22, 0.52);
        vec3 nightHorizon = vec3(0.05, 0.07, 0.16);
        vec3 nightZenith = vec3(0.008, 0.015, 0.055);
        vec3 horizon = mix(duskHorizon, nightHorizon, uNight);
        vec3 zenith = mix(duskZenith, nightZenith, uNight);
        vec3 col = mix(horizon, zenith, pow(max(h, 0.0), 0.55));
        vec3 sunDir = normalize(vec3(-0.72, 0.10, -0.28));
        float glow = pow(max(dot(normalize(vDir), sunDir), 0.0), 22.0);
        col += vec3(1.0, 0.48, 0.16) * glow * (1.0 - uNight) * 0.95;
        float wide = pow(max(dot(normalize(vDir), sunDir), 0.0), 5.0);
        col += vec3(0.9, 0.35, 0.12) * wide * (1.0 - uNight) * 0.22;
        if (uNight > 0.04 && vDir.y > 0.02) {
          vec3 cell = floor(vDir * 240.0);
          float s = hash3(cell);
          float star = step(0.9965, s) * uNight;
          float twinkle = 0.55 + 0.45 * sin(uTime * 2.0 + s * 43.0);
          col += vec3(star * twinkle);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  mat.fog = false;
  const dome = new THREE.Mesh(geo, mat);
  dome.frustumCulled = false;
  S.skyDome = dome;
  S.scene.add(dome);

  S.scene.fog = new THREE.Fog(0x4a2a44, 130, 540);

  const hemi = new THREE.HemisphereLight(0xffc27a, 0x2a2438, 0.7);
  S.hemi = hemi;
  S.scene.add(hemi);

  const fill = new THREE.AmbientLight(0x604a66, 0.35);
  S.ambient = fill;
  S.scene.add(fill);
  return dome;
}
