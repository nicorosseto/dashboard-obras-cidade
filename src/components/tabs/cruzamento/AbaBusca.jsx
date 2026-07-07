// Aba 8 — Busca por Processo. Extraído de PaginaGeo4Cruzamento.jsx (Fase M5, Etapa 2).
import { useState, useEffect, useRef, useMemo } from 'react'
import { LoadingInline } from '../../Loading.jsx'
import { CampoBusca } from '../PaginaBuscaProcesso.jsx'
import { norm, buildRows } from '../../../lib/cruzamento.js'
import { SecaoCard, TabelaPaginada } from './shared.jsx'

// Badge de origem
function BadgeOrigem({ origem }) {
  const cfg = origem === 'Só Fisc.'
    ? 'bg-red/10 text-red'
    : origem === 'Só Sistema Geo'
    ? 'bg-navy/10 text-navy'
    : 'bg-violet-100 text-violet-700'
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${cfg}`}>{origem}</span>
}

// Tooltip flutuante que segue o cursor
function TooltipCursor({ children, texto }) {
  const [pos, setPos] = useState(null)
  return (
    <span
      className="relative"
      onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <span
          style={{ position: 'fixed', left: pos.x + 14, top: pos.y + 14, zIndex: 9999 }}
          className="pointer-events-none bg-gray-800 text-white text-[11px] px-2 py-1 rounded-sm shadow-lg max-w-[220px] leading-snug"
        >
          {texto}
        </span>
      )}
    </span>
  )
}

const COLS_LISTA = [
  {
    key: 'processo', label: 'Nº Processo',
    render: r => r.somenteEmFisc
      ? (
        <TooltipCursor texto="Presente somente na base de Fiscalização — sem correspondente no Sistema Geo">
          <span className="italic text-gray-500 cursor-help">{r.processo}</span>
        </TooltipCursor>
      )
      : r.processo,
  },
  { key: 'permissionaria', label: 'Permissionária' },
  { key: 'executora',      label: 'Executora' },
  { key: 'tipoProcesso',   label: 'Tipo de Processo' },
  { key: 'subprefeitura',  label: 'Sub.' },
  {
    key: 'statusGeo', label: 'Status Sistema Geo',
    render: r => r.statusGeoReal && r.statusGeoReal !== r.statusGeo
      ? (
        <TooltipCursor texto={`Status real: ${r.statusGeoReal}`}>
          <span className="cursor-help border-b border-dotted border-gray-400">{r.statusGeo}</span>
        </TooltipCursor>
      )
      : r.statusGeo,
  },
  { key: 'etapaGeo',   label: 'Etapa Sistema Geo' },
  { key: 'statusFisc', label: 'Status Fiscalização', sep: true },
  { key: 'lote',       label: 'Lote' },
  {
    key: 'origem', label: 'Origem Dados', sep: true,
    render: r => <BadgeOrigem origem={r.origem} />,
  },
]

export default function AbaBusca({ emComum, soFisc, soGeo, nFiltrosAtivos, visibilidade }) {
  const [textoBusca, setTextoBusca] = useState('')
  const [termoBusca, setTermoBusca] = useState('')
  const [listarAtivado, setListarAtivado] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [rowsExibidas, setRowsExibidas] = useState([])
  const timerRef = useRef(null)
  const raf2Ref = useRef(0)

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const v = textoBusca.trim().toLowerCase()
      if (v) setCarregando(true)
      setTermoBusca(v)
    }, 250)
    return () => clearTimeout(timerRef.current)
  }, [textoBusca])

  // Respeita a visibilidade da barra lateral (Todos / Só em comum / Só na Fisc. / Só no Sistema Geo)
  const allRows = useMemo(() => {
    const ec = visibilidade === 'so-fisc' || visibilidade === 'so-geo' ? [] : emComum
    const sf = visibilidade === 'em-comum' || visibilidade === 'so-geo' ? [] : soFisc
    const sg = visibilidade === 'em-comum' || visibilidade === 'so-fisc' ? [] : soGeo
    return buildRows(ec, sf, sg)
  }, [emComum, soFisc, soGeo, visibilidade])

  // Os dados filtrados pela barra lateral mudaram (qualquer filtro/visibilidade) →
  // a lista volta a ficar oculta até o usuário clicar em "Filtrar" de novo. Depende
  // da referência de `allRows` (memoizada acima), não de um contador.
  useEffect(() => { setListarAtivado(false) }, [allRows])

  function handleFiltrar() {
    setCarregando(true)
    setListarAtivado(true)
  }

  // A lista só aparece por ação explícita: clicar em "Filtrar" ou buscar por número.
  // Os filtros da barra lateral NÃO disparam a listagem sozinhos.
  const ativo = !!termoBusca || listarAtivado

  const rowsAlvo = useMemo(() => {
    if (!ativo) return []
    if (!termoBusca) return allRows
    return allRows.filter(r => norm(r.processo).includes(termoBusca))
  }, [ativo, allRows, termoBusca])

  // Commit deferido com rAF DUPLO: o 1º rAF roda antes da pintura do frame do
  // spinner; o 2º roda só no frame seguinte — garantindo que o browser PINTE o
  // spinner antes de o commit pesado (ordenação/render) bloquear a thread.
  // (rAF simples roda antes da pintura e o spinner nunca aparecia.)
  useEffect(() => {
    if (!ativo) { setRowsExibidas([]); setCarregando(false); return }
    const raf1 = requestAnimationFrame(() => {
      raf2Ref.current = requestAnimationFrame(() => {
        setRowsExibidas(rowsAlvo)
        setCarregando(false)
      })
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2Ref.current) }
  }, [ativo, rowsAlvo])

  const rows = rowsExibidas

  return (
    <SecaoCard titulo="Lista de Processos">
      <p className="text-xs text-gray-500 mb-3">
        Selecione os <strong>filtros da barra lateral</strong> (permissionária, subprefeitura, status, etapa,
        tipo de processo, visibilidade) e clique em <strong>Filtrar</strong> para listar os processos — ou busque por número abaixo.
        Processos presentes somente na base de Fiscalização aparecem em <span className="italic">itálico</span> ao final.
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Origem dos dados:
        <span className="mx-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-violet-100 text-violet-700">Comum</span> presente nas duas bases ·
        <span className="mx-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-navy/10 text-navy">Só Sistema Geo</span> obra sem fiscalização ·
        <span className="mx-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-red/10 text-red">Só Fisc.</span> sem registro no Sistema Geo
      </p>

      <CampoBusca
        busca={textoBusca}
        onChange={setTextoBusca}
        placeholder="Buscar por número de processo…"
        totalResultados={rows.length}
        totalBase={allRows.length}
        onFiltrar={handleFiltrar}
        nFiltrosAtivos={nFiltrosAtivos}
      />

      {carregando ? (
        <LoadingInline mensagem="Montando a lista de processos…" />
      ) : !ativo ? (
        <p className="text-sm text-gray-400 text-center py-8">
          Aplique os filtros na barra lateral e clique em <strong>Filtrar</strong> para listar os processos,
          ou digite um número de processo acima.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Nenhum processo encontrado com os filtros selecionados.</p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-2">{rows.length.toLocaleString('pt-BR')} processo{rows.length !== 1 ? 's' : ''} encontrado{rows.length !== 1 ? 's' : ''}</p>
          <TabelaPaginada
            key={termoBusca + listarAtivado}
            rows={rows}
            colunas={COLS_LISTA}
            emptyMsg=""
            rowClassName={r => r.somenteEmFisc ? 'italic text-gray-500' : ''}
          />
        </>
      )}
    </SecaoCard>
  )
}
