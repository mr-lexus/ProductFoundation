import type { ManifestOptions, VitePWAOptions } from "vite-plugin-pwa";
import manifest from "./pwa-manifest.json";

export const pwaOptions: Partial<VitePWAOptions> = {
  strategies: "generateSW",
  registerType: "prompt",
  injectRegister: false,
  devOptions: { enabled: false },
  manifest: manifest as Partial<ManifestOptions>,
  includeAssets: ["icons/apple-touch-icon.png"],
  workbox: {
    globPatterns: ["**/*.{html,js,css}", "icons/*.png"],
    cleanupOutdatedCaches: true,
    // Workbox NavigationRoute matches request.mode === "navigate" only. Fetches,
    // scripts, images and worker requests must never receive the HTML fallback.
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [
      /^\/(?:rpc|health|metrics)(?:\/|\?|$)/,
      /^\/(?:assets|icons)(?:\/|\?|$)/,
      /\.(?:js|mjs|css|map|json|webmanifest|wasm|xml|txt|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf|mp4|webm|pdf)(?:\?|$)/i
    ],
    runtimeCaching: []
  }
};
