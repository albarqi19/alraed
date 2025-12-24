import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'node:path'
// import { VitePWA } from 'vite-plugin-pwa' // معطل - نستخدم Firebase SW فقط

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // VitePWA معطل - نستخدم firebase-messaging-sw.js + manifest.json يدوي
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
