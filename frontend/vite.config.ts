import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname);
  const fileEnv = loadEnv(mode, envDir, "");
  const dfxNetwork =
    fileEnv.VITE_DFX_NETWORK || fileEnv.DFX_NETWORK || "local";
  const backendCanister =
    fileEnv.VITE_CANISTER_ID_ASEED_BACKEND ||
    "rrkah-fqaaa-aaaaa-aaaaq-cai";

  return {
    plugins: [react()],
    define: {
      global: "globalThis",
      "process.env.CANISTER_ID_ASEED_BACKEND": JSON.stringify(backendCanister),
      "process.env.DFX_NETWORK": JSON.stringify(dfxNetwork),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:4943",
          changeOrigin: true,
        },
      },
    },
  };
});
