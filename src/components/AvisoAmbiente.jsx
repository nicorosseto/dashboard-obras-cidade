import { getAmbiente } from '../lib/env.js'

// Faixa fina no topo da tela avisando quando o app NÃO está em produção
// (ambiente de teste/preview ou desenvolvimento local). Serve para você nunca
// confundir e mexer no banco real sem querer. Em produção não renderiza nada.
export default function AvisoAmbiente() {
  const ambiente = getAmbiente()
  if (!ambiente) return null

  return (
    <div
      role="status"
      style={{
        background: ambiente.cor,
        color: '#fff',
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.05em',
        padding: '4px 8px',
      }}
    >
      {ambiente.emoji} {ambiente.label} — você NÃO está no banco de produção
    </div>
  )
}
