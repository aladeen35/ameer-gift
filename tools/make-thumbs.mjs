// Renders the four museum templates to public/templates/<name>.jpg (needs `npm run dev` running on :5173)
import { chromium } from "playwright";
import sharp from "sharp";
const base = process.argv[2] || "http://localhost:5173/";
const b = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const tpl of ["classic", "garden", "wedding", "grad"]) {
  const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  await p.goto(`${base}museum.html?demo=1&shot=1&q=high&tpl=${tpl}`);
  await p.waitForFunction(() => document.body.dataset.ready === "1", null, { timeout: 120000 });
  await p.waitForTimeout(5000);
  const png = await p.screenshot();
  await sharp(png).resize(600, 400).jpeg({ quality: 78, mozjpeg: true }).toFile(`public/templates/${tpl}.jpg`);
  console.log("wrote", tpl); await p.close();
}
await b.close();
