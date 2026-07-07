// Renderiza chips dos filtros ativos no topo da sidebar expandida.
// chips: Array<{ id: string, label: string, onRemover: () => void }>
export default function ChipsFiltros({ chips, onLimparTodos }) {
  if (!chips.length) return null
  return (
    <div className="px-3 pt-2 pb-2 flex flex-wrap gap-1.5 border-b border-grey-line bg-navy/5">
      {chips.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1 text-[10px] bg-white border border-navy/30 text-navy px-2 py-0.5 rounded-full shadow-xs max-w-[160px]"
        >
          <span className="truncate">{c.label}</span>
          <button
            type="button"
            onClick={c.onRemover}
            className="text-navy/50 hover:text-red leading-none font-bold shrink-0"
            title={`Remover: ${c.label}`}
            aria-label={`Remover filtro ${c.label}`}
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onLimparTodos}
        className="text-[10px] text-navy/50 hover:text-red underline self-center"
      >
        limpar todos
      </button>
    </div>
  )
}

// Formata YYYY-MM-DD como DD/MM/AA (rótulo curto para chips)
export function fmtDateChip(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

// Gera rótulo de período ativo
export function labelPeriodo(dataIni, dataFim) {
  if (dataIni && dataFim) return `${fmtDateChip(dataIni)} – ${fmtDateChip(dataFim)}`
  if (dataIni) return `Desde ${fmtDateChip(dataIni)}`
  return `Até ${fmtDateChip(dataFim)}`
}

// Computa datas dos presets dinâmicos (este mês, trimestre atual)
export function presetsHoje() {
  const hoje = new Date()
  const y = hoje.getFullYear()
  const m = hoje.getMonth() // 0-indexed
  const mesStr = String(m + 1).padStart(2, '0')
  const ultimoDiaMes = new Date(y, m + 1, 0).getDate()

  const trimQ = Math.floor(m / 3) // 0-indexed quarter (0–3)
  const trimIniM = trimQ * 3 // 0-indexed
  const trimFimM = trimQ * 3 + 2 // 0-indexed
  const ultimoDiaTrim = new Date(y, trimFimM + 1, 0).getDate()

  return {
    esteMes: {
      ini: `${y}-${mesStr}-01`,
      fim: `${y}-${mesStr}-${String(ultimoDiaMes).padStart(2, '0')}`,
    },
    trimAtual: {
      ini: `${y}-${String(trimIniM + 1).padStart(2, '0')}-01`,
      fim: `${y}-${String(trimFimM + 1).padStart(2, '0')}-${String(ultimoDiaTrim).padStart(2, '0')}`,
    },
  }
}
