// Converts Microsoft Rocketbox avatars and motion-capture clips (MIT) into small web-ready GLB files.
//
//   node tools/build-avatars.mjs            -> writes public/models/avatars/*.glb and public/models/anims-{m,f}.glb
//
// Steps per avatar: download FBX + TGA textures from GitHub, parse with three's FBXLoader (in Node),
// export a skinned glTF, then simplify (meshoptimizer), resize textures to WebP and meshopt-compress.
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import sharp from "sharp";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";
import { weld, simplify, prune, dedup, quantize, meshopt, resample } from "@gltf-transform/functions";
import { MeshoptSimplifier, MeshoptEncoder } from "meshoptimizer";

const RAW = "https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/";
const CACHE = ".cache/rocketbox";
const OUT = "public/models";
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(path.join(OUT, "avatars"), { recursive: true });

// Modest, Gulf/Sudan-friendly selection. `g` picks the animation set (male / female clips).
export const AVATARS = [
  { id: "m-thobe-shemagh", src: "Adults/Male_Adult_19", g: "m", kind: "man" },
  { id: "m-sudan-jalabiya", src: "Adults/Male_Adult_15", g: "m", kind: "man", accessory: "imma", recolor: { skin: 0.68, capWhite: true } },
  { id: "m-thobe-ghutra", src: "Adults/Male_Adult_21", g: "m", kind: "man" },
  { id: "m-thobe-kufi", src: "Adults/Male_Adult_15", g: "m", kind: "man" },
  { id: "m-shirt-blue", src: "Adults/Male_Adult_08", g: "m", kind: "man" },
  { id: "m-shirt-khaki", src: "Adults/Male_Adult_14", g: "m", kind: "man" },
  { id: "f-hijab-white", src: "Adults/Female_Adult_06", g: "f", kind: "woman" },
  { id: "f-sudan-toub-orange", src: "Adults/Female_Adult_06", g: "f", kind: "woman", recolor: { skin: 0.62, toub: ["#C8501E", "#F2C14E"] } },
  { id: "f-sudan-toub-teal", src: "Adults/Female_Adult_06", g: "f", kind: "woman", recolor: { skin: 0.56, toub: ["#0F6E6A", "#E9C46A"] } },
  { id: "f-abaya-black", src: "Adults/Female_Adult_10", g: "f", kind: "woman" },
  { id: "f-coat-grey", src: "Adults/Female_Adult_09", g: "f", kind: "woman" },
  { id: "f-coat-beige", src: "Adults/Female_Adult_14", g: "f", kind: "woman" },
  // Sudanese characters, derived from the avatars above: jalabiya + imma (turban added in the app), and a toub in two colours
  { id: "b-blue", src: "Children/Male_Child_01", g: "m", kind: "boy" },
  { id: "b-orange", src: "Children/Male_Child_02", g: "m", kind: "boy" },
  { id: "g-hijab-green", src: "Children/Female_Child_02", g: "f", kind: "girl" },
  { id: "g-pink", src: "Children/Female_Child_01", g: "f", kind: "girl" },
];
const CLIPS = {
  idle: "all_animations_max_motextr_static/{g}_idle_neutral_01.max.fbx",
  look: "all_animations_max_motextr_static/{g}_idle_look_around_01.max.fbx",
  walk: "all_animations_max_motextr_xy/{g}_walk_neutral.max.fbx",
  jog: "all_animations_max_motextr_xy/{g}_run_slow_01.max.fbx",
  wave: "all_animations_max_motextr_static/{g}_wave_01.max.fbx",
  clap: "all_animations_max_motextr_static/{g}_claphands_01.max.fbx",
  sit: "all_animations_max_motextr_static/{g}_sit_chair_idle_neutral_01.max.fbx",
};
const TARGET_TRIS = 16000;

/* ---------- Node shims for three ---------- */
THREE.TextureLoader.prototype.load = function () { return new THREE.Texture(); };
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(b => { this.result = b; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(b => { this.result = "data:application/octet-stream;base64," + Buffer.from(b).toString("base64"); this.onloadend?.(); }); }
};

async function fetchCached(rel) {
  const file = path.join(CACHE, rel.replace(/[\\/ ]/g, "_"));
  if (fs.existsSync(file) && fs.statSync(file).size > 100) return fs.readFileSync(file);
  for (let i = 0; i < 4; i++) {
    const r = await fetch(RAW + rel.split("/").map(encodeURIComponent).join("/"));
    if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(file, b); return b; }
    if (r.status === 404) return null;
    await new Promise(res => setTimeout(res, 2000 * 2 ** i));
  }
  throw new Error("download failed " + rel);
}
function parseFBX(buf) { return new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), ""); }

// Minimal TGA decoder (uncompressed and RLE, 24/32 bit) -> RGBA buffer
function decodeTGA(b) {
  const idLen = b[0], type = b[2], w = b.readUInt16LE(12), h = b.readUInt16LE(14), bpp = b[16], desc = b[17];
  const px = bpp / 8, out = Buffer.alloc(w * h * 4); let p = 18 + idLen, n = 0;
  const put = o => { out[n * 4] = b[o + 2]; out[n * 4 + 1] = b[o + 1]; out[n * 4 + 2] = b[o]; out[n * 4 + 3] = px === 4 ? b[o + 3] : 255; n++; };
  if (type === 2 || type === 3) { while (n < w * h) { put(p); p += px; } }
  else if (type === 10) {
    while (n < w * h) { const c = b[p++], k = (c & 0x7f) + 1; if (c & 0x80) { for (let i = 0; i < k; i++) put(p); p += px; } else { for (let i = 0; i < k; i++) { put(p); p += px; } } }
  } else throw new Error("unsupported TGA type " + type);
  if (!(desc & 0x20)) { // bottom-up -> flip
    const row = w * 4, tmp = Buffer.alloc(row);
    for (let y = 0; y < h / 2; y++) { const a = y * row, z = (h - 1 - y) * row; out.copy(tmp, 0, a, a + row); out.copy(out, a, z, z + row); tmp.copy(out, z); }
  }
  return { data: out, width: w, height: h };
}
// Recolouring for the Sudanese variants: darker skin, toub fabric with a woven gold motif, white cap under the imma
function hsv(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx / 255]; }
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
function recolor(img, rc, role) {
  const { data, width: w, height: h } = img;
  const [base, accent] = rc.toub ? rc.toub.map(hex) : [null, null];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (data[i + 3] === 0 && role !== "opacity") continue;
    const r = data[i], g = data[i + 1], b = data[i + 2]; const [hu, sa, va] = hsv(r, g, b);
    const u = x / w, v = y / h;
    const skin = role !== "opacity" && hu < 45 && sa > 0.16 && sa < 0.85 && va > 0.12;
    let cloth = false, ref = 0.8;
    if (base) {
      if (role === "body" && hu >= 40 && hu <= 95 && sa > 0.12) { cloth = true; ref = 0.5; }
      if (role === "head" && sa < 0.24 && va > 0.42 && !(u < 0.36 && v > 0.82)) { cloth = true; ref = 0.85; }
      if (role === "body" && sa < 0.2 && va > 0.55 && !skin) { cloth = true; ref = 0.85; }
      if (role === "opacity") { cloth = true; ref = 0.85; }
    }
    if (cloth) {
      const shade = Math.min(1.25, va / ref);
      // woven motif: fine diagonal gold threads + small diamonds on a grid
      const d1 = (x + y) % 22 < 2, d2 = Math.abs(((x % 28) - 14)) + Math.abs(((y % 28) - 14)) < 4;
      const c = d1 || d2 ? accent : base;
      data[i] = Math.min(255, c[0] * shade); data[i + 1] = Math.min(255, c[1] * shade); data[i + 2] = Math.min(255, c[2] * shade);
      continue;
    }
    if (rc.capWhite && role === "head" && v > 0.79 && !skin && va > 0.18) { const l = Math.min(255, 150 + va * 110); data[i] = l; data[i + 1] = l; data[i + 2] = l * 0.98; continue; }
    if (skin && rc.skin) {
      const k = rc.skin, sat = 1.12;
      const m = (r + g + b) / 3; data[i] = Math.min(255, (m + (r - m) * sat) * k); data[i + 1] = Math.min(255, (m + (g - m) * sat) * k * 0.97); data[i + 2] = Math.min(255, (m + (b - m) * sat) * k * 0.92);
    }
  }
  return img;
}
async function tgaToWebP(buf, size, { alpha = false, quality = 80, normal = false, rc = null, role = "" } = {}) {
  const { data, width, height } = rc ? recolor(decodeTGA(buf), rc, role) : decodeTGA(buf);
  let img = sharp(data, { raw: { width, height, channels: 4 } }).resize(size, size, { fit: "fill" });
  if (!alpha) img = img.removeAlpha();
  return img.webp({ quality: normal ? 90 : quality, alphaQuality: 90, effort: 6 }).toBuffer();
}

