// Avatars: realistic Rocketbox characters driven by motion-capture clips (medium/high tier),
// and the light Quaternius characters with procedural walking (low tier and fallback).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { canvasTex, blobShadow, makeLabel } from "./textures.js";
import { OPT } from "./i18n.js";

const lin = h => new THREE.Color(h);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const loadGLB = url => new Promise((res, rej) => loader.load(url, res, undefined, rej));

/* ---------- light characters ---------- */
const C = { navy: "#13294B", gold: "#C9A24B" };
const LITE = {
  man: { skin: ["Skin"], hair: ["Hair", "Eyebrows"], outfit: ["Suit"], fixed: { Tie: C.gold, White: "#F4F4F2", Black: "#1A1A1C" }, h: 1.76, kid: false },
  woman: { skin: ["Skin"], hair: ["Hair_Blond", "Hair_Brown"], outfit: ["Black"], fixed: { White: "#F4F4F2", Brown: "#2A1A12" }, h: 1.68, kid: false },
  boy: { skin: ["Skin", "Skin_Darker"], hair: ["Hair", "Eyebrows"], outfit: ["LightBrown"], fixed: { LightBlue: "#2D4363", White: "#F2F2F2", Red_Dark: C.navy }, h: 1.22, kid: true },
  girl: { skin: ["Skin"], hair: ["Hair_Blond", "Hair_Brown"], outfit: ["White"], fixed: { Orange: "#2D4363", Grey: "#2B2B30", Brown: "#2A1A12" }, h: 1.16, kid: true },
};
export const KIND_H = { man: 1.76, woman: 1.66, boy: 1.3, girl: 1.28 };

function makeRig(root) {
  root.updateMatrixWorld(true);
  const inv = root.getWorldQuaternion(new THREE.Quaternion()).invert();
  const B = {}; root.traverse(o => { if (o.isBone) B[o.name.replace(/[.:]/g, "")] = o; });
  const rest = {}, pm = {}, pmi = {};
  for (const k in B) { const b = B[k]; rest[k] = b.quaternion.clone(); const m = inv.clone().multiply(b.parent.getWorldQuaternion(new THREE.Quaternion())); pm[k] = m; pmi[k] = m.clone().invert(); }
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  function set(k, rx, ry, rz) { const b = B[k]; if (!b) return; qa.setFromAxisAngle(Z, rz || 0); qb.setFromAxisAngle(X, rx || 0).multiply(qa); if (ry) { qa.setFromAxisAngle(Y, ry); qb.premultiply(qa); } b.quaternion.copy(pmi[k]).multiply(qb).multiply(pm[k]).multiply(rest[k]); }
  function pose(t, w, breath, lean, bank, leg, sit) {
    lean = lean || 0; bank = bank || 0; leg = leg || 0.85;
    const s = Math.sin(t), c = Math.cos(t), br = Math.sin(breath) * 0.025, A = 0.44 * w, K = 1.0 * w;
    if (sit) { set("UpperLegL", -1.5); set("UpperLegR", -1.5); set("LowerLegL", 1.5); set("LowerLegR", 1.5); set("FootL", 0); set("FootR", 0);
      set("UpperArmL", br, 0, -1.2); set("UpperArmR", br, 0, 1.2); set("LowerArmL", -0.6); set("LowerArmR", -0.6); set("Abdomen", 0); set("Chest", -br * 0.4); set("Head", -0.05 + br * 0.3); return -leg * 0.52; }
    const kL = K * Math.max(0, c) * 0.95 + 0.05 * w, kR = K * Math.max(0, -c) * 0.95 + 0.05 * w;
    set("UpperLegL", -A * s - kL * 0.18); set("UpperLegR", A * s - kR * 0.18); set("LowerLegL", kL); set("LowerLegR", kR);
    set("FootL", (A * s - kL * 0.82) * 0.6); set("FootR", (-A * s - kR * 0.82) * 0.6);
    set("UpperArmL", 0.4 * w * s + br, 0, -1.28 + br * 0.6 - bank * 0.4); set("UpperArmR", -0.4 * w * s + br, 0, 1.28 - br * 0.6 - bank * 0.4);
    set("LowerArmL", -0.2 - 0.25 * w - Math.max(0, -s) * 0.15 * w); set("LowerArmR", -0.2 - 0.25 * w - Math.max(0, s) * 0.15 * w);
    set("Abdomen", lean * 0.5, -0.04 * w * s, bank * 0.5); set("Chest", 0.02 * w + lean * 0.5 - br * 0.4, 0.08 * w * s, bank * 0.5); set("Head", -0.03 + br * 0.3 - lean * 0.6, -0.06 * w * s, -bank * 0.6);
    return -leg * (1 - Math.cos(A * s)) + 0.012 * w * Math.abs(c);
  }
  return { B, set, pose, rest };
}

