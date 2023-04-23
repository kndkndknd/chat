import { defineConfig } from 'vite'
import dns from 'dns'

dns.setDefaultResultOrder('verbatim')

export default defineConfig({
  server: {
    proxy: {
      '/socket.io': {
        target: 'https://localhost:8888',
        ws: true,
      }
    }
  }
})