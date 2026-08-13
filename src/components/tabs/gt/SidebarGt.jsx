import { memo, useMemo, useState } from 'react'
import { fmtNumero } from '../../../lib/aggregations.js'
import {
  STATUS_GRUPO_LABEL,
  STATUS_GRUPO_COR,
  contarFiltrosAtivosGt,
} from '../../../lib/gtObras.js'
import { INDIGO } from '../../../lib/cores.js'

// Bloco colapsável — mesmo padrão de SidebarMultas.jsx.
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

// Sidebar de filtros do módulo GT Obras — mesmo padrão visual/estrutural de
// SidebarMultas.jsx (índigo no lugar do vermelho institucional, via inline
// style — não é uma das 4 cores do tema Tailwind). Filtra: permissionária
// (NORCREST consolidada), grupo de status, subprefeitura e ano do processo.
const SidebarGt = memo(function SidebarGt({
  aberto,
  onToggle,
  filtros,
  setFiltros,
  onLimpar,
  permissionarias,
  statusGrupoDisponiveis,
  subprefeiturasDisponiveis,
  anosDisponiveis,
  totalFiltrado,
  totalGeral,
  filtrosAtivos,
}) {
  const [busca, setBusca] = useState('')
  const [norcrestAberto, setNorcrestAberto] = useState(false)

  // Contagem de CRITÉRIOS de filtro ativos (não o total de linhas filtradas
  // — usada no rótulo "Filtros · N" da sidebar recolhida; achado de
  // 12/08/2026, ver dominio.md).
  const filtrosCount = contarFiltrosAtivosGt(filtros)

  const permSet =
    filtros.permissionarias instanceof Set ? filtros.permissionarias : new Set()
  const statusSet =
    filtros.statusGrupo instanceof Set ? filtros.statusGrupo : new Set()
  const subSet =
    filtros.subprefeituras instanceof Set ? filtros.subprefeituras : new Set()
  const anoSet = filtros.anos instanceof Set ? filtros.anos : new Set()

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
    setFiltros({ ...filtros, statusGrupo: next })
  }

  function toggleSub(s) {
    const next = new Set(subSet)
    if (next.has(s)) next.delete(s)
    else next.add(s)
    setFiltros({ ...filtros, subprefeituras: next })
  }

  function toggleAno(a) {
    const next = new Set(anoSet)
    if (next.has(a)) next.delete(a)
    else next.add(a)
    setFiltros({ ...filtros, anos: next })
  }

  const isTodasPerm = permSet.size === 0

  if (!aberto) {
    return (
      <aside
        data-tour="sidebar-filtros"
        className="w-14 shrink-0 bg-white border-r border-grey-line flex flex-col items-center py-4 cursor-pointer transition-colors select-none"
        onClick={onToggle}
        title="Abrir filtros"
      >
        <svg
          className="w-4 h-4 mb-3 shrink-0"
          style={{ color: INDIGO }}
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
          <span
            className="w-2 h-2 rounded-full mb-2 shrink-0"
            style={{ background: INDIGO }}
          />
        )}
        <span
          className="text-xs font-extrabold uppercase tracking-widest mt-1"
          style={{ color: INDIGO, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {filtrosAtivos ? `Filtros · ${filtrosCount}` : 'Filtros'}
        </span>
      </aside>
    )
  }

  return (
    <aside
      data-tour="sidebar-filtros"
      className="w-60 shrink-0 bg-white border-r border-grey-line overflow-y-auto p-3 space-y-3"
    >
      <div
        className="flex items-center justify-between border-b-2 pb-2 mb-1"
        style={{ borderColor: INDIGO }}
      >
        <div
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide"
          style={{ color: INDIGO }}
        >
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
            <span
              className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-semibold normal-case"
              style={{ background: INDIGO }}
            >
              {fmtNumero(totalFiltrado)} de {fmtNumero(totalGeral)}
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          title="Recolher filtros"
          className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
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

      <BlocoFiltro titulo="Permissionária">
        <input
          type="text"
          placeholder="Buscar..."
          aria-label="Buscar permissionária"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full text-xs border border-grey-line rounded-sm px-2 py-1 mb-2 focus:outline-hidden"
        />
        <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
            <input
              type="checkbox"
              checked={isTodasPerm}
              onChange={() => togglePerm('TODAS')}
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
                />
                <span className="font-semibold truncate">
                  NORCREST (consolidado)
                </span>
              </label>
              <button
                type="button"
                onClick={() => setNorcrestAberto((o) => !o)}
                className="w-5 h-5 flex items-center justify-center rounded-sm text-xs font-bold transition-colors shrink-0"
                style={{ border: `1px solid ${INDIGO}4d`, color: INDIGO }}
              >
                {norcrestAberto || busca ? '−' : '+'}
              </button>
            </div>
          )}
          {(norcrestAberto || busca) &&
            norcrestFiltradas.map((p) => (
              <div
                key={p}
                className="pl-4 border-l-2 ml-2"
                style={{ borderColor: `${INDIGO}33` }}
              >
                <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
                  <input
                    type="checkbox"
                    checked={permSet.has(p)}
                    onChange={() => togglePerm(p)}
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
              />
              <span className="truncate">{p}</span>
            </label>
          ))}
        </div>
      </BlocoFiltro>

      <BlocoFiltro titulo="Situação">
        <div className="space-y-0.5">
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
            <input
              type="checkbox"
              checked={statusSet.size === 0}
              onChange={() => setFiltros({ ...filtros, statusGrupo: new Set() })}
            />
            <span className="font-semibold">TODAS</span>
          </label>
          {statusGrupoDisponiveis.map(({ grupo, qtd }) => (
            <label
              key={grupo}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm"
            >
              <input
                type="checkbox"
                checked={statusSet.has(grupo)}
                onChange={() => toggleStatus(grupo)}
              />
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: STATUS_GRUPO_COR[grupo] }}
              />
              <span className="truncate flex-1">
                {STATUS_GRUPO_LABEL[grupo] || grupo}
              </span>
              <span className="text-gray-400 shrink-0">{fmtNumero(qtd)}</span>
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
              />
              <span className="truncate">{s}</span>
            </label>
          ))}
        </div>
      </BlocoFiltro>

      <BlocoFiltro titulo="Ano do Processo">
        <div className="space-y-0.5">
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
            <input
              type="checkbox"
              checked={anoSet.size === 0}
              onChange={() => setFiltros({ ...filtros, anos: new Set() })}
            />
            <span className="font-semibold">TODOS</span>
          </label>
          {anosDisponiveis.map((a) => (
            <label
              key={a}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm"
            >
              <input
                type="checkbox"
                checked={anoSet.has(a)}
                onChange={() => toggleAno(a)}
              />
              <span className="truncate">{a}</span>
            </label>
          ))}
        </div>
      </BlocoFiltro>

      <button
        onClick={onLimpar}
        disabled={!filtrosAtivos}
        className="w-full text-xs py-2 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ border: `1px solid ${INDIGO}`, color: INDIGO }}
      >
        Limpar filtros
      </button>
    </aside>
  )
})

export default SidebarGt
