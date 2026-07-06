import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
  build: {
    // O aviso padrão (500 kB) dispara no chunk do recharts (563 kB) mesmo ele
    // sendo vendor isolado, carregado só sob demanda — não bloqueia o chunk
    // inicial (156 kB). Subir o limite evita ruído sem esconder regressão real
    // (o chunk inicial continua sendo o que importa e é monitorado à parte).
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Fase M2 (modernização): separa as libs pesadas em chunks de vendor
        // próprios — cacheiam independente do código da aplicação (mudam bem
        // menos) e, combinadas com o lazy-loading das páginas em App.jsx, cada
        // módulo só baixa o vendor que realmente usa.
        manualChunks: {
          recharts: ['recharts'],
          leaflet: ['leaflet', 'react-leaflet'],
          xlsx: ['xlsx'],
          'html-to-image': ['html-to-image'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
