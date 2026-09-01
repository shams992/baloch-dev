import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Create ESM-compatible __dirname replacement
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@/pages/admin', replacement: path.resolve(__dirname, './src/Admin') },
      { find: '@/lib', replacement: path.resolve(__dirname, './src/Backend') },
      { find: '@/pages', replacement: path.resolve(__dirname, './src/Frontend/pages') },
      { find: '@/components', replacement: path.resolve(__dirname, './src/Frontend/components') },
      { find: '@/three', replacement: path.resolve(__dirname, './src/Frontend/three') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Allows access via local IP (192.168.x.x) or tunnels without host header errors
    allowedHosts: ['all'], 
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          motion: ['framer-motion', 'gsap'],
        },
      },
    },
  },
})