import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin in development: the session cookie works without cross-site settings.
    proxy: { '/api': 'http://127.0.0.1:3333' },
  },
})
