import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // The Supabase library is part of the main script, which is intended. The photo-identification
    // and QR-code libraries are already loaded on demand.
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
    // Tests that type into forms and wait for saves are slow when the whole suite runs at once.
    testTimeout: 20_000,
  },
})
