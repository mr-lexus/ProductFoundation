import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { pwaOptions } from "./pwa.config";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), VitePWA(pwaOptions)],
  build: { outDir: "dist", emptyOutDir: true },
  server: { host: "127.0.0.1", port: 1420, strictPort: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true }
});
