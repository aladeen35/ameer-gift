// Picks low / medium / high graphics presets from what the device reports. The visitor can override it in Settings.
const KEY = "ag-quality";

export const PRESETS = {
  low: { pixelRatio: 1, shadows: false, shadowMap: 0, post: "none", bloom: false, ao: false, aa: "msaa", spots: 0, chandelierLights: 0, reflections: false, avatars: "lite", anisotropy: 2, crystals: 0.5 },
  medium: { pixelRatio: 1.5, shadows: true, shadowMap: 1024, post: "medium", bloom: true, ao: false, aa: "fxaa", spots: 2, chandelierLights: 1, reflections: false, avatars: "real", anisotropy: 4, crystals: 1 },
  high: { pixelRatio: 2, shadows: true, shadowMap: 2048, post: "high", bloom: true, ao: true, aa: "smaa", spots: 4, chandelierLights: 3, reflections: true, avatars: "real", anisotropy: 8, crystals: 1 },
};

function gpuName() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return { ok: false, name: "" };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const webgl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { ok: true, name: String(name || ""), webgl2 };
  } catch (e) {
    return { ok: false, name: "" };
  }
}

export function detectTier() {
  const q = new URLSearchParams(location.search).get("q");
  if (q && PRESETS[q]) return { tier: q, auto: false, reason: "url" };
  try { const saved = localStorage.getItem(KEY); if (saved && PRESETS[saved]) return { tier: saved, auto: false, reason: "saved" }; } catch (e) {}
  const g = gpuName();
  const n = g.name.toLowerCase();
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  const mobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
  let score = 0;
  if (!g.ok || !g.webgl2) score -= 3;
  if (/swiftshader|llvmpipe|software|basic render/.test(n)) score -= 4;
  // strong mobile GPUs (Adreno 7xx, Mali-G7xx/G6xx newer, Immortalis, Xclipse, Apple)
  if (/adreno \(tm\) 7\d\d|adreno 7\d\d|adreno \(tm\) 8\d\d|immortalis|xclipse|apple gpu|apple m\d/.test(n)) score += 2;
  else if (/adreno \(tm\) 6[4-9]\d|mali-g7\d|mali-g6[1-9]|mali-g7/.test(n)) score += 1;
  else if (/adreno \(tm\) [1-5]\d\d|mali-[4t]|mali-g5[0-2]|powervr/.test(n)) score -= 2;
  if (!mobile && /nvidia|geforce|radeon|rtx|intel\(r\) (iris|arc)|apple/.test(n)) score += 2;
  if (mem >= 8) score += 1; else if (mem <= 3) score -= 2;
  if (cores >= 8) score += 1; else if (cores <= 4) score -= 1;
  const tier = score >= 3 ? "high" : score >= 0 ? "medium" : "low";
  return { tier, auto: true, reason: g.name };
}

export function saveTier(t) { try { localStorage.setItem(KEY, t); } catch (e) {} }

// Drops one level when the frame rate stays low for a while (only for automatic choices)
export class FpsGuard {
  constructor(onDrop) { this.onDrop = onDrop; this.acc = 0; this.frames = 0; this.slow = 0; this.enabled = true; }
  tick(dt) {
    if (!this.enabled) return;
    this.acc += dt; this.frames++;
    if (this.acc < 2) return;
    const fps = this.frames / this.acc; this.acc = 0; this.frames = 0;
    this.slow = fps < 30 ? this.slow + 1 : 0;
    if (this.slow >= 3) { this.slow = 0; this.onDrop(fps); }
  }
}
