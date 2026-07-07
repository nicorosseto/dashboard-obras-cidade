import { useMemo, useState } from 'react'
import { fmtNumero, fmtAreaDecimal, fmtData } from '../lib/aggregations.js'
import ThSort from './ThSort.jsx'

const STATUS_OPCOES = [
  'Todos',
  'Solucionado',
  'Em andamento',
  'Legislacao Atendida',
  'Sem status',
]
const PAGE_SIZE = 20

function sortData(rows, key, dir) {
  if (!key) return rows
  return [...rows].sort((a, b) => {
    const va = a[key] ?? ''
    const vb = b[key] ?? ''
    const cmp =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base' })
    return dir === 'asc' ? cmp : -cmp
  })
}

export default function Tabela({ rows }) {
  const [subprefeitura, setSubprefeitura] = useState('Todas')
  const [status, setStatus] = useState('Todos')
  const [pagina, setPagina] = useState(0)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(key) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPagina(0)
  }

  const subprefeituras = useMemo(() => {
    const set = new Set(rows.map((r) => r.subprefeitura).filter(Boolean))
    return ['Todas', ...Array.from(set).sort()]
  }, [rows])

  const filtradas = useMemo(() => {
    return rows.filter((r) => {
      if (subprefeitura !== 'Todas' && r.subprefeitura !== subprefeitura)
        return false
      if (status !== 'Todos' && r.status_simplificado !== status) return false
      return true
    })
  }, [rows, subprefeitura, status])

  const sorted = useMemo(
    () => sortData(filtradas, sortKey, sortDir),
    [filtradas, sortKey, sortDir]
  )

  const totalPaginas = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginaAtual = Math.min(pagina, totalPaginas - 1)
  const visiveis = sorted.slice(
    paginaAtual * PAGE_SIZE,
    (paginaAtual + 1) * PAGE_SIZE
  )

  const thProps = { sortKey, sortDir, onSort: handleSort }

  return (
    <section className="bg-white rounded-lg shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="font-semibold text-slate-800">Detalhe dos laudos</h3>
        <div className="flex gap-2 flex-wrap text-xs">
          <select
            value={subprefeitura}
            onChange={(e) => {
              setSubprefeitura(e.target.value)
              setPagina(0)
            }}
            className="border border-slate-300 rounded-sm px-2 py-1"
          >
            {subprefeituras.map((s) => (
              <option key={s} value={s}>
                SP: {s}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPagina(0)
            }}
            className="border border-slate-300 rounded-sm px-2 py-1"
          >
            {STATUS_OPCOES.map((s) => (
              <option key={s} value={s}>
                Status: {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <ThSort
                colKey="permissionaria"
                label="Permissionária"
                {...thProps}
                className="text-left p-2"
              />
              <ThSort
                colKey="executora"
                label="Executora"
                {...thProps}
                className="text-left p-2"
              />
              <ThSort
                colKey="subprefeitura"
                label="Subpref."
                {...thProps}
                className="text-left p-2"
              />
              <ThSort
                colKey="classificacao_viaria"
                label="Class."
                {...thProps}
                className="text-left p-2"
              />
              <ThSort
                colKey="area_m2"
                label="Área (m²)"
                {...thProps}
                className="text-right p-2"
              />
              <ThSort
                colKey="data_inicio"
                label="Data início"
                {...thProps}
                className="text-left p-2"
              />
              <ThSort
                colKey="status_simplificado"
                label="Status"
                {...thProps}
                className="text-left p-2"
              />
            </tr>
          </thead>
          <tbody>
            {visiveis.map((r) => (
              <tr
                key={r.id}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="p-2 font-medium">{r.permissionaria}</td>
                <td className="p-2 text-slate-500">{r.executora || '—'}</td>
                <td
                  className="p-2"
                  title={r.subprefeitura_nome || r.subprefeitura || ''}
                >
                  {r.subprefeitura || '—'}
                </td>
                <td className="p-2">{r.classificacao_viaria || '-'}</td>
                <td className="p-2 text-right tabular-nums">
                  {fmtAreaDecimal(r.area_m2)}
                </td>
                <td className="p-2">{fmtData(r.data_inicio)}</td>
                <td className="p-2">{r.status_simplificado}</td>
              </tr>
            ))}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Sem resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-xs text-slate-600">
        <div>{fmtNumero(sorted.length)} linhas filtradas</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
            disabled={paginaAtual === 0}
            className="px-3 py-1 border rounded-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            Pagina {paginaAtual + 1} de {totalPaginas}
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
            disabled={paginaAtual >= totalPaginas - 1}
            className="px-3 py-1 border rounded-sm disabled:opacity-40"
          >
            Proxima
          </button>
        </div>
      </div>
    </section>
  )
}
