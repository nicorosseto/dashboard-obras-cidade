const ABAS_FISC = [
  { id: 1, label: 'Visão Geral', icon: '👁️' },
  { id: 2, label: 'Evolução Temporal', icon: '📈' },
  { id: 3, label: 'Distribuição Espacial', icon: '🗺️' },
  { id: 4, label: 'Detalhes', icon: '📋' },
  { id: 6, label: 'Executoras', icon: '🏢' },
  { id: 7, label: 'Busca por Processo', icon: '🔍' },
]

const ABAS_GEO = [
  { id: 1, label: 'Visão Geral', icon: '👁️' },
  { id: 2, label: 'Linha do Tempo', icon: '⏳' },
  { id: 3, label: 'Subprefeitura', icon: '📍' },
  { id: 6, label: 'Busca por Processo', icon: '🔍' },
]

export default function PageTabs({
  ativa,
  onChange,
  showAdmin = false,
  secaoAtiva = 'fiscalizacao',
  abasPermitidas,
  accentFrom = '#1F3864',
  accentTo = '#2E4F7F',
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
          className={`flex items-center gap-1.5 text-sm font-semibold py-2 transition-all relative ${
            ativa === a.id ? 'text-white' : 'text-white/70 hover:text-white'
          }`}
        >
          <span className="text-lg">{a.icon}</span>
          <span className="hidden sm:inline">{a.label}</span>
          {ativa === a.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={underlineStyle} />
          )}
        </button>
      ))}

      {showAdmin && <div className="w-px h-5 bg-white/30 mx-1" />}

      {showAdmin && (
        <button
          onClick={() => onChange(5)}
          title="Administração"
          aria-label="Administração"
          aria-current={ativa === 5 ? 'page' : undefined}
          className={`flex items-center gap-1.5 text-sm font-semibold py-2 transition-all relative ${
            ativa === 5 ? 'text-white' : 'text-white/70 hover:text-white'
          }`}
        >
          <span className="text-lg">⚙️</span>
          <span className="hidden sm:inline">Admin</span>
          {ativa === 5 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={underlineStyle} />
          )}
        </button>
      )}
    </nav>
  )
}
