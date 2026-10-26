import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
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
        target: process.env.VITE_PROXY_TARGET || (process.env.CHOKIDAR_USEPOLLING ? 'http://backend:5000' : 'http://localhost:5000'),
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Không ngắt app nếu backend đang restart
            console.warn('[vite proxy warning]:', err.message);
          });
        },
      },
    },
  },
})
