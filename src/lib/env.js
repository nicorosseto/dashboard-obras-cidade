// Detecta o ambiente atual a partir da variável VITE_APP_ENV, que deve ser
// definida por ambiente (no Vercel e no .env.local):
//   - 'production'  -> site real (banco de produção). NÃO mostra aviso.
//   - 'preview'     -> ambiente de HOMOLOGAÇÃO/teste no Vercel (banco de teste).
//   - 'development' -> rodando localmente (npm run dev).
//
// Obs.: o usuário chama o ambiente de teste de "homologação" (termo que ele já
// usa em outros sistemas); por isso a faixa amarela mostra "HOMOLOGAÇÃO".
//
// Se a variável não estiver definida, usamos o modo do próprio Vite (DEV/PROD)
// como rede de segurança: em build de produção sem a variável, não mostramos
// nada (para não dar alarme falso no site real).

import { NAVY } from './cores.js'
import { ehModoDemo } from './demo.js'

const appEnv = import.meta.env.VITE_APP_ENV

export const IS_PRODUCTION = appEnv === 'production'

// Retorna os dados do aviso visual, ou null quando não deve aparecer (produção).
// A faixa de DEMO tem precedência sobre qualquer outra (homologação/dev):
// é o deploy público de portfólio, sempre com dados fictícios.
export function getAmbiente() {
  if (ehModoDemo()) {
    return {
      label: 'DEMONSTRAÇÃO — DADOS FICTÍCIOS PARA PORTFÓLIO',
      cor: '#0f766e',
      emoji: '🔍',
    }
  }

  if (appEnv === 'production') return null

  if (appEnv === 'preview') {
    return {
      label: 'HOMOLOGAÇÃO (AMBIENTE DE TESTE)',
      cor: '#9a6700',
      emoji: '🟡',
    }
  }

  if (appEnv === 'development' || import.meta.env.DEV) {
    return { label: 'DESENVOLVIMENTO LOCAL', cor: NAVY, emoji: '🔧' }
  }

  // Build de produção sem VITE_APP_ENV definido: não arrisca mostrar aviso.
  return null
}
