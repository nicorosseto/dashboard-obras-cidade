import { useEffect, useState } from 'react'

// Botão de ajuda (?) + pop-up explicativo, reutilizável em qualquer tela de
// upload. O conteúdo (as regras) vem como `children`, então cada upload
// (Sistema Geo, Emergências, futuros) descreve as suas próprias regras.
export default function AjudaUpload({ titulo = 'Como funciona', children }) {
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    if (!aberto) return
    function onKey(e) {
      if (e.key === 'Escape') setAberto(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto])

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title="Entenda como a planilha é tratada"
        className="shrink-0 w-6 h-6 rounded-full border border-navy/30 text-navy text-xs font-bold flex items-center justify-center hover:bg-navy hover:text-white transition-colors"
      >
        ?
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-70 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setAberto(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-grey-line sticky top-0 bg-white">
              <h2 className="text-sm font-bold text-navy uppercase tracking-wide">
                {titulo}
              </h2>
              <button
                onClick={() => setAberto(false)}
                className="text-gray-500 hover:text-navy text-xl leading-none w-7 h-7 flex items-center justify-center rounded-sm hover:bg-grey-bg"
                title="Fechar"
              >
                ×
              </button>
            </div>
            <div className="p-5 text-sm text-gray-700 leading-relaxed space-y-4">
              {children}
            </div>
            <div className="px-5 py-3 border-t border-grey-line sticky bottom-0 bg-white text-right">
              <button
                onClick={() => setAberto(false)}
                className="bg-navy text-white px-4 py-1.5 rounded-sm text-xs font-semibold hover:bg-navy-light transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Um item de regra: título curto + explicação. Usado dentro do pop-up.
export function Regra({ titulo, children }) {
  return (
    <div>
      <p className="font-semibold text-navy">{titulo}</p>
      <div className="text-gray-600 mt-0.5">{children}</div>
    </div>
  )
}
