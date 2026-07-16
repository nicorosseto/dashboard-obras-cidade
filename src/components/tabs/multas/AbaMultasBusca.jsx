import { useState, useMemo, useEffect, useRef } from 'react'
import { fmtData } from '../../../lib/aggregations.js'
import { fmtValorBRL, SITUACAO_VINCULO_LABEL, SITUACAO_VINCULO_COR } from '../../../lib/multas.js'
import { LoadingInline } from '../../Loading.jsx'
import BotaoExportarGrafico from '../../BotaoExportarGrafico.jsx'
import { PaginacaoBusca } from '../emerg/shared.jsx'

const PAGE_SIZE = 50
const DEBOUNCE_MS = 250

function normBusca(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '')
}

function SituacaoBadge({ situacao }) {
  const label = SITUACAO_VINCULO_LABEL[situacao] || situacao
  const cor = SITUACAO_VINCULO_COR[situacao] || '#9CA3AF'
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
  { key: 'auto_multa', label: 'Auto da Multa' },
  { key: 'num_processo', label: 'Nº Processo' },
  { key: 'permissionaria', label: 'Permissionária' },
  { key: 'status', label: 'Status' },
  { key: 'valor', label: 'Valor', transform: (v) => fmtValorBRL(v) },
  { key: 'data_infracao', label: 'Data Infração', transform: (v) => fmtData(v) },
  { key: '_situacao_vinculo', label: 'Situação do Vínculo', transform: (v) => SITUACAO_VINCULO_LABEL[v] || v },
]

// Aba "Busca/Lista" — padrão obrigatório do dominio.md: só lista por ação
// explícita do usuário (botão "Filtrar" ou digitar um número de processo/auto
// da multa). Nada dispara a listagem sozinho.
export default function AbaMultasBusca({ linhas }) {
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

  useEffect(() => { setListarAtivado(false); setPag(0) }, [linhas])

  function handleFiltrar() { setCarregando(true); setListarAtivado(true) }

  const mostrarTabela = !!buscaAplicada || listarAtivado

  const resultado = useMemo(() => {
    if (!mostrarTabela) return []
    const q = normBusca(buscaAplicada)
    if (!q) return linhas
    return linhas.filter(
      (r) => normBusca(r.num_processo).includes(q) || normBusca(r.auto_multa).includes(q)
    )
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

  const totalPag = Math.ceil(resultadoExibido.length / PAGE_SIZE)
  const pagina = resultadoExibido.slice(pag * PAGE_SIZE, (pag + 1) * PAGE_SIZE)

  return (
    <div className="bg-white rounded-md shadow-card p-4 space-y-4" data-tour="multas-busca-campo">
      <div>
        <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-3">
          Busca por Nº de Processo ou Auto da Multa
        </h3>
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
              placeholder="Ex.: número do processo ou do auto da multa…"
              aria-label="Nº de processo ou auto da multa"
              className="w-full pl-9 pr-10 py-2 text-sm border border-grey-line rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red/30 focus:border-red"
              autoFocus
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Limpar">✕</button>
            )}
          </div>
          <button
            onClick={handleFiltrar}
            title="Listar todas as multas carregadas"
            data-tour="multas-busca-filtrar"
            className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-red text-white hover:bg-red/90 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filtrar
          </button>
          {mostrarTabela && (
            <div className="shrink-0 flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-navy tabular-nums">{resultado.length.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-gray-500">resultado(s)</p>
              </div>
              <BotaoExportarGrafico dados={resultadoExibido} colunas={COLUNAS_EXPORT} titulo="Busca de Multas" modulo="multas" />
            </div>
          )}
        </div>
        <p className="mt-1.5 text-[10px] text-gray-400">
          Busca parcial, sem distinção de maiúsculas/minúsculas. Clique em <strong>Filtrar</strong> para
          listar todas as multas carregadas, ou digite parte do número acima.
        </p>
      </div>

      {carregando && <LoadingInline mensagem="Montando a lista…" />}

      {!mostrarTabela && !carregando && (
        <div className="py-8 text-center text-gray-400 text-sm border border-dashed border-grey-line rounded-lg">
          Clique em <strong>Filtrar</strong> para listar as multas, ou digite parte do número de
          processo/auto da multa acima.
        </div>
      )}

      {mostrarTabela && !carregando && (
        <>
          <div className="overflow-x-auto rounded-sm border border-grey-line">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-navy text-white text-left">
                  <th className="p-2 whitespace-nowrap">Auto da Multa</th>
                  <th className="p-2 whitespace-nowrap">Nº Processo</th>
                  <th className="p-2 whitespace-nowrap">Permissionária</th>
                  <th className="p-2 whitespace-nowrap">Status</th>
                  <th className="p-2 whitespace-nowrap">Valor</th>
                  <th className="p-2 whitespace-nowrap">Data Infração</th>
                  <th className="p-2 whitespace-nowrap">Situação do Vínculo</th>
                </tr>
              </thead>
              <tbody>
                {pagina.map((m, i) => (
                  <tr key={m.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-grey-bg'}>
                    <td className="p-2 font-mono text-[11px] whitespace-nowrap">{m.auto_multa || '—'}</td>
                    <td className="p-2 font-mono text-[11px] whitespace-nowrap">{m.num_processo || '—'}</td>
                    <td className="p-2 whitespace-nowrap">{m.permissionaria || '—'}</td>
                    <td className="p-2 whitespace-nowrap">{m.status || '—'}</td>
                    <td className="p-2 whitespace-nowrap tabular-nums">{fmtValorBRL(m.valor)}</td>
                    <td className="p-2 whitespace-nowrap">{fmtData(m.data_infracao)}</td>
                    <td className="p-2 whitespace-nowrap"><SituacaoBadge situacao={m._situacao_vinculo} /></td>
                  </tr>
                ))}
                {pagina.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-400">
                      {buscaAplicada ? `Nenhum resultado para "${buscaAplicada}".` : 'Nenhuma multa carregada.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginacaoBusca pag={pag} total={totalPag} onChange={setPag} count={resultadoExibido.length} />
        </>
      )}
    </div>
  )
}
