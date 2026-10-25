// The museum hall: data-driven templates, layout (main hall + optional side room), lights and decor.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { canvasTex, floorTextures, wallTexture, radial, wallWash, plaqueCanvas, dedicationCanvas, blobShadow } from "./textures.js";
import { cv, star } from "./demoArt.js";

export const TEMPLATES = {
  classic: { wall: "#F3F0EA", trim: "#13294B", trim2: "#1E3D6E", accent: "#C9A24B", floor: "marble-white", ceiling: "#16294A", beams: "#0F1F3A", feature: "cladding", featureA: "#13294B", featureB: "#1A3560", light: 0xffe2b0, chandelier: "crystal", decor: "planters", bg: "#15284A" },
  garden: { wall: "#EEF1E6", trim: "#3F6B3A", trim2: "#557A45", accent: "#C9A24B", floor: "stone-warm", ceiling: "#E7EEDD", beams: "#C9D6B8", feature: "hedge", featureA: "#3C6B3A", featureB: "#4E7D47", light: 0xfff0cf, chandelier: "lantern", decor: "plants", bg: "#3A5A3A" },
  wedding: { wall: "#FBF7F3", trim: "#E3C9BE", trim2: "#EBD6CE", accent: "#D4AF6A", floor: "marble-warm", ceiling: "#FFFFFF", beams: "#F1E6DE", feature: "floral", featureA: "#F6EAE4", featureB: "#EFDCD3", light: 0xfff1dc, chandelier: "crystal", decor: "flowers", bg: "#E8D9CF" },
  grad: { wall: "#EEF3FA", trim: "#13294B", trim2: "#1E3D6E", accent: "#4F86C6", floor: "wood", ceiling: "#13294B", beams: "#0E1F3A", feature: "stripes", featureA: "#13294B", featureB: "#4F86C6", light: 0xfff0d8, chandelier: "ring", decor: "pennants", bg: "#13294B" },
};

const lin = h => new THREE.Color(h);
export const RW = 7, RD = 13, RH = 4.4;
const SIDE = { x0: -17, x1: -7, z0: -7, z1: 7, door: 1.6, doorH: 3.2 };

/* ---------- layout ---------- */
// Painting slots in walking order. Each slot: position on the wall, facing direction (yaw), max size.
export function layout(sideRoom) {
  const s = [];
  const wall = (x, z, ry, o = {}) => s.push({ x, z, ry, ...o });
  const L = Math.PI / 2, R = -Math.PI / 2;
  // main hall: left wall, left partition, back wall, right partition, right wall, then the two easels
  wall(-RW + 0.01, 7, L);
  if (!sideRoom) wall(-RW + 0.01, 0.8, L);
  wall(-RW + 0.01, -5.4, L);
  s.push({ part: "L", side: "outer" }, { part: "L", side: "inner" });
  wall(-4.9, -RD + 0.13, 0); wall(4.9, -RD + 0.13, 0);
  s.push({ part: "R", side: "inner" }, { part: "R", side: "outer" });
  wall(RW - 0.01, -5.4, R); wall(RW - 0.01, 0.8, R); wall(RW - 0.01, 7, R);
  s.push({ easel: true, x: -2.3, z: 0.4, ry: 0.45 }, { easel: true, x: 2.3, z: 0.4, ry: -0.45 });
  if (sideRoom) {
    wall(-4.4, RD - 0.13, Math.PI); // front wall beside the entrance
    const zf = SIDE.z0 + 0.01, zb = SIDE.z1 - 0.01, xf = SIDE.x0 + 0.01;
    wall(-9.4, zf, 0, { max: 1.6 }); wall(-12.6, zf, 0, { max: 1.6 }); wall(-15.4, zf, 0, { max: 1.2 });
    wall(xf, -3.6, L); wall(xf, 0, L); wall(xf, 3.6, L);
    wall(-15.4, zb, Math.PI, { max: 1.2 }); wall(-12.6, zb, Math.PI, { max: 1.6 }); wall(-9.4, zb, Math.PI, { max: 1.6 });
    s.push({ part: "S", side: "outer" }, { part: "S", side: "inner" }, { part: "S", side: "outer2" }, { part: "S", side: "inner2" });
    s.push({ easel: true, x: -9.6, z: 4.4, ry: Math.PI - 0.5 });
  }
  return s;
}

/* ---------- materials ---------- */
function goldMat(env) { return new THREE.MeshStandardMaterial({ color: lin("#D4AF5C"), roughness: 0.28, metalness: 1, envMapIntensity: 1.2 }); }
function std(hex, o = {}) { return new THREE.MeshStandardMaterial({ color: lin(hex), roughness: 0.85, metalness: 0, ...o }); }

