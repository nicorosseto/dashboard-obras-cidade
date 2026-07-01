import { useState } from 'react'
import { fmtNumero } from '../../../lib/aggregations.js'
import {
  STATUS_COLOR, STATUS_PADRAO, STATUS_FIXOS_EMERG,
  agregaStatusComOutros, COLUNAS_CRUZADA,
} from '../../../lib/emergencias.js'
import { KpiCard } from './shared.jsx'

// Rótulo de exibição de cada coluna (chave interna → label legível)
const LABEL_COL = { _Outros: 'Outros', _total: 'Total' }
function labelCol(s) { return LABEL_COL[s] || s }

// Cor da coluna no cabeçalho
function corCol(s) {
  if (s === '_Outros') return STATUS_PADRAO
  return STATUS_COLOR[s] || STATUS_PADRAO
}

// Card "Outros" com popover ao hover mostrando os status contemplados
function CardOutros({ outros, total }) {
  const [aberto, setAberto] = useState(false)
  if (!outros || outros.qtd === 0) return null
  return (
    <div
      className="relative"
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
    >
      <div className="bg-white border border-grey-line rounded-lg p-3 cursor-help h-full flex flex-col justify-between hover:border-navy/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Outros status</span>
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div>
          <div className="text-2xl font-bold" style={{ color: STATUS_PADRAO }}>{fmtNumero(outros.qtd)}</div>
          {total > 0 && (
            <div className="text-[10px] text-gray-400">
              {((outros.qtd / total) * 100).toFixed(1)}%
            </div>
          )}
          <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
            {outros.detalhe.length} status · passe o mouse
          </p>
        </div>
      </div>
      {aberto && outros.detalhe.length > 0 && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-grey-line rounded-lg shadow-xl p-3 w-60 text-xs">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-2 border-b border-grey-line pb-1">
            Status em "Outros"
          </p>
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {outros.detalhe.map(({ status, qtd }) => (
              <div key={status} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: STATUS_COLOR[status] || STATUS_PADRAO }} />
                <span className="flex-1 truncate text-gray-700">{status}</span>
                <span className="text-gray-500 font-semibold shrink-0">{fmtNumero(qtd)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Ícone de ordenação para cabeçalho da tabela
function IconeSort({ ativo, dir }) {
  if (!ativo) return <span className="ml-1 text-gray-300 text-[9px]">⇅</span>
  return <span className="ml-1 text-navy text-[9px]">{dir === 'asc' ? '▲' : '▼'}</span>
}

export default function AbaGeral({ total, linhas: linhasRaw, cruzada }) {
  const [sortKey, setSortKey] = useState('Informada')
  const [sortDir, setSortDir] = useState('desc')

  // Agrupa status em fixos + Outros para os KPI cards
  const { fixos: statusFixos, outros: statusOutros } = agregaStatusComOutros(linhasRaw || [])

  function handleSort(col) {
    if (col === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(col); setSortDir('desc') }
  }

  const linhasOrdenadas = [...(cruzada.linhas || [])].sort((a, b) => {
    const av = sortKey === '_Outros' ? (a._Outros || 0) : sortKey === '_total' ? (a._total || 0) : (a[sortKey] || 0)
    const bv = sortKey === '_Outros' ? (b._Outros || 0) : sortKey === '_total' ? (b._total || 0) : (b[sortKey] || 0)
    if (sortKey === 'permissionaria') {
      return sortDir === 'asc'
        ? a.permissionaria.localeCompare(b.permissionaria, 'pt')
        : b.permissionaria.localeCompare(a.permissionaria, 'pt')
    }
    return sortDir === 'asc' ? av - bv : bv - av
  })

  const colunasComTotal = [...cruzada.colunasStatus, '_total']

  return (
    <div className="space-y-4">
      {/* KPI cards: Total + 4 fixos + Outros */}
      <div className={`grid grid-cols-2 gap-3 ${statusOutros.qtd > 0 ? 'md:grid-cols-3 lg:grid-cols-6' : 'md:grid-cols-3 lg:grid-cols-5'}`}>
        <KpiCard label="Total de Processos" valor={total} cor="#1F3864" destaque />
        {STATUS_FIXOS_EMERG.map((s) => {
          const item = statusFixos.find((f) => f.status === s)
          return (
            <KpiCard
              key={s}
              label={s}
              valor={item?.qtd ?? 0}
              cor={STATUS_COLOR[s] || STATUS_PADRAO}
              pct={total ? ((item?.qtd ?? 0) / total) * 100 : 0}
            />
          )
        })}
        <CardOutros outros={statusOutros} total={total} />
      </div>

      {/* Tabela cruzada Permissionária × Status */}
      <div className="bg-white rounded-md shadow-card p-4 overflow-x-auto">
        <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-3">
          Processos por Permissionária × Status
        </h3>
        <table className="min-w-full text-xs">
          <thead className="bg-grey-bg sticky top-0">
            <tr>
              {/* Coluna Permissionária ordenável */}
              <th
                className="text-left p-2 font-semibold text-navy cursor-pointer select-none hover:bg-navy/5 rounded"
                onClick={() => handleSort('permissionaria')}
              >
                Permissionária
                <IconeSort ativo={sortKey === 'permissionaria'} dir={sortDir} />
              </th>
              {/* Colunas de status + Total, todas ordenáveis */}
              {colunasComTotal.map((s) => (
                <th
                  key={s}
                  className="text-right p-2 font-semibold cursor-pointer select-none hover:bg-navy/5 rounded whitespace-nowrap"
                  style={{ color: s === '_total' ? '#1F3864' : corCol(s) }}
                  onClick={() => handleSort(s)}
                >
                  {s === '_total' ? 'Total' : labelCol(s)}
                  <IconeSort ativo={sortKey === s} dir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhasOrdenadas.map((l, i) => (
              <tr key={l.permissionaria} className={i % 2 === 0 ? 'bg-white' : 'bg-grey-bg/40'}>
                <td className="p-2 font-medium">{l.permissionaria}</td>
                {cruzada.colunasStatus.map((s) => {
                  const val = s === '_Outros' ? (l._Outros || 0) : (l[s] || 0)
                  return (
                    <td key={s} className="text-right p-2 tabular-nums">
                      {val ? fmtNumero(val) : '—'}
                    </td>
                  )
                })}
                <td className="text-right p-2 font-bold tabular-nums text-navy">
                  {fmtNumero(l._total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
