// Entrance scene: white stone facade, pointed arch with gold trim, studded navy doors that swing open.
import * as THREE from "three";
import { canvasTex, floorTextures, signCanvas } from "./textures.js";
import { cv, star } from "./demoArt.js";

const lin = h => new THREE.Color(h);
export const AW = 2.5, AS = 2.55, AP = 3.75;
export function archPts(w, s, p, n = 24) {
  const pts = []; const ctrl = s + (p - s) * 0.62;
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector2((1 - t) * (1 - t) * (-w / 2) + 2 * (1 - t) * t * (-w / 2), (1 - t) * (1 - t) * s + 2 * (1 - t) * t * ctrl + t * t * p)); }
  const right = pts.slice(0, -1).reverse().map(v => new THREE.Vector2(-v.x, v.y)); return pts.concat(right);
}

function stoneTexture() {
  const [c, g] = cv(512, 512); g.fillStyle = "#F4F1EA"; g.fillRect(0, 0, 512, 512);
  const rows = 8, h = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? 128 : 0;
    for (let x = -256; x < 512; x += 256) {
      const shade = 236 + Math.floor(Math.random() * 14);
      g.fillStyle = `rgb(${shade},${shade - 3},${shade - 9})`; g.fillRect(x + off + 2, r * h + 2, 252, h - 4);
    }
    g.fillStyle = "rgba(170,160,140,.45)"; g.fillRect(0, r * h, 512, 2);
    for (let x = -256; x < 512; x += 256) g.fillRect(x + off, r * h, 2, h);
  }
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(120,110,95,${Math.random() * 0.05})`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
  return c;
}

export function buildEntrance({ C, quality, title }) {
  const S = new THREE.Scene();
  const [bc, bg] = cv(4, 256); const gr = bg.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#BFD3EC"); gr.addColorStop(0.7, "#F3F6FB"); gr.addColorStop(1, "#FFFFFF"); bg.fillStyle = gr; bg.fillRect(0, 0, 4, 256);
  S.background = canvasTex(bc);
  S.fog = new THREE.Fog(0xf3f6fb, 16, 40);
  S.add(new THREE.HemisphereLight(0xffffff, 0xc9bfae, quality.tier === "low" ? 1.3 : 0.55));
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.7); sun.position.set(-4, 8, 7); S.add(sun);
  if (quality.shadows) {
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 5, bottom: -2, near: 1, far: 25 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5;
  }
  const gold = new THREE.MeshStandardMaterial({ color: lin("#D4AF5C"), roughness: 0.28, metalness: 1 });
  const mat = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: lin(hex), roughness: 0.85, ...o });

  const ft = floorTextures("marble-white", 512);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ map: canvasTex(ft.map, { repeat: [25, 16.7] }), roughness: 0.35 }));
  plaza.rotation.x = -Math.PI / 2; plaza.receiveShadow = true; S.add(plaza);

  const sh = new THREE.Shape(); sh.moveTo(-5.5, 0); sh.lineTo(-AW / 2, 0); archPts(AW, AS, AP).forEach(v => sh.lineTo(v.x, v.y)); sh.lineTo(AW / 2, 0); sh.lineTo(5.5, 0); sh.lineTo(5.5, 6.4); sh.lineTo(-5.5, 6.4); sh.closePath();
  const wallGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false });
  // planar UVs in metres so the stone blocks keep their size
  const uv = wallGeo.attributes.uv; const p = wallGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 2.2, p.getY(i) / 2.2);
  const stone = canvasTex(stoneTexture()); stone.wrapS = stone.wrapT = THREE.RepeatWrapping;
  const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ map: stone, roughness: 0.9 })); wall.position.z = -0.6; wall.receiveShadow = true; S.add(wall);
  const base = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.35, 0.75), mat(C.trim)); base.position.set(0, 0.175, -0.3); S.add(base);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.22, 0.8), mat("#FFFFFF")); cap.position.set(0, 6.45, -0.3); S.add(cap);
  const gl = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.05, 0.82), gold); gl.position.set(0, 6.32, -0.3); S.add(gl);
  // pilasters
  [-3.4, 3.4].forEach(x => { const pil = new THREE.Mesh(new THREE.BoxGeometry(0.55, 6.1, 0.2), mat("#FBFAF6", { roughness: 0.7 })); pil.position.set(x, 3.2, 0.05); pil.castShadow = quality.shadows; S.add(pil);
    const pc = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.3), mat("#FFFFFF")); pc.position.set(x, 6.1, 0.08); S.add(pc); const pb = pc.clone(); pb.position.y = 0.45; S.add(pb); });
  const ap = archPts(AW + 0.22, AS, AP + 0.14, 32).map(v => new THREE.Vector3(v.x, v.y, 0.04)); ap.unshift(new THREE.Vector3(-(AW + 0.22) / 2, 0.35, 0.04)); ap.push(new THREE.Vector3((AW + 0.22) / 2, 0.35, 0.04));
  S.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ap), 120, 0.07, 8, false), gold));
  const ty = new THREE.Shape(); ty.moveTo(-AW / 2, AS); archPts(AW, AS, AP).forEach(v => ty.lineTo(v.x, v.y)); ty.closePath();
  const tm = new THREE.Mesh(new THREE.ShapeGeometry(ty), mat(C.trim, { roughness: 0.7 })); tm.position.z = -0.42; S.add(tm);
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.12, AP - AS + 0.2), mat(C.trim, { roughness: 0.7 })); seam.position.set(0, (AS + AP) / 2, -0.415); S.add(seam);
  const st = new THREE.Mesh(new THREE.CircleGeometry(0.28, 8), gold); st.position.set(0, AS + 0.5, -0.4); S.add(st);
  const [ic, ig] = cv(64, 256); const igr = ig.createLinearGradient(0, 0, 0, 256); igr.addColorStop(0, "#FFF3D6"); igr.addColorStop(1, "#F2D99A"); ig.fillStyle = igr; ig.fillRect(0, 0, 64, 256);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(AW, AP), new THREE.MeshBasicMaterial({ map: canvasTex(ic) })); inner.position.set(0, AP / 2, -1.4); S.add(inner);
  const doors = []; const dm = mat(C.trim2, { roughness: 0.55 });
  [-1, 1].forEach(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * AW / 2, 0, -0.45);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(AW / 2 - 0.02, AS, 0.08), dm); leaf.position.set(-side * (AW / 4), AS / 2, 0); leaf.castShadow = quality.shadows; pivot.add(leaf);
    const studs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), gold, 15); const m = new THREE.Matrix4(); let k = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) { m.makeTranslation(-side * (AW / 4) + (i - 1) * 0.32, 0.45 + j * 0.42, 0.05); studs.setMatrixAt(k++, m); }
    pivot.add(studs);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 8, 20), gold); ring.position.set(-side * 0.16, 1.2, 0.06); pivot.add(ring);
    S.add(pivot); doors.push({ pivot, side });
  });
  const signTex = canvasTex(signCanvas(title || ""));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.9), new THREE.MeshStandardMaterial({ map: signTex, transparent: true, roughness: 0.4, metalness: 0.3 })); sign.position.set(0, 4.95, 0.01); sign.visible = false; S.add(sign); // the HTML title already shows the name above the doors
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 3.2), mat(C.trim)); carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.006, 1.2); carpet.receiveShadow = true; S.add(carpet);
  [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 3.2), gold); e.rotation.x = -Math.PI / 2; e.position.set(s * 0.82, 0.008, 1.2); S.add(e); });
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.76, 0.12, 48), mat("#FFFFFF", { roughness: 0.4 })); pod.position.set(0, 0.06, 2.1); pod.receiveShadow = true; S.add(pod);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.025, 8, 64), gold); rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.12, 2.1); S.add(rim);
  [-1, 1].forEach(s => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.7, 24), mat("#FFFFFF", { roughness: 0.6 })); pot.position.set(s * 2.5, 0.35, 0.35); pot.castShadow = quality.shadows; S.add(pot);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.02, 6, 32), gold); band.rotation.x = Math.PI / 2; band.position.set(s * 2.5, 0.62, 0.35); S.add(band);
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48, 1), mat("#5E7A49", { flatShading: true })); bush.position.set(s * 2.5, 1.1, 0.35); bush.scale.y = 1.25; bush.castShadow = quality.shadows; S.add(bush);
  });
  S.traverse(o => { if (o.isMesh) o.receiveShadow = o.receiveShadow || false; });
  return { scene: S, doors, setTitle(t) { const nt = canvasTex(signCanvas(t)); sign.material.map.dispose(); sign.material.map = nt; sign.material.needsUpdate = true; } };
}
export { star };
