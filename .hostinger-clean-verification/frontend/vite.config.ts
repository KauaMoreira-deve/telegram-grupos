import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Evita publicar o código-fonte original em arquivos .map.
    sourcemap: false,
  },
})
