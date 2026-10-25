// Procedural textures drawn on canvas (no downloads): marble, stone, wood, light pools, plaques, labels.
import * as THREE from "three";
import { cv, fd, fb, star } from "./demoArt.js";

export function canvasTex(c, { srgb = true, repeat = null, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5) | 0) >>> 0) % 100000 / 100000; }

// Large polished tiles with soft veins; returns color + roughness maps for one 2x2 tile block
export function floorTextures(style, size = 1024) {
  const [c, g] = cv(size, size), [rc, rg] = cv(size / 4, size / 4);
  const r = rng(style.length * 977 + 13);
  const P = {
    "marble-white": { base: "#EEEAE3", vein: "rgba(150,140,128,", grout: "#D6CFC3", rough: 70 },
    "marble-warm": { base: "#E9DFCF", vein: "rgba(160,132,96,", grout: "#D3C4AC", rough: 70 },
    "stone-warm": { base: "#DCD3C2", vein: "rgba(120,108,90,", grout: "#C2B79F", rough: 150 },
    wood: { base: "#B98C5E", vein: "rgba(90,58,30,", grout: "#8A6440", rough: 120 },
  }[style] || { base: "#EEEAE3", vein: "rgba(150,140,128,", grout: "#D6CFC3", rough: 70 };
  g.fillStyle = P.base; g.fillRect(0, 0, size, size);
  if (style === "wood") {
    const plank = size / 8;
    for (let i = 0; i < 8; i++) {
      const shade = 0.9 + r() * 0.2; g.fillStyle = `rgba(${Math.round(185 * shade)},${Math.round(140 * shade)},${Math.round(94 * shade)},1)`; g.fillRect(0, i * plank, size, plank);
      for (let k = 0; k < 40; k++) { g.strokeStyle = P.vein + (0.05 + r() * 0.12) + ")"; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = i * plank + r() * plank; g.moveTo(0, y); g.bezierCurveTo(size * 0.3, y + r() * 8 - 4, size * 0.6, y + r() * 8 - 4, size, y + r() * 6 - 3); g.stroke(); }
      g.fillStyle = P.grout; g.fillRect(0, i * plank, size, 2); const off = r() * size; g.fillRect(off, i * plank, 2, plank);
    }
  } else {
    for (let t = 0; t < 4; t++) {
      const x0 = (t % 2) * size / 2, y0 = Math.floor(t / 2) * size / 2;
      g.save(); g.beginPath(); g.rect(x0, y0, size / 2, size / 2); g.clip();
      const tint = 0.97 + r() * 0.06; g.fillStyle = `rgba(255,255,255,${(tint - 1) * 2 + 0.06})`; g.fillRect(x0, y0, size / 2, size / 2);
      for (let k = 0; k < 7; k++) {
        g.strokeStyle = P.vein + (0.05 + r() * 0.16) + ")"; g.lineWidth = 0.6 + r() * 2.2; g.beginPath();
        let x = x0 + r() * size / 2, y = y0 + r() * size / 2; g.moveTo(x, y);
        for (let s = 0; s < 12; s++) { x += (r() - 0.3) * 60; y += (r() - 0.45) * 60; g.lineTo(x, y); }
        g.stroke();
      }
      g.filter = "blur(1.2px)"; g.drawImage(c, x0, y0, size / 2, size / 2, x0, y0, size / 2, size / 2); g.filter = "none";
      g.restore();
    }
    g.strokeStyle = P.grout; g.lineWidth = 3; g.strokeRect(1.5, 1.5, size / 2 - 3, size / 2 - 3); g.strokeRect(size / 2 + 1.5, 1.5, size / 2 - 3, size / 2 - 3);
    g.strokeRect(1.5, size / 2 + 1.5, size / 2 - 3, size / 2 - 3); g.strokeRect(size / 2 + 1.5, size / 2 + 1.5, size / 2 - 3, size / 2 - 3);
  }
  // roughness: grout and veins a little rougher
  rg.fillStyle = `rgb(${P.rough},${P.rough},${P.rough})`; rg.fillRect(0, 0, size / 4, size / 4);
  rg.globalAlpha = 0.35; rg.drawImage(c, 0, 0, size / 4, size / 4); rg.globalAlpha = 1;
  rg.fillStyle = `rgb(${P.rough},${P.rough},${P.rough})`; rg.globalAlpha = 0.6; rg.fillRect(0, 0, size / 4, size / 4); rg.globalAlpha = 1;
  return { map: c, rough: rc };
}

