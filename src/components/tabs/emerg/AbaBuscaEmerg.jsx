import { useState, useMemo, useEffect, useRef } from 'react'
import { fmtNumero, fmtData } from '../../../lib/aggregations.js'
import { normProc, statusVistoriaDe } from '../../../lib/emergencias.js'
import { LoadingInline } from '../../Loading.jsx'
import { StatusBadgeEmerg, PaginacaoBusca } from './shared.jsx'

const PAGE_SIZE = 50
const DEBOUNCE_MS = 250

function normBusca(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '')
}

function sortBusca(rows, key, dir) {
  if (!key) return rows
  return [...rows].sort((a, b) => {
    const va = a[key] ?? ''
    const vb = b[key] ?? ''
    const cmp = String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base' })
    return dir === 'asc' ? cmp : -cmp
  })
}

export default function AbaBuscaEmerg({ linhas, vistoriaMap, filtrosAtivos = false }) {
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [listarAtivado, setListarAtivado] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [resultadoExibido, setResultadoExibido] = useState([])
  const [pag, setPag] = useState(0)
  const [sortKey, setSortKey] = useState('num_processo')
  const [sortDir, setSortDir] = useState('asc')
  const raf2Ref = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => {
      const v = busca.trim()
      if (v) setCarregando(true)
      setBuscaAplicada(v)
      setPag(0)
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [busca])

  useEffect(() => { setListarAtivado(false); setPag(0) }, [linhas])

  function handleFiltrar() { setCarregando(true); setListarAtivado(true) }
  function handleSort(k) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('asc') }
    setPag(0)
  }

  const mostrarTabela = !!buscaAplicada || listarAtivado

  const resultado = useMemo(() => {
    if (!mostrarTabela) return []
    const q = normBusca(buscaAplicada)
    if (!q) return linhas
    return linhas.filter((r) => normBusca(r.num_processo).includes(q))
  }, [linhas, buscaAplicada, mostrarTabela])

  useEffect(() => {
    if (!mostrarTabela) { setResultadoExibido([]); setCarregando(false); return }
    const raf1 = requestAnimationFrame(() => {
      raf2Ref.current = requestAnimationFrame(() => {
        setResultadoExibido(resultado)
        setCarregando(false)
      })
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2Ref.current) }
  }, [mostrarTabela, resultado])

  const sorted = useMemo(() => sortBusca(resultadoExibido, sortKey, sortDir), [resultadoExibido, sortKey, sortDir])
  const totalPag = Math.ceil(sorted.length / PAGE_SIZE)
  const pagina = sorted.slice(pag * PAGE_SIZE, (pag + 1) * PAGE_SIZE)

  const COLUNAS = [
    { key: 'num_processo', label: 'Processo' },
    { key: 'data_cadastro', label: 'Data Cadastro' },
    { key: 'etapa', label: 'Etapa' },
    { key: 'permissionaria', label: 'Permissionária' },
    { key: 'subprefeitura', label: 'Subpref.' },
    { key: 'status', label: 'Status' },
  ]

  return (
    <div className="bg-white rounded-md shadow-card p-4 space-y-4" data-tour="busca-campo">
      <div>
        <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-3">Busca por Número de Processo</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex.: 6012.2024/0001234-5 ou parte do número…"
              aria-label="Número do processo"
              className="w-full pl-9 pr-10 py-2 text-sm border border-grey-line rounded-lg focus:outline-hidden focus:ring-2 focus:ring-navy/30 focus:border-navy"
              autoFocus
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Limpar">✕</button>
            )}
          </div>
          <button
            onClick={handleFiltrar}
            title="Listar os processos com os filtros da barra lateral aplicados"
            data-tour="busca-filtrar"
            className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-navy text-white hover:bg-navy-light transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filtrar
          </button>
          {mostrarTabela && (
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold text-navy tabular-nums">{resultado.length.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] text-gray-500">resultado(s)</p>
            </div>
          )}
        </div>
        <p className="mt-1.5 text-[10px] text-gray-400">
          Busca parcial, sem distinção de maiúsculas/minúsculas. A lista respeita os{' '}
          <strong>filtros da barra lateral</strong> — clique em <strong>Filtrar</strong> para listar
          {filtrosAtivos ? ' (filtros ativos).' : '.'}
        </p>
      </div>

      {carregando && <LoadingInline mensagem="Montando a lista de processos…" />}

      {!mostrarTabela && !carregando && (
        <div className="py-8 text-center text-gray-400 text-sm border border-dashed border-grey-line rounded-lg">
          Aplique os filtros na barra lateral e clique em <strong>Filtrar</strong> para listar os
          processos, ou digite parte do número do processo acima.
        </div>
      )}

      {mostrarTabela && !carregando && (
        <>
          <div className="overflow-x-auto rounded-sm border border-grey-line">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-navy text-white text-left">
                  {COLUNAS.map((col) => (
                    <th key={col.key} onClick={() => handleSort(col.key)} className="p-2 whitespace-nowrap cursor-pointer select-none group">
                      <span className="inline-flex items-center gap-0.5">
                        <span className="group-hover:text-white/80 transition-colors">{col.label}</span>
                        <span className={`text-[10px] leading-none ${sortKey === col.key ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`}>
                          {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </span>
                    </th>
                  ))}
                  <th className="p-2 whitespace-nowrap">Possui Vistoria?</th>
                  <th className="p-2 whitespace-nowrap">Status Vistoria</th>
                </tr>
              </thead>
              <tbody>
                {pagina.map((it, i) => {
                  const key = normProc(it.num_processo)
                  const v = vistoriaMap?.get?.(key)
                  const temVist = !!v
                  const statusV = temVist ? statusVistoriaDe(v) : '—'
                  return (
                    <tr key={it.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-grey-bg'}>
                      <td className="p-2 font-mono text-[11px] whitespace-nowrap">{it.num_processo || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{fmtData(it.data_cadastro) || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{it.etapa || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{it.permissionaria || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{it.subprefeitura || '—'}</td>
                      <td className="p-2 whitespace-nowrap"><StatusBadgeEmerg status={it.status} /></td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold ${temVist ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {temVist ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="p-2">
                        {temVist ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            statusV === 'Legislação Atendida' ? 'bg-green-50 text-green-700 border border-green-200' :
                            statusV === 'Solucionado'         ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            statusV === 'Em Andamento'        ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                               'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                            {statusV}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  )
                })}
                {pagina.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-gray-400">
                      {buscaAplicada ? `Nenhum resultado para "${buscaAplicada}".` : 'Nenhum processo com os filtros selecionados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginacaoBusca pag={pag} total={totalPag} onChange={setPag} count={sorted.length} />
        </>
      )}
    </div>
  )
}
