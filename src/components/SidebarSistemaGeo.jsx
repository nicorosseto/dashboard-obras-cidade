import { useMemo, useState } from 'react'
import { listaAnosGeo, consolidarNorcrest } from '../lib/aggregations.js'
import ChipsFiltros, { labelPeriodo, presetsHoje } from './ChipsFiltros.jsx'

const PRESETS = presetsHoje()

function toggleInSet(set, value) {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function uniqSorted(rows, getter) {
  const set = new Set()
  for (const r of rows) {
    const v = getter(r)
    if (v) set.add(v)
  }
  return Array.from(set).sort((a, b) =>
    String(a).localeCompare(String(b), 'pt')
  )
}

export default function SidebarSistemaGeo({
  rows,
  filtros,
  setFiltros,
  onLimpar,
}) {
  const [busca, setBusca] = useState('')
  const [norcrestAberto, setNorcrestAberto] = useState(false)
  // Grupos de status expandidos (mostrando os status individuais)
  const [statusAbertos, setStatusAbertos] = useState(() => new Set())

  const anos = useMemo(() => listaAnosGeo(rows), [rows])
  // Permissionárias separadas: NORCREST/* vão pra dentro da "pasta"; demais ficam normais
  const { norcrestUnits, outrasPermissionarias } = useMemo(() => {
    const norcrestSet = new Set()
    const outrasSet = new Set()
    for (const r of rows) {
      if (!r.permissionaria) continue
      if (consolidarNorcrest(r.permissionaria) === 'NORCREST')
        norcrestSet.add(r.permissionaria)
      else outrasSet.add(r.permissionaria)
    }
    return {
      norcrestUnits: Array.from(norcrestSet).sort((a, b) =>
        String(a).localeCompare(String(b), 'pt')
      ),
      outrasPermissionarias: Array.from(outrasSet).sort((a, b) =>
        String(a).localeCompare(String(b), 'pt')
      ),
    }
  }, [rows])
  const permissionarias = outrasPermissionarias // mantido para compatibilidade com busca
  const subprefeituras = useMemo(
    () => uniqSorted(rows, (r) => r.subprefeitura),
    [rows]
  )
  const tiposProcesso = useMemo(
    () => uniqSorted(rows, (r) => r.tipo_processo_nome || r.tipo_processo),
    [rows]
  )
  const etapas = useMemo(() => uniqSorted(rows, (r) => r.etapa_nome), [rows])
  // Status agrupado: cada grupo unificado e os status individuais que o compõem.
  const statusPorGrupo = useMemo(() => {
    const map = new Map() // grupo -> Set de status individuais (status_nome)
    for (const r of rows) {
      const grupo = r.status_unificado || r.status_nome || '(sem status)'
      const ind = r.status_nome || r.status || grupo
      if (!map.has(grupo)) map.set(grupo, new Set())
      map.get(grupo).add(ind)
    }
    return Array.from(map.entries())
      .map(([grupo, set]) => ({
        grupo,
        individuais: Array.from(set).sort((a, b) =>
          String(a).localeCompare(String(b), 'pt')
        ),
      }))
      .sort((a, b) => String(a.grupo).localeCompare(String(b.grupo), 'pt'))
  }, [rows])
  const tiposObra = useMemo(
    () => uniqSorted(rows, (r) => r.tipo_obra_nome || r.tipo_obra),
    [rows]
  )

  const permSet =
    filtros.permissionarias instanceof Set ? filtros.permissionarias : new Set()
  const subSet =
    filtros.subprefeituras instanceof Set ? filtros.subprefeituras : new Set()
  const tpSet =
    filtros.tiposProcesso instanceof Set ? filtros.tiposProcesso : new Set()
  const etSet = filtros.etapas instanceof Set ? filtros.etapas : new Set()
  const stSet =
    filtros.statusUnificados instanceof Set
      ? filtros.statusUnificados
      : new Set()
  const toSet = filtros.tiposObra instanceof Set ? filtros.tiposObra : new Set()

  const permFiltradas = useMemo(() => {
    if (!busca) return permissionarias
    const q = busca.toUpperCase()
    return permissionarias.filter((p) => p.toUpperCase().includes(q))
  }, [permissionarias, busca])

  const setDataIni = (v) => setFiltros({ ...filtros, dataIni: v || null })
  const setDataFim = (v) => setFiltros({ ...filtros, dataFim: v || null })
  const aplicarAno = (ano) =>
    setFiltros({ ...filtros, dataIni: `${ano}-01-01`, dataFim: `${ano}-12-31` })
  const limparPeriodo = () =>
    setFiltros({ ...filtros, dataIni: null, dataFim: null })

  const anoAtivoPreset = useMemo(() => {
    if (!filtros.dataIni || !filtros.dataFim) return null
    const m1 = filtros.dataIni.match(/^(\d{4})-01-01$/)
    const m2 = filtros.dataFim.match(/^(\d{4})-12-31$/)
    if (m1 && m2 && m1[1] === m2[1]) return m1[1]
    return null
  }, [filtros.dataIni, filtros.dataFim])

  const esteMesAtivo =
    filtros.dataIni === PRESETS.esteMes.ini && filtros.dataFim === PRESETS.esteMes.fim
  const trimAtualAtivo =
    filtros.dataIni === PRESETS.trimAtual.ini && filtros.dataFim === PRESETS.trimAtual.fim

  function toggleField(field, set, value) {
    if (value === 'TODAS' || value === 'TODOS') {
      setFiltros({ ...filtros, [field]: new Set() })
      return
    }
    setFiltros({ ...filtros, [field]: toggleInSet(set, value) })
  }

  // Grupos com alguma seleção (o próprio grupo ou qualquer sub-status dele)
  const gruposComSelecao = statusPorGrupo
    .filter(
      ({ grupo, individuais }) =>
        stSet.has(grupo) || individuais.some((i) => stSet.has(i))
    )
    .map((g) => g.grupo)
  // Grupos com seleção parcial (sub-status marcados sem o grupo inteiro)
  const gruposParciais = statusPorGrupo
    .filter(
      ({ grupo, individuais }) =>
        !stSet.has(grupo) && individuais.some((i) => stSet.has(i))
    )
    .map((g) => g.grupo)

  const DICA_SUBSTATUS_BLOQUEADO =
    'Sub-status de grupos diferentes não podem ser misturados. ' +
    'Desmarque o(s) outro(s) grupo(s) para editar aqui.'
  const DICA_GRUPO_BLOQUEADO =
    'Há sub-status marcados em outro grupo. ' +
    'Desmarque-os para poder selecionar este grupo.'

  // Marcar um grupo seleciona também todos os seus sub-status; desmarcar limpa tudo.
  function toggleGrupoStatus(grupo, individuais) {
    const next = new Set(stSet)
    if (next.has(grupo)) {
      next.delete(grupo)
      individuais.forEach((i) => next.delete(i))
    } else {
      next.add(grupo)
      individuais.forEach((i) => next.add(i))
    }
    setFiltros({ ...filtros, statusUnificados: next })
  }

  // Sub-status individual: só editável com no máximo 1 grupo selecionado.
  // Desmarcar o último sub-status de um grupo desmarca o grupo junto.
  function toggleStatusIndividual(grupo, individuais, ind) {
    const next = new Set(stSet)
    if (next.has(ind)) {
      next.delete(ind)
      if (!individuais.some((i) => next.has(i))) next.delete(grupo)
    } else {
      next.add(ind)
      if (individuais.every((i) => next.has(i))) next.add(grupo)
    }
    setFiltros({ ...filtros, statusUnificados: next })
  }

  const periodoCount = filtros.dataIni || filtros.dataFim ? 1 : 0
  const statusCount = gruposComSelecao.length
  const totalAtivos =
    periodoCount + permSet.size + subSet.size + tpSet.size + etSet.size + statusCount + toSet.size
  const filtrosAtivos = totalAtivos > 0

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
    if (statusCount === 1) {
      result.push({ id: `st:${gruposComSelecao[0]}`, label: gruposComSelecao[0], onRemover: () => setFiltros({ ...filtros, statusUnificados: new Set() }) })
    } else if (statusCount > 1) {
      result.push({ id: 'st:multi', label: `${statusCount} status`, onRemover: () => setFiltros({ ...filtros, statusUnificados: new Set() }) })
    }
    if (tpSet.size === 1) {
      const v = Array.from(tpSet)[0]
      result.push({ id: `tp:${v}`, label: v, onRemover: () => setFiltros({ ...filtros, tiposProcesso: new Set() }) })
    } else if (tpSet.size > 1) {
      result.push({ id: 'tp:multi', label: `${tpSet.size} tipos proc.`, onRemover: () => setFiltros({ ...filtros, tiposProcesso: new Set() }) })
    }
    if (etSet.size === 1) {
      const v = Array.from(etSet)[0]
      result.push({ id: `et:${v}`, label: v, onRemover: () => setFiltros({ ...filtros, etapas: new Set() }) })
    } else if (etSet.size > 1) {
      result.push({ id: 'et:multi', label: `${etSet.size} etapas`, onRemover: () => setFiltros({ ...filtros, etapas: new Set() }) })
    }
    if (toSet.size === 1) {
      const v = Array.from(toSet)[0]
      result.push({ id: `to:${v}`, label: v, onRemover: () => setFiltros({ ...filtros, tiposObra: new Set() }) })
    } else if (toSet.size > 1) {
      result.push({ id: 'to:multi', label: `${toSet.size} tipos obra`, onRemover: () => setFiltros({ ...filtros, tiposObra: new Set() }) })
    }
    return result
  }, [filtros, permSet, subSet, statusCount, gruposComSelecao, tpSet, etSet, toSet])

  const [aberto, setAberto] = useState(false)

  // ── Recolhida ────────────────────────────────────────────────────
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

  // ── Expandida ────────────────────────────────────────────────────
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-grey-line flex flex-col h-full">
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

      {/* Data Cadastro */}
      <Bloco titulo="Período" count={periodoCount}>
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

      {/* Permissionária - searchable + NORCREST consolidado + sub-itens */}
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
          <Check
            label="TODAS"
            checked={permSet.size === 0}
            onChange={() => toggleField('permissionarias', permSet, 'TODAS')}
            bold
          />
          {/* NORCREST (consolidado) com botão expandir */}
          <CheckExpansivel
            label="NORCREST (consolidado)"
            checked={permSet.has('NORCREST')}
            onChange={() => toggleField('permissionarias', permSet, 'NORCREST')}
            aberto={norcrestAberto || !!busca}
            onToggle={() => setNorcrestAberto((o) => !o)}
            mostraBotao={norcrestUnits.length > 0}
          />
          {/* Sub-itens NORCREST indentados — só visíveis se aberto ou busca ativa */}
          {(norcrestAberto || busca) &&
            norcrestUnits
              .filter(
                (p) => !busca || p.toUpperCase().includes(busca.toUpperCase())
              )
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
          {/* Demais permissionárias */}
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

      {/* Etapa */}
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

      {/* Status — grupo unificado com "+" para ver os status individuais */}
      <Bloco titulo="Status" count={statusCount}>
        <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
          <Check
            label="TODOS"
            checked={stSet.size === 0}
            onChange={() => toggleField('statusUnificados', stSet, 'TODOS')}
            bold
          />
          {statusPorGrupo.map(({ grupo, individuais }) => {
            // Outro grupo tem seleção → sub-status deste ficam travados.
            const outroComSelecao = gruposComSelecao.some((g) => g !== grupo)
            // Outro grupo tem seleção parcial → este grupo não pode ser marcado.
            const outroParcial = gruposParciais.some((g) => g !== grupo)
            return (
              <div key={grupo}>
                <CheckExpansivel
                  label={grupo}
                  checked={stSet.has(grupo)}
                  onChange={() => toggleGrupoStatus(grupo, individuais)}
                  aberto={statusAbertos.has(grupo)}
                  onToggle={() =>
                    setStatusAbertos((s) => toggleInSet(s, grupo))
                  }
                  mostraBotao={individuais.length > 1}
                  disabled={outroParcial}
                  dicaDesabilitado={DICA_GRUPO_BLOQUEADO}
                />
                {statusAbertos.has(grupo) &&
                  individuais.map((ind) => (
                    <div
                      key={ind}
                      className="pl-4 border-l-2 border-navy/20 ml-2"
                    >
                      <Check
                        label={ind}
                        checked={stSet.has(ind)}
                        disabled={outroComSelecao}
                        dicaDesabilitado={DICA_SUBSTATUS_BLOQUEADO}
                        onChange={() =>
                          toggleStatusIndividual(grupo, individuais, ind)
                        }
                      />
                    </div>
                  ))}
              </div>
            )
          })}
        </div>
      </Bloco>

      {/* Tipo de Obra */}
      <Bloco titulo="Tipo de Obra" count={toSet.size}>
        <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
          <Check
            label="TODOS"
            checked={toSet.size === 0}
            onChange={() => toggleField('tiposObra', toSet, 'TODOS')}
            bold
          />
          {tiposObra.map((t) => (
            <Check
              key={t}
              label={t}
              checked={toSet.has(t)}
              onChange={() => toggleField('tiposObra', toSet, t)}
            />
          ))}
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

function Check({ label, checked, onChange, bold, disabled, dicaDesabilitado }) {
  // O title fica no <label> inteiro: o balão aparece sobre a caixinha E o nome.
  return (
    <label
      className={`flex items-center gap-2 text-xs px-1 py-0.5 rounded ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:bg-grey-bg'
      }`}
      title={disabled ? dicaDesabilitado : undefined}
    >
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        disabled={!!disabled}
        className="accent-navy"
      />
      <span className={`${bold ? 'font-semibold' : ''} truncate`}>{label}</span>
    </label>
  )
}

// Checkbox com botão "+/−" para expandir/colapsar sub-itens
function CheckExpansivel({
  label,
  checked,
  onChange,
  aberto,
  onToggle,
  mostraBotao = true,
  disabled,
  dicaDesabilitado,
}) {
  return (
    <div
      className={`flex items-center gap-1 text-xs px-1 py-0.5 rounded ${
        disabled ? 'opacity-50' : 'hover:bg-grey-bg'
      }`}
    >
      <label
        className={`flex items-center gap-2 flex-1 min-w-0 ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
        title={disabled ? dicaDesabilitado : undefined}
      >
        <input
          type="checkbox"
          checked={!!checked}
          onChange={onChange}
          disabled={!!disabled}
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
