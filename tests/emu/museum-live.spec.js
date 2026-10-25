// Full data path against the Firebase emulators: teaser -> access code -> vault + photos -> comment saved.
// Run: npm run test:emu   (starts the emulators and a preview server)
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, Timestamp } from "firebase/firestore";
import { createHash } from "node:crypto";

const GID = "emutest01", PIN = "4821";
const key = GID + "-" + createHash("sha256").update(GID + ":" + PIN).digest().subarray(0, 12).toString("hex");
const png = "data:image/png;base64," + fs.readFileSync("public/icon-192.png").toString("base64");
let env;

test.beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-ameer-gift", firestore: { rules: fs.readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore(); const openAt = Timestamp.fromMillis(Date.now() - 60000), expiresAt = Timestamp.fromMillis(Date.now() + 864e5);
    await setDoc(doc(db, "teasers", GID), { status: "active", title: "معرض العائلة", recipient: "أمي", sender: "أحمد", openAt, expiresAt, logo: "", owner: "owner1", template: "wedding", sideRoom: false });
    await setDoc(doc(db, "vaults", key), { owner: "owner1", gid: GID, status: "active", demo: false, title: "معرض العائلة", recipient: "أمي", sender: "أحمد", dedication: "إلى أغلى الناس", company: { name: "", logo: "" },
      template: "wedding", music: "", visitors: 4, sideRoom: false, openAt, expiresAt, photoCount: 3 });
    for (const [i, d] of ["2019-05-01", "2015-01-20", "2022-11-11"].entries()) await setDoc(doc(db, "vaults", key, "photos", "p" + i), { img: png, date: d, title: "صورة " + (i + 1), caption: "تعليق " + (i + 1) });
  });
});
test.afterAll(async () => { await env?.cleanup(); });

test("visitor opens a real museum with the code and leaves a comment", async ({ page }, info) => {
  await page.goto(`museum.html?g=${GID}&emu=1&q=low&lang=ar`);
  await expect(page.locator("#pin")).toBeVisible({ timeout: 60000 });
  await page.locator(".pins input").first().click();
  await page.keyboard.type("1111");
  await expect(page.locator("#pinErr")).not.toBeEmpty({ timeout: 20000 });
  await page.screenshot({ path: info.outputPath("pin-wrong.png") });
  for (const [i, d] of [...PIN].entries()) await page.locator(".pins input").nth(i).fill(d);
  await expect(page.locator("#sheet")).toBeVisible({ timeout: 90000 });
  await expect(page.locator("#iTitle")).toHaveText("معرض العائلة");
  // photos are hung oldest first
  const titles = await page.evaluate(() => window.__ag.S.arts.map(a => a.title));
  expect(titles).toEqual(["صورة 2", "صورة 1", "صورة 3"]);
  await page.fill("#name", "ليلى");
  await page.click("#enter");
  await page.waitForFunction(() => window.__ag?.S.mode === "museum", null, { timeout: 90000 });
  await page.evaluate(() => Object.assign(window.__ag.P, { x: -4.6, z: 6.6, yaw: -1.6, camYawT: 1.25, camYaw: 1.25, intro: 0 }));
  await expect(page.locator("#view")).toBeVisible({ timeout: 30000 });
  await page.click("#view");
  await expect(page.locator("#viewer")).toBeVisible({ timeout: 30000 });
  await page.click("#like");
  await page.fill("#ctext", "ذكرى لا تُنسى");
  await page.click("#csend");
  await page.screenshot({ path: info.outputPath("viewer-live.png") });
  // the comment reached Firestore under the visitor's anonymous id
  await expect.poll(async () => {
    let found = null;
    await env.withSecurityRulesDisabled(async c => { const uid = await page.evaluate(() => window.__ag.S.auth?.currentUser?.uid); if (!uid) return; const s = await getDoc(doc(c.firestore(), "vaults", key, "social", uid)); found = s.exists() ? s.data() : null; });
    return found && found.comments?.[0]?.t;
  }, { timeout: 20000 }).toBe("ذكرى لا تُنسى");
  // and the visit was counted
  await expect.poll(async () => { let n = 0; await env.withSecurityRulesDisabled(async c => { const s = await getDoc(doc(c.firestore(), "visits", GID)); n = s.exists() ? s.data().count : 0; }); return n; }, { timeout: 20000 }).toBe(1);
});

test("a museum that has not opened yet shows the countdown", async ({ page }) => {
  await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), "teasers", "later01"), { status: "active", title: "قريبًا", recipient: "أ", sender: "ب", openAt: Timestamp.fromMillis(Date.now() + 3 * 864e5), logo: "", owner: "o" }); });
  await page.goto(`museum.html?g=later01&emu=1&q=low`);
  await expect(page.locator("#soon")).toBeVisible({ timeout: 60000 });
  await expect(page.locator("#cd0")).not.toHaveText(/^(00|٠٠)$/);
});

test("an expired trial shows the trial-ended screen", async ({ page }) => {
  await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), "teasers", "trial01"), { status: "trial", title: "تجربة", recipient: "أ", sender: "ب", openAt: Timestamp.fromMillis(Date.now() - 7200e3), expiresAt: Timestamp.fromMillis(Date.now() - 3600e3), logo: "", owner: "o" }); });
  await page.goto(`museum.html?g=trial01&emu=1&q=low&lang=ar`);
  await expect(page.locator("#msgT")).toHaveText("انتهت التجربة المجانية", { timeout: 60000 });
});
