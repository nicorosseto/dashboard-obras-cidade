import { useEffect, useMemo, useRef, useState } from 'react'
import { fmtData } from '../../lib/aggregations.js'
import ThSort from '../ThSort.jsx'
import { LoadingInline } from '../Loading.jsx'
import EmptyState from '../EmptyState.jsx'

const PAGE_SIZE = 50
const DEBOUNCE_MS = 250

const FALHAS = [
  'falha_geometria', 'falha_recomposicao', 'falha_sinalizacao',
  'falha_sarjeta', 'falha_guia', 'falha_reposicao',
  'falha_trincas', 'falha_afundamento', 'falha_nivelamento', 'falha_outros',
]

const FALHAS_LABEL = {
  falha_geometria:    'Geometria',
  falha_recomposicao: 'Recomposição',
  falha_sinalizacao:  'Sinalização',
  falha_sarjeta:      'Sarjeta',
  falha_guia:         'Guia',
  falha_reposicao:    'Falha na reposição',
  falha_trincas:      'Trincas',
  falha_afundamento:  'Afundamento',
  falha_nivelamento:  'Nivelamento',
  falha_outros:       'Outros',
}

function contarFalhas(row) {
  return FALHAS.filter((f) => row[f]).length
}

function listarFalhas(row) {
  return FALHAS.filter((f) => row[f]).map((f) => FALHAS_LABEL[f]).join(', ')
}

function normalizar(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

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

// ── Campo de busca compartilhado ──────────────────────────────────────────────
export function CampoBusca({ busca, onChange, placeholder, totalResultados, totalBase, mostrarContador = true, onFiltrar, nFiltrosAtivos = 0 }) {
  return (
    <div className="bg-white rounded-lg border border-grey-line p-4" data-tour="busca-campo">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Número do processo
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              value={busca}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || 'Ex.: 6012.2024/0001234-5 ou parte do número…'}
              className="w-full pl-9 pr-10 py-2 text-sm border border-grey-line rounded-lg focus:outline-hidden focus:ring-2 focus:ring-navy/30 focus:border-navy"
              autoFocus
            />
            {busca && (
              <button
                onClick={() => onChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Limpar"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {onFiltrar && (
          <button
            onClick={onFiltrar}
            title="Listar os processos com os filtros da barra lateral aplicados"
            data-tour="busca-filtrar"
            className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-navy text-white hover:bg-navy-light transition-colors sm:self-end"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filtrar
          </button>
        )}
        {mostrarContador && (
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-navy tabular-nums">
              {busca
                ? totalResultados.toLocaleString('pt-BR')
                : totalBase.toLocaleString('pt-BR')}
            </p>
            <p className="text-[10px] text-gray-500">
              {busca ? 'resultado(s)' : 'registro(s) disponíveis'}
            </p>
          </div>
        )}
      </div>
      <p className="mt-2 text-[10px] text-gray-400">
        Busca parcial e sem distinção de maiúsculas/minúsculas. A lista respeita os{' '}
        <strong>filtros da barra lateral</strong> — clique em <strong>Filtrar</strong> para listar
        {nFiltrosAtivos > 0
          ? ` (${nFiltrosAtivos} filtro${nFiltrosAtivos !== 1 ? 's' : ''} ativo${nFiltrosAtivos !== 1 ? 's' : ''}).`
          : '.'}
      </p>
    </div>
  )
}

// ── Tabela Fiscalização ────────────────────────────────────────────────────────
function TabelaFisc({ rows }) {
  const [pag, setPag] = useState(0)
  const [sortKey, setSortKey] = useState('id_origem')
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(k) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('asc') }
    setPag(0)
  }

  const sorted = useMemo(() => sortData(rows, sortKey, sortDir), [rows, sortKey, sortDir])
  const totalPag = Math.ceil(sorted.length / PAGE_SIZE)
  const pagina = sorted.slice(pag * PAGE_SIZE, (pag + 1) * PAGE_SIZE)

  return (
    <div>
      <div className="overflow-x-auto rounded-sm border border-grey-line">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-navy text-white text-left">
              <ThSort colKey="id_origem"           label="Processo"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <ThSort colKey="permissionaria"      label="Permissionária" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <ThSort colKey="subprefeitura"       label="Subpref."       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <ThSort colKey="data_inicio"         label="Data Vistoria"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <ThSort colKey="status_simplificado" label="Status"         sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <th className="p-2 whitespace-nowrap">NC</th>
              <th className="p-2 whitespace-nowrap">Falhas</th>
            </tr>
          </thead>
          <tbody>
            {pagina.map((r, i) => {
              const nf = contarFalhas(r)
              const detFalhas = listarFalhas(r)
              return (
                <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-grey-bg'}>
                  <td className="p-2 font-mono text-[11px] whitespace-nowrap">{r.id_origem || '—'}</td>
                  <td className="p-2 whitespace-nowrap">{r.permissionaria || '—'}</td>
                  <td className="p-2 whitespace-nowrap" title={r.subprefeitura_nome || ''}>{r.subprefeitura || '—'}</td>
                  <td className="p-2 whitespace-nowrap">{fmtData(r.data_inicio)}</td>
                  <td className="p-2 whitespace-nowrap">
                    <StatusBadgeFisc status={r.status_simplificado} />
                  </td>
                  <td className="p-2 text-center">
                    {r.tem_nao_conformidade
                      ? <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-red/10 text-red">Sim</span>
                      : <span className="text-gray-400">—</span>
                    }
                  </td>
                  <td className="p-2" title={detFalhas || undefined}>
                    {nf > 0
                      ? <span className="text-red font-semibold">{nf}{detFalhas ? ` · ${detFalhas}` : ''}</span>
                      : <span className="text-gray-400">—</span>
                    }
                  </td>
                </tr>
              )
            })}
            {pagina.length === 0 && (
              <tr><td colSpan={7}><EmptyState mensagem="Nenhum resultado com os filtros atuais." /></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Paginacao pag={pag} total={totalPag} onChange={setPag} count={sorted.length} />
    </div>
  )
}

// ── Tabela Sistema Geo ───────────────────────────────────────────────────────────
function TabelaGeo({ rows }) {
  const [pag, setPag] = useState(0)
  const [sortKey, setSortKey] = useState('processo')
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(k) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('asc') }
    setPag(0)
  }

  const sorted = useMemo(() => sortData(rows, sortKey, sortDir), [rows, sortKey, sortDir])
  const totalPag = Math.ceil(sorted.length / PAGE_SIZE)
  const pagina = sorted.slice(pag * PAGE_SIZE, (pag + 1) * PAGE_SIZE)

  return (
    <div>
      <div className="overflow-x-auto rounded-sm border border-grey-line">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-navy text-white text-left">
              <ThSort colKey="processo"           label="Processo"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <ThSort colKey="permissionaria"     label="Permissionária" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <ThSort colKey="executora"          label="Executora"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <ThSort colKey="subprefeitura"      label="Subpref."       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <ThSort colKey="tipo_processo_nome" label="Tipo"           sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <ThSort colKey="etapa_nome"         label="Etapa"          sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <ThSort colKey="status_nome"        label="Status"         sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <ThSort colKey="status_unificado"   label="Grupo"          sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <ThSort colKey="tipo_obra_nome"     label="Tipo Obra"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
              <ThSort colKey="data_cadastro"      label="Data Cadastro"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="p-2 whitespace-nowrap" />
            </tr>
          </thead>
          <tbody>
            {pagina.map((r, i) => (
              <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-grey-bg'}>
                <td className="p-2 font-mono text-[11px] whitespace-nowrap">{r.processo || '—'}</td>
                <td className="p-2 whitespace-nowrap">{r.permissionaria || '—'}</td>
                <td className="p-2 whitespace-nowrap">{r.executora || '—'}</td>
                <td className="p-2 whitespace-nowrap">{r.subprefeitura || '—'}</td>
                <td className="p-2 whitespace-nowrap">{r.tipo_processo_nome || '—'}</td>
                <td className="p-2 whitespace-nowrap">{r.etapa_nome || '—'}</td>
                <td className="p-2 whitespace-nowrap">{r.status_nome || '—'}</td>
                <td className="p-2 whitespace-nowrap text-gray-500">{r.status_unificado || '—'}</td>
                <td className="p-2 whitespace-nowrap">{r.tipo_obra_nome || '—'}</td>
                <td className="p-2 whitespace-nowrap">{fmtData(r.data_cadastro)}</td>
              </tr>
            ))}
            {pagina.length === 0 && (
              <tr><td colSpan={10}><EmptyState mensagem="Nenhum resultado com os filtros atuais." /></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Paginacao pag={pag} total={totalPag} onChange={setPag} count={sorted.length} />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusBadgeFisc({ status }) {
  if (!status) return <span className="text-gray-400">—</span>
  const cores = {
    'Solucionado':         'bg-emerald-50 text-emerald-700',
    'Em andamento':        'bg-amber-50 text-amber-700',
    'Legislacao Atendida': 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-semibold ${cores[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function Paginacao({ pag, total, onChange, count }) {
  if (total <= 1) return null
  return (
    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
      <span>{count.toLocaleString('pt-BR')} resultados</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(pag - 1)}
          disabled={pag === 0}
          className="px-2 py-1 rounded-sm border border-grey-line disabled:opacity-30 hover:bg-grey-bg"
        >
          ‹ Anterior
        </button>
        <span className="font-semibold text-navy">{pag + 1} / {total}</span>
        <button
          onClick={() => onChange(pag + 1)}
          disabled={pag + 1 >= total}
          className="px-2 py-1 rounded-sm border border-grey-line disabled:opacity-30 hover:bg-grey-bg"
        >
          Próxima ›
        </button>
      </div>
    </div>
  )
}

// ── Componente raiz ───────────────────────────────────────────────────────────
export default function PaginaBuscaProcesso({ rows, modo, nFiltrosAtivos = 0 }) {
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [listarAtivado, setListarAtivado] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [rowsExibidas, setRowsExibidas] = useState([])
  const raf2Ref = useRef(0)

  // Debounce: só aplica o filtro 250 ms após parar de digitar.
  // Evita congelar ao digitar sobre bases grandes (76k fisc / 175k geo).
  useEffect(() => {
    const t = setTimeout(() => {
      const v = busca.trim()
      if (v) setCarregando(true)
      setBuscaAplicada(v)
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [busca])

  // Os dados filtrados pela barra lateral mudaram (qualquer filtro) → a lista
  // volta a ficar oculta até o usuário clicar em "Filtrar" de novo. Depende da
  // referência de `rows` (memoizada no App), não de um contador — trocar de uma
  // permissionária para outra mantém o contador igual e também precisa resetar.
  useEffect(() => { setListarAtivado(false) }, [rows])

  function handleFiltrar() {
    setCarregando(true)
    setListarAtivado(true)
  }

  const isGeo = modo === 'geo'
  const campoProcesso = isGeo ? 'processo' : 'id_origem'

  // A lista só aparece por ação explícita: buscar por número ou clicar em
  // "Filtrar". Os filtros da barra lateral NÃO disparam a listagem sozinhos.
  const mostrarTabela = !!buscaAplicada || listarAtivado

  const resultado = useMemo(() => {
    if (!mostrarTabela) return []
    const q = normalizar(buscaAplicada)
    if (!q) return rows
    return rows.filter((r) => normalizar(r[campoProcesso]).includes(q))
  }, [rows, buscaAplicada, campoProcesso, mostrarTabela])

  // Commit deferido com rAF DUPLO: o 1º rAF roda antes da pintura do frame do
  // spinner; o 2º roda só no frame seguinte — garantindo que o browser PINTE o
  // spinner antes de o commit pesado (ordenação/render) bloquear a thread.
  // (rAF simples roda antes da pintura e o spinner nunca aparecia.)
  useEffect(() => {
    if (!mostrarTabela) { setRowsExibidas([]); setCarregando(false); return }
    const raf1 = requestAnimationFrame(() => {
      raf2Ref.current = requestAnimationFrame(() => {
        setRowsExibidas(resultado)
        setCarregando(false)
      })
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2Ref.current) }
  }, [mostrarTabela, resultado])

  return (
    <div className="space-y-4">
      <CampoBusca
        busca={busca}
        onChange={setBusca}
        totalResultados={resultado.length}
        totalBase={rows.length}
        onFiltrar={handleFiltrar}
        nFiltrosAtivos={nFiltrosAtivos}
      />

      {carregando && (
        <div className="bg-white rounded-lg border border-grey-line">
          <LoadingInline mensagem="Montando a lista de processos…" />
        </div>
      )}

      {/* A tabela só aparece quando há busca ou clique em "Filtrar" */}
      {!mostrarTabela && !carregando && (
        <div className="bg-white rounded-lg border border-grey-line p-8 text-center text-gray-400 text-sm">
          Aplique os filtros na barra lateral e clique em <strong>Filtrar</strong> para listar os
          processos, ou digite parte do número do processo acima.
        </div>
      )}
      {mostrarTabela && !carregando && (
        isGeo
          ? <TabelaGeo rows={rowsExibidas} />
          : <TabelaFisc rows={rowsExibidas} />
      )}
    </div>
  )
}