/* ---------- builder ---------- */
export function buildHall({ scene, tpl = "classic", sideRoom = false, quality, renderer, logoUrl, onProgress }) {
  const C = TEMPLATES[tpl] || TEMPLATES.classic;
  const root = new THREE.Group(); root.name = "hall"; scene.add(root);
  scene.background = lin(C.bg);
  const gold = goldMat(), trimM = std(C.trim, { roughness: 0.6 }), accentM = new THREE.MeshStandardMaterial({ color: lin(C.accent), roughness: 0.3, metalness: 0.9 });
  const obstacles = [];  // {box:[x0,z0,x1,z1]} | {circle:[x,z,r]}
  const segments = [];   // camera blockers [x0,z0,x1,z1]
  const rooms = [[-RW + 0.45, -RD + 0.45, RW - 0.45, RD - 0.45]];
  const sits = [];       // bench seats {x,z,yaw}
  const lightsDyn = [];

  /* floor */
  const ft = floorTextures(C.floor, quality.tier === "low" ? 512 : 1024);
  const tile = C.floor === "wood" ? 4 : 2.4;
  const mkFloor = (w, d, x, z) => {
    const map = canvasTex(ft.map, { repeat: [w / tile, d / tile], aniso: quality.anisotropy });
    const rough = canvasTex(ft.rough, { srgb: false, repeat: [w / tile, d / tile] });
    const m = new THREE.MeshStandardMaterial({ map, roughnessMap: rough, roughness: C.floor === "wood" ? 0.55 : 0.22, metalness: 0, envMapIntensity: 0.9 });
    if (quality.reflections) { m.transparent = true; m.opacity = 0.93; }
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); f.rotation.x = -Math.PI / 2; f.position.set(x, 0, z); f.receiveShadow = true; f.renderOrder = -1; root.add(f);
    if (quality.reflections) {
      const ref = new Reflector(new THREE.PlaneGeometry(w, d), { textureWidth: Math.min(1024, innerWidth), textureHeight: Math.min(1024, innerHeight), color: 0x5a5a5a });
      ref.rotation.x = -Math.PI / 2; ref.position.set(x, -0.002, z); root.add(ref);
    }
  };
  mkFloor(RW * 2, RD * 2, 0, 0);
  if (sideRoom) { mkFloor(SIDE.x1 - SIDE.x0, SIDE.z1 - SIDE.z0, (SIDE.x0 + SIDE.x1) / 2, 0); mkFloor(0.6, SIDE.door * 2, -RW, 0); }

  /* walls (merged by material) */
  const wallMap = canvasTex(wallTexture(C.wall), { repeat: [6, 2] });
  const wallM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wallMap, roughness: 0.92 });
  const wallGeos = [], trimGeos = [], goldGeos = [];
  const wallPiece = (x0, z0, x1, z1, y0 = 0, y1 = RH, skirt = true, inwardNormal) => {
    const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, yaw = Math.atan2(inwardNormal[0], inwardNormal[1]);
    const g = new THREE.PlaneGeometry(len, y1 - y0); g.rotateY(yaw); g.translate(cx, (y0 + y1) / 2, cz); wallGeos.push(g);
    if (skirt && y0 === 0) {
      const sk = new THREE.BoxGeometry(len, 0.16, 0.04); sk.rotateY(yaw); sk.translate(cx + inwardNormal[0] * 0.02, 0.08, cz + inwardNormal[1] * 0.02); trimGeos.push(sk);
      const gl = new THREE.BoxGeometry(len, 0.025, 0.05); gl.rotateY(yaw); gl.translate(cx + inwardNormal[0] * 0.02, 0.18, cz + inwardNormal[1] * 0.02); goldGeos.push(gl);
    }
    if (y0 === 0) segments.push([x0, z0, x1, z1]);
  };
  // main hall: back, front, right, left (left has a door when there is a side room)
  wallPiece(-RW, -RD, RW, -RD, 0, RH, true, [0, 1]);
  wallPiece(-RW, RD, RW, RD, 0, RH, true, [0, -1]);
  wallPiece(RW, -RD, RW, RD, 0, RH, true, [-1, 0]);
  if (sideRoom) {
    wallPiece(-RW, -RD, -RW, -SIDE.door, 0, RH, true, [1, 0]);
    wallPiece(-RW, SIDE.door, -RW, RD, 0, RH, true, [1, 0]);
    wallPiece(-RW, -SIDE.door, -RW, SIDE.door, SIDE.doorH, RH, false, [1, 0]);
    // side room walls
    wallPiece(SIDE.x0, SIDE.z0, SIDE.x1, SIDE.z0, 0, RH, true, [0, 1]);
    wallPiece(SIDE.x0, SIDE.z1, SIDE.x1, SIDE.z1, 0, RH, true, [0, -1]);
    wallPiece(SIDE.x0, SIDE.z0, SIDE.x0, SIDE.z1, 0, RH, true, [1, 0]);
    wallPiece(SIDE.x1, SIDE.z0, SIDE.x1, -SIDE.door, 0, RH, true, [-1, 0]);
    wallPiece(SIDE.x1, SIDE.door, SIDE.x1, SIDE.z1, 0, RH, true, [-1, 0]);
    wallPiece(SIDE.x1, -SIDE.door, SIDE.x1, SIDE.door, SIDE.doorH, RH, false, [-1, 0]);
    rooms.push([SIDE.x0 + 0.45, SIDE.z0 + 0.45, SIDE.x1 - 0.45, SIDE.z1 - 0.45], [-RW - 0.8, -SIDE.door + 0.4, -RW + 0.8, SIDE.door - 0.4]);
    // door frame: gold arch trim on the hall side
    const pts = [new THREE.Vector3(-RW + 0.03, 0, -SIDE.door), new THREE.Vector3(-RW + 0.03, SIDE.doorH, -SIDE.door), new THREE.Vector3(-RW + 0.03, SIDE.doorH, SIDE.door), new THREE.Vector3(-RW + 0.03, 0, SIDE.door)];
    for (let i = 0; i < 3; i++) { const a = pts[i], b = pts[i + 1]; const len = a.distanceTo(b); const g = new THREE.BoxGeometry(0.08, i === 1 ? 0.08 : len, i === 1 ? len : 0.08); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); goldGeos.push(g); }
  } else wallPiece(-RW, -RD, -RW, RD, 0, RH, true, [1, 0]);
  const walls = new THREE.Mesh(mergeGeometries(wallGeos), wallM); walls.receiveShadow = true; root.add(walls);
  root.add(new THREE.Mesh(mergeGeometries(trimGeos), trimM));

  /* ceiling with coffer beams */
  const ceilM = std(C.ceiling, { roughness: 1 });
  const ceilGeos = [new THREE.PlaneGeometry(RW * 2, RD * 2).rotateX(Math.PI / 2).translate(0, RH, 0)];
  if (sideRoom) ceilGeos.push(new THREE.PlaneGeometry(SIDE.x1 - SIDE.x0, SIDE.z1 - SIDE.z0).rotateX(Math.PI / 2).translate((SIDE.x0 + SIDE.x1) / 2, RH, 0));
  root.add(new THREE.Mesh(mergeGeometries(ceilGeos), ceilM));
  const beamGeos = [];
  for (let x = -RW + 3.5; x < RW; x += 3.5) beamGeos.push(new THREE.BoxGeometry(0.12, 0.1, RD * 2).translate(x, RH - 0.05, 0));
  for (let z = -RD + 3.25; z < RD; z += 3.25) beamGeos.push(new THREE.BoxGeometry(RW * 2, 0.1, 0.12).translate(0, RH - 0.05, z));
  root.add(new THREE.Mesh(mergeGeometries(beamGeos), std(C.beams, { roughness: 0.8 })));

  /* lighting */
  const hemi = new THREE.HemisphereLight(0xffffff, lin(C.floor === "wood" ? "#A07A55" : "#CFC6B6"), quality.tier === "low" ? 1.5 : 0.55);
  root.add(hemi);
  const key = new THREE.DirectionalLight(0xfff2dc, quality.tier === "low" ? 1.0 : 1.4);
  key.position.set(3, 9, 5); root.add(key); root.add(key.target);
  if (quality.shadows) {
    key.castShadow = true; key.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
    const s = 7; Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 30 });
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
  }

  /* chandeliers */
  const chZ = [7.5, -1.2, -9];
  const bulbs = [];
  chZ.forEach((z, i) => chandelier(root, C, 0, RH - 0.62, z, i === 1 ? 0.9 : 0.78, gold, quality, i < quality.chandelierLights, bulbs));
  if (sideRoom) chandelier(root, C, -12, RH - 0.62, 0, 0.7, gold, quality, false, bulbs);

  /* feature wall + logo */
  const logo = featureWall(root, C, gold, logoUrl, quality);

  /* partitions */
  const parts = {};
  const partition = (key, x, z0, z1, alongX = false) => {
    const L = Math.abs(z1 - z0), zc = (z0 + z1) / 2, T = 0.3, HH = 3.1;
    const geo = alongX ? new THREE.BoxGeometry(L, HH, T) : new THREE.BoxGeometry(T, HH, L);
    const w = new THREE.Mesh(geo, std(C.wall, { roughness: 0.9 })); w.position.set(alongX ? zc : x, HH / 2, alongX ? x : zc); w.castShadow = quality.shadows; w.receiveShadow = true; root.add(w);
    const base = new THREE.Mesh(alongX ? new THREE.BoxGeometry(L + 0.04, 0.16, T + 0.04) : new THREE.BoxGeometry(T + 0.04, 0.16, L + 0.04), trimM); base.position.set(w.position.x, 0.08, w.position.z); root.add(base);
    const cap = new THREE.Mesh(alongX ? new THREE.BoxGeometry(L + 0.06, 0.05, T + 0.06) : new THREE.BoxGeometry(T + 0.06, 0.05, L + 0.06), gold); cap.position.set(w.position.x, HH + 0.025, w.position.z); root.add(cap);
    const bx = alongX ? [zc - L / 2 - 0.05, x - T / 2 - 0.05, zc + L / 2 + 0.05, x + T / 2 + 0.05] : [x - T / 2 - 0.05, z0 - 0.05, x + T / 2 + 0.05, z1 + 0.05];
    obstacles.push({ box: bx }); segments.push([bx[0], bx[1], bx[2], bx[1]], [bx[2], bx[1], bx[2], bx[3]], [bx[2], bx[3], bx[0], bx[3]], [bx[0], bx[3], bx[0], bx[1]]);
    parts[key] = { x, zc, T, L, alongX };
  };
  partition("L", -3.6, -10.6, -6.4); partition("R", 3.6, -10.6, -6.4);
  if (sideRoom) partition("S", -12, -2.6, 2.6);

  /* benches */
  const bench = (x, z, ry) => {
    const g = new THREE.Group(); const top = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 2), std("#D9C7A2", { roughness: 0.55 })); top.position.y = 0.46; top.castShadow = top.receiveShadow = quality.shadows; g.add(top);
    [-1, 1].forEach(s => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.08), trimM); leg.position.set(0, 0.21, s * 0.8); leg.castShadow = quality.shadows; g.add(leg); });
    g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    const c = Math.cos(ry), s = Math.sin(ry); const hx = Math.abs(c) * 0.35 + Math.abs(s) * 1.08, hz = Math.abs(s) * 0.35 + Math.abs(c) * 1.08;
    obstacles.push({ box: [x - hx, z - hz, x + hx, z + hz], bench: true });
    // two seats per bench, sitting faces both long sides -> pick the side facing the nearest wall art
    [-0.5, 0.5].forEach(off => { const sx = x + s * off, sz = z + c * off; sits.push({ x: sx, z: sz, yaw: ry + (x < 0 ? -Math.PI / 2 : Math.PI / 2) }); });
    shadowBlob(root, x, z, 1.6, 2.6, ry);
  };
  bench(-3.4, 3.6, 0); bench(3.4, 3.6, 0);
  if (sideRoom) bench(-14.6, 0, 0);

  /* dedication pedestal near the entrance */
  const pz = 5.0;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1, 6), trimM); ped.position.set(0, 0.5, pz); ped.castShadow = quality.shadows; root.add(ped);
  const pr = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 6), gold); pr.position.set(0, 1.02, pz); root.add(pr);
  const dedCanvas = cv(640, 420)[0];
  const dedTex = canvasTex(dedCanvas);
  const dp = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.62), new THREE.MeshStandardMaterial({ map: dedTex, roughness: 0.6 })); dp.position.set(0, 1.32, pz + 0.02); dp.rotation.x = -0.55; root.add(dp);
  const db = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.69, 0.04), gold); db.position.copy(dp.position); db.rotation.copy(dp.rotation); db.translateZ(-0.025); root.add(db);
  obstacles.push({ circle: [0, pz, 0.75] });
  shadowBlob(root, 0, pz, 1.4, 1.4, 0);

  /* entrance arch on the start wall */
  entranceArch(root, C, gold);

  /* template decor */
  decor(root, C, gold, quality, obstacles, sideRoom);

  root.add(new THREE.Mesh(mergeGeometries(goldGeos), gold));

  /* painting spotlights pool (re-aimed at the nearest paintings every frame) */
  for (let i = 0; i < quality.spots; i++) {
    const sp = new THREE.SpotLight(C.light, 0, 7, 0.42, 0.6, 1.4);
    sp.position.set(0, RH - 0.2, 0); root.add(sp); root.add(sp.target); lightsDyn.push(sp);
  }

  return { root, C, obstacles, segments, rooms, sits, key, bulbs, logo, parts, spots: lightsDyn, ded: { canvas: dedCanvas, tex: dedTex, mesh: dp, pos: new THREE.Vector3(0, 1.3, pz + 0.35) }, gold, trimM };
}

