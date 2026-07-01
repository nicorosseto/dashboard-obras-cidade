// Banner não-intrusivo exibido quando os dados do sistema foram atualizados
// por outro usuário enquanto este estava logado. Não fecha sozinho (padrão do
// projeto). O polling ativo fica no App.jsx; este componente só exibe.
export default function AvisoAtualizacao({ modulos, onRecarregar, onDescartar }) {
  const lista = modulos.join(', ')
  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-md px-4"
    >
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg">
        <span className="mt-0.5 text-base leading-none" aria-hidden>🔄</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">Dados atualizados</p>
          <p className="text-xs text-amber-800 mt-0.5">
            {lista} {modulos.length === 1 ? 'foi atualizado' : 'foram atualizados'} por
            outro usuário. Recarregue para ver os dados novos.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={onRecarregar}
            className="px-3 py-1 rounded bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors whitespace-nowrap"
          >
            Recarregar
          </button>
          <button
            onClick={onDescartar}
            className="px-3 py-1 rounded border border-amber-400 text-amber-800 text-xs hover:bg-amber-100 transition-colors whitespace-nowrap"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
