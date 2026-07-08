import { useMemo, useState } from 'react'
import ChipsFiltros, { labelPeriodo, presetsHoje } from './ChipsFiltros.jsx'

function toggleInSet(set, value) {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

const PRESETS = presetsHoje()

export default function Sidebar({
  anos,
  permissionarias,
  subprefeituras,
  subprefeiturasMapa,
  filtros,
  setFiltros,
  onLimpar,
}) {
  const [busca, setBusca] = useState('')
  const [norcrestAberto, setNorcrestAberto] = useState(false)

  const permSet =
    filtros.permissionarias instanceof Set ? filtros.permissionarias : new Set()
  const subSet =
    filtros.subprefeituras instanceof Set ? filtros.subprefeituras : new Set()

  // Separa NORCREST/* das demais permissionárias
  const { norcrestUnits, demais } = useMemo(() => {
    const sa = []
    const de = []
    for (const p of permissionarias) {
      if (String(p).toUpperCase().startsWith('NORCREST')) sa.push(p)
      else de.push(p)
    }
    return { norcrestUnits: sa, demais: de }
  }, [permissionarias])

  const permissionariasFiltradas = useMemo(() => {
    if (!busca) return demais
    const q = busca.toUpperCase()
    return demais.filter((p) => p.toUpperCase().includes(q))
  }, [demais, busca])

  const norcrestFiltradas = useMemo(() => {
    if (!busca) return norcrestUnits
    const q = busca.toUpperCase()
    return norcrestUnits.filter((p) => p.toUpperCase().includes(q))
  }, [norcrestUnits, busca])

  const setDataIni = (v) => setFiltros({ ...filtros, dataIni: v || null })
  const setDataFim = (v) => setFiltros({ ...filtros, dataFim: v || null })

  const aplicarAno = (ano) => {
    setFiltros({ ...filtros, dataIni: `${ano}-01-01`, dataFim: `${ano}-12-31` })
  }
  const limparPeriodo = () =>
    setFiltros({ ...filtros, dataIni: null, dataFim: null })

  const anoAtivoPreset = useMemo(() => {
    if (!filtros.dataIni || !filtros.dataFim) return null
    const m1 = filtros.dataIni.match(/^(\d{4})-01-01$/)
    const m2 = filtros.dataFim.match(/^(\d{4})-12-31$/)
    if (m1 && m2 && m1[1] === m2[1]) return parseInt(m1[1], 10)
    return null
  }, [filtros.dataIni, filtros.dataFim])

  const esteMesAtivo =
    filtros.dataIni === PRESETS.esteMes.ini && filtros.dataFim === PRESETS.esteMes.fim
  const trimAtualAtivo =
    filtros.dataIni === PRESETS.trimAtual.ini && filtros.dataFim === PRESETS.trimAtual.fim

  function togglePerm(p) {
    if (p === 'TODAS') {
      setFiltros({ ...filtros, permissionarias: new Set() })
      return
    }
    setFiltros({ ...filtros, permissionarias: toggleInSet(permSet, p) })
  }

  function toggleSub(s) {
    if (s === 'TODAS') {
      setFiltros({ ...filtros, subprefeituras: new Set() })
      return
    }
    setFiltros({ ...filtros, subprefeituras: toggleInSet(subSet, s) })
  }

  const isTodasPerm = permSet.size === 0
  const isTodasSub = subSet.size === 0
  const periodoCount = filtros.dataIni || filtros.dataFim ? 1 : 0
  const ncCount = filtros.temNc !== null ? 1 : 0
  const filtrosAtivos = periodoCount > 0 || permSet.size > 0 || subSet.size > 0 || ncCount > 0
  const totalAtivos = periodoCount + permSet.size + subSet.size + ncCount

  // Chips de filtros ativos
  const chips = useMemo(() => {
    const result = []
    if (filtros.dataIni || filtros.dataFim) {
      result.push({
        id: 'periodo',
        label: labelPeriodo(filtros.dataIni, filtros.dataFim),
        onRemover: () => setFiltros({ ...filtros, dataIni: null, dataFim: null }),
      })
    }
    if (filtros.temNc === true)
      result.push({ id: 'nc', label: 'Só NC', onRemover: () => setFiltros({ ...filtros, temNc: null }) })
    else if (filtros.temNc === false)
      result.push({ id: 'nc', label: 'Sem NC', onRemover: () => setFiltros({ ...filtros, temNc: null }) })
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
    return result
  }, [filtros, permSet, subSet])

  const [aberto, setAberto] = useState(false)

  // ── Recolhida ────────────────────────────────────────────────────
  if (!aberto) {
    return (
      <aside
        data-tour="sidebar-filtros"
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

  // ── Expandida ────────────────────────────────────────────────────
  return (
    <aside data-tour="sidebar-filtros" className="w-60 shrink-0 bg-white border-r border-grey-line flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-3 py-3 border-b-2 border-navy shrink-0">
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

      {/* Data da vistoria */}
      <Bloco titulo="Data da Vistoria" count={periodoCount}>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase">
              De
            </label>
            <input
              type="date"
              value={filtros.dataIni || ''}
              onChange={(e) => setDataIni(e.target.value)}
              className="w-full text-xs border border-grey-line rounded-sm px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-navy"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-semibold uppercase">
              Até
            </label>
            <input
              type="date"
              value={filtros.dataFim || ''}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full text-xs border border-grey-line rounded-sm px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-navy"
            />
          </div>
          {/* Presets de período */}
          <div className="flex flex-wrap gap-1 pt-1">
            <button
              type="button"
              onClick={limparPeriodo}
              className={`text-[10px] px-2 py-0.5 rounded border ${
                !filtros.dataIni && !filtros.dataFim
                  ? 'bg-navy text-white border-navy'
                  : 'border-grey-line text-navy hover:bg-grey-bg'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFiltros({ ...filtros, dataIni: PRESETS.esteMes.ini, dataFim: PRESETS.esteMes.fim })}
              className={`text-[10px] px-2 py-0.5 rounded border ${
                esteMesAtivo
                  ? 'bg-navy text-white border-navy'
                  : 'border-grey-line text-navy hover:bg-grey-bg'
              }`}
            >
              Este mês
            </button>
            <button
              type="button"
              onClick={() => setFiltros({ ...filtros, dataIni: PRESETS.trimAtual.ini, dataFim: PRESETS.trimAtual.fim })}
              className={`text-[10px] px-2 py-0.5 rounded border ${
                trimAtualAtivo
                  ? 'bg-navy text-white border-navy'
                  : 'border-grey-line text-navy hover:bg-grey-bg'
              }`}
            >
              Tri. atual
            </button>
            {anos.map((ano) => (
              <button
                key={ano}
                type="button"
                onClick={() => aplicarAno(ano)}
                className={`text-[10px] px-2 py-0.5 rounded border ${
                  anoAtivoPreset === ano
                    ? 'bg-navy text-white border-navy'
                    : 'border-grey-line text-navy hover:bg-grey-bg'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </div>
      </Bloco>

      {/* Não-Conformidade */}
      <Bloco titulo="Conformidade" count={ncCount} dataTour="filtro-nc">
        <div className="flex gap-1 flex-wrap">
          {[
            { v: null, label: 'Todas' },
            { v: true, label: 'Só NC' },
            { v: false, label: 'Sem NC' },
          ].map(({ v, label }) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setFiltros({ ...filtros, temNc: v })}
              className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${
                filtros.temNc === v
                  ? 'bg-navy text-white border-navy'
                  : 'border-grey-line text-navy hover:bg-grey-bg'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Bloco>

      {/* Permissionaria */}
      <Bloco titulo="Permissionária" count={permSet.size}>
        <input
          type="text"
          placeholder="Buscar..."
          aria-label="Buscar permissionária"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full text-xs border border-grey-line rounded-sm px-2 py-1 mb-2 focus:outline-hidden focus:ring-1 focus:ring-navy"
        />
        <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
            <input
              type="checkbox"
              checked={isTodasPerm}
              onChange={() => togglePerm('TODAS')}
              className="accent-navy"
            />
            <span className="font-semibold">TODAS</span>
          </label>
          {/* NORCREST (consolidado) com botão expansível */}
          {norcrestUnits.length > 0 && (
            <div className="flex items-center gap-1 text-xs hover:bg-grey-bg px-1 py-0.5 rounded-sm">
              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={permSet.has('NORCREST')}
                  onChange={() => togglePerm('NORCREST')}
                  className="accent-navy"
                />
                <span className="font-semibold truncate">
                  NORCREST (consolidado)
                </span>
              </label>
              <button
                type="button"
                onClick={() => setNorcrestAberto((o) => !o)}
                title={norcrestAberto ? 'Recolher' : 'Expandir bases'}
                className="w-5 h-5 flex items-center justify-center rounded-sm border border-navy/30 text-navy text-xs font-bold hover:bg-navy hover:text-white transition-colors shrink-0"
              >
                {norcrestAberto || busca ? '−' : '+'}
              </button>
            </div>
          )}
          {/* Sub-itens NORCREST */}
          {(norcrestAberto || busca) &&
            norcrestFiltradas.map((p) => (
              <div key={p} className="pl-4 border-l-2 border-navy/20 ml-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
                  <input
                    type="checkbox"
                    checked={permSet.has(p)}
                    onChange={() => togglePerm(p)}
                    className="accent-navy"
                  />
                  <span className="truncate">{p}</span>
                </label>
              </div>
            ))}
          {norcrestUnits.length > 0 && <div className="h-px bg-grey-line my-1" />}
          {/* Demais permissionárias */}
          {permissionariasFiltradas.map((p) => (
            <label
              key={p}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm"
            >
              <input
                type="checkbox"
                checked={permSet.has(p)}
                onChange={() => togglePerm(p)}
                className="accent-navy"
              />
              <span>{p}</span>
            </label>
          ))}
        </div>
      </Bloco>

      {/* Subprefeitura */}
      <Bloco titulo="Subprefeitura" count={subSet.size}>
        <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm">
            <input
              type="checkbox"
              checked={isTodasSub}
              onChange={() => toggleSub('TODAS')}
              className="accent-navy"
            />
            <span className="font-semibold">TODAS</span>
          </label>
          {subprefeituras.map((s) => {
            const nome = subprefeiturasMapa?.get(s)
            return (
              <label
                key={s}
                title={nome || s}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-grey-bg px-1 py-0.5 rounded-sm"
              >
                <input
                  type="checkbox"
                  checked={subSet.has(s)}
                  onChange={() => toggleSub(s)}
                  className="accent-navy"
                />
                <span>{s}</span>
              </label>
            )
          })}
        </div>
      </Bloco>

      </div>{/* fim seções com scroll */}

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

function Bloco({ titulo, count = 0, children, defaultOpen = false, dataTour }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div data-tour={dataTour}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
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
        <span className="text-[8px]" aria-hidden="true">{open ? '▼' : '▶'}</span>
      </button>
      {open && children}
    </div>
  )
}
