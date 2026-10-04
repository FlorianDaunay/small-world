/// <reference types="vitest" />
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import pkg from "./package.json";

// `base: "./"` keeps every asset path relative, so the build works on GitHub Pages
// whatever the repository name is (https://<user>.github.io/<repo>/).
export default defineConfig({
  base: "./",
  plugins: [react()],
  // Single source of truth for the version: package.json, exposed to the app at build time.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    // Libraries change less often than the game: a separate chunk stays cached between releases.
    rollupOptions: { output: { manualChunks: { vendor: ["react", "react-dom", "react-router-dom", "zustand", "peerjs"] } } },
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { globals: true, environment: "node", include: ["src/**/*.test.ts"] },
});
