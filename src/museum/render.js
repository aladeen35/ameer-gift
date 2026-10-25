// Renderer, environment lighting and the post-processing chain for each quality tier.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";

export function makeRenderer(canvas, q) {
  const R = new THREE.WebGLRenderer({ canvas, antialias: q.aa === "msaa", powerPreference: "high-performance", stencil: false, preserveDrawingBuffer: /[?&]shot=1/.test(location.search) });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, q.pixelRatio));
  R.outputColorSpace = THREE.SRGBColorSpace;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.92;
  R.shadowMap.enabled = q.shadows; R.shadowMap.type = THREE.PCFShadowMap;
  return R;
}

// Warm interior reflections without downloading an HDRI: three's procedural room, tinted
export function makeEnvironment(R) {
  const pm = new THREE.PMREMGenerator(R);
  const room = new RoomEnvironment();
  room.traverse(o => { if (o.isMesh && o.material?.color) o.material.color.multiply(new THREE.Color(1.0, 0.93, 0.82)); });
  const env = pm.fromScene(room, 0.04).texture; pm.dispose();
  return env;
}

export class Post {
  constructor(R, q) { this.R = R; this.q = q; this.composer = null; this.scene = null; this.camera = null; }
  setup(scene, camera, opts = {}) {
    this.scene = scene; this.camera = camera;
    if (this.composer) { this.composer.dispose?.(); this.composer = null; }
    if (this.q.post === "none") return;
    const R = this.R, w = innerWidth, h = innerHeight;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: this.q.post === "high" ? 0 : 0 });
    const c = new EffectComposer(R, rt); c.setPixelRatio(R.getPixelRatio()); c.setSize(w, h);
    c.addPass(new RenderPass(scene, camera));
    if (this.q.ao && opts.ao !== false) { const ao = new GTAOPass(scene, camera, w, h); ao.blendIntensity = 0.75; ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1, scale: 1 }); c.addPass(ao); this.ao = ao; }
    if (this.q.bloom && opts.bloom !== false && !/[?&]bloom=0/.test(location.search)) { const b = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.35, 0.3, 1.9); c.addPass(b); this.bloom = b; }
    c.addPass(new OutputPass());
    if (/[?&]aa=0/.test(location.search)) {} else if (this.q.aa === "smaa") c.addPass(new SMAAPass(w * R.getPixelRatio(), h * R.getPixelRatio()));
    else if (this.q.aa === "fxaa") { const f = new ShaderPass(FXAAShader); f.material.uniforms.resolution.value.set(1 / (w * R.getPixelRatio()), 1 / (h * R.getPixelRatio())); c.addPass(f); this.fxaa = f; }
    this.composer = c;
  }
  resize(w, h) {
    this.R.setSize(w, h, false);
    if (this.composer) { this.composer.setSize(w, h); if (this.fxaa) this.fxaa.material.uniforms.resolution.value.set(1 / (w * this.R.getPixelRatio()), 1 / (h * this.R.getPixelRatio())); }
  }
  render(scene, camera) {
    if (this.composer && scene === this.scene && camera === this.camera) this.composer.render();
    else this.R.render(scene, camera);
  }
}
