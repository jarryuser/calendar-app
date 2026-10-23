import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/\/(ical\.js|rrule)\//.test(id)) return 'calendar-io'
          if (/\/(date-fns|date-fns-tz)\//.test(id)) return 'dates'
          if (id.includes('/@dnd-kit/')) return 'drag-and-drop'
          if (/\/(react|react-dom|scheduler)\//.test(id)) return 'react'
        },
      },
    },
  },
  // Tauri-friendly dev server: fixed port and keep the terminal output
  // (so Rust compiler errors stay visible during `tauri dev`).
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
})