async function exportGLB(scene, animations = []) {
  const ex = new GLTFExporter();
  const ab = await ex.parseAsync(scene, { binary: true, animations, onlyVisible: false });
  return new Uint8Array(ab);
}

let io;
async function getIO() {
  if (io) return io;
  await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
  return io;
}

/* ---------- avatars ---------- */
async function buildAvatar(a) {
  const name = path.basename(a.src);
  const fbx = await fetchCached(`Assets/Avatars/${a.src}/Export/${name}.fbx`);
  const obj = parseFBX(fbx);
  let skinned = null; obj.traverse(o => { if (o.isSkinnedMesh && !skinned) skinned = o; });
  if (!skinned) throw new Error("no skinned mesh in " + name);
  // children are rigged as "Bip02": rename so the shared clips (Bip01) drive every avatar
  obj.traverse(o => { if (o.isBone) o.name = o.name.replace(/^Bip0\d/, "Bip01"); });
  const mats = Array.isArray(skinned.material) ? skinned.material : [skinned.material];
  // Clean materials: names drive texture lookup (e.g. f001_body -> f001_body_color.tga)
  const clean = mats.map(m => new THREE.MeshStandardMaterial({ name: m.name, roughness: 0.8, metalness: 0 }));
  skinned.material = clean.length > 1 ? clean : clean[0];
  obj.traverse(o => { if (o.isMesh && o !== skinned) o.visible = false; });
  obj.animations = [];
  // FBX UVs follow three's flipY texture convention; glTF images are top-down, so flip V
  const uvA = skinned.geometry.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setY(i, 1 - uvA.getY(i));
  const root = new THREE.Group(); root.name = "avatar"; root.add(obj); obj.scale.setScalar(0.01); // cm -> m
  const glb = await exportGLB(root);

  const io = await getIO();
  const doc = await io.readBinary(glb);
  // remove hidden helper meshes the exporter kept as empty nodes
  await doc.transform(weld());
  let tris = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() || 0) / 3;
  if (tris > TARGET_TRIS) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: TARGET_TRIS / tris, error: 0.01 }));
  tris = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() || 0) / 3;

  // textures
  doc.createExtension(EXTTextureWebP).setRequired(true);
  for (const mat of doc.getRoot().listMaterials()) {
    const base = mat.getName();
    const isOpacity = /opacity/i.test(base);
    const color = await fetchCached(`Assets/Avatars/${a.src}/Textures/${base}_color.tga`);
    if (color) {
      const role = isOpacity ? "opacity" : /head/.test(base) ? "head" : "body";
      const tex = doc.createTexture(base + "_c").setMimeType("image/webp").setImage(await tgaToWebP(color, isOpacity ? 512 : role === "head" ? 512 : 1024, { alpha: isOpacity, rc: a.recolor, role }));
      mat.setBaseColorTexture(tex);
    }
    if (isOpacity) { mat.setAlphaMode("MASK").setAlphaCutoff(0.4).setDoubleSided(true); }
    const nrm = !isOpacity && (await fetchCached(`Assets/Avatars/${a.src}/Textures/${base}_normal.tga`));
    if (nrm) mat.setNormalTexture(doc.createTexture(base + "_n").setMimeType("image/webp").setImage(await tgaToWebP(nrm, 512, { normal: true })));
    mat.setRoughnessFactor(isOpacity ? 0.9 : 0.75).setMetallicFactor(0);
  }
  await doc.transform(prune(), dedup(), quantize({ quantizeNormal: 10, quantizeTexcoord: 12, quantizePosition: 14 }), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  doc.getRoot().getAsset().extras = { source: "Microsoft Rocketbox " + a.src, license: "MIT" };
  const out = path.join(OUT, "avatars", a.id + ".glb");
  await io.write(out, doc);
  // hip height (Bip01 rest Y) lets the app rescale shared clips for children
  let hip = 0; obj.traverse(o => { if (o.isBone && o.name === "Bip01") hip = o.getWorldPosition(new THREE.Vector3()).y; });
  return { id: a.id, kind: a.kind, g: a.g, ...(a.accessory ? { accessory: a.accessory } : {}), file: `models/avatars/${a.id}.glb`, tris: Math.round(tris), kb: Math.round(fs.statSync(out).size / 1024), hip: +hip.toFixed(3), src: a.src };
}

