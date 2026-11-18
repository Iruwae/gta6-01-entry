// SOLMAR BAY — postfx.js
// Hand-rolled post pipeline (no three/addons vendored in this repo, so the
// composer is written from scratch): scene -> MSAA render target -> bright
// pass -> separable gaussian blur at half res -> composite (bloom + warm
// teal-orange grade + vignette + grain + sRGB encode).
//
// Colour note (three r187): rendering into a render target applies tone
// mapping but skips output colour-space conversion, so the scene target
// holds tone-mapped LINEAR values. The composite shader does the sRGB
// encode itself and renders straight to the canvas (its ShaderMaterial
// carries no coloursapce chunk, so three does not convert it again).
// The DOM HUD is untouched by all of this.

import * as THREE from 'three';

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BRIGHT_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float b = smoothstep(0.55, 0.9, l);
    gl_FragColor = vec4(c * b, 1.0);
  }
`;

const BLUR_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uDir;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    vec2 d = uDir * uTexel;
    vec3 c = texture2D(tDiffuse, vUv).rgb * 0.227027;
    c += texture2D(tDiffuse, vUv + d * 1.384615).rgb * 0.3162162;
    c += texture2D(tDiffuse, vUv - d * 1.384615).rgb * 0.3162162;
    c += texture2D(tDiffuse, vUv + d * 3.230769).rgb * 0.0702703;
    c += texture2D(tDiffuse, vUv - d * 3.230769).rgb * 0.0702703;
    gl_FragColor = vec4(c, 1.0);
  }
`;

const COMPOSITE_FRAG = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform float uTime;
  uniform float uBloom;
  uniform float uVig;
  uniform float uGrain;
  uniform float uHeat;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tScene, vUv).rgb;
    vec3 b = texture2D(tBloom, vUv).rgb;
    c += b * uBloom;
    // Warm grade: shadows drift cool teal, highlights drift warm gold.
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    vec3 warm = vec3(1.06, 1.0, 0.92);
    vec3 cool = vec3(0.94, 0.98, 1.06);
    c *= mix(cool, warm, smoothstep(0.15, 0.85, l));
    // Vignette.
    vec2 dv = vUv - 0.5;
    c *= 1.0 - dot(dv, dv) * uVig;
    // Heat pulse: at high wanted the frame edges burn red (uHeat 0..1).
    float edge = smoothstep(0.25, 0.75, length(dv));
    c = mix(c, vec3(0.9, 0.08, 0.05), edge * uHeat * 0.35);
    // Fine grain (time-driven hash, one frame = one still).
    float g = fract(sin(dot(vUv * (uTime + 13.0), vec2(12.9898, 78.233))) * 43758.5453);
    c += (g - 0.5) * uGrain;
    // sRGB encode: the scene target holds tone-mapped linear values.
    c = pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
    gl_FragColor = vec4(c, 1.0);
  }
`;

function makeRT(w, h, samples) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false,
    samples: samples || 0,
  });
}

export class PostFX {
  // `lite` (headless QA / screenshots): no MSAA and one blur iteration —
  // SwiftShader pays full price for every fullscreen pass, and the lite
  // pipeline keeps the same grade/vignette/bloom look. Real browsers
  // always run the full pipeline.
  constructor(renderer, scene, camera, lite = false) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.lite = !!lite;
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    this.brightMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: QUAD_VERT,
      fragmentShader: BRIGHT_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.blurMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uDir: { value: new THREE.Vector2(1, 0) },
        uTexel: { value: new THREE.Vector2(1 / 640, 1 / 360) },
      },
      vertexShader: QUAD_VERT,
      fragmentShader: BLUR_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.compMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tBloom: { value: null },
        uTime: { value: 0 },
        uBloom: { value: 0.55 },
        uVig: { value: 0.85 },
        uGrain: { value: 0.035 },
        uHeat: { value: 0 },
      },
      vertexShader: QUAD_VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    this.sceneRT = null;
    this.brightRT = null;
    this.blurRT = null;
    this.setSize();
  }

  // Heat pulse: at high wanted the grade pushes a red edge vignette
  // (the post pass is the only place a fullscreen red pulse is cheap).
  setHeatPulse(v) {
    if (this.compMat && this.compMat.uniforms.uHeat) {
      this.compMat.uniforms.uHeat.value = Math.max(0, Math.min(1, v));
    }
  }

  setSize() {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());    const w = Math.max(2, size.x);
    const h = Math.max(2, size.y);
    const hw = Math.max(2, w >> 1);
    const hh = Math.max(2, h >> 1);
    if (this.sceneRT) {
      this.sceneRT.dispose();
      this.brightRT.dispose();
      this.blurRT.dispose();
    }
    this.sceneRT = makeRT(w, h, this.lite ? 0 : 4);
    this.brightRT = makeRT(hw, hh, 0);
    this.blurRT = makeRT(hw, hh, 0);
    this.blurMat.uniforms.uTexel.value.set(1 / hw, 1 / hh);
  }

  render(time) {
    const r = this.renderer;
    // 1. Scene into the MSAA target.
    r.setRenderTarget(this.sceneRT);
    r.render(this.scene, this.camera);
    // 2. Bright pass at half res.
    this.quad.material = this.brightMat;
    this.brightMat.uniforms.tDiffuse.value = this.sceneRT.texture;
    r.setRenderTarget(this.brightRT);
    r.render(this.quadScene, this.quadCam);
    // 3. Separable blur (two H+V iterations full, one lite).
    for (let i = 0; i < (this.lite ? 1 : 2); i++) {
      this.quad.material = this.blurMat;
      this.blurMat.uniforms.tDiffuse.value = this.brightRT.texture;
      this.blurMat.uniforms.uDir.value.set(1, 0);
      r.setRenderTarget(this.blurRT);
      r.render(this.quadScene, this.quadCam);
      this.blurMat.uniforms.tDiffuse.value = this.blurRT.texture;
      this.blurMat.uniforms.uDir.value.set(0, 1);
      r.setRenderTarget(this.brightRT);
      r.render(this.quadScene, this.quadCam);
    }
    // 4. Composite to the canvas.
    this.quad.material = this.compMat;
    this.compMat.uniforms.tScene.value = this.sceneRT.texture;
    this.compMat.uniforms.tBloom.value = this.brightRT.texture;
    this.compMat.uniforms.uTime.value = time;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }
}
