// Aba "Motivo Inválido" (v2) — deriva da planilha de posicionamento
// (emergencias_obras.natureza_obra) + classificação válido/inválido por termo.
// Mostra SÓ os processos cujos motivos foram marcados como inválidos. Sem upload
// próprio: os dados vêm do upload normal do módulo; a classificação é feita no
// EditorMotivos (botão "Ajustar motivos" / após o upload).
import { useState, useMemo } from 'react'
import { fmtData } from '../../../lib/aggregations.js'
import { normProc, nomeCurtoPermissionaria, siglaSubpref } from '../../../lib/emergencias.js'
import { KpiCard, PaginacaoBusca } from './shared.jsx'
import BotaoExportarGrafico from '../../BotaoExportarGrafico.jsx'

const PAGE_SIZE = 50

const COLS_TABELA = [
  { key: 'codigo_aio', label: 'Nº Processo' },
  { key: '_permissionaria', label: 'Permissionária' },
  { key: 'status', label: 'Status' },
  { key: 'data_aio', label: 'Data AIO' },
  { key: '_rotulo', label: 'Motivo' },
  { key: 'natureza', label: 'Natureza (texto da empresa)' },
  { key: 'logradouro', label: 'Logradouro' },
  { key: '_subpref', label: 'Subpref.' },
]

const COLS_EXPORT = [
  { key: 'codigo_aio', label: 'Nº Processo' },
  { key: '_permissionaria', label: 'Permissionária' },
  { key: 'status', label: 'Status' },
  { key: 'data_aio', label: 'Data AIO', transform: (v) => (v ? fmtData(v) : 'Sem aviso de início') },
  { key: '_rotulo', label: 'Motivo' },
  { key: 'natureza', label: 'Natureza (texto da empresa)' },
  { key: 'logradouro', label: 'Logradouro' },
  { key: '_subpref', label: 'Subpref.' },
]

