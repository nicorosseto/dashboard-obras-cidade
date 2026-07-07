import { fmtNumero } from '../../lib/aggregations.js'

// Tooltip visual padrão de todos os gráficos do dashboard.
// Cobre barras/linhas (uma ou várias séries) e pizzas (com % opcional).
// Use sempre como: <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
// Props opcionais:
//  - labelFormatter: formata o rótulo do eixo X (ex.: fmtMesAno)
//  - unidade: sufixo após o número em gráficos de série única (ex.: "processos")
export default function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  unidade,
}) {
  if (!active || !payload?.length) return null

  const ponto = payload[0]?.payload || {}

  // Título: rótulo do eixo X (formatado, se houver) ou nome do ponto (pizza)
  let titulo = label
  if (labelFormatter && titulo != null) titulo = labelFormatter(titulo)
  if (titulo == null || titulo === '')
    titulo = ponto.nome ?? payload[0]?.name ?? ''

  const multi = payload.length > 1
  const pct = ponto.pct

  return (
    <div className="bg-white border border-grey-line rounded-sm shadow-card p-2 text-xs min-w-[120px] max-w-[240px]">
      {titulo !== '' && (
        <div className="font-semibold text-navy mb-1 truncate">{titulo}</div>
      )}

      {multi ? (
        <div className="space-y-0.5">
          {payload.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ background: item.color || item.fill || '#888' }}
              />
              <span className="text-gray-500 truncate min-w-0 flex-1">
                {item.name}
              </span>
              <span className="font-medium text-gray-700 tabular-nums shrink-0 ml-2">
                {fmtNumero(item.value)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-600">
          {fmtNumero(payload[0].value)}
          {unidade ? ` ${unidade}` : ''}
          {pct != null ? ` (${pct}%)` : ''}
        </div>
      )}
    </div>
  )
}
