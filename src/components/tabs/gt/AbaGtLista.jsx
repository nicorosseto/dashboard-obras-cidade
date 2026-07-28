import { useState, useMemo, useEffect, useRef } from 'react'
import { fmtAreaDecimal } from '../../../lib/aggregations.js'
import {
  STATUS_GRUPO_LABEL,
  agruparGtPorProcesso,
  textoTrechoGt as textoTrecho,
  textoViaGt as textoVia,
  inconsistenciasGt,
} from '../../../lib/gtObras.js'
import { LoadingInline } from '../../Loading.jsx'
import BotaoExportarGrafico from '../../BotaoExportarGrafico.jsx'
import { PaginacaoBusca } from '../emerg/shared.jsx'
import { normProc } from '../../../lib/emergencias.js'
import AbaGtInconsistencias from './AbaGtInconsistencias.jsx'
import { StatusGrupoBadge } from './shared.jsx'

const PAGE_SIZE = 50
const DEBOUNCE_MS = 250

function normBusca(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

const COLUNAS_EXPORT = [
  { key: 'num_processo', label: 'Nº Processo' },
  {
    key: '_permissionaria_exibir',
    label: 'Permissionária',
    transform: (v, r) => v || r?.permissionaria || '—',
  },
  { key: 'subprefeitura', label: 'Subprefeitura' },
  {
    key: '_vias',
    label: 'Vias (nome, trecho e status do recape)',
    transform: (v) =>
      (v || [])
        .map(
          (via) =>
            `${textoVia(via)}${via.situacao_recape ? ` (${via.situacao_recape})` : ''}`
        )
        .join(' | '),
  },
  { key: '_qtd_vias', label: 'Qtde de Vias' },
  { key: 'status', label: 'Status' },
  {
    key: 'status_grupo',
    label: 'Situação',
    transform: (v) => STATUS_GRUPO_LABEL[v] || v,
  },
  {
    key: 'area_m2',
    label: 'Metragem Total (m²)',
    transform: (v) => fmtAreaDecimal(v),
  },
  { key: '_status_geo', label: 'Status Sistema Geo', transform: (v) => v || '—' },
]

// Aba "Lista" — padrão obrigatório do dominio.md: só lista por ação explícita
// (botão "Filtrar" ou digitar um número de processo). A partir da Fase 4
// (padrão do módulo Multas, 2ª rodada de ampliação de 16/07/2026) esta aba
// também hospeda, como seção auxiliar/alternável, o "raio-x" de
// inconsistências da planilha — o usuário principal do GT não corrige esses
// erros (a edição é sempre na planilha), então a visão é só para
// conferência, sem destaque próprio no menu.
//
// ⚠️ Agrupa por processo (agruparGtPorProcesso) antes de listar — um
// processo com várias vias/trechos vira UMA linha na tabela (com todas as
// vias listadas dentro da mesma célula e a metragem somada), nunca uma
// linha por trecho (achado do usuário, 27/07/2026: contar/listar por
// trecho duplicava o processo e inflava a contagem).
export default function AbaGtLista({
  linhas,
  gtDash,
  mostrarInconsistencias,
  onToggleInconsistencias,
}) {
  const porProcesso = useMemo(() => agruparGtPorProcesso(linhas), [linhas])
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
  }, [porProcesso])

  function handleFiltrar() {
    setCarregando(true)
    setListarAtivado(true)
  }

  const mostrarTabela = !!buscaAplicada || listarAtivado

  const resultado = useMemo(() => {
    if (!mostrarTabela) return []
    const q = normBusca(buscaAplicada)
    if (!q) return porProcesso
    const qProc = normProc(buscaAplicada)
    return porProcesso.filter(
      (r) =>
        normBusca(r.num_processo).includes(q) ||
        (qProc && r.num_processo_normalizado === qProc)
    )
  }, [porProcesso, buscaAplicada, mostrarTabela])

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

  const totalInconsistencias = useMemo(() => {
    const g = inconsistenciasGt(linhas)
    return (
      g.semProcesso.length +
      g.processoNaoEncontrado.length +
      g.duplicados.length +
      g.situacaoRecapeAmbigua.length
    )
  }, [linhas])

  if (mostrarInconsistencias) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => onToggleInconsistencias(false)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-red transition-colors"
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
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar para a lista de processos
        </button>
        <AbaGtInconsistencias linhasCruzadas={linhas} gtDash={gtDash} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => onToggleInconsistencias(true)}
          data-tour="gt-toggle-inconsistencias"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-sm border border-grey-line text-gray-600 hover:border-red hover:text-red transition-colors"
        >
          <span aria-hidden>⚠️</span>
          Verificar inconsistências da planilha ({totalInconsistencias})
        </button>
      </div>
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
                    <th className="p-2 whitespace-nowrap">Subprefeitura</th>
                    <th className="p-2 whitespace-nowrap">
                      Vias (nome — trecho — recape)
                    </th>
                    <th className="p-2 whitespace-nowrap">Status</th>
                    <th className="p-2 whitespace-nowrap">Situação</th>
                    <th className="p-2 whitespace-nowrap">Metragem Total (m²)</th>
                    <th className="p-2 whitespace-nowrap">Status Sistema Geo</th>
                  </tr>
                </thead>
                <tbody>
                  {pagina.map((l, i) => (
                    <tr
                      key={l.id || i}
                      className={i % 2 === 0 ? 'bg-white' : 'bg-grey-bg'}
                    >
                      <td className="p-2 font-mono text-[11px] whitespace-nowrap align-top">
                        {l.num_processo || '—'}
                      </td>
                      <td className="p-2 whitespace-nowrap align-top">
                        {l._permissionaria_exibir || l.permissionaria || '—'}
                      </td>
                      <td className="p-2 whitespace-nowrap align-top">
                        {l.subprefeitura || '—'}
                      </td>
                      <td className="p-2 max-w-[320px] align-top">
                        {(l._vias || []).map((v, vi) => {
                          const trecho = textoTrecho(v)
                          return (
                            <div
                              key={vi}
                              className="truncate text-[11px]"
                              title={`${textoVia(v)}${v.situacao_recape ? ` — recape: ${v.situacao_recape}` : ''}`}
                            >
                              {v.nome_via ? (
                                <strong>{v.nome_via}</strong>
                              ) : (
                                !trecho && (
                                  <span className="text-gray-400">
                                    (via não informada)
                                  </span>
                                )
                              )}
                              {v.nome_via && trecho && ' — '}
                              {trecho}
                              {v.situacao_recape && (
                                <span className="text-gray-400">
                                  {' '}
                                  ({v.situacao_recape})
                                </span>
                              )}
                            </div>
                          )
                        })}
                        {l._qtd_vias > 1 && (
                          <span className="text-[10px] text-gray-400">
                            {l._qtd_vias} vias
                          </span>
                        )}
                      </td>
                      <td className="p-2 whitespace-nowrap align-top">
                        {l.status || '—'}
                      </td>
                      <td className="p-2 whitespace-nowrap align-top">
                        <StatusGrupoBadge grupo={l.status_grupo} />
                      </td>
                      <td className="p-2 whitespace-nowrap tabular-nums align-top">
                        {fmtAreaDecimal(l.area_m2)}
                      </td>
                      <td className="p-2 whitespace-nowrap align-top">
                        {l._status_geo || '—'}
                      </td>
                    </tr>
                  ))}
                  {pagina.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-gray-400">
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
