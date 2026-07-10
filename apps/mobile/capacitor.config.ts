import type { CapacitorConfig } from "@capacitor/cli";

const liveReloadUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.gtdplanner.mobile",
  appName: "GTD Planner Mobile",
  webDir: "../web/dist",
  ...(liveReloadUrl
    ? {
        server: {
          allowNavigation: ["*"],
          cleartext: true,
          url: liveReloadUrl
        }
      }
    : {})
};

export default config;
