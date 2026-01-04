import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages deployment
  // Must match your repository name: https://username.github.io/SCREENER_APP/
  base: process.env.NODE_ENV === 'production' ? '/SCREENER_APP/' : '/',
})
