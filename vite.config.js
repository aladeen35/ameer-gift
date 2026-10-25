import { defineConfig } from "vite";
import { resolve } from "node:path";

// Relative base so the same build works on GitHub Pages (/ameer-gift/) and on a custom domain
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    outDir: "dist",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        admin: resolve(import.meta.dirname, "admin.html"),
        museum: resolve(import.meta.dirname, "museum.html"),
        credits: resolve(import.meta.dirname, "credits.html"),
      },
    },
  },
});
