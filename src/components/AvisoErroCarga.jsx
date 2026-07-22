// Banner não-intrusivo exibido quando a carga de um dataset grande (ex.:
// Sistema Geo) falha (timeout, rate limit, rede) — sem isso o erro só ia pro
// console e a tela ficava com os dados zerados sem nenhum aviso (achado de
// 22/07/2026). Não fecha sozinho (padrão do projeto).
export default function AvisoErroCarga({ mensagem, onTentarNovamente }) {
  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-300 w-full max-w-md px-4"
    >
      <div className="flex items-start gap-3 rounded-xl border border-red/30 bg-red/5 px-4 py-3 shadow-lg">
        <span className="mt-0.5 text-base leading-none" aria-hidden>
          ⚠️
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red">Falha ao carregar dados</p>
          <p className="text-xs text-red/80 mt-0.5">{mensagem}</p>
        </div>
        <button
          onClick={onTentarNovamente}
          className="px-3 py-1 rounded-sm bg-red text-white text-xs font-semibold hover:opacity-90 transition-colors whitespace-nowrap shrink-0"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
