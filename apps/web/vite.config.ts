import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, searchForWorkspaceRoot } from "vite";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 1420,
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        resolve(currentDirectory, "../../packages/contracts"),
        resolve(currentDirectory, "../../packages/frontend-app")
      ]
    }
  }
});
