import { NAVY, NAVY_LIGHT } from '../lib/cores.js'
import { ABAS_FISC, ABAS_GEO } from '../lib/abasPaginas.js'

export default function PageTabs({
  ativa,
  onChange,
  secaoAtiva = 'fiscalizacao',
  abasPermitidas,
  accentFrom = NAVY,
  accentTo = NAVY_LIGHT,
}) {
  const todas = secaoAtiva === 'sistemaGeo' ? ABAS_GEO : ABAS_FISC
  const abas = abasPermitidas
    ? todas.filter((a) => abasPermitidas.includes(a.id))
    : todas

  const underlineStyle = { background: `linear-gradient(to right, ${accentFrom}, ${accentTo})` }

  return (
    <nav className="flex items-center gap-4">
      {abas.map((a) => (
        <button
          key={a.id}
          onClick={() => onChange(a.id)}
          title={a.label}
          aria-label={a.label}
          aria-current={ativa === a.id ? 'page' : undefined}
          className={`flex items-center gap-1.5 text-sm py-2 transition-all relative ${
            ativa === a.id ? 'text-white font-bold' : 'text-white/70 font-semibold hover:text-white'
          }`}
        >
          <span className="text-lg">{a.icon}</span>
          <span className="hidden sm:inline">{a.label}</span>
          {ativa === a.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={underlineStyle} />
          )}
        </button>
      ))}
    </nav>
  )
}
