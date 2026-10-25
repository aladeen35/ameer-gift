import base from "./playwright.config.js";
import { defineConfig } from "@playwright/test";
// Same as the smoke tests, but against the Firebase emulators (see npm run test:emu)
export default defineConfig({ ...base, testDir: "tests/emu", workers: 1, webServer: { ...base.webServer, command: "npm run build && npm run preview" } });
