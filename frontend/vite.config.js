import fs from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isDocker = fs.existsSync('/.dockerenv')
const defaultBackendTarget = process.env.VITE_PROXY_TARGET || (isDocker ? 'http://backend:5000' : 'http://localhost:5000')
const defaultWsTarget = process.env.VITE_PROXY_TARGET || (isDocker ? 'ws://backend:5000' : 'ws://localhost:5000')

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,

    watch: {
      usePolling: true,
    },

    proxy: {
      '/api': {
        target: defaultBackendTarget,
        changeOrigin: true,
        secure: false,
        ws: true,
      },

      '/ws': {
        target: defaultWsTarget,
        ws: true,
        changeOrigin: true,
      },

      '/uploads': {
        target: defaultBackendTarget,
        changeOrigin: true,
      },
    },
  },
})
