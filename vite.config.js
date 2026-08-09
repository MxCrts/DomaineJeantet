import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Le site est publie sur GitHub Pages sous le sous-chemin /DomaineJeantet/
export default defineConfig({
  base: '/DomaineJeantet/',
  plugins: [react()],
  build: {
    // Le SDK Firebase (auth + firestore) fait a lui seul ~600 Ko non compresses
    // (~165 Ko gzip). C'est attendu, on evite juste l'avertissement au build.
    chunkSizeWarningLimit: 900,
  },
})
