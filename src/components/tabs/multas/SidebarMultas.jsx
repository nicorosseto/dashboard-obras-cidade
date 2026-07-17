import { memo, useMemo, useState } from 'react'
import { fmtNumero, fmtData } from '../../../lib/aggregations.js'
import {
  SITUACAO_VINCULO_LABEL,
  SITUACAO_VINCULO_COR,
  SITUACOES_VINCULO,
} from '../../../lib/multas.js'

// Bloco colapsável — mesmo padrão de SidebarEmergencias.jsx.
function BlocoFiltro({ titulo, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-grey-line pb-1 mb-2 hover:text-navy"
      >
        <span>{titulo}</span>
        <span className="text-[8px]" aria-hidden="true">
          {open ? '▼' : '▶'}
        </span>
      </button>
      {open && children}
    </div>
  )
}

// Sidebar de filtros do módulo Multas (item 1 da melhoria de 16/07/2026) —
// mesmo padrão visual/estrutural de SidebarEmergencias.jsx: blocos
// colapsáveis, chips/checkboxes, botão "Limpar filtros" e contador de
// filtros ativos. Filtra: permissionária (NORCREST consolidada), status da
// multa, situação do vínculo e subprefeitura, além do período da infração.
const SidebarMultas = memo(function SidebarMultas({
  aberto,
  onToggle,
  filtros,
  setFiltros,
  onLimpar,
  permissionarias,
  statusDisponiveis,
  subprefeiturasDisponiveis,
  dataLimites,
  totalFiltrado,
  totalGeral,
  filtrosAtivos,
}) {
  const [busca, setBusca] = useState('')
  const [norcrestAberto, setNorcrestAberto] = useState(false)

  const permSet =
    filtros.permissionarias instanceof Set ? filtros.permissionarias : new Set()
  const statusSet = filtros.status instanceof Set ? filtros.status : new Set()
  const vinculoSet =
    filtros.situacaoVinculo instanceof Set ? filtros.situacaoVinculo : new Set()
  const subSet =
    filtros.subprefeituras instanceof Set ? filtros.subprefeituras : new Set()

  const { norcrestUnits, demais } = useMemo(() => {
    const sa = [],
      de = []
    for (const p of permissionarias) {
      if (String(p).toUpperCase().startsWith('NORCREST')) sa.push(p)
      else de.push(p)
    }
    return { norcrestUnits: sa, demais: de }
  }, [permissionarias])

  const demaisFiltradas = useMemo(() => {
    if (!busca) return demais
    const q = busca.toUpperCase()
    return demais.filter((p) => p.toUpperCase().includes(q))
  }, [demais, busca])

  const norcrestFiltradas = useMemo(() => {
    if (!busca) return norcrestUnits
    const q = busca.toUpperCase()
    return norcrestUnits.filter((p) => p.toUpperCase().includes(q))
  }, [norcrestUnits, busca])

  function togglePerm(p) {
    if (p === 'TODAS') {
      setFiltros({ ...filtros, permissionarias: new Set() })
      return
    }
    const next = new Set(permSet)
    if (next.has(p)) next.delete(p)
    else next.add(p)
    setFiltros({ ...filtros, permissionarias: next })
  }

  function toggleStatus(s) {
    const next = new Set(statusSet)
    if (next.has(s)) next.delete(s)
    else next.add(s)
    setFiltros({ ...filtros, status: next })
  }

  function toggleVinculo(v) {
    const next = new Set(vinculoSet)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    setFiltros({ ...filtros, situacaoVinculo: next })
  }

  function toggleSub(s) {
    const next = new Set(subSet)
    if (next.has(s)) next.delete(s)
    else next.add(s)
    setFiltros({ ...filtros, subprefeituras: next })
  }

  const isTodasPerm = permSet.size === 0

  if (!aberto) {
    return (
      <aside
        data-tour="sidebar-filtros"
        className="w-14 shrink-0 bg-white border-r border-grey-line flex flex-col items-center py-4 cursor-pointer hover:bg-red/5 transition-colors select-none"
        onClick={onToggle}
        title="Abrir filtros"
      >
        <svg
          className="w-4 h-4 text-red mb-3 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {filtrosAtivos && (
          <span className="w-2 h-2 rounded-full bg-red mb-2 shrink-0" />
        )}
        <span
          className="text-xs font-extrabold text-red uppercase tracking-widest mt-1"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {filtrosAtivos ? `Filtros · ${fmtNumero(totalFiltrado)}` : 'Filtros'}
        </span>
      </aside>
    )
  }

  return (
    <aside
      data-tour="sidebar-filtros"
      className="w-60 shrink-0 bg-white border-r border-grey-line overflow-y-auto p-3 space-y-3"
    >
      <div className="flex items-center justify-between border-b-2 border-red pb-2 mb-1">
        <div className="flex items-center gap-2 text-sm font-bold text-red uppercase tracking-wide">
          <svg
            className="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filtros
          {filtrosAtivos && (
            <span className="text-[10px] bg-red text-white px-1.5 py-0.5 rounded-full font-semibold normal-case">
              {fmtNumero(totalFiltrado)} de {fmtNumero(totalGeral)}
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          title="Recolher filtros"
          className="text-gray-400 hover:text-red transition-colors p-0.5"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <BlocoFiltro titulo="Período da Infração">
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase">
              De
            </label>
            <input
              type="date"
              value={filtros.dataIni || ''}
              min={dataLimites.min || undefined}
              max={dataLimites.max || undefined}
              onChange={(e) =>
                setFiltros({ ...filtros, dataIni: e.target.value || null })
              }
              className="w-full text-xs border border-grey-line rounded-sm px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-red"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase">
              Até
            </label>
            <input
              type="date"
              value={filtros.dataFim || ''}
              min={dataLimites.min || undefined}
              max={dataLimites.max || undefined}
              onChange={(e) =>
                setFiltros({ ...filtros, dataFim: e.target.value || null })
              }
              className="w-full text-xs border border-grey-line rounded-sm px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-red"
            />
          </div>
          {dataLimites.min && dataLimites.max && (
            <p className="text-[10px] text-gray-400 leading-tight">
              Disponível: {fmtData(dataLimites.min)} a{' '}
              {fmtData(dataLimites.max)}
            </p>
          )}
        </div>
      </BlocoFiltro>

      <BlocoFiltro titulo="Permissionária">
        <input
          type="text"
          placeholder="Buscar..."
          aria-label="Buscar permissionária"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full text-xs border border-grey-line rounded-sm px-2 py-1 mb-2 focus:outline-hidden focus:ring-1 focus:ring-red"
        />
        <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
            <input
              type="checkbox"
              checked={isTodasPerm}
              onChange={() => togglePerm('TODAS')}
              className="accent-red"
            />
            <span className="font-semibold">TODAS</span>
          </label>
          {norcrestUnits.length > 0 && (
            <div className="flex items-center gap-1 text-xs hover:bg-grey-bg px-1 py-0.5 rounded-sm">
              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={permSet.has('NORCREST')}
                  onChange={() => togglePerm('NORCREST')}
                  className="accent-red"
                />
                <span className="font-semibold truncate">
                  NORCREST (consolidado)
                </span>
              </label>
              <button
                type="button"
                onClick={() => setNorcrestAberto((o) => !o)}
                className="w-5 h-5 flex items-center justify-center rounded-sm border border-red/30 text-red text-xs font-bold hover:bg-red hover:text-white transition-colors shrink-0"
              >
                {norcrestAberto || busca ? '−' : '+'}
              </button>
            </div>
          )}
          {(norcrestAberto || busca) &&
            norcrestFiltradas.map((p) => (
              <div key={p} className="pl-4 border-l-2 border-red/20 ml-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
                  <input
                    type="checkbox"
                    checked={permSet.has(p)}
                    onChange={() => togglePerm(p)}
                    className="accent-red"
                  />
                  <span className="truncate">{p}</span>
                </label>
              </div>
            ))}
          {norcrestUnits.length > 0 && <div className="h-px bg-grey-line my-1" />}
          {demaisFiltradas.map((p) => (
            <label
              key={p}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm"
            >
              <input
                type="checkbox"
                checked={permSet.has(p)}
                onChange={() => togglePerm(p)}
                className="accent-red"
              />
              <span className="truncate">{p}</span>
            </label>
          ))}
        </div>
      </BlocoFiltro>

      <BlocoFiltro titulo="Status da Multa">
        <div className="space-y-0.5">
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
            <input
              type="checkbox"
              checked={statusSet.size === 0}
              onChange={() => setFiltros({ ...filtros, status: new Set() })}
              className="accent-red"
            />
            <span className="font-semibold">TODOS</span>
          </label>
          {statusDisponiveis.map(({ status, qtd }) => (
            <label
              key={status}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm"
            >
              <input
                type="checkbox"
                checked={statusSet.has(status)}
                onChange={() => toggleStatus(status)}
                className="accent-red"
              />
              <span className="truncate flex-1">{status}</span>
              <span className="text-gray-400 shrink-0">{fmtNumero(qtd)}</span>
            </label>
          ))}
        </div>
      </BlocoFiltro>

      <BlocoFiltro titulo="Situação do Vínculo">
        <div className="space-y-0.5">
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
            <input
              type="checkbox"
              checked={vinculoSet.size === 0}
              onChange={() =>
                setFiltros({ ...filtros, situacaoVinculo: new Set() })
              }
              className="accent-red"
            />
            <span className="font-semibold">TODAS</span>
          </label>
          {SITUACOES_VINCULO.map((v) => (
            <label
              key={v}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm"
            >
              <input
                type="checkbox"
                checked={vinculoSet.has(v)}
                onChange={() => toggleVinculo(v)}
                className="accent-red"
              />
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: SITUACAO_VINCULO_COR[v] }}
              />
              <span className="truncate">{SITUACAO_VINCULO_LABEL[v]}</span>
            </label>
          ))}
        </div>
      </BlocoFiltro>

      <BlocoFiltro titulo="Subprefeitura">
        <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
            <input
              type="checkbox"
              checked={subSet.size === 0}
              onChange={() =>
                setFiltros({ ...filtros, subprefeituras: new Set() })
              }
              className="accent-red"
            />
            <span className="font-semibold">TODAS</span>
          </label>
          {subprefeiturasDisponiveis.map((s) => (
            <label
              key={s}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm"
            >
              <input
                type="checkbox"
                checked={subSet.has(s)}
                onChange={() => toggleSub(s)}
                className="accent-red"
              />
              <span className="truncate">{s}</span>
            </label>
          ))}
        </div>
      </BlocoFiltro>

      <button
        onClick={onLimpar}
        disabled={!filtrosAtivos}
        className="w-full text-xs py-2 border border-red text-red rounded-sm hover:bg-red hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-red"
      >
        Limpar filtros
      </button>
    </aside>
  )
})

export default SidebarMultas
