import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "./html/index.html",
        "chat-processor": path.resolve(
          __dirname,
          "./src/audioWorklet/chat-processor.js",
        ),
        "whitenoise-processor": path.resolve(
          __dirname,
          "./src/audioWorklet/whitenoise-processor.js",
        ),
        form: "./html/form.html",
        vosk: "./html/vosk.html",
        rotate: "./html/rotate.html",
        // snowleopard: "./src/snowleopard/snowLeopardClient.js",
      },
      output: {
        dir: "../backend/static",
        entryFileNames: (chunk) => {
          if (chunk.name === "chat-processor") {
            return "chat-processor.js";
          }
          if (chunk.name === "whitenoise-processor") {
            return "whitenoise-processor.js";
          }
          return "[name].js";
        },
        // entryFileNames: "[name].js",
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
