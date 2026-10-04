import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nativeApiOrigin } from "../../scripts/native-runtime-config.mts";

export default defineConfig(({ command, mode, isPreview }) => ({
  root: fileURLToPath(new URL(".", import.meta.url)),
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify(
      nativeApiOrigin(
        process.env,
        "desktop",
        (command === "serve" && !isPreview) || mode === "development"
      )
    )
  },
  plugins: [react()],
  publicDir: false,
  build: { outDir: "dist", emptyOutDir: true },
  server: { host: "127.0.0.1", port: 1422, strictPort: true },
  preview: { host: "127.0.0.1", port: 4175, strictPort: true }
}));
