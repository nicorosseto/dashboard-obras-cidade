import { useState, useMemo, useEffect, useRef } from 'react'
import { fmtData, fmtAreaDecimal } from '../../../lib/aggregations.js'
import { STATUS_GRUPO_LABEL, STATUS_GRUPO_COR } from '../../../lib/gtObras.js'
import { LoadingInline } from '../../Loading.jsx'
import BotaoExportarGrafico from '../../BotaoExportarGrafico.jsx'
import { PaginacaoBusca } from '../emerg/shared.jsx'
import { normProc } from '../../../lib/emergencias.js'

const PAGE_SIZE = 50
const DEBOUNCE_MS = 250

function normBusca(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function StatusGrupoBadge({ grupo }) {
  const label = STATUS_GRUPO_LABEL[grupo] || grupo
  const cor = STATUS_GRUPO_COR[grupo] || '#9CA3AF'
  return (
    <span
      className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold"
      style={{ background: `${cor}1a`, color: cor }}
    >
      {label}
    </span>
  )
}

const COLUNAS_EXPORT = [
  { key: 'num_processo', label: 'Nº Processo' },
  { key: 'permissionaria', label: 'Permissionária' },
  { key: 'executora', label: 'Executora' },
  { key: 'subprefeitura', label: 'Subprefeitura' },
  { key: 'nome_via', label: 'Via' },
  { key: 'status', label: 'Status' },
  {
    key: 'status_grupo',
    label: 'Situação',
    transform: (v) => STATUS_GRUPO_LABEL[v] || v,
  },
  { key: 'area_m2', label: 'Metragem (m²)', transform: (v) => fmtAreaDecimal(v) },
  { key: 'situacao_recape_norm', label: 'Situação Recape' },
  {
    key: 'data_conclusao',
    label: 'Data Conclusão (Recape)',
    transform: (v) => fmtData(v),
  },
  { key: '_status_geo', label: 'Status Sistema Geo', transform: (v) => v || '—' },
]

// Aba "Lista" — padrão obrigatório do dominio.md: só lista por ação explícita
// (botão "Filtrar" ou digitar um número de processo). Nesta fase (F3) ainda
// não tem a seção de inconsistências (vem na F4, junto com a aba "Análise
// de Status").
export default function AbaGtLista({ linhas }) {
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [listarAtivado, setListarAtivado] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [resultadoExibido, setResultadoExibido] = useState([])
  const [pag, setPag] = useState(0)
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

  useEffect(() => {
    setListarAtivado(false)
    setPag(0)
  }, [linhas])

  function handleFiltrar() {
    setCarregando(true)
    setListarAtivado(true)
  }

  const mostrarTabela = !!buscaAplicada || listarAtivado

  const resultado = useMemo(() => {
    if (!mostrarTabela) return []
    const q = normBusca(buscaAplicada)
    if (!q) return linhas
    const qProc = normProc(buscaAplicada)
    return linhas.filter(
      (r) =>
        normBusca(r.num_processo).includes(q) ||
        (qProc && r.num_processo_normalizado === qProc)
    )
  }, [linhas, buscaAplicada, mostrarTabela])

  useEffect(() => {
    if (!mostrarTabela) {
      setResultadoExibido([])
      setCarregando(false)
      return
    }
    const raf1 = requestAnimationFrame(() => {
      raf2Ref.current = requestAnimationFrame(() => {
        setResultadoExibido(resultado)
        setCarregando(false)
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2Ref.current)
    }
  }, [mostrarTabela, resultado])

  const totalPag = Math.ceil(resultadoExibido.length / PAGE_SIZE)
  const pagina = resultadoExibido.slice(pag * PAGE_SIZE, (pag + 1) * PAGE_SIZE)

  return (
    <div className="space-y-3">
      <div
        className="bg-white rounded-md shadow-card p-4 space-y-4"
        data-tour="gt-busca-campo"
      >
        <div>
          <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-3">
            Busca por Nº de Processo
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Ex.: número do processo (SEI)…"
                aria-label="Nº de processo"
                className="w-full pl-9 pr-10 py-2 text-sm border border-grey-line rounded-lg focus:outline-hidden"
                autoFocus
              />
              {busca && (
                <button
                  onClick={() => setBusca('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Limpar"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={handleFiltrar}
              title="Listar todas as obras carregadas"
              data-tour="gt-busca-filtrar"
              className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: '#3730a3' }}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filtrar
            </button>
            {mostrarTabela && (
              <div className="shrink-0 flex items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl font-bold text-navy tabular-nums">
                    {resultado.length.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-[10px] text-gray-500">resultado(s)</p>
                </div>
                <BotaoExportarGrafico
                  dados={resultadoExibido}
                  colunas={COLUNAS_EXPORT}
                  titulo="Busca GT Obras"
                  modulo="gt"
                />
              </div>
            )}
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400">
            Busca parcial, sem distinção de maiúsculas/minúsculas. Clique em{' '}
            <strong>Filtrar</strong> para listar todas as obras carregadas, ou
            digite parte do número de processo acima.
          </p>
        </div>

        {carregando && <LoadingInline mensagem="Montando a lista…" />}

        {!mostrarTabela && !carregando && (
          <div className="py-8 text-center text-gray-400 text-sm border border-dashed border-grey-line rounded-lg">
            Clique em <strong>Filtrar</strong> para listar as obras, ou digite
            parte do número de processo acima.
          </div>
        )}

        {mostrarTabela && !carregando && (
          <>
            <div className="overflow-x-auto rounded-sm border border-grey-line">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-navy text-white text-left">
                    <th className="p-2 whitespace-nowrap">Nº Processo</th>
                    <th className="p-2 whitespace-nowrap">Permissionária</th>
                    <th className="p-2 whitespace-nowrap">Executora</th>
                    <th className="p-2 whitespace-nowrap">Subprefeitura</th>
                    <th className="p-2 whitespace-nowrap">Via</th>
                    <th className="p-2 whitespace-nowrap">Status</th>
                    <th className="p-2 whitespace-nowrap">Situação</th>
                    <th className="p-2 whitespace-nowrap">Metragem (m²)</th>
                    <th className="p-2 whitespace-nowrap">Situação Recape</th>
                    <th className="p-2 whitespace-nowrap">Status Sistema Geo</th>
                  </tr>
                </thead>
                <tbody>
                  {pagina.map((l, i) => (
                    <tr
                      key={l.id || i}
                      className={i % 2 === 0 ? 'bg-white' : 'bg-grey-bg'}
                    >
                      <td className="p-2 font-mono text-[11px] whitespace-nowrap">
                        {l.num_processo || '—'}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {l._permissionaria_exibir || l.permissionaria || '—'}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {l.executora || '—'}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {l.subprefeitura || '—'}
                      </td>
                      <td className="p-2 whitespace-nowrap max-w-[180px] truncate" title={l.nome_via || ''}>
                        {l.nome_via || '—'}
                      </td>
                      <td className="p-2 whitespace-nowrap">{l.status || '—'}</td>
                      <td className="p-2 whitespace-nowrap">
                        <StatusGrupoBadge grupo={l.status_grupo} />
                      </td>
                      <td className="p-2 whitespace-nowrap tabular-nums">
                        {fmtAreaDecimal(l.area_m2)}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {l.situacao_recape_norm || '—'}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {l._status_geo || '—'}
                      </td>
                    </tr>
                  ))}
                  {pagina.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-4 text-center text-gray-400">
                        {buscaAplicada
                          ? `Nenhum resultado para "${buscaAplicada}".`
                          : 'Nenhuma obra carregada.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginacaoBusca
              pag={pag}
              total={totalPag}
              onChange={setPag}
              count={resultadoExibido.length}
            />
          </>
        )}
      </div>
    </div>
  )
}
