import { memo, useState, useMemo } from 'react'
import { fmtNumero, fmtData } from '../../../lib/aggregations.js'
import { STATUS_VISTORIA_OPTS, STATUS_FIXOS_EMERG } from '../../../lib/emergencias.js'

function BlocoFiltro({ titulo, children, defaultOpen = false, bloqueado = false }) {
  const [open, setOpen] = useState(defaultOpen)
  if (bloqueado) {
    return (
      <div className="opacity-50" title='Não se aplica na aba "Motivo Inválido"'>
        <div className="w-full flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-400 font-bold border-b border-grey-line pb-1 mb-1">
          <span>{titulo}</span>
          <span className="text-[9px]">🔒</span>
        </div>
        <p className="text-[9px] text-gray-400 italic mb-2">Não se aplica nesta aba.</p>
      </div>
    )
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-grey-line pb-1 mb-2 hover:text-navy"
      >
        <span>{titulo}</span>
        <span className="text-[8px]" aria-hidden="true">{open ? '▼' : '▶'}</span>
      </button>
      {open && children}
    </div>
  )
}

function BlocoStatusSistemaGeo({ statusDisponiveis, filtros, setFiltros }) {
  const [outrosAberto, setOutrosAberto] = useState(false)

  const stGeoSet = filtros.statusSistemaGeo instanceof Set ? filtros.statusSistemaGeo : new Set()

  // Mapa status → qtd a partir do disponível (para mostrar contagem)
  const qtdPorStatus = useMemo(() => {
    const m = new Map()
    for (const x of statusDisponiveis) m.set(x.status, x.qtd)
    return m
  }, [statusDisponiveis])

  // Fixos (na ordem definida) + lista "outros" = status presentes que não são fixos
  const outros = useMemo(() => {
    return statusDisponiveis
      .filter((x) => !STATUS_FIXOS_EMERG.includes(x.status))
      .sort((a, b) => b.qtd - a.qtd)
  }, [statusDisponiveis])

  const todosOutrosSel = outros.length > 0 && outros.every((x) => stGeoSet.has(x.status))
  const algunsOutrosSel = outros.some((x) => stGeoSet.has(x.status))
  const outrosSelecionados = outros.filter((x) => stGeoSet.has(x.status)).length

  function toggle(status) {
    const next = new Set(stGeoSet)
    if (next.has(status)) next.delete(status)
    else next.add(status)
    setFiltros({ ...filtros, statusSistemaGeo: next })
  }

  function toggleOutros() {
    const next = new Set(stGeoSet)
    if (todosOutrosSel) {
      for (const x of outros) next.delete(x.status)
    } else {
      for (const x of outros) next.add(x.status)
    }
    setFiltros({ ...filtros, statusSistemaGeo: next })
  }

  if (statusDisponiveis.length === 0) return null

  return (
    <div className="space-y-0.5">
      <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
        <input
          type="checkbox"
          checked={stGeoSet.size === 0}
          onChange={() => setFiltros({ ...filtros, statusSistemaGeo: new Set() })}
          className="accent-navy"
        />
        <span className="font-semibold">TODOS</span>
      </label>
      {STATUS_FIXOS_EMERG.map((status) => (
        <label key={status} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
          <input type="checkbox" checked={stGeoSet.has(status)} onChange={() => toggle(status)} className="accent-navy" />
          <span className="truncate flex-1">{status}</span>
          <span className="text-gray-400 shrink-0">{fmtNumero(qtdPorStatus.get(status) || 0)}</span>
        </label>
      ))}
      {outros.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs hover:bg-grey-bg px-1 py-0.5 rounded-sm">
            <input
              type="checkbox"
              checked={todosOutrosSel}
              ref={(el) => { if (el) el.indeterminate = algunsOutrosSel && !todosOutrosSel }}
              onChange={toggleOutros}
              className="accent-navy shrink-0"
            />
            <span className="flex-1 truncate text-gray-600">
              Outros
              {outrosSelecionados > 0 && (
                <span className="ml-1 text-navy font-semibold">·{outrosSelecionados} sel.</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setOutrosAberto((o) => !o)}
              title={outrosAberto ? 'Recolher' : 'Expandir status agrupados'}
              className="w-5 h-5 flex items-center justify-center rounded-sm border border-navy/30 text-navy text-xs font-bold hover:bg-navy hover:text-white transition-colors shrink-0"
            >
              {outrosAberto ? '−' : '+'}
            </button>
          </div>
          {outrosAberto && (
            <div className="pl-4 border-l-2 border-navy/20 ml-2 mt-0.5 space-y-0.5 max-h-44 overflow-y-auto pr-1">
              {outros.map(({ status, qtd }) => (
                <label key={status} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
                  <input type="checkbox" checked={stGeoSet.has(status)} onChange={() => toggle(status)} className="accent-navy" />
                  <span className="truncate flex-1">{status}</span>
                  <span className="text-gray-400 shrink-0">{fmtNumero(qtd)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SidebarEmergencias = memo(function SidebarEmergencias({
  aberto,
  onToggle,
  filtros,
  setFiltros,
  onLimpar,
  permissionarias,
  dataLimites,
  totalFiltrado,
  totalGeral,
  filtrosAtivos,
  statusDisponiveis = [],
  bloqueados = {},
}) {
  const [busca, setBusca] = useState('')
  const [norcrestAberto, setNorcrestAberto] = useState(false)

  const permSet =
    filtros.permissionarias instanceof Set ? filtros.permissionarias : new Set()

  const { norcrestUnits, demais } = useMemo(() => {
    const sa = [], de = []
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

  const isTodasPerm = permSet.size === 0

  if (!aberto) {
    return (
      <aside
        data-tour="sidebar-filtros"
        className="w-14 shrink-0 bg-white border-r border-grey-line flex flex-col items-center py-4 cursor-pointer hover:bg-navy/5 transition-colors select-none"
        onClick={onToggle}
        title="Abrir filtros"
      >
        <svg className="w-4 h-4 text-navy mb-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {filtrosAtivos && <span className="w-2 h-2 rounded-full bg-red mb-2 shrink-0" />}
        <span
          className="text-xs font-extrabold text-navy uppercase tracking-widest mt-1"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {filtrosAtivos ? `Filtros · ${fmtNumero(totalFiltrado)}` : 'Filtros'}
        </span>
      </aside>
    )
  }

  return (
    <aside data-tour="sidebar-filtros" className="w-60 shrink-0 bg-white border-r border-grey-line overflow-y-auto p-3 space-y-3">
      <div className="flex items-center justify-between border-b-2 border-navy pb-2 mb-1">
        <div className="flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filtros
          {filtrosAtivos && (
            <span className="text-[10px] bg-navy text-white px-1.5 py-0.5 rounded-full font-semibold normal-case">
              {fmtNumero(totalFiltrado)} de {fmtNumero(totalGeral)}
            </span>
          )}
        </div>
        <button onClick={onToggle} title="Recolher filtros" className="text-gray-400 hover:text-navy transition-colors p-0.5">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <BlocoFiltro titulo="Data de Cadastro" bloqueado={!!bloqueados.data}>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase">De</label>
            <input
              type="date"
              value={filtros.dataIni || ''}
              min={dataLimites.min || undefined}
              max={dataLimites.max || undefined}
              onChange={(e) => setFiltros({ ...filtros, dataIni: e.target.value || null })}
              className="w-full text-xs border border-grey-line rounded-sm px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-navy"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase">Até</label>
            <input
              type="date"
              value={filtros.dataFim || ''}
              min={dataLimites.min || undefined}
              max={dataLimites.max || undefined}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value || null })}
              className="w-full text-xs border border-grey-line rounded-sm px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-navy"
            />
          </div>
          {dataLimites.min && dataLimites.max && (
            <p className="text-[10px] text-gray-400 leading-tight">
              Disponível: {fmtData(dataLimites.min)} a {fmtData(dataLimites.max)}
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
          className="w-full text-xs border border-grey-line rounded-sm px-2 py-1 mb-2 focus:outline-hidden focus:ring-1 focus:ring-navy"
        />
        <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
            <input type="checkbox" checked={isTodasPerm} onChange={() => togglePerm('TODAS')} className="accent-navy" />
            <span className="font-semibold">TODAS</span>
          </label>
          {norcrestUnits.length > 0 && (
            <div className="flex items-center gap-1 text-xs hover:bg-grey-bg px-1 py-0.5 rounded-sm">
              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                <input type="checkbox" checked={permSet.has('NORCREST')} onChange={() => togglePerm('NORCREST')} className="accent-navy" />
                <span className="font-semibold truncate">NORCREST (consolidado)</span>
              </label>
              <button
                type="button"
                onClick={() => setNorcrestAberto((o) => !o)}
                className="w-5 h-5 flex items-center justify-center rounded-sm border border-navy/30 text-navy text-xs font-bold hover:bg-navy hover:text-white transition-colors shrink-0"
              >
                {norcrestAberto || busca ? '−' : '+'}
              </button>
            </div>
          )}
          {(norcrestAberto || busca) && norcrestFiltradas.map((p) => (
            <div key={p} className="pl-4 border-l-2 border-navy/20 ml-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
                <input type="checkbox" checked={permSet.has(p)} onChange={() => togglePerm(p)} className="accent-navy" />
                <span className="truncate">{p}</span>
              </label>
            </div>
          ))}
          {norcrestUnits.length > 0 && <div className="h-px bg-grey-line my-1" />}
          {demaisFiltradas.map((p) => (
            <label key={p} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
              <input type="checkbox" checked={permSet.has(p)} onChange={() => togglePerm(p)} className="accent-navy" />
              <span className="truncate">{p}</span>
            </label>
          ))}
        </div>
      </BlocoFiltro>

      <BlocoFiltro titulo="Status Sistema Geo">
        <BlocoStatusSistemaGeo
          statusDisponiveis={statusDisponiveis}
          filtros={filtros}
          setFiltros={setFiltros}
        />
      </BlocoFiltro>

      <BlocoFiltro titulo="Possui Vistoria?" bloqueado={!!bloqueados.possuiVistoria}>
        <div className="flex rounded-sm border border-grey-line overflow-hidden text-[11px]">
          {[['todas', 'Todas'], ['sim', 'Sim'], ['nao', 'Não']].map(([val, label], i) => (
            <button
              key={val}
              type="button"
              onClick={() => setFiltros({ ...filtros, possuiVistoria: val })}
              className={`flex-1 px-2 py-1.5 ${i > 0 ? 'border-l border-grey-line' : ''} ${
                (filtros.possuiVistoria || 'todas') === val
                  ? 'bg-navy text-white'
                  : 'bg-white text-navy hover:bg-grey-bg'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-1 leading-tight">
          Cruzamento com fiscalizações por nº processo.
        </p>
      </BlocoFiltro>

      <BlocoFiltro titulo="Status da Vistoria" bloqueado={!!bloqueados.statusVistoria}>
        <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
            <input
              type="checkbox"
              checked={(filtros.statusVistoria?.size ?? 0) === 0}
              onChange={() => setFiltros({ ...filtros, statusVistoria: new Set() })}
              className="accent-navy"
            />
            <span className="font-semibold">TODOS</span>
          </label>
          {STATUS_VISTORIA_OPTS.map((st) => {
            const stSet = filtros.statusVistoria instanceof Set ? filtros.statusVistoria : new Set()
            const sel = stSet.has(st)
            const corMap = {
              'Legislação Atendida': 'text-green-700',
              Solucionado: 'text-blue-700',
              'Em Andamento': 'text-amber-700',
              'Não Conformidade': 'text-red-600',
              'Sem vistoria': 'text-gray-500',
            }
            return (
              <label key={st} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => {
                    const next = new Set(stSet)
                    if (next.has(st)) next.delete(st)
                    else next.add(st)
                    setFiltros({ ...filtros, statusVistoria: next })
                  }}
                  className="accent-navy"
                />
                <span className={corMap[st] || ''}>{st}</span>
              </label>
            )
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-1 leading-tight">
          <strong className="text-red-600">"NC"</strong> isolada = laudo com NC sem sol./andamento.
        </p>
      </BlocoFiltro>

      <button
        onClick={onLimpar}
        disabled={!filtrosAtivos}
        className="w-full text-xs py-2 border border-navy text-navy rounded-sm hover:bg-navy hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-navy"
      >
        Limpar filtros
      </button>
    </aside>
  )
})

export default SidebarEmergencias
