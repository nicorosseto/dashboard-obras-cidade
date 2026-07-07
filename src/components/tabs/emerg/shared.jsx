// Componentes primitivos compartilhados entre as abas de Emergências.
import { fmtNumero } from '../../../lib/aggregations.js'

export function ChartCard({ titulo, children }) {
  return (
    <div className="bg-white rounded-md shadow-card p-4">
      <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-2 text-center">
        {titulo}
      </h3>
      {children}
    </div>
  )
}

export function KpiCard({ label, valor, cor, pct, destaque, sufixo }) {
  return (
    <div
      className="bg-white rounded-md shadow-card px-3 py-2.5 border-l-4"
      style={{ borderLeftColor: cor }}
    >
      <div
        className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold truncate"
        title={label}
      >
        {label}
      </div>
      <div
        className={`font-bold mt-0.5 tabular-nums ${destaque ? 'text-2xl' : 'text-xl'}`}
        style={{ color: cor }}
      >
        {fmtNumero(valor)}{sufixo}
      </div>
      {pct !== undefined && (
        <div className="text-[9px] text-gray-500 mt-0.5">{pct.toFixed(1)}%</div>
      )}
    </div>
  )
}

export function StatusBadgeEmerg({ status }) {
  if (!status) return <span className="text-gray-400">—</span>
  const cores = {
    Informada:      'bg-red/10 text-red',
    Encerrada:      'bg-emerald-50 text-emerald-700',
    'Em andamento': 'bg-amber-50 text-amber-700',
  }
  return (
    <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-semibold ${cores[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export function PaginacaoBusca({ pag, total, onChange, count }) {
  if (total <= 1) return null
  return (
    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
      <span>{count.toLocaleString('pt-BR')} resultados</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(pag - 1)} disabled={pag === 0}
          className="px-2 py-1 rounded-sm border border-grey-line disabled:opacity-30 hover:bg-grey-bg">
          ‹ Anterior
        </button>
        <span className="font-semibold text-navy">{pag + 1} / {total}</span>
        <button onClick={() => onChange(pag + 1)} disabled={pag + 1 >= total}
          className="px-2 py-1 rounded-sm border border-grey-line disabled:opacity-30 hover:bg-grey-bg">
          Próxima ›
        </button>
      </div>
    </div>
  )
}