/* ---------- library ---------- */
export class AvatarLib {
  constructor(base) { this.base = base; this.manifest = null; this.cache = new Map(); this.anims = new Map(); this.lite = new Map(); }
  async init() {
    try { this.manifest = await (await fetch(this.base + "models/avatars.json")).json(); } catch (e) { this.manifest = { avatars: [], anims: {} }; }
    return this.manifest;
  }
  variants(kind) { return (this.manifest?.avatars || []).filter(a => a.kind === kind); }
  info(id) { return (this.manifest?.avatars || []).find(a => a.id === id); }
  async real(id) {
    if (!this.cache.has(id)) {
      const a = this.info(id); if (!a) throw new Error("unknown avatar " + id);
      this.cache.set(id, loadGLB(this.base + a.file).then(g => ({ gltf: g, info: a })));
    }
    return this.cache.get(id);
  }
  async clips(g) {
    if (!this.anims.has(g)) {
      const a = this.manifest.anims[g];
      this.anims.set(g, loadGLB(this.base + a.file).then(gl => ({ clips: gl.animations, meta: a.clips })));
    }
    return this.anims.get(g);
  }
  async liteModel(kind) {
    if (!this.lite.has(kind)) this.lite.set(kind, loadGLB(this.base + `models/lite/${kind}.glb`));
    return this.lite.get(kind);
  }
}

const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpV = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
// rotate a bone by a world-space rotation, keeping the result in its local frame
function worldRotate(bone, axis, angle) {
  if (!bone || !angle) return;
  bone.parent.getWorldQuaternion(tmpQ);
  tmpQ2.setFromAxisAngle(axis, angle);
  bone.quaternion.premultiply(tmpQ.clone().invert().multiply(tmpQ2).multiply(tmpQ));
}

/* ---------- one avatar in the world ---------- */
export class Avatar {
  // spec: {kind, id (real variant), look:[skin,hair,outfit] (lite), h (height scale), name, photo}
  constructor(lib, spec, { shadows = false, real = true } = {}) {
    this.lib = lib; this.spec = { ...spec }; this.shadows = shadows; this.wantReal = real;
    this.root = new THREE.Group(); this.model = new THREE.Group(); this.root.add(this.model);
    if (!Avatar.blobTex) Avatar.blobTex = canvasTex(blobShadow());
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: Avatar.blobTex, transparent: true, depthWrite: false, opacity: 0.9 }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.position.y = 0.012; this.blob.scale.setScalar(0.95); this.root.add(this.blob);
    this.label = null; this.ready = false; this.kind = spec.kind;
    this.speed = 0; this.phase = 0; this.breath = Math.random() * 6; this.lean = 0; this.bank = 0; this.sitting = false; this.lookAt = null; this.lookW = 0;
  }
  get height() { return (KIND_H[this.kind] || 1.7) * (this.spec.h || 1); }
  async load() {
    const s = this.spec; this.kind = s.kind;
    let ok = false;
    if (this.wantReal && s.id) { try { await this._loadReal(s.id); ok = true; } catch (e) { console.warn("real avatar failed, using light one", e); } }
    if (!ok) await this._loadLite(s.kind, s.look || [1, 0, 0]);
    this.model.scale.setScalar(s.h || 1);
    this.setLabel(s.name, s.photo);
    this.ready = true; return this;
  }
  _clear() { while (this.model.children.length) { const c = this.model.children[0]; this.model.remove(c); c.traverse?.(o => { if (o.isMesh) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose?.()); } }); } this.mixer = null; this.rig = null; this.actions = null; }
  async _loadReal(id) {
    const { gltf, info } = await this.lib.real(id);
    const { clips, meta } = await this.lib.clips(info.g);
    this._clear();
    const obj = SkeletonUtils.clone(gltf.scene);
    obj.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = this.shadows; o.receiveShadow = false; const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.envMapIntensity = 0.7; if (m.alphaTest) { m.transparent = true; m.alphaTest = 0.04; m.depthWrite = true; } }); } });
    this.model.add(obj); this.real = true; this.info = info;
    this.mixer = new THREE.AnimationMixer(obj); this.actions = {}; this.meta = meta;
    const ratio = info.hip && meta.idle?.hip ? info.hip / meta.idle.hip : 1;
    for (const c of clips) {
      let clip = c;
      if (Math.abs(ratio - 1) > 0.02) { // children: shorter legs, scale the hip height track
        clip = c.clone(); const t = clip.tracks.find(t => /Bip01\.position$/.test(t.name)); if (t) { t.values = t.values.slice(); for (let i = 0; i < t.values.length; i++) t.values[i] *= ratio; }
      }
      const a = this.mixer.clipAction(clip); a.enabled = true; a.setEffectiveWeight(0); a.play(); this.actions[c.name] = a;
    }
    for (const k of ["wave", "clap", "look"]) if (this.actions[k]) { this.actions[k].stop(); this.actions[k].setLoop(THREE.LoopOnce, 1); this.actions[k].clampWhenFinished = false; }
    this.bones = {}; obj.traverse(o => { if (o.isBone) this.bones[o.name] = o; });
    this.w = { idle: 1, walk: 0, jog: 0, sit: 0 };
    this.walkSpeed = (meta.walk?.speed || 1.35) * ratio; this.jogSpeed = (meta.jog?.speed || 2.3) * ratio;
    this.blob.scale.setScalar(this.kind === "boy" || this.kind === "girl" ? 0.75 : 0.95);
  }
  async _loadLite(kind, look) {
    const g = await this.lib.liteModel(kind);
    this._clear(); this.real = false;
    const obj = SkeletonUtils.clone(g.scene); const L = LITE[kind];
    obj.scale.setScalar(L.h / 1.86 * (KIND_H[kind] / L.h));
    const mats = [];
    obj.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = this.shadows; o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.roughness = 0.82; m.metalness = 0; mats.push(m); }); } });
    this.model.add(obj); this.mats = mats; this.rig = makeRig(obj);
    if (L.kid && this.rig.B.Head) this.rig.B.Head.scale.setScalar(1.18);
    this.applyLook(look);
    this.blob.scale.setScalar(L.kid ? 0.75 : 0.95);
  }
  applyLook(look) {
    if (this.real || !this.mats) return; const m = LITE[this.kind]; const pick = (arr, i) => arr[Math.min(arr.length - 1, Math.max(0, i | 0))][0];
    this.mats.forEach(x => { const n = x.name; if (m.skin.includes(n)) x.color.copy(lin(pick(OPT.skin, look[0]))).multiplyScalar(n === "Skin_Darker" ? 0.85 : 1); else if (m.hair.includes(n)) x.color.copy(lin(pick(OPT.hair, look[1]))); else if (m.outfit.includes(n)) x.color.copy(lin(pick(OPT.outfit, look[2]))); else if (m.fixed[n]) x.color.copy(lin(m.fixed[n])); });
  }
  setLabel(name, photo) {
    if (this.label) { this.root.remove(this.label); this.label.material.map.dispose(); this.label = null; }
    if (!name && !photo) return;
    this.label = makeLabel(name, photo); this.label.position.y = this.height + 0.3; this.root.add(this.label);
  }
  setHeightScale(h) { this.spec.h = h; this.model.scale.setScalar(h); if (this.label) this.label.position.y = this.height + 0.3; }
  emote(name) {
    if (this.sitting && name !== "sit") return;
    if (this.real && this.actions?.[name]) { const a = this.actions[name]; a.reset(); a.setEffectiveWeight(1); a.fadeIn(0.3); a.play(); this.emoting = name; this.emoteT = a.getClip().duration; }
    else if (!this.real) { this.emoting = name; this.emoteT = 2.2; }
  }
  // per-frame: speed in m/s, turnRate rad/s, accel m/s²
  update(dt, { speed = 0, turnRate = 0, accel = 0, sitting = false, lookAt = null } = {}) {
    if (!this.ready) return;
    this.breath += dt * 1.6; this.sitting = sitting;
    this.lean += (THREE.MathUtils.clamp(accel * 0.02 + speed * 0.025, -0.1, 0.14) - this.lean) * (1 - Math.exp(-dt * 6));
    this.bank += (THREE.MathUtils.clamp(-turnRate * speed * 0.03, -0.14, 0.14) - this.bank) * (1 - Math.exp(-dt * 6));
    if (this.emoting) { this.emoteT -= dt; if (this.emoteT <= 0 || speed > 0.3) { if (this.real && this.actions?.[this.emoting]) this.actions[this.emoting].fadeOut(0.35); this.emoting = null; } }
    if (this.real) this._updateReal(dt, speed, sitting, lookAt); else this._updateLite(dt, speed, sitting);
  }
  _updateReal(dt, speed, sitting, lookAt) {
    const A = this.actions, ws = this.walkSpeed, js = this.jogSpeed;
    let wIdle = 0, wWalk = 0, wJog = 0, wSit = sitting ? 1 : 0;
    if (!sitting) {
      if (speed < 0.08) wIdle = 1;
      else if (speed < ws) { const t = THREE.MathUtils.smoothstep(speed, 0.08, ws * 0.7); wIdle = 1 - t; wWalk = t; }
      else { const t = THREE.MathUtils.clamp((speed - ws) / (js - ws), 0, 1); wWalk = 1 - t; wJog = t; }
    }
    const k = 1 - Math.exp(-dt * 8), W = this.w;
    W.idle += (wIdle - W.idle) * k; W.walk += (wWalk - W.walk) * k; W.jog += (wJog - W.jog) * k; W.sit += (wSit - W.sit) * (1 - Math.exp(-dt * 5));
    const emoteW = this.emoting && A[this.emoting] ? A[this.emoting].getEffectiveWeight() : 0;
    const base = 1 - Math.min(1, emoteW);
    A.idle?.setEffectiveWeight(W.idle * base); A.walk?.setEffectiveWeight(W.walk); A.jog?.setEffectiveWeight(W.jog); A.sit?.setEffectiveWeight(W.sit);
    A.look?.setEffectiveWeight(0);
    // speed-matched cadence: feet do not slide
    if (A.walk) A.walk.timeScale = speed > 0.08 ? THREE.MathUtils.clamp(speed / ws, 0.55, 1.5) : 1;
    if (A.jog) A.jog.timeScale = speed > ws ? THREE.MathUtils.clamp(speed / js, 0.7, 1.4) : 1;
    if (A.walk && A.jog && W.walk > 0.05 && W.jog > 0.05) A.jog.time = (A.walk.time / A.walk.getClip().duration) * A.jog.getClip().duration;
    this.mixer.update(dt);
    // procedural layers on top of the mocap: lean into acceleration, bank into turns, look at the nearest painting
    const b = this.bones;
    const fwd = tmpV.set(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    this.root.updateMatrixWorld(true);
    worldRotate(b.Bip01_Spine1, right, this.lean * 0.6);
    worldRotate(b.Bip01_Spine1, fwd, this.bank);
    const want = lookAt && !sitting ? 1 : 0; this.lookW += (want - this.lookW) * (1 - Math.exp(-dt * 3));
    if (lookAt) this._lastLook = lookAt;
    if (this.lookW > 0.01 && this._lastLook && b.Bip01_Head) {
      const head = b.Bip01_Head.getWorldPosition(new THREE.Vector3());
      const d = this._lastLook.clone().sub(head); const yawTo = Math.atan2(d.x, d.z) - this.root.rotation.y; const yw = Math.atan2(Math.sin(yawTo), Math.cos(yawTo));
      const yawC = THREE.MathUtils.clamp(yw, -1.0, 1.0) * this.lookW; const pitch = THREE.MathUtils.clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.4, 0.35) * this.lookW;
      worldRotate(b.Bip01_Neck, UP, yawC * 0.4); worldRotate(b.Bip01_Head, UP, yawC * 0.6);
      const r2 = new THREE.Vector3(Math.cos(this.root.rotation.y + yawC), 0, -Math.sin(this.root.rotation.y + yawC));
      worldRotate(b.Bip01_Head, r2, -pitch * 0.8);
    }
  }
  _updateLite(dt, speed, sitting) {
    const L = LITE[this.kind], leg = (KIND_H[this.kind]) * 0.5;
    const w = sitting ? 0 : Math.min(1, speed / (L.kid ? 1.9 : 2.4) * 1.1);
    this.wl = (this.wl || 0) + (w - (this.wl || 0)) * (1 - Math.exp(-dt * 8));
    const A = Math.max(0.12, 0.44 * this.wl), stride = 2 * leg * Math.sin(A);
    this.phase += dt * (speed > 0.03 ? Math.PI * speed / stride : 0);
    let bob = this.rig.pose(this.phase, this.wl, this.breath, this.lean, this.bank, leg, sitting);
    if (this.emoting === "wave") { this.rig.set("UpperArmR", 0, 0, -0.2 + Math.sin(this.breath * 6) * 0.25); this.rig.set("LowerArmR", -1.2); }
    if (this.emoting === "clap") { const c = Math.abs(Math.sin(this.breath * 7)); this.rig.set("UpperArmL", -0.9, 0, -0.5 - c * 0.3); this.rig.set("UpperArmR", -0.9, 0, 0.5 + c * 0.3); this.rig.set("LowerArmL", -1); this.rig.set("LowerArmR", -1); }
    this.model.position.y = bob * (this.spec.h || 1);
  }
  dispose() { this._clear(); if (this.label) this.label.material.map.dispose(); this.root.parent?.remove(this.root); }
}