// Modal: processos de um motivo inválido.
function ModalMotivo({ rotulo, processos, onClose }) {
  const [pag, setPag] = useState(0)
  const PAGE = 30
  const totalPags = Math.ceil(processos.length / PAGE)
  const pagAtual = Math.min(pag, Math.max(0, totalPags - 1))
  const visiveis = processos.slice(pagAtual * PAGE, (pagAtual + 1) * PAGE)
  const colsModal = [
    { key: 'codigo_aio', label: 'Nº Processo' },
    { key: '_permissionaria', label: 'Permissionária' },
    { key: 'status', label: 'Status' },
    { key: 'natureza', label: 'Natureza (texto da empresa)' },
    { key: '_subpref', label: 'Subpref.' },
  ]
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-navy uppercase tracking-wide">Motivo: {rotulo}</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">{processos.length.toLocaleString('pt-BR')} processos com este motivo inválido</p>
          </div>
          <div className="flex items-center gap-2">
            <BotaoExportarGrafico dados={processos} colunas={colsModal} titulo={`motivo-${rotulo}`} modulo="emergencias" />
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none" title="Fechar">✕</button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0">
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Nº Processo</th>
                <th className="px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Permissionária</th>
                <th className="px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide">Natureza (texto da empresa)</th>
                <th className="px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Subpref.</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r, i) => (
                <tr key={`${r.codigo_aio}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-gray-700 whitespace-nowrap">{r.codigo_aio || '—'}</td>
                  <td className="px-3 py-1.5 text-gray-700 max-w-[160px] truncate" title={r._permissionaria}>{r._permissionaria}</td>
                  <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">{r.status || '—'}</td>
                  <td className="px-3 py-1.5 text-gray-600">{r.natureza}</td>
                  <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">{r._subpref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPags > 1 && (
          <div className="px-4 py-2 border-t border-gray-100">
            <PaginacaoBusca pag={pagAtual} total={totalPags} onChange={setPag} count={processos.length} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function AbaMotivosInvalidos({ grupos = [], linhas = [], podeUpload = false, pendentes = 0, onAbrirEditor = () => {} }) {
  const [pag, setPag] = useState(0)
  const [sortKey, setSortKey] = useState('codigo_aio')
  const [sortDir, setSortDir] = useState('asc')
  const [motivoAberto, setMotivoAberto] = useState(null) // rótulo do grupo no modal

  // Mapa da base de emergências por nº de processo (nome tratado, status, subpref).
  const emergMap = useMemo(() => {
    const m = new Map()
    for (const r of linhas || []) {
      const k = normProc(r.num_processo)
      if (k && !m.has(k)) m.set(k, r)
    }
    return m
  }, [linhas])

  const gruposInvalidos = useMemo(() => grupos.filter((g) => g.invalido), [grupos])
  const totalClassificados = useMemo(() => grupos.filter((g) => g.classificado).length, [grupos])

  // Processos inválidos enriquecidos (1 por nº de processo).
  const processos = useMemo(() => {
    const out = []
    const visto = new Set()
    for (const g of gruposInvalidos) {
      for (const it of g.itens || []) {
        const k = normProc(it.codigo_aio)
        if (k && visto.has(k)) continue
        if (k) visto.add(k)
        const o = it._obra || {}
        const emg = emergMap.get(k)
        const nome = (emg?.permissionaria && String(emg.permissionaria).trim()) || o.permissionaria
        out.push({
          codigo_aio: it.codigo_aio,
          _termo: g.termo,
          _rotulo: g.rotulo,
          natureza: it.natureza,
          _permissionaria: nomeCurtoPermissionaria(nome) || '—',
          status: emg?.status || null,
          data_aio: o.data_inicio_obra || null,
          logradouro: o.logradouro || null,
          _subpref: siglaSubpref(emg?.subprefeitura) || '—',
          _data_base: emg?.data_cadastro || o.data_inicio_obra || null,
        })
      }
    }
    return out
  }, [gruposInvalidos, emergMap])

  // Card: motivos inválidos por contagem (de processos distintos).
  const cardMotivos = useMemo(() => {
    const m = new Map()
    for (const p of processos) {
      if (!m.has(p._termo)) m.set(p._termo, { termo: p._termo, rotulo: p._rotulo, qtd: 0 })
      m.get(p._termo).qtd++
    }
    return [...m.values()].sort((a, b) => b.qtd - a.qtd)
  }, [processos])

  const periodo = useMemo(() => {
    let min = null, max = null
    for (const p of processos) {
      const d = p._data_base
      if (!d) continue
      if (!min || d < min) min = d
      if (!max || d > max) max = d
    }
    return { min, max }
  }, [processos])

  const sorted = useMemo(() => {
    const arr = [...processos]
    arr.sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      const cmp = String(va).localeCompare(String(vb), 'pt-BR')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [processos, sortKey, sortDir])

  const totalPags = Math.ceil(sorted.length / PAGE_SIZE)
  const pagAtual = Math.min(pag, Math.max(0, totalPags - 1))
  const linhasPag = sorted.slice(pagAtual * PAGE_SIZE, (pagAtual + 1) * PAGE_SIZE)

  function handleSort(k) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('asc') }
    setPag(0)
  }
  function SortIcon({ col }) {
    if (col !== sortKey) return <span className="text-gray-300 ml-0.5">↕</span>
    return <span className="text-amber-600 ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const processosDoModal = useMemo(() => {
    if (!motivoAberto) return []
    return processos.filter((p) => p._rotulo === motivoAberto)
  }, [motivoAberto, processos])

  return (
    <div className="space-y-4">
      {/* Barra de ação: ajustar motivos + pendências */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-gray-500">
          {totalClassificados > 0
            ? <>Motivos classificados a partir da planilha de posicionamento. <span className="text-gray-400">Inválidos definem o que aparece abaixo.</span></>
            : 'Os motivos de natureza ainda não foram classificados.'}
        </div>
        {podeUpload && (
          <button
            onClick={onAbrirEditor}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded border transition-colors ${
              pendentes > 0
                ? 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 animate-pulse'
                : 'border-navy text-navy hover:bg-navy hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Ajustar motivos de natureza
            {pendentes > 0 && <span className="ml-1 bg-amber-500 text-white rounded-full px-1.5 text-[10px]">{pendentes} pendente(s)</span>}
          </button>
        )}
      </div>

      {/* Aviso de pendências */}
      {pendentes > 0 && podeUpload && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
          <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <span className="font-semibold">{pendentes} motivo(s) novo(s) sem classificação.</span>{' '}
            Clique em <strong>"Ajustar motivos de natureza"</strong> para marcar quais são válidos ou inválidos.
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {processos.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">
          {gruposInvalidos.length === 0
            ? (podeUpload
                ? 'Nenhum motivo marcado como inválido ainda. Use "Ajustar motivos de natureza" para classificar.'
                : 'Nenhum motivo de natureza foi marcado como inválido ainda.')
            : 'Nenhum processo encontrado para os motivos marcados como inválidos.'}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard label="Processos com motivo inválido" valor={processos.length} cor="#b45309" destaque />
            <KpiCard label="Motivos inválidos" valor={gruposInvalidos.length} cor="#C00000" />
            <div className="bg-white rounded-md shadow-card px-3 py-2.5 border-l-4" style={{ borderLeftColor: '#1F3864' }}>
              <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Período da análise</div>
              <div className="font-bold mt-0.5 text-navy text-lg tabular-nums">
                {periodo.min && periodo.max
                  ? (periodo.min === periodo.max ? fmtData(periodo.min) : `${fmtData(periodo.min)} – ${fmtData(periodo.max)}`)
                  : '—'}
              </div>
              <div className="text-[9px] text-gray-400 mt-0.5">aviso de início (ou cadastro, na falta)</div>
            </div>
          </div>

          {/* Card: motivos inválidos mais recorrentes (clicáveis) */}
          {cardMotivos.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🔎</span>
                <h3 className="text-sm font-bold text-navy uppercase tracking-wide">Motivos inválidos mais recorrentes</h3>
                <span className="text-[11px] text-gray-400">(clique para ver os processos)</span>
              </div>
              <ul className="space-y-1">
                {cardMotivos.map((g, i) => {
                  const pct = processos.length ? (g.qtd / processos.length) * 100 : 0
                  return (
                    <li key={g.termo}>
                      <button
                        onClick={() => setMotivoAberto(g.rotulo)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-amber-50 text-left group transition-colors"
                      >
                        <span className="w-5 text-[11px] font-bold text-amber-600 shrink-0">{i + 1}º</span>
                        <span className="flex-1 text-xs text-gray-700 truncate group-hover:text-navy" title={g.rotulo}>{g.rotulo}</span>
                        <div className="w-24 h-1.5 bg-gray-100 rounded overflow-hidden shrink-0">
                          <div className="h-full bg-red" style={{ width: `${Math.max(4, pct)}%` }} />
                        </div>
                        <span className="w-24 text-right text-[11px] text-gray-500 tabular-nums shrink-0">
                          {g.qtd.toLocaleString('pt-BR')} · {pct.toFixed(0)}%
                        </span>
                        <span className="text-gray-300 group-hover:text-amber-500 shrink-0">›</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Tabela */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-navy uppercase tracking-wide">
                Processos ({sorted.length.toLocaleString('pt-BR')})
              </h3>
              <BotaoExportarGrafico dados={sorted} colunas={COLS_EXPORT} titulo="motivo-invalido" modulo="emergencias" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    {COLS_TABELA.map(({ key, label }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className="px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-navy"
                      >
                        {label}<SortIcon col={key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhasPag.map((r, i) => (
                    <tr key={`${r.codigo_aio}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-gray-700 whitespace-nowrap">{r.codigo_aio || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-700 max-w-[160px] truncate" title={r._permissionaria}>{r._permissionaria}</td>
                      <td className="px-3 py-1.5">
                        {r.status
                          ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">{r.status}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {r.data_aio
                          ? <span className="text-gray-600">{fmtData(r.data_aio)}</span>
                          : <span className="text-gray-400 italic">Sem aviso de início</span>}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red/10 text-red">{r._rotulo}</span>
                      </td>
                      <td className="px-3 py-1.5 text-gray-600 max-w-[220px] truncate" title={r.natureza}>{r.natureza || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-600 max-w-[160px] truncate" title={r.logradouro}>{r.logradouro || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">{r._subpref}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-gray-100">
              <PaginacaoBusca pag={pagAtual} total={totalPags} onChange={setPag} count={sorted.length} />
            </div>
          </div>
        </>
      )}

      {motivoAberto && <ModalMotivo rotulo={motivoAberto} processos={processosDoModal} onClose={() => setMotivoAberto(null)} />}
    </div>
  )
}
