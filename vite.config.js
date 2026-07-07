import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
  build: {
    // O aviso padrão (500 kB) dispara no chunk do recharts mesmo ele sendo
    // vendor isolado, carregado só sob demanda — não bloqueia o chunk inicial.
    // Subir o limite evita ruído sem esconder regressão real (o chunk inicial
    // continua sendo o que importa e é monitorado à parte).
    chunkSizeWarningLimit: 600,
    // Vite 8 (Rolldown): `rollupOptions` virou `rolldownOptions` e a forma de
    // OBJETO do `manualChunks` deixou de existir — o substituto é o
    // `codeSplitting` (grupos com test/priority).
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // ⚠️ O grupo `react` com prioridade MAIOR é o que corrige o achado
            // do PR 1 da M4: sem um chunk próprio, o react/react-dom era
            // alojado dentro do chunk do recharts e o entry pré-carregava
            // 434 kB de recharts no boot só para obter o React. Grupo de
            // prioridade maior "rouba" os módulos dos grupos abaixo.
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 10,
            },
            // Fase M2 (modernização): libs pesadas em chunks de vendor
            // próprios — cacheiam independente do código da aplicação e,
            // combinadas com o lazy-loading das páginas em App.jsx, cada
            // módulo só baixa o vendor que realmente usa. (As dependências
            // de cada lib entram junto no grupo — comportamento padrão do
            // codeSplitting, `includeDependenciesRecursively: true`.)
            { name: 'recharts', test: /node_modules[\\/]recharts[\\/]/, priority: 5 },
            {
              name: 'leaflet',
              test: /node_modules[\\/](react-leaflet|@react-leaflet|leaflet)[\\/]/,
              priority: 5,
            },
            { name: 'xlsx', test: /node_modules[\\/]xlsx[\\/]/, priority: 5 },
            {
              name: 'html-to-image',
              test: /node_modules[\\/]html-to-image[\\/]/,
              priority: 5,
            },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/, priority: 5 },
          ],
        },
      },
    },
  },
})