/* ---------- animation clips (one file per gender) ---------- */
async function buildAnims(g) {
  let skeletonRoot = null; const clips = []; const meta = {};
  for (const [key, rel] of Object.entries(CLIPS)) {
    const buf = await fetchCached("Assets/Animations/" + rel.replace("{g}", g));
    if (!buf) { console.warn("missing clip", key, g); continue; }
    const obj = parseFBX(buf);
    const clip = obj.animations[0];
    // keep rotations of real bones + the hip height; drop scale, nub/footstep helpers and per-bone offsets
    const keep = clip.tracks.filter(t => {
      const [node, prop] = t.name.split(".");
      if (/Footsteps|Nub$/.test(node) || prop === "scale") return false;
      if (prop === "position") return node === "Bip01";
      return true;
    });
    // in-place locomotion: remove horizontal travel from Bip01, remember the speed it implied
    const pos = keep.find(t => t.name === "Bip01.position");
    let speed = 0, hip = 0;
    if (pos) {
      const v = pos.values, n = v.length / 3;
      const dx = v[(n - 1) * 3] - v[0], dz = v[(n - 1) * 3 + 2] - v[2];
      speed = Math.hypot(dx, dz) / 100 / clip.duration; // m/s
      const x0 = v[0], z0 = v[2]; let sum = 0;
      for (let i = 0; i < n; i++) { v[i * 3] -= x0 + dx * (i / (n - 1)); v[i * 3 + 2] -= z0 + dz * (i / (n - 1)); sum += v[i * 3 + 1]; }
      hip = sum / n / 100;
    }
    // long idle takes are trimmed: a few seconds loop well and keep downloads small
    const maxLen = { idle: 8, sit: 10, clap: 5 }[key];
    let c = new THREE.AnimationClip(key, clip.duration, keep);
    if (maxLen && clip.duration > maxLen) c = THREE.AnimationUtils.subclip(c, key, 0, Math.round(maxLen * 30), 30);
    c.optimize(); clips.push(c); meta[key] = { speed: +speed.toFixed(3), hip: +hip.toFixed(3), duration: +c.duration.toFixed(3) };
    if (!skeletonRoot) { obj.traverse(o => { if (o.isBone && o.name === "Bip01" && !skeletonRoot) skeletonRoot = o; }); skeletonRoot.parent?.remove(skeletonRoot); }
  }
  const root = new THREE.Group(); root.name = "anims"; const holder = new THREE.Group(); holder.scale.setScalar(0.01); holder.add(skeletonRoot); root.add(holder);
  // drop helper bones from the exported skeleton too
  const drop = []; skeletonRoot.traverse(o => { if (/Footsteps|Nub$/.test(o.name)) drop.push(o); }); drop.forEach(o => o.parent?.remove(o));
  const glb = await exportGLB(root, clips);
  const io = await getIO();
  const doc = await io.readBinary(glb);
  await doc.transform(resample({ tolerance: 1e-4 }), prune({ keepLeaves: true }), dedup(), meshopt({ encoder: MeshoptEncoder, level: "high" }));
  const out = path.join(OUT, `anims-${g}.glb`);
  await io.write(out, doc);
  return { g, file: `models/anims-${g}.glb`, kb: Math.round(fs.statSync(out).size / 1024), clips: meta };
}

const only = process.argv.slice(2);
const prev = fs.existsSync(path.join(OUT, "avatars.json")) ? JSON.parse(fs.readFileSync(path.join(OUT, "avatars.json"), "utf8")) : null;
const manifest = { generated: new Date().toISOString(), avatars: [], anims: prev?.anims || {} };
if (only.length && prev) manifest.avatars = prev.avatars.filter(a => !only.includes(a.id));
if (!only.length) for (const g of ["m", "f"]) { const r = await buildAnims(g); manifest.anims[g] = r; console.log("anims", g, r.kb + " KB", JSON.stringify(r.clips)); }
for (const a of AVATARS) {
  if (only.length && !only.includes(a.id)) continue;
  try { const r = await buildAvatar(a); manifest.avatars.push(r); console.log("avatar", r.id, r.tris + " tris", r.kb + " KB", "hip", r.hip); }
  catch (e) { console.error("FAILED", a.id, e.message); }
}
manifest.avatars.sort((a, b) => AVATARS.findIndex(x => x.id === a.id) - AVATARS.findIndex(x => x.id === b.id));
fs.writeFileSync(path.join(OUT, "avatars.json"), JSON.stringify(manifest, null, 1));
