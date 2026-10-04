import type { CapacitorConfig } from "@capacitor/cli";
import { capacitorServer } from "../../scripts/native-runtime-config.mts";

const server = capacitorServer(process.env);
const config: CapacitorConfig = {
  appId: "com.example.product.mobile",
  appName: "Product Starter",
  webDir: "dist",
  server,
  android: { allowMixedContent: server.cleartext === true }
};
export default config;
