// Botão fixo "?" para (re)abrir o tour guiado da tela atual.
// `variante`: 'claro' para fundos claros (Home), 'escuro' para o Header navy.

export default function BotaoTour({
  onClick,
  variante = 'claro',
  title = 'Rever o tour desta tela',
  dataTour,
}) {
  const estilo =
    variante === 'escuro'
      ? 'bg-white/15 hover:bg-white/30 text-white'
      : 'border border-grey-line text-navy/70 hover:text-navy hover:border-navy'
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      data-tour={dataTour}
      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${estilo}`}
    >
      ?
    </button>
  )
}