export function wallTexture(hex, size = 256) {
  const [c, g] = cv(size, size); g.fillStyle = hex; g.fillRect(0, 0, size, size);
  const r = rng(7); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.012 + r() * 0.02})`; g.fillRect(r() * size, r() * size, 2, 2); }
  return c;
}

export function radial(inner, outer, size = 128, cx = 0.5, cy = 0.5) {
  const [c, g] = cv(size, size);
  const gr = g.createRadialGradient(size * cx, size * cy, 1, size * 0.5, size * 0.5, size * 0.5);
  gr.addColorStop(0, inner); gr.addColorStop(0.45, inner.replace(/[\d.]+\)$/, m => (parseFloat(m) * 0.35).toFixed(3) + ")")); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}
// cone-shaped wash a spotlight leaves on a wall above a painting
export function wallWash(size = 256) {
  const [c, g] = cv(size, size);
  const gr = g.createRadialGradient(size / 2, size * 0.32, 4, size / 2, size * 0.5, size * 0.55);
  gr.addColorStop(0, "rgba(255,244,222,0.95)"); gr.addColorStop(0.35, "rgba(255,238,206,0.45)"); gr.addColorStop(0.75, "rgba(255,232,196,0.08)"); gr.addColorStop(1, "rgba(255,232,196,0)");
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}
export function blobShadow(size = 64) {
  const [c, g] = cv(size, size); const gr = g.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2 - 1);
  gr.addColorStop(0, "rgba(10,16,30,0.5)"); gr.addColorStop(1, "rgba(10,16,30,0)"); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}

export function plaqueCanvas(title, dateText, lang, accent = "#C9A24B") {
  const [c, g] = cv(512, 180);
  g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, 512, 180); g.fillStyle = accent; g.fillRect(0, 0, 512, 6);
  const rtl = lang === "ar", X = rtl ? 484 : 28; g.direction = rtl ? "rtl" : "ltr"; g.textAlign = rtl ? "right" : "left";
  g.fillStyle = "#13294B"; let fs = 44; g.font = fd(fs); while (g.measureText(title).width > 460 && fs > 22) { fs -= 2; g.font = fd(fs); }
  g.fillText(title, X, 82); g.fillStyle = "#8A6B2A"; g.font = fb(30); g.fillText(dateText, X, 140);
  return c;
}

export function dedicationCanvas(lines, lang) {
  const [c, g] = cv(640, 420);
  g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, 640, 420); g.strokeStyle = "#C9A24B"; g.lineWidth = 8; g.strokeRect(14, 14, 612, 392);
  g.direction = lang === "ar" ? "rtl" : "ltr"; g.textAlign = "center";
  g.fillStyle = "#13294B"; let fs = 52; g.font = fd(fs); while (g.measureText(lines[0]).width > 560 && fs > 30) { fs -= 2; g.font = fd(fs); }
  g.fillText(lines[0], 320, 100);
  g.fillStyle = "#3E4E69"; g.font = fb(lang === "ar" ? 29 : 25);
  // wrap the body text
  const body = lines.slice(1, -1).join(" "), words = body.split(/\s+/); const rows = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (g.measureText(t).width > 540 && cur) { rows.push(cur); cur = w; } else cur = t; }
  if (cur) rows.push(cur);
  rows.slice(0, 5).forEach((r, i) => g.fillText(r, 320, 165 + i * 42));
  g.fillStyle = "#A8832F"; g.font = fd(38); g.fillText(lines[lines.length - 1], 320, 375);
  star(g, 320, 40, 10, "#C9A24B");
  return c;
}

function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// name + optional round photo above an avatar
export function makeLabel(name, photo) {
  const [c, g] = cv(512, 128); const t = canvasTex(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  spr.scale.set(1.1, 0.275, 1); spr.renderOrder = 10;
  const draw = img => {
    g.clearRect(0, 0, 512, 128); g.font = fd(48); g.direction = "rtl";
    const tw = name ? Math.min(360, g.measureText(name).width) : 0; const ph = img ? 92 : 0, gap = img && name ? 12 : 0;
    const w = Math.max(img ? 104 : 0, tw + (name ? 52 : 0) + ph + gap + (img && !name ? 12 : 0)), x = (512 - w) / 2;
    g.fillStyle = "rgba(19,41,75,.88)"; rr(g, x, 14, w, 100, 50); g.fill();
    if (img) {
      const cx = x + w - 6 - ph / 2, cy = 64; g.save(); g.beginPath(); g.arc(cx, cy, ph / 2 - 2, 0, 7); g.clip();
      const s = Math.min(img.width, img.height); g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, cx - ph / 2, cy - ph / 2, ph, ph); g.restore();
      g.strokeStyle = "#C9A24B"; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, ph / 2 - 2, 0, 7); g.stroke();
    }
    if (name) { g.fillStyle = "#F3DFA6"; g.textAlign = "center"; g.fillText(name, x + (w - ph - gap) / 2, 82, 360); }
    t.needsUpdate = true;
  };
  draw(null);
  if (photo) { const im = new Image(); im.onload = () => draw(im); im.src = photo; }
  if (!name && !photo) spr.visible = false;
  return spr;
}

export function signCanvas(text, color = "#A8832F", w = 1024, h = 200) {
  const [c, g] = cv(w, h); g.direction = "rtl"; g.textAlign = "center"; g.fillStyle = color;
  let fs = 118; g.font = fd(fs); while (g.measureText(text).width > w - 60 && fs > 40) { fs -= 4; g.font = fd(fs); }
  g.fillText(text, w / 2, h * 0.7); return c;
}
