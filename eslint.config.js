import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/**", "node_modules/**", "prototype/**", "public/**", "test-results/**", "playwright-report/**", "android/**"] },
  js.configs.recommended,
  {
    files: ["src/**/*.js", "*.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.browser } },
    rules: { "no-empty": ["error", { allowEmptyCatch: true }], "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }] },
  },
  {
    files: ["tools/**/*.mjs", "tests/**/*.js", "playwright.config.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.node, ...globals.browser } },
    rules: { "no-empty": ["error", { allowEmptyCatch: true }], "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }] },
  },
];
