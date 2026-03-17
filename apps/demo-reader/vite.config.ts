
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' && process.env.VITE_BASE_PATH ? process.env.VITE_BASE_PATH : '/',
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
    },
  },
}))