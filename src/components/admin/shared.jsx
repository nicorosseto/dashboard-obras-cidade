// Componentes/funções compartilhados pelas abas do painel de Configurações
// (Fase M5, Frente 3, Etapa 3 — extraído de AdminPanel.jsx).

export function ModalConfirmacao({ titulo, mensagem, alerta, onConfirmar, onCancelar }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-conf-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onCancelar} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-red-100">
            <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h2 id="modal-conf-titulo" className="text-base font-bold text-gray-900">{titulo}</h2>
            <p className="text-sm text-gray-600 mt-1">{mensagem}</p>
            {alerta && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-2 py-1.5 mt-2">{alerta}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm rounded-sm border border-grey-line text-gray-600 hover:bg-grey-bg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm rounded-sm bg-red font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

export function sortArr(arr, key, dir, getValue) {
  if (!key) return arr
  return [...arr].sort((a, b) => {
    const va = getValue ? getValue(a, key) : (a[key] ?? '')
    const vb = getValue ? getValue(b, key) : (b[key] ?? '')
    const cmp =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', {
            sensitivity: 'base',
          })
    return dir === 'asc' ? cmp : -cmp
  })
}
