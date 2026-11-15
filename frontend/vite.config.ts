import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Mantém as URLs das imagens iguais nos bundles do navegador e do servidor.
    assetsInlineLimit: 0,
    // Evita publicar o código-fonte original em arquivos .map.
    sourcemap: false,
  },
})