function shadowBlob(root, x, z, w, d, ry) {
  if (!shadowBlob.tex) shadowBlob.tex = canvasTex(blobShadow());
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: shadowBlob.tex, transparent: true, depthWrite: false, opacity: 0.55 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, 0.006, z); root.add(m);
}

function chandelier(root, C, x, y, z, sc, gm, quality, withLight, bulbs) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(sc);
  const bulbM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: lin("#FFE6A8"), emissiveIntensity: 3.2 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, (RH - y) / sc, 8), gm); stem.position.y = (RH - y) / 2 / sc; g.add(stem);
  if (C.chandelier === "lantern") {
    const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.8, 8, 1, true), new THREE.MeshStandardMaterial({ color: lin("#2E3B2A"), roughness: 0.5, metalness: 0.6, wireframe: true }));
    g.add(frame);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: lin("#FFE2A8"), emissiveIntensity: 1.6, transparent: true, opacity: 0.9 }));
    g.add(glow); const top = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.3, 8), gm); top.position.y = 0.55; g.add(top); bulbs.push(glow);
  } else if (C.chandelier === "ring") {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 12, 80), bulbM); ring.rotation.x = Math.PI / 2; g.add(ring); bulbs.push(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.07, 8, 80, Math.PI * 2), gm); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.06; g.add(ring2);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.2, 4), gm); w.position.set(Math.cos(a) * 0.45, 0.5, Math.sin(a) * 0.45); w.rotation.z = Math.cos(a) * 0.65; w.rotation.x = -Math.sin(a) * 0.65; g.add(w); }
  } else {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), gm); body.scale.y = 1.4; g.add(body);
    [[0.72, 0], [0.46, 0.34]].forEach(([r, yy]) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 8, 64), gm); t.rotation.x = Math.PI / 2; t.position.y = yy; g.add(t); });
    const armGeos = [], cupGeos = [], bulbGeos = [];
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, cx = Math.cos(a) * 0.72, cz = Math.sin(a) * 0.72;
      armGeos.push(new THREE.CylinderGeometry(0.012, 0.012, 0.72, 6).rotateZ(Math.PI / 2).rotateY(-a).translate(cx / 2, 0, cz / 2));
      cupGeos.push(new THREE.CylinderGeometry(0.05, 0.03, 0.06, 12).translate(cx, 0.04, cz));
      bulbGeos.push(new THREE.SphereGeometry(0.045, 10, 8).scale(1, 1.5, 1).translate(cx, 0.12, cz));
    }
    g.add(new THREE.Mesh(mergeGeometries([...armGeos, ...cupGeos]), gm));
    const b = new THREE.Mesh(mergeGeometries(bulbGeos), bulbM); g.add(b); bulbs.push(b);
    const crystalM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transmission: quality.tier === "high" ? 0.6 : 0, thickness: 0.02, ior: 1.6, emissive: lin("#FFF2D0"), emissiveIntensity: 0.25, transparent: true, opacity: 0.92, envMapIntensity: 2 });
    const drops = []; [[0.72, 36, 2], [0.46, 22, 2], [0.2, 10, 3]].forEach(([r, n, len], ri) => { for (let i = 0; i < n * quality.crystals; i++) { const a = i / (n * quality.crystals) * Math.PI * 2 + ri * 0.2; for (let k = 0; k < len; k++) drops.push([Math.cos(a) * r, -0.06 - k * 0.075 - (i % 2) * 0.04 + (ri === 1 ? 0.34 : 0) - (ri === 2 ? 0.2 : 0), Math.sin(a) * r]); } });
    const inst = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.022, 0), crystalM, drops.length); const m = new THREE.Matrix4();
    drops.forEach((d, i) => { m.makeScale(1, 1.6, 1); m.setPosition(d[0], d[1], d[2]); inst.setMatrixAt(i, m); }); g.add(inst);
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(radial("rgba(255,236,196,0.9)", "rgba(255,236,196,0)")), color: lin("#FFE3A0"), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(3, 3, 1); g.add(halo);
  // warm pool on the ceiling above
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), new THREE.MeshBasicMaterial({ map: halo.material.map, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = Math.PI / 2; pool.position.y = (RH - y) / sc - 0.01; g.add(pool);
  if (withLight) { const pl = new THREE.PointLight(C.light, 6, 9, 1.6); pl.position.y = -0.2; g.add(pl); }
  root.add(g);
}

function featureWall(root, C, gm, logoUrl, quality) {
  const z = -RD + 0.02, W = RW * 2;
  const n = 28, pw = W / n;
  const box = new THREE.BoxGeometry(pw - 0.03, RH - 0.4, 0.08);
  if (C.feature === "hedge") {
    // hedge wall: many leaf clusters (instanced) on a green backing
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, RH - 0.3), std(C.featureA)); back.position.set(0, (RH - 0.3) / 2 + 0.05, z + 0.03); root.add(back);
    const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 0), std(C.featureB, { flatShading: true, roughness: 0.9 }), quality.tier === "low" ? 500 : 1100);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
    for (let i = 0; i < leaves.count; i++) { e.set(Math.random() * 3, Math.random() * 3, 0); q.setFromEuler(e); const s = 0.7 + Math.random() * 0.8; m.compose(new THREE.Vector3(-W / 2 + Math.random() * W, 0.2 + Math.random() * (RH - 0.6), z + 0.08 + Math.random() * 0.08), q, new THREE.Vector3(s, s, s)); leaves.setMatrixAt(i, m); col.set(C.featureB).offsetHSL(0, 0, (Math.random() - 0.5) * 0.12); leaves.setColorAt(i, col); }
    root.add(leaves);
  } else {
    const a = new THREE.InstancedMesh(box, std(C.featureA, { roughness: 0.6 }), n / 2), b = new THREE.InstancedMesh(box, std(C.featureB, { roughness: 0.6 }), n / 2);
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { m.makeTranslation(-W / 2 + pw * (i + 0.5), RH / 2 + 0.1, z + 0.04); (i % 2 ? a : b).setMatrixAt(Math.floor(i / 2), m); }
    root.add(a, b);
    const lines = new THREE.InstancedMesh(new THREE.BoxGeometry(0.025, RH - 0.4, 0.1), C.feature === "floral" ? gm : gm, n - 1);
    for (let i = 1; i < n; i++) { m.makeTranslation(-W / 2 + pw * i, RH / 2 + 0.1, z + 0.05); lines.setMatrixAt(i - 1, m); }
    root.add(lines);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, 0.14), gm); top.position.set(0, RH - 0.12, z + 0.07); root.add(top);
  // logo panel
  const PW = 4.4, PH = 3.3, cy = 2.25;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(PW + 3, PH + 3), new THREE.MeshBasicMaterial({ map: canvasTex(radial("rgba(255,224,160,0.9)", "rgba(255,224,160,0)")), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.set(0, cy - 0.2, z + 0.09); root.add(halo);
  const sh = new THREE.Shape(); const r = 0.35, x0 = -PW / 2, y0 = -PH / 2;
  sh.moveTo(x0 + r, y0); sh.lineTo(-x0 - r, y0); sh.quadraticCurveTo(-x0, y0, -x0, y0 + r); sh.lineTo(-x0, -y0 - r); sh.quadraticCurveTo(-x0, -y0, -x0 - r, -y0); sh.lineTo(x0 + r, -y0); sh.quadraticCurveTo(x0, -y0, x0, -y0 - r); sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
  const back = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.06, bevelSegments: 2 }), gm); back.position.set(0, cy, z + 0.1); root.add(back);
  const face = new THREE.Mesh(new THREE.ShapeGeometry(sh), std("#FFFFFF", { roughness: 0.5 })); face.scale.set(0.96, 0.95, 1); face.position.set(0, cy, z + 0.23); root.add(face);
  if (C.feature === "floral") floralArch(root, 0, z + 0.3, PW + 0.6, cy + PH / 2 + 0.2, quality);
  const logo = { mesh: null, set(url) {
    if (!url) return;
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => {
      const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
      const asp = img.width / img.height, lh = PH * 0.82, lw = Math.min(PW * 0.88, lh * asp), hh = lw / asp;
      if (logo.mesh) { root.remove(logo.mesh); logo.mesh.material.map?.dispose(); }
      logo.mesh = new THREE.Mesh(new THREE.PlaneGeometry(lw, hh), new THREE.MeshBasicMaterial({ map: t, transparent: true })); logo.mesh.position.set(0, cy, z + 0.24); root.add(logo.mesh);
    };
    img.src = url;
  } };
  logo.set(logoUrl);
  [-1.4, 1.4].forEach(x => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.26, 12), gm); l.rotation.x = Math.PI / 2.4; l.position.set(x, cy + PH / 2 + 0.35, z + 0.35); root.add(l); });
  return logo;
}

