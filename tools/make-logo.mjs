// Builds the white/gold logo variants for dark backgrounds from the original logos.
// Navy ink becomes white, gold stays gold, the white background becomes transparent.
import sharp from "sharp";

const NAVY = [19, 41, 75];
async function convert(src, out) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const a0 = data[i + 3] / 255;
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    // coverage against the white background, then the "pure" ink colour under it
    const cov = Math.min(1, (255 - min) / 150);
    if (cov <= 0.01) { data[i + 3] = 0; continue; }
    const ink = [0, 1, 2].map(c => Math.max(0, Math.min(255, (data[i + c] - 255 * (1 - cov)) / cov)));
    // 0 = navy/neutral ink, 1 = gold ink
    const gold = Math.max(0, Math.min(1, (ink[0] - ink[2] - 40) / 70));
    const G = [Math.min(255, ink[0] * 1.06 + 16), Math.min(255, ink[1] * 1.06 + 12), Math.min(255, ink[2] * 1.04 + 6)];
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(255 * (1 - gold) + G[c] * gold);
    data[i + 3] = Math.round(255 * cov * a0);
  }
  await sharp(data, { raw: info }).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toFile(out);
  console.log("wrote", out);
}
// Transparent copies of the light versions too (white background removed)
async function clear(src, out) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    const ink = Math.min(1, (255 - min) / 60);
    if (ink < 1) {
      // un-premultiply against white so edges stay clean
      const a = ink;
      for (let c = 0; c < 3; c++) data[i + c] = a > 0 ? Math.max(0, Math.min(255, (data[i + c] - 255 * (1 - a)) / a)) : 0;
      data[i + 3] = Math.round(255 * a);
    }
  }
  await sharp(data, { raw: info }).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toFile(out);
  console.log("wrote", out);
}
await convert("public/logo-full.png", "public/logo-full-light.png");
await convert("public/logo-icon.png", "public/logo-icon-light.png");
await clear("public/logo-full.png", "public/logo-full-clear.png");
await clear("public/logo-icon.png", "public/logo-icon-clear.png");
