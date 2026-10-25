import { test, expect } from "@playwright/test";

const shot = (page, info, name) => page.screenshot({ path: info.outputPath(name + ".png") }).then(b => info.attach(name, { body: b, contentType: "image/png" }));

test("home page shows the sign-in card and the demo link", async ({ page }, info) => {
  await page.goto("index.html");
  await expect(page.locator("#gBtn")).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".demo-cta a")).toHaveAttribute("href", /museum\.html\?demo=1/);
  await shot(page, info, "home");
});

test("admin page shows the team sign-in", async ({ page }, info) => {
  await page.goto("admin.html");
  await expect(page.locator("#vLogin")).toBeVisible({ timeout: 20000 });
  await shot(page, info, "admin");
});

test("credits list every library", async ({ page }) => {
  await page.goto("credits.html");
  await expect(page.locator(".cr .card")).toHaveCount(11);
});

test("waiting page counts down", async ({ page }, info) => {
  await page.goto("museum.html?demo=1&q=low&lang=ar&soon=100000");
  await expect(page.locator("#soon")).toBeVisible({ timeout: 60000 });
  const first = await page.locator("#cd3").textContent();
  await page.waitForTimeout(2200);
  expect(await page.locator("#cd3").textContent()).not.toBe(first);
  await shot(page, info, "waiting-ar");
});

test("demo museum: pick a character, enter, open a painting", async ({ page }, info) => {
  await page.goto("museum.html?demo=1&q=medium&lang=ar");
  await expect(page.locator("#sheet")).toBeVisible({ timeout: 90000 });
  await page.waitForTimeout(2000);
  await shot(page, info, "entrance");
  await page.locator('#who button[data-who="woman"]').click();
  await page.waitForTimeout(2500);
  await page.fill("#name", "سارة");
  await page.click("#enter");
  await page.waitForFunction(() => window.__ag?.S.mode === "museum", null, { timeout: 90000 });
  await page.waitForTimeout(4000);
  await shot(page, info, "hall");
  // stand in front of the first painting on the left wall
  await page.evaluate(() => Object.assign(window.__ag.P, { x: -4.6, z: 6.6, yaw: -1.6, camYawT: 1.25, camYaw: 1.25, intro: 0 }));
  await expect(page.locator("#view")).toBeVisible({ timeout: 30000 });
  await page.click("#view");
  await expect(page.locator("#viewer")).toBeVisible({ timeout: 30000 });
  await page.fill("#ctext", "ذكرى جميلة");
  await page.click("#csend");
  await expect(page.locator(".cm")).toHaveCount(1);
  await shot(page, info, "viewer");
});

test("unknown museum link explains the problem", async ({ page }, info) => {
  await page.goto("museum.html");
  await expect(page.locator("#msg")).toBeVisible({ timeout: 30000 });
  await shot(page, info, "bad-link");
});
