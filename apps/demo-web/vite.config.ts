import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@etapsky/sdf-kit'],
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      crypto: 'crypto-browserify',
    },
  },
})