import { defineConfig } from 'vite'
import { resolve } from 'path'

//import reactRefresh from '@vitejs/plugin-react-refresh'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  //plugins: [reactRefresh()],
  root: 'src/pages',
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        '': resolve(__dirname, 'src/pages/index.html'),
        'snowleopard': resolve(__dirname, 'src/pages/snowleopard/index.html'),
      },
      output: {
        entryFileNames: `assets/[name]/bundle.js`,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === '.css') {
            return 'assets/index.css'
          }
          return `assets/[name].[ext]`
        },
        chunkFileNames: `assets/[name].js`,
      }
    }
  },
  server: {
    https: {
      key: fs.readFileSync('../../../keys/privkey.pem'),
      cert: fs.readFileSync('../../../keys/cert.pem'),
    },
    proxy: {
      '/socket.io': {
        target: 'http://localhost:8888',
        ws: true,
      }
    }
  },
})