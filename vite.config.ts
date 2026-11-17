import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // node_modules/.vite picked up root-owned files from a past run and can't
  // be cleaned without sudo in this environment; point the cache elsewhere
  // instead of fighting that. See .gitignore.
  cacheDir: '.vite-cache',
})
