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
      // Keep shared code out of the page bundles, otherwise the home page could end up importing (and running) the museum bundle
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "three";
          if (id.includes("node_modules/@firebase/database") || id.includes("node_modules/firebase/database")) return "firebase-db";
          if (id.includes("node_modules/@firebase") || id.includes("node_modules/firebase")) return "firebase";
          if (id.includes("/src/shared.js") || id.includes("/src/config.js") || id.includes("rolldown") || id.includes("\0")) return "shared";
        },
      },
    },
  },
});
