import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "./html/index.html",
        form: "./html/form.html",
        rotate: "./html/rotate.html",
        // snowleopard: "./src/snowleopard/snowLeopardClient.js",
      },
      output: {
        dir: "../backend/static",
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
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