function floralArch(root, x, z, w, h, quality) {
  const n = quality.tier === "low" ? 120 : 260;
  const inst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), n);
  const m = new THREE.Matrix4(), c = new THREE.Color(), cols = ["#F4D6D6", "#FFFFFF", "#EBC2C8", "#F7E7CE", "#D8E6CF"];
  for (let i = 0; i < n; i++) {
    const t = Math.random(); let px, py;
    if (t < 0.3) { px = x - w / 2; py = t / 0.3 * h; } else if (t < 0.6) { px = x + w / 2; py = (t - 0.3) / 0.3 * h; } else { const a = (t - 0.6) / 0.4 * Math.PI; px = x - Math.cos(a) * w / 2; py = h + Math.sin(a) * 0.5; }
    const s = 0.6 + Math.random() * 0.9; m.makeScale(s, s, s); m.setPosition(px + (Math.random() - 0.5) * 0.25, py + (Math.random() - 0.5) * 0.2, z + Math.random() * 0.15); inst.setMatrixAt(i, m);
    c.set(cols[i % cols.length]); inst.setColorAt(i, c);
  }
  root.add(inst);
}

function entranceArch(root, C, gm) {
  const archPts = (w, s, p, n = 24) => { const pts = []; const ctrl = s + (p - s) * 0.62; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector2((1 - t) * (1 - t) * (-w / 2) + 2 * (1 - t) * t * (-w / 2), (1 - t) * (1 - t) * s + 2 * (1 - t) * t * ctrl + t * t * p)); } const right = pts.slice(0, -1).reverse().map(v => new THREE.Vector2(-v.x, v.y)); return pts.concat(right); };
  const ap = archPts(2.4, 2.4, 3.5, 28).map(v => new THREE.Vector3(v.x, v.y, RD - 0.05)); ap.unshift(new THREE.Vector3(-1.2, 0, RD - 0.05)); ap.push(new THREE.Vector3(1.2, 0, RD - 0.05));
  root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ap), 100, 0.06, 8, false), gm));
  const ty = new THREE.Shape(); ty.moveTo(-1.2, 0); archPts(2.4, 2.4, 3.5).forEach(v => ty.lineTo(v.x, v.y)); ty.lineTo(1.2, 0); ty.closePath();
  const dm = new THREE.Mesh(new THREE.ShapeGeometry(ty), std(C.trim2)); dm.position.z = RD - 0.06; dm.rotation.y = Math.PI; root.add(dm);
}

