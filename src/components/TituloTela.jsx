export default function TituloTela({ titulo, corDe, corPara }) {
  if (!titulo) return null
  return (
    <div className="flex items-center gap-2 mb-2" data-tour="titulo-tela">
      <span
        className="w-1 h-5 rounded-full shrink-0"
        style={{ background: `linear-gradient(to bottom, ${corDe}, ${corPara})` }}
      />
      <h2 className="text-base font-semibold text-navy leading-tight truncate">
        {titulo}
      </h2>
    </div>
  )
}
