import { useMemo, useState } from 'react'
import { consolidarNorcrest } from '../lib/aggregations.js'
import ChipsFiltros from './ChipsFiltros.jsx'

function toggleInSet(set, value) {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function uniqSorted(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), 'pt')
  )
}

const OPCOES_VISIBILIDADE = [
  { id: 'todos', label: 'Todos' },
  { id: 'em-comum', label: 'Só em comum' },
  { id: 'so-fisc', label: 'Só na Fiscalização' },
  { id: 'so-geo', label: 'Só no Sistema Geo' },
]

export default function SidebarCruzamento({ rowsFisc, rowsGeo, filtros, setFiltros, onLimpar }) {
  const [busca, setBusca] = useState('')
  const [norcrestAberto, setNorcrestAberto] = useState(false)
  const [aberto, setAberto] = useState(false)

  const permSet = filtros.permissionarias instanceof Set ? filtros.permissionarias : new Set()
  const subSet = filtros.subprefeituras instanceof Set ? filtros.subprefeituras : new Set()
  const sfSet = filtros.statusFisc instanceof Set ? filtros.statusFisc : new Set()
  const sgSet = filtros.statusGeo instanceof Set ? filtros.statusGeo : new Set()
  const etSet = filtros.etapas instanceof Set ? filtros.etapas : new Set()
  const tpSet = filtros.tiposProcesso instanceof Set ? filtros.tiposProcesso : new Set()

  // Listas derivadas da união das duas bases
  const { norcrestUnits, outrasPermissionarias } = useMemo(() => {
    const sabSet = new Set()
    const outSet = new Set()
    for (const r of rowsFisc) {
      if (!r.permissionaria) continue
      if (consolidarNorcrest(r.permissionaria) === 'NORCREST') sabSet.add(r.permissionaria)
      else outSet.add(r.permissionaria)
    }
    for (const r of rowsGeo) {
      if (!r.permissionaria) continue
      if (consolidarNorcrest(r.permissionaria) === 'NORCREST') sabSet.add(r.permissionaria)
      else outSet.add(r.permissionaria)
    }
    return {
      norcrestUnits: uniqSorted(Array.from(sabSet)),
      outrasPermissionarias: uniqSorted(Array.from(outSet)),
    }
  }, [rowsFisc, rowsGeo])

  const subprefeituras = useMemo(() => {
    const s = new Set()
    for (const r of rowsFisc) { if (r.subprefeitura) s.add(r.subprefeitura) }
    for (const r of rowsGeo) { if (r.subprefeitura) s.add(r.subprefeitura) }
    return uniqSorted(Array.from(s))
  }, [rowsFisc, rowsGeo])

  const statusFiscOpcoes = useMemo(
    () => uniqSorted(rowsFisc.map((r) => r.status_simplificado).filter(Boolean)),
    [rowsFisc]
  )

  const [statusAbertos, setStatusAbertos] = useState(() => new Set())

  const statusPorGrupo = useMemo(() => {
    const map = new Map()
    for (const r of rowsGeo) {
      const grupo = r.status_unificado || r.status_nome || '(sem status)'
      const ind = r.status_nome || r.status || grupo
      if (!map.has(grupo)) map.set(grupo, new Set())
      map.get(grupo).add(ind)
    }
    return Array.from(map.entries())
      .map(([grupo, set]) => ({
        grupo,
        individuais: Array.from(set).sort((a, b) => String(a).localeCompare(String(b), 'pt')),
      }))
      .sort((a, b) => String(a.grupo).localeCompare(String(b.grupo), 'pt'))
  }, [rowsGeo])

  const etapas = useMemo(
    () => uniqSorted(rowsGeo.map((r) => r.etapa_nome).filter(Boolean)),
    [rowsGeo]
  )

  const tiposProcesso = useMemo(
    () => uniqSorted(rowsGeo.map((r) => r.tipo_processo_nome || r.tipo_processo).filter(Boolean)),
    [rowsGeo]
  )

  const permFiltradas = useMemo(() => {
    if (!busca) return outrasPermissionarias
    const q = busca.toUpperCase()
    return outrasPermissionarias.filter((p) => p.toUpperCase().includes(q))
  }, [outrasPermissionarias, busca])

  function toggleField(field, set, value) {
    if (value === 'TODAS' || value === 'TODOS') {
      setFiltros({ ...filtros, [field]: new Set() })
      return
    }
    setFiltros({ ...filtros, [field]: toggleInSet(set, value) })
  }

  const visibilidadeAtiva = filtros.visibilidade !== 'todos'
  const totalAtivos =
    permSet.size + subSet.size + sfSet.size + sgSet.size + etSet.size + tpSet.size +
    (visibilidadeAtiva ? 1 : 0)
  const filtrosAtivos = totalAtivos > 0

  // Chips de filtros ativos
  const chips = useMemo(() => {
    const result = []
    if (visibilidadeAtiva) {
      const label = OPCOES_VISIBILIDADE.find((o) => o.id === filtros.visibilidade)?.label || filtros.visibilidade
      result.push({ id: 'vis', label, onRemover: () => setFiltros({ ...filtros, visibilidade: 'todos' }) })
    }
    if (permSet.size === 1) {
      const v = Array.from(permSet)[0]
      result.push({ id: `perm:${v}`, label: v, onRemover: () => setFiltros({ ...filtros, permissionarias: new Set() }) })
    } else if (permSet.size > 1) {
      result.push({ id: 'perm:multi', label: `${permSet.size} permissionárias`, onRemover: () => setFiltros({ ...filtros, permissionarias: new Set() }) })
    }
    if (subSet.size === 1) {
      const v = Array.from(subSet)[0]
      result.push({ id: `sub:${v}`, label: v, onRemover: () => setFiltros({ ...filtros, subprefeituras: new Set() }) })
    } else if (subSet.size > 1) {
      result.push({ id: 'sub:multi', label: `${subSet.size} subprefeituras`, onRemover: () => setFiltros({ ...filtros, subprefeituras: new Set() }) })
    }
    if (sfSet.size === 1) {
      const v = Array.from(sfSet)[0]
      result.push({ id: `sf:${v}`, label: `Fisc: ${v}`, onRemover: () => setFiltros({ ...filtros, statusFisc: new Set() }) })
    } else if (sfSet.size > 1) {
      result.push({ id: 'sf:multi', label: `${sfSet.size} status fisc.`, onRemover: () => setFiltros({ ...filtros, statusFisc: new Set() }) })
    }
    if (sgSet.size === 1) {
      const v = Array.from(sgSet)[0]
      result.push({ id: `sg:${v}`, label: `Geo: ${v}`, onRemover: () => setFiltros({ ...filtros, statusGeo: new Set() }) })
    } else if (sgSet.size > 1) {
      result.push({ id: 'sg:multi', label: `${sgSet.size} status geo`, onRemover: () => setFiltros({ ...filtros, statusGeo: new Set() }) })
    }
    if (etSet.size === 1) {
      const v = Array.from(etSet)[0]
      result.push({ id: `et:${v}`, label: v, onRemover: () => setFiltros({ ...filtros, etapas: new Set() }) })
    } else if (etSet.size > 1) {
      result.push({ id: 'et:multi', label: `${etSet.size} etapas`, onRemover: () => setFiltros({ ...filtros, etapas: new Set() }) })
    }
    if (tpSet.size === 1) {
      const v = Array.from(tpSet)[0]
      result.push({ id: `tp:${v}`, label: v, onRemover: () => setFiltros({ ...filtros, tiposProcesso: new Set() }) })
    } else if (tpSet.size > 1) {
      result.push({ id: 'tp:multi', label: `${tpSet.size} tipos`, onRemover: () => setFiltros({ ...filtros, tiposProcesso: new Set() }) })
    }
    return result
  }, [filtros, visibilidadeAtiva, permSet, subSet, sfSet, sgSet, etSet, tpSet])

  // ── Recolhida ──────────────────────────────────────────────────────────────
  if (!aberto) {
    return (
      <aside
        className="w-14 shrink-0 bg-white border-r border-grey-line flex flex-col items-center py-4 cursor-pointer hover:bg-navy/5 transition-colors select-none"
        onClick={() => setAberto(true)}
        title="Abrir filtros"
      >
        <svg
          className="w-4 h-4 text-navy mb-3 shrink-0"
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
          className="text-xs font-extrabold text-navy uppercase tracking-widest mt-1"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {filtrosAtivos ? `Filtros · ${totalAtivos}` : 'Filtros'}
        </span>
      </aside>
    )
  }

  // ── Expandida ──────────────────────────────────────────────────────────────
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-grey-line flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-3 py-3 border-b-2 border-violet-600 shrink-0">
        <div className="flex items-center gap-2 text-sm font-bold text-navy uppercase tracking-wide">
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
            <span className="text-[10px] bg-navy text-white px-1.5 py-0.5 rounded-full font-semibold normal-case tracking-normal">
              {totalAtivos}
            </span>
          )}
        </div>
        <button
          onClick={() => setAberto(false)}
          title="Recolher filtros"
          className="text-gray-400 hover:text-navy transition-colors p-0.5"
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

      {/* Chips de filtros ativos */}
      <ChipsFiltros chips={chips} onLimparTodos={onLimpar} />

      {/* Seções com scroll */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* Visibilidade */}
        <Bloco titulo="Visibilidade" count={visibilidadeAtiva ? 1 : 0} defaultOpen>
          <div className="space-y-1">
            {OPCOES_VISIBILIDADE.map((op) => (
              <label key={op.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
                <input
                  type="radio"
                  name="visibilidade-cruzamento"
                  value={op.id}
                  checked={filtros.visibilidade === op.id}
                  onChange={() => setFiltros({ ...filtros, visibilidade: op.id })}
                  className="accent-navy"
                />
                <span className={filtros.visibilidade === op.id ? 'font-semibold' : ''}>
                  {op.label}
                </span>
              </label>
            ))}
          </div>
        </Bloco>

        {/* Permissionária */}
        <Bloco titulo="Permissionária" count={permSet.size}>
          <input
            type="text"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full text-xs border border-grey-line rounded-sm px-2 py-1 mb-2 focus:outline-hidden focus:ring-1 focus:ring-navy"
          />
          <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
            <Check
              label="TODAS"
              checked={permSet.size === 0}
              onChange={() => toggleField('permissionarias', permSet, 'TODAS')}
              bold
            />
            {norcrestUnits.length > 0 && (
              <CheckExpansivel
                label="NORCREST (consolidado)"
                checked={permSet.has('NORCREST')}
                onChange={() => toggleField('permissionarias', permSet, 'NORCREST')}
                aberto={norcrestAberto || !!busca}
                onToggle={() => setNorcrestAberto((o) => !o)}
                mostraBotao={norcrestUnits.length > 0}
              />
            )}
            {(norcrestAberto || busca) &&
              norcrestUnits
                .filter((p) => !busca || p.toUpperCase().includes(busca.toUpperCase()))
                .map((p) => (
                  <div key={p} className="pl-4 border-l-2 border-navy/20 ml-2">
                    <Check
                      label={p}
                      checked={permSet.has(p)}
                      onChange={() => toggleField('permissionarias', permSet, p)}
                    />
                  </div>
                ))}
            {norcrestUnits.length > 0 && <div className="h-px bg-grey-line my-1" />}
            {permFiltradas.map((p) => (
              <Check
                key={p}
                label={p}
                checked={permSet.has(p)}
                onChange={() => toggleField('permissionarias', permSet, p)}
              />
            ))}
          </div>
        </Bloco>

        {/* Subprefeitura */}
        <Bloco titulo="Subprefeitura" count={subSet.size}>
          <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
            <Check
              label="TODAS"
              checked={subSet.size === 0}
              onChange={() => toggleField('subprefeituras', subSet, 'TODAS')}
              bold
            />
            {subprefeituras.map((s) => (
              <Check
                key={s}
                label={s}
                checked={subSet.has(s)}
                onChange={() => toggleField('subprefeituras', subSet, s)}
              />
            ))}
          </div>
        </Bloco>

        {/* Status Fiscalização */}
        <Bloco titulo="Status Fiscalização" count={sfSet.size}>
          <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
            <Check
              label="TODOS"
              checked={sfSet.size === 0}
              onChange={() => toggleField('statusFisc', sfSet, 'TODOS')}
              bold
            />
            {statusFiscOpcoes.map((s) => (
              <Check
                key={s}
                label={s}
                checked={sfSet.has(s)}
                onChange={() => toggleField('statusFisc', sfSet, s)}
              />
            ))}
          </div>
        </Bloco>

        {/* Status Sistema Geo — agrupado com individuais expansíveis */}
        <Bloco titulo="Status Sistema Geo" count={sgSet.size}>
          <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
            <Check
              label="TODOS"
              checked={sgSet.size === 0}
              onChange={() => toggleField('statusGeo', sgSet, 'TODOS')}
              bold
            />
            {statusPorGrupo.map(({ grupo, individuais }) => {
              const grupoAberto = statusAbertos.has(grupo)
              const grupoMarcado = sgSet.has(grupo)
              const algumIndMarcado = individuais.some(i => sgSet.has(i))
              return (
                <div key={grupo}>
                  <div className="flex items-center gap-1 text-xs px-1 py-0.5 rounded-sm hover:bg-grey-bg">
                    <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={grupoMarcado || algumIndMarcado}
                        onChange={() => {
                          if (grupoMarcado || algumIndMarcado) {
                            // Desmarca grupo e todos individuais
                            const next = new Set(sgSet)
                            next.delete(grupo)
                            for (const i of individuais) next.delete(i)
                            setFiltros({ ...filtros, statusGeo: next })
                          } else {
                            toggleField('statusGeo', sgSet, grupo)
                          }
                        }}
                        className="accent-navy"
                      />
                      <span className={`font-semibold truncate ${grupoMarcado || algumIndMarcado ? 'text-navy' : ''}`}>{grupo}</span>
                    </label>
                    {individuais.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setStatusAbertos(prev => {
                          const next = new Set(prev)
                          if (next.has(grupo)) next.delete(grupo)
                          else next.add(grupo)
                          return next
                        })}
                        title={grupoAberto ? 'Recolher' : 'Ver status individuais'}
                        className="w-5 h-5 flex items-center justify-center rounded-sm border border-navy/30 text-navy text-xs font-bold hover:bg-navy hover:text-white transition-colors shrink-0"
                      >
                        {grupoAberto ? '−' : '+'}
                      </button>
                    )}
                  </div>
                  {grupoAberto && individuais.map(ind => (
                    <div key={ind} className="pl-4 border-l-2 border-navy/20 ml-2">
                      <Check
                        label={ind}
                        checked={sgSet.has(ind) || (grupoMarcado)}
                        onChange={() => {
                          // Se grupo selecionado, ao clicar individual, desmarca grupo e seleciona só os outros
                          if (grupoMarcado) {
                            const next = new Set(sgSet)
                            next.delete(grupo)
                            for (const i of individuais) if (i !== ind) next.add(i)
                            setFiltros({ ...filtros, statusGeo: next })
                          } else {
                            toggleField('statusGeo', sgSet, ind)
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </Bloco>

        {/* Etapa Sistema Geo */}
        <Bloco titulo="Etapa" count={etSet.size}>
          <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
            <Check
              label="TODAS"
              checked={etSet.size === 0}
              onChange={() => toggleField('etapas', etSet, 'TODAS')}
              bold
            />
            {etapas.map((e) => (
              <Check
                key={e}
                label={e}
                checked={etSet.has(e)}
                onChange={() => toggleField('etapas', etSet, e)}
              />
            ))}
          </div>
        </Bloco>

        {/* Tipo de Processo */}
        <Bloco titulo="Tipo de Processo" count={tpSet.size}>
          <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
            <Check
              label="TODOS"
              checked={tpSet.size === 0}
              onChange={() => toggleField('tiposProcesso', tpSet, 'TODOS')}
              bold
            />
            {tiposProcesso.map((t) => (
              <Check
                key={t}
                label={t}
                checked={tpSet.has(t)}
                onChange={() => toggleField('tiposProcesso', tpSet, t)}
              />
            ))}
          </div>
        </Bloco>

      </div>

      {/* Footer fixo */}
      <div className="px-3 py-2 border-t border-grey-line shrink-0">
        <button
          onClick={onLimpar}
          className="w-full text-xs py-2 border border-navy text-navy rounded-sm hover:bg-navy hover:text-white transition-colors"
        >
          Limpar filtros
        </button>
      </div>
    </aside>
  )
}

function Check({ label, checked, onChange, bold }) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        className="accent-navy"
      />
      <span className={`${bold ? 'font-semibold' : ''} truncate`}>{label}</span>
    </label>
  )
}

function CheckExpansivel({ label, checked, onChange, aberto, onToggle, mostraBotao = true }) {
  return (
    <div className="flex items-center gap-1 text-xs px-1 py-0.5 rounded-sm hover:bg-grey-bg">
      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
        <input
          type="checkbox"
          checked={!!checked}
          onChange={onChange}
          className="accent-navy"
        />
        <span className="font-semibold truncate">{label}</span>
      </label>
      {mostraBotao && (
        <button
          type="button"
          onClick={onToggle}
          title={aberto ? 'Recolher' : 'Expandir bases'}
          className="w-5 h-5 flex items-center justify-center rounded-sm border border-navy/30 text-navy text-xs font-bold hover:bg-navy hover:text-white transition-colors shrink-0"
        >
          {aberto ? '−' : '+'}
        </button>
      )}
    </div>
  )
}

function Bloco({ titulo, count = 0, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-grey-line pb-1 mb-2 hover:text-navy"
      >
        <span className="flex items-center gap-1.5">
          {titulo}
          {count > 0 && (
            <span className="bg-navy text-white text-[9px] leading-none font-bold normal-case tracking-normal rounded-full px-1.5 py-0.5">
              {count}
            </span>
          )}
        </span>
        <span className="text-[8px]">{open ? '▼' : '▶'}</span>
      </button>
      {open && children}
    </div>
  )
}
