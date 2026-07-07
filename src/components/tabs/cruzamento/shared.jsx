// Micro-componentes compartilhados entre as abas do módulo "Análise
// Integrada" (Cruzamento). Extraído de PaginaGeo4Cruzamento.jsx na Fase M5,
// Etapa 2. Constantes de cor ficam em ./cores.js (react-refresh não gosta de
// misturar componente com constante no mesmo arquivo).
import { useState, useMemo } from 'react'
import { fmtNumero } from '../../../lib/aggregations.js'
import ThSort from '../../ThSort.jsx'
import { PAGE_SIZE } from './cores.js'

export function KPICard({ label, valor, sub, destaque }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 flex flex-col gap-1 transition-all ${destaque ? 'ring-2 ring-violet-500 shadow-violet-100' : ''}`}>
      <span className="text-[11px] text-gray-500 uppercase tracking-wide leading-tight">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${destaque ? 'text-violet-700' : 'text-navy'}`}>{fmtNumero(valor)}</span>
      {sub && <span className="text-[11px] text-gray-400">{sub}</span>}
    </div>
  )
}

export function Paginacao({ pagina, totalPaginas, total, onChange }) {
  const ini = pagina * PAGE_SIZE + 1
  const fim = Math.min((pagina + 1) * PAGE_SIZE, total)
  return (
    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
      <span>Mostrando {fmtNumero(ini)}–{fmtNumero(fim)} de {fmtNumero(total)}</span>
      <div className="flex gap-1">
        <button disabled={pagina === 0} onClick={() => onChange(pagina - 1)}
          className="px-2 py-1 rounded-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50">‹</button>
        <span className="px-2 py-1">{pagina + 1}/{totalPaginas}</span>
        <button disabled={pagina >= totalPaginas - 1} onClick={() => onChange(pagina + 1)}
          className="px-2 py-1 rounded-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50">›</button>
      </div>
    </div>
  )
}

export function TabelaPaginada({ rows, colunas, emptyMsg, defaultSort, defaultDir = 'desc', rowClassName }) {
  const [pagina, setPagina] = useState(0)
  const [sortKey, setSortKey] = useState(defaultSort || null)
  const [sortDir, setSortDir] = useState(defaultSort ? defaultDir : 'asc')

  function handleSort(key) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPagina(0)
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    const col = colunas.find(c => c.key === sortKey)
    return [...rows].sort((a, b) => {
      const va = col?.sortValue ? col.sortValue(a) : (a[sortKey] ?? '')
      const vb = col?.sortValue ? col.sortValue(b) : (b[sortKey] ?? '')
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, colunas, sortKey, sortDir])

  if (rows.length === 0) return <p className="text-sm text-gray-500 py-8 text-center">{emptyMsg}</p>

  const totalPaginas = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pg = Math.min(pagina, totalPaginas - 1)
  const visiveis = sorted.slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE)
  const thProps = { sortKey, sortDir, onSort: handleSort }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              {colunas.map(c => (
                <ThSort key={c.key} colKey={c.key} label={c.label} {...thProps}
                  className={`text-left py-2 pr-4 font-semibold text-navy whitespace-nowrap ${c.sep ? 'border-l border-slate-200 pl-3' : ''}`} />
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((row, i) => (
              <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 ${rowClassName ? rowClassName(row) : ''}`}>
                {colunas.map(c => (
                  <td key={c.key} className={`py-1.5 pr-4 text-gray-700 ${c.sep ? 'border-l border-slate-100 pl-3' : ''}`}>
                    {c.render ? c.render(row) : (row[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPaginas > 1 && <Paginacao pagina={pg} totalPaginas={totalPaginas} total={sorted.length} onChange={setPagina} />}
    </div>
  )
}

export function SecaoCard({ titulo, children, className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-5 ${className}`}>
      {titulo && <h3 className="text-sm font-semibold text-navy mb-4 uppercase tracking-wide">{titulo}</h3>}
      {children}
    </div>
  )
}
