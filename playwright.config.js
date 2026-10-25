import { defineConfig } from "@playwright/test";

// Smoke tests at a phone viewport (390x844). Screenshots are kept as CI artifacts.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4173/",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    screenshot: "on",
    launchOptions: {
      executablePath: process.env.PW_CHROME || undefined,
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  webServer: { command: "npm run preview", url: "http://localhost:4173/", reuseExistingServer: !process.env.CI, timeout: 60000 },
});
