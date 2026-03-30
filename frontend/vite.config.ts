import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
    "process.env.CANISTER_ID_ASEED_BACKEND": JSON.stringify(
      process.env.VITE_CANISTER_ID_ASEED_BACKEND || "rrkah-fqaaa-aaaaa-aaaaq-cai"
    ),
    "process.env.DFX_NETWORK": JSON.stringify(process.env.DFX_NETWORK || "local"),
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
});
