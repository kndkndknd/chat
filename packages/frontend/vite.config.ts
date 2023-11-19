import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "./html/index.html",
        snowleopard: "./src/snowleopard/snowLeopardClient.js",
      },
      output: {
        dir: "../build/client",
        entryFileNames: "[name].js",
      },
    },
  },
  server: {
    proxy: {
      "/socket.io": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
});
