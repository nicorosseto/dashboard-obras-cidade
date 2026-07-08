// Modal de convite do tour guiado — aparece UMA vez por usuário no primeiro
// acesso a cada tela/módulo (registro em tour_visto). "Agora não" registra
// como dispensado e não pergunta de novo; o botão "?" permite rever depois.

export default function ConviteTour({
  titulo = 'Conhecer o sistema?',
  texto,
  onAceitar,
  onRecusar,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-7">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-navy/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-navy"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-navy uppercase tracking-wide">
            {titulo}
          </h2>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">{texto}</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRecusar}
            className="flex-1 py-2 rounded-sm border border-grey-line text-navy text-sm font-semibold hover:bg-grey-bg transition-colors"
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={onAceitar}
            autoFocus
            className="flex-1 py-2 rounded-sm bg-navy text-white text-sm font-semibold hover:bg-navy-light transition-colors"
          >
            Começar o tour
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-3">
          Você pode rever o tour quando quiser pelo botão “?”.
        </p>
      </div>
    </div>
  )
}
