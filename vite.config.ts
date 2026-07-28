import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const workerHubTarget = env.VITE_WORKER_HUB_HOST;

  return {
    plugins: [react()],
    build: {
      outDir: "h5",
    },
    server: {
      host: "127.0.0.1",
      port: 5175,
      proxy: {
        "/v1/": {
          target: workerHubTarget,
          changeOrigin: true,
        },
      },
    },
  };
});

