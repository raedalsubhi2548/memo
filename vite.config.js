import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Deployed on Vercel at the domain root; deep links are rewritten to index.html (vercel.json)
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
  base: '/',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rollupOptions: {
      output: {
        ...(isSsrBuild ? {} : { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'] } }), // Supabase loads on demand (src/lib/api.js)
      },
    },
  },
}))
