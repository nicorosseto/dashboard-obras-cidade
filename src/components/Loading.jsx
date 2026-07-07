// ─── Injeta keyframes CSS uma única vez ──────────────────────────────
const STYLE_ID = '__loading_styles'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes topbar-fill {
      0%   { width: 0%;   opacity: 1; }
      25%  { width: 45%;  opacity: 1; }
      60%  { width: 72%;  opacity: 1; }
      85%  { width: 86%;  opacity: 1; }
      100% { width: 92%;  opacity: 1; }
    }
    @keyframes topbar-done {
      0%   { width: 92%; opacity: 1; }
      80%  { width: 100%; opacity: 1; }
      100% { width: 100%; opacity: 0; }
    }
  `
  document.head.appendChild(s)
}

// ────────────────────────────────────────────────────────────────────
// Barra fina no topo (estilo YouTube / GitHub)
// ────────────────────────────────────────────────────────────────────
export function TopProgressBar() {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-200 h-0.5 bg-transparent pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-navy shadow-xs"
        style={{
          animation: 'topbar-fill 3s ease-out forwards',
          boxShadow: '0 0 6px 0 #1F3864aa',
        }}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Spinner SVG animado
// ────────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', color = '#1F3864' }) {
  const dim = { sm: 18, md: 32, lg: 52, xl: 64 }[size] ?? 32
  const stroke = { sm: 2.5, md: 3, lg: 3.5, xl: 4 }[size] ?? 3
  const r = dim / 2 - stroke * 1.5
  const circ = 2 * Math.PI * r

  return (
    <svg
      width={dim}
      height={dim}
      viewBox={`0 0 ${dim} ${dim}`}
      fill="none"
      style={{
        animation: 'spin 0.85s linear infinite',
        display: 'block',
        flexShrink: 0,
      }}
    >
      <circle
        cx={dim / 2}
        cy={dim / 2}
        r={r}
        stroke="#E5E7EB"
        strokeWidth={stroke}
      />
      <circle
        cx={dim / 2}
        cy={dim / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circ * 0.72} ${circ * 0.28}`}
        strokeDashoffset={circ * 0.25}
      />
    </svg>
  )
}

// ────────────────────────────────────────────────────────────────────
// Tela cheia (auth, carga inicial, erros)
// ────────────────────────────────────────────────────────────────────
export function LoadingPage({
  mensagem = 'Carregando...',
  erro = false,
  progresso = null,
}) {
  // Só mostra a barra exata quando o total é confiável (positivo e não
  // ultrapassado). Com count subestimado, a barra fixaria em 100% parecendo
  // travada — nesse caso fica só a barra animada (CSS) acima.
  const totalConfiavel =
    progresso && progresso.total > 0 && progresso.carregadas <= progresso.total
  const pct = totalConfiavel
    ? Math.min(100, Math.round((progresso.carregadas / progresso.total) * 100))
    : 0

  return (
    <>
      {!erro && <TopProgressBar />}
      <div className="min-h-screen flex flex-col items-center justify-center bg-grey-bg gap-6">
        {!erro && <Spinner size="xl" />}
        {erro && (
          <div className="w-14 h-14 rounded-full bg-red/10 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-red"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        )}
        <div className="text-center">
          <p className={`text-sm font-medium ${erro ? 'text-red' : 'text-navy/70'}`}>
            {mensagem}
          </p>
          {totalConfiavel && (
            <>
              <div className="mt-4 w-64 h-2 bg-navy/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-navy transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-navy/60 mt-2">{pct}%</p>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ────────────────────────────────────────────────────────────────────
// Spinner inline para seções (ex: tabelas do Admin, aba Histórico)
// ────────────────────────────────────────────────────────────────────
export function LoadingInline({
  mensagem = 'Carregando...',
  height = 'py-10',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${height}`}
    >
      <Spinner size="md" />
      <p className="text-xs text-gray-500 font-medium">{mensagem}</p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Spinner para área de conteúdo de página inteira (ex: emergências)
// ────────────────────────────────────────────────────────────────────
export function LoadingConteudo({ mensagem = 'Carregando...' }) {
  return (
    <>
      <TopProgressBar />
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-navy/70">{mensagem}</p>
      </div>
    </>
  )
}
