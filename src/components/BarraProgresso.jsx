// Barra fina no topo da tela indicando o carregamento dos dados do Sistema Geo
// (são ~175 mil linhas, baixadas em páginas). Fica fixa no topo enquanto a
// carga não termina, para o usuário saber que os números ainda vão crescer.
export default function BarraProgresso({ carregadas, total }) {
  // Total confiável = positivo e ainda não ultrapassado pelas linhas baixadas.
  // Se o count estimado vier 0/subestimado, tratamos como INDETERMINADO: em vez
  // de fingir 100% ("Finalizando…" o tempo todo, parecendo travado), mostramos a
  // contagem crescendo com uma barra animada.
  const totalConfiavel = total > 0 && carregadas <= total
  const pct = totalConfiavel
    ? Math.min(100, Math.round((carregadas / total) * 100))
    : 0
  const finalizando = totalConfiavel && pct >= 100

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-navy text-white shadow-md">
      <div className="px-4 py-1.5 flex items-center gap-3">
        <svg
          className="w-4 h-4 animate-spin shrink-0"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <div className="shrink-0">
          <span className="text-[11px] font-semibold">
            {finalizando ? 'Finalizando…' : 'Carregando dados do Sistema Geo…'}
          </span>
          {!finalizando && (
            <span className="block text-[10px] text-white/60">
              Os outros módulos já estão disponíveis
            </span>
          )}
        </div>
        {!finalizando && (
          <>
            <div className="flex-1 h-2 bg-white/20 rounded overflow-hidden">
              {totalConfiavel ? (
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              ) : (
                // Total desconhecido: barra "indeterminada" (faixa que desliza)
                <div className="h-full w-1/3 bg-white/80 animate-pulse rounded" />
              )}
            </div>
            <span className="text-[11px] tabular-nums whitespace-nowrap">
              {carregadas.toLocaleString('pt-BR')}
              {totalConfiavel ? ` / ${total.toLocaleString('pt-BR')} (${pct}%)` : ' linhas'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
