import { Config } from "@remotion/cli/config";
import path from "node:path";

// Offline composition imports the same presentation components as the app.
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: { ...config.resolve?.alias, "@": path.resolve("src") },
  },
}));
