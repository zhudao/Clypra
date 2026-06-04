import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.clypra.app",
  appName: "Clypra",
  webDir: "dist",
  server: {
    androidScheme: "https",
    url: "http://192.168.193.39:1420",
    cleartext: true,
  },
};

export default config;
