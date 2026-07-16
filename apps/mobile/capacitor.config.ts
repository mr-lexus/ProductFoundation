import type { CapacitorConfig } from "@capacitor/cli";

const liveReloadUrl = process.env.CAP_SERVER_URL;
const liveReloadEnabled = process.env.CAP_LIVE_RELOAD === "true";

if (liveReloadUrl !== undefined && !liveReloadEnabled) {
  throw new Error("CAP_SERVER_URL requires the explicit CAP_LIVE_RELOAD=true development flag.");
}
if (liveReloadEnabled && liveReloadUrl === undefined) {
  throw new Error("CAP_LIVE_RELOAD=true requires CAP_SERVER_URL.");
}

const liveReloadServer = (() => {
  if (liveReloadUrl === undefined) {
    return undefined;
  }
  const url = new URL(liveReloadUrl);
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.origin !== liveReloadUrl) {
    throw new Error("CAP_SERVER_URL must be an exact http or https origin.");
  }
  return {
    allowNavigation: [url.hostname],
    cleartext: url.protocol === "http:",
    url: url.origin
  };
})();

const config: CapacitorConfig = {
  appId: "com.example.product.mobile",
  appName: "Product Starter",
  webDir: "../web/dist",
  ...(liveReloadServer === undefined
    ? {}
    : {
        server: liveReloadServer
      })
};

export default config;