function decor(root, C, gm, quality, obstacles, sideRoom) {
  const spots = [[-5.6, 11.6], [5.6, 11.6], [-5.6, -11.6], [5.6, -11.6]];
  if (C.decor === "planters" || C.decor === "plants" || C.decor === "flowers") {
    const potM = std(C.decor === "plants" ? "#C9B79C" : "#FFFFFF", { roughness: 0.55 });
    spots.forEach(([x, z]) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.72, 24), potM); pot.position.set(x, 0.36, z); pot.castShadow = quality.shadows; root.add(pot);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 6, 32), gm); band.rotation.x = Math.PI / 2; band.position.set(x, 0.64, z); root.add(band);
      if (C.decor === "flowers") {
        const inst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), 70); const m = new THREE.Matrix4(), c = new THREE.Color();
        for (let i = 0; i < 70; i++) { const a = Math.random() * 6.28, r = Math.random() * 0.4; m.makeScale(1, 1, 1); m.setPosition(x + Math.cos(a) * r, 0.85 + Math.random() * 0.55, z + Math.sin(a) * r); inst.setMatrixAt(i, m); c.set(["#F4D6D6", "#FFFFFF", "#EBC2C8", "#C9DDB8"][i % 4]); inst.setColorAt(i, c); }
        root.add(inst);
      } else if (C.decor === "plants") {
        // palm: trunk + fronds
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.7, 8), std("#7A5A3A")); trunk.position.set(x, 1.5, z); root.add(trunk);
        const fr = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; fr.push(new THREE.PlaneGeometry(0.18, 1.1).translate(0, 0.55, 0).rotateX(-1.0).rotateY(a).translate(x, 2.35, z)); }
        const fronds = new THREE.Mesh(mergeGeometries(fr), new THREE.MeshStandardMaterial({ color: lin("#4E7D47"), side: THREE.DoubleSide, roughness: 0.8 })); root.add(fronds);
      } else {
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), std("#5E7A49", { flatShading: true })); bush.position.set(x, 1.15, z); bush.scale.y = 1.25; root.add(bush);
      }
      obstacles.push({ circle: [x, z, 0.5] });
    });
  }
  if (C.decor === "pennants") {
    // bunting along both side walls
    const cols = ["#13294B", "#4F86C6", "#C9A24B", "#FFFFFF"]; const geos = cols.map(() => []);
    [-RW + 0.05, RW - 0.05].forEach(x => { for (let i = 0; i < 26; i++) { const z = -RD + 1 + i; const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.22), new THREE.Vector3(0, 0, 0.22), new THREE.Vector3(0, -0.42, 0)]); g.computeVertexNormals(); g.translate(x, RH - 0.35 - Math.sin(i / 25 * Math.PI * 4) * 0.05, z); geos[i % 4].push(g); } });
    geos.forEach((g, i) => root.add(new THREE.Mesh(mergeGeometries(g), new THREE.MeshStandardMaterial({ color: lin(cols[i]), side: THREE.DoubleSide, roughness: 0.8 }))));
    // a graduation cap sculpture on a plinth in front of the feature wall corners
    [[-5.6, -11.6], [5.6, -11.6]].forEach(([x, z]) => {
      const pl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.6), std("#FFFFFF", { roughness: 0.5 })); pl.position.set(x, 0.5, z); root.add(pl);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.7), std("#13294B")); cap.position.set(x, 1.28, z); cap.rotation.y = 0.785; root.add(cap);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.25, 20), std("#13294B")); bowl.position.set(x, 1.13, z); root.add(bowl);
      const tas = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), gm); tas.position.set(x + 0.3, 1.15, z); root.add(tas);
      obstacles.push({ circle: [x, z, 0.5] });
    });
  }
}

