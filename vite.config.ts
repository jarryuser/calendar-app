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
  // Tauri-friendly dev server: fixed port and keep the terminal output
  // (so Rust compiler errors stay visible during `tauri dev`).
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
})
