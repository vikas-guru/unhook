/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: { port: 5173, host: true },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['node_modules/**', 'dist/**', '.claude/**', 'test-results/**'],
  },
})