/* ---------- paintings ---------- */
const FRAME_DEPTH = 0.07;
export function makeFrames(root, gm) {
  // frames and passe-partouts share two instanced meshes (2 draw calls for all)
  const max = 32;
  const frames = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, FRAME_DEPTH), gm, max);
  const mats = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.9 }), max);
  frames.count = mats.count = 0; frames.castShadow = true;
  root.add(frames, mats);
  const wash = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: canvasTex(wallWash()), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }), max);
  wash.count = 0; root.add(wash);
  return { frames, mats, wash };
}

// Resolves a slot (wall / partition / easel) to a world transform and builds the painting there
export function hangPainting(ctx, slot, art, quality, lang, dateText) {
  const { root, parts, obstacles, inst, C } = ctx;
  let x = slot.x, z = slot.z, ry = slot.ry, y = 1.75, scale = 1, onEasel = false;
  if (slot.part) {
    const p = parts[slot.part]; const off = p.T / 2 + 0.01;
    if (slot.part === "S") { const zz = slot.side.endsWith("2") ? 1.3 : -1.3; const sgn = slot.side.startsWith("outer") ? 1 : -1; x = p.x + sgn * off; z = zz; ry = sgn > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { const sgn = (slot.part === "L") === (slot.side === "inner") ? 1 : -1; x = p.x + sgn * off; z = p.zc; ry = sgn > 0 ? Math.PI / 2 : -Math.PI / 2; }
  }
  const g = new THREE.Group();
  if (slot.easel) {
    onEasel = true; scale = 0.72; y = 1.36;
    const e = new THREE.Group(); e.position.set(x, 0, z); e.rotation.y = ry; root.add(e);
    [[-0.42, 0.14], [0.42, 0.14]].forEach(([lx, lz]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.95, 0.05), ctx.gold); l.position.set(lx, 0.95, lz); l.rotation.z = -lx * 0.12; l.rotation.x = -0.12; l.castShadow = quality.shadows; e.add(l); });
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.9, 0.05), ctx.gold); bl.position.set(0, 0.9, -0.38); bl.rotation.x = 0.3; e.add(bl);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.05, 0.12), ctx.trimM); shelf.position.set(0, 0.66, 0.22); e.add(shelf);
    obstacles.push({ circle: [x, z, 0.6] });
    g.position.set(0, y, 0.3); g.rotation.x = -0.12; e.add(g);
  } else { g.position.set(x, y, z); g.rotation.y = ry; root.add(g); }
  // size from aspect
  const asp = art.aspect || (art.portrait ? 0.75 : 4 / 3);
  const maxW = (slot.max || 1.9) * scale, maxH = (asp < 1 ? 1.6 : 1.3) * scale;
  let H = maxH, W = H * asp; if (W > maxW) { W = maxW; H = W / asp; }
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.55, color: 0xffffff, map: art.texture || null }));
  pic.scale.set(W, H, 1); pic.position.z = FRAME_DEPTH + 0.006; g.add(pic);
  // plaque
  const pc = plaqueCanvas(art.titleShown, dateText, lang, C.accent); const ptex = canvasTex(pc);
  const pk = Math.max(scale, 0.85);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.62 * pk, 0.22 * pk), new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.6 }));
  if (onEasel) plaque.position.set(0, -H / 2 - 0.42, 0.05); else plaque.position.set(W / 2 - 0.31 * pk, -H / 2 - 0.3 * pk, 0.02);
  g.add(plaque);
  g.updateMatrixWorld(true);
  // frame + mat instances
  const m = new THREE.Matrix4(), sc = new THREE.Matrix4();
  const fi = inst.frames.count++; sc.makeScale(W + 0.26 * scale, H + 0.26 * scale, 1); m.copy(g.matrixWorld).multiply(new THREE.Matrix4().makeTranslation(0, 0, FRAME_DEPTH / 2)).multiply(sc); inst.frames.setMatrixAt(fi, m);
  const mi = inst.mats.count++; sc.makeScale(W + 0.12 * scale, H + 0.12 * scale, 1); m.copy(g.matrixWorld).multiply(new THREE.Matrix4().makeTranslation(0, 0, FRAME_DEPTH + 0.003)).multiply(sc); inst.mats.setMatrixAt(mi, m);
  inst.frames.instanceMatrix.needsUpdate = inst.mats.instanceMatrix.needsUpdate = true;
  if (!onEasel) { const wi = inst.wash.count++; sc.makeScale(W + 1.8, H + 2.4, 1); m.copy(g.matrixWorld).multiply(new THREE.Matrix4().makeTranslation(0, 0.5, 0.004)).multiply(sc); inst.wash.setMatrixAt(wi, m); inst.wash.instanceMatrix.needsUpdate = true; }
  const pos = pic.getWorldPosition(new THREE.Vector3());
  const n = new THREE.Vector3(0, 0, 1).transformDirection(g.matrixWorld).setY(0).normalize();
  return { group: g, mesh: pic, plaque, ptex, pos, n, W, H, onEasel, setTexture(t, aspect) {
    pic.material.map = t; pic.material.needsUpdate = true;
    if (aspect && Math.abs(aspect - asp) > 0.02) { let h2 = maxH, w2 = h2 * aspect; if (w2 > maxW) { w2 = maxW; h2 = w2 / aspect; } pic.scale.set(w2, h2, 1); }
  } };
}
