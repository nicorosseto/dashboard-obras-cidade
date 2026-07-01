import { useMemo, useState } from 'react'
import BotaoExportarGrafico from '../BotaoExportarGrafico.jsx'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { consolidarNorcrest, fmtNumero } from '../../lib/aggregations.js'
import ChartTooltip from '../charts/ChartTooltip.jsx'
import ThSort from '../ThSort.jsx'

const SEM_EXECUTORA = '(sem executora — obra não cadastrada no Sistema Geo)'
const PAGE_SIZE = 50

const METRICAS = [
  { key: 'total', label: 'Laudos' },
  { key: 'nc', label: 'NC' },
  { key: 'pctNC', label: '% NC' },
  { key: 'solucionado', label: 'Solucionado' },
  { key: 'emAndamento', label: 'Em andamento' },
  { key: 'legAtendida', label: 'Leg. Atendida' },
]

// Cor de destaque por métrica
const METRICA_COLOR = {
  total: '#1F3864',
  nc: '#C00000',
  pctNC: '#C00000',
  solucionado: '#16a34a',
  emAndamento: '#d97706',
  legAtendida: '#2563eb',
}

function isNorcrestRow(r) {
  if (r.grupo_norcrest === 'NORCREST') return true
  return String(r.permissionaria || '').toUpperCase().startsWith('NORCREST')
}

function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 100) : 0
}

function valorMetrica(row, key) {
  if (key === 'pctNC') return pct(row.nc, row.total)
  return row[key] ?? 0
}

function agruparPorPermissionaria(rows) {
  const map = new Map()
  for (const r of rows) {
    const k = consolidarNorcrest(r.permissionaria) || '(sem)'
    if (!map.has(k)) {
      map.set(k, { nome: k, total: 0, nc: 0, comExecutora: 0, solucionado: 0, emAndamento: 0, legAtendida: 0 })
    }
    const o = map.get(k)
    o.total++
    if (r.tem_nao_conformidade) o.nc++
    if (r.executora) o.comExecutora++
    if (r.solucionado) o.solucionado++
    else if (r.em_andamento) o.emAndamento++
    else if (r.legislacao_atendida) o.legAtendida++
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

function agruparPorExecutora(rows, permSel) {
  const base = rows.filter((r) => {
    if (permSel === 'NORCREST') return isNorcrestRow(r)
    return (consolidarNorcrest(r.permissionaria) || '(sem)') === permSel
  })

  const map = new Map()
  for (const r of base) {
    const k = r.executora || SEM_EXECUTORA
    if (!map.has(k)) {
      map.set(k, {
        nome: k,
        permissionaria: permSel,
        total: 0,
        nc: 0,
        solucionado: 0,
        emAndamento: 0,
        legAtendida: 0,
        semStatus: 0,
      })
    }
    const o = map.get(k)
    o.total++
    if (r.tem_nao_conformidade) o.nc++
    if (r.solucionado) o.solucionado++
    else if (r.em_andamento) o.emAndamento++
    else if (r.legislacao_atendida) o.legAtendida++
    else o.semStatus++
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.nome === SEM_EXECUTORA) return 1
    if (b.nome === SEM_EXECUTORA) return -1
    return b.total - a.total
  })
}

function BadgePct({ valor, alto = false }) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ${
        alto ? 'bg-red/10 text-red' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {valor}%
    </span>
  )
}

// Tooltip customizado que mostra a permissionária quando estamos no gráfico de executoras
function TooltipExecutoras({ active, payload, label, permissionaria, metricaLabel, isPct }) {
  if (!active || !payload?.length) return null
  const valor = payload[0]?.value ?? 0
  return (
    <div className="bg-white border border-grey-line rounded shadow-card p-2 text-xs min-w-[160px] max-w-[260px]">
      <div className="font-semibold text-navy mb-1 truncate">{label}</div>
      {permissionaria && (
        <div className="text-slate-400 text-[10px] mb-1 truncate">
          Permissionária: {permissionaria}
        </div>
      )}
      <div className="text-gray-600 font-medium">
        {metricaLabel}: {isPct ? `${valor}%` : fmtNumero(valor)}
      </div>
    </div>
  )
}

// Gráfico de barras horizontais — top N por métrica
function GraficoTopExecutoras({ dados, metrica, permissionaria }) {
  const m = METRICAS.find((m) => m.key === metrica) || METRICAS[0]
  const cor = METRICA_COLOR[metrica] || '#1F3864'
  const isPct = metrica === 'pctNC'

  // Top 10 (excluindo "sem executora"), ordenado pela métrica desc
  const top = useMemo(() => {
    return [...dados]
      .filter((r) => r.nome !== SEM_EXECUTORA)
      .sort((a, b) => valorMetrica(b, metrica) - valorMetrica(a, metrica))
      .slice(0, 10)
      .map((r) => ({ ...r, valor: valorMetrica(r, metrica) }))
  }, [dados, metrica])

  if (top.length === 0) return null

  const nomeAbreviado = (nome, max = 28) =>
    nome.length > max ? nome.slice(0, max) + '…' : nome

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, top.length * 36)}>
      <BarChart
        data={top}
        layout="vertical"
        margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickFormatter={(v) => (isPct ? `${v}%` : fmtNumero(v))}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="nome"
          width={180}
          tick={{ fontSize: 10, fill: '#334155' }}
          tickFormatter={(v) => nomeAbreviado(v)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={
            <TooltipExecutoras
              permissionaria={permissionaria}
              metricaLabel={m.label}
              isPct={isPct}
            />
          }
          wrapperStyle={{ zIndex: 50 }}
          cursor={{ fill: '#f1f5f9' }}
        />
        <Bar dataKey="valor" radius={[0, 3, 3, 0]} maxBarSize={22}>
          {top.map((entry, i) => (
            <Cell key={i} fill={cor} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Gráfico de barras horizontais — NC por permissionária (top 15)
function GraficoNCPermissionarias({ dados, onClickPerm }) {
  const top = useMemo(() => {
    return [...dados]
      .sort((a, b) => b.nc - a.nc)
      .slice(0, 15)
      .map((r) => ({ ...r, valor: r.nc }))
  }, [dados])

  if (top.length === 0) return null

  const nomeAbreviado = (nome, max = 24) =>
    nome.length > max ? nome.slice(0, max) + '…' : nome

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, top.length * 36)}>
      <BarChart
        data={top}
        layout="vertical"
        margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
        onClick={(e) => {
          const nome = e?.activePayload?.[0]?.payload?.nome
          if (nome) onClickPerm(nome)
        }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickFormatter={(v) => fmtNumero(v)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="nome"
          width={160}
          tick={{ fontSize: 10, fill: '#334155' }}
          tickFormatter={(v) => nomeAbreviado(v)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<ChartTooltip unidade="NC" />}
          wrapperStyle={{ zIndex: 50 }}
          cursor={{ fill: '#fff0f0' }}
        />
        <Bar dataKey="valor" fill="#C00000" fillOpacity={0.8} radius={[0, 3, 3, 0]} maxBarSize={22} style={{ cursor: 'pointer' }} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function TabelaExecutoras({ rows }) {
  const [pagina, setPagina] = useState(0)
  const [sortKey, setSortKey] = useState('total')
  const [sortDir, setSortDir] = useState('desc')

  function handleSort(key) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPagina(0)
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    return [...rows].sort((a, b) => {
      if (a.nome === SEM_EXECUTORA) return 1
      if (b.nome === SEM_EXECUTORA) return -1
      const va = sortKey === 'pctNC' ? pct(a.nc, a.total) : (a[sortKey] ?? '')
      const vb = sortKey === 'pctNC' ? pct(b.nc, b.total) : (b[sortKey] ?? '')
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', {
              sensitivity: 'base',
            })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir])

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        Sem executoras para a seleção atual.
      </p>
    )
  }
  const totalPag = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pag = Math.min(pagina, totalPag - 1)
  const visiveis = sorted.slice(pag * PAGE_SIZE, (pag + 1) * PAGE_SIZE)

  const thProps = { sortKey, sortDir, onSort: handleSort }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <ThSort colKey="nome" label="Executora" {...thProps} className="text-left py-2 px-3 font-semibold text-navy" />
              <ThSort colKey="total" label="Laudos" {...thProps} className="text-right py-2 px-3 font-semibold text-navy whitespace-nowrap" />
              <ThSort colKey="nc" label="NC" {...thProps} className="text-right py-2 px-3 font-semibold text-navy whitespace-nowrap" />
              <ThSort colKey="pctNC" label="% NC" {...thProps} className="text-right py-2 px-3 font-semibold text-navy whitespace-nowrap" />
              <ThSort colKey="solucionado" label="Solucionado" {...thProps} className="text-right py-2 px-3 font-semibold text-navy whitespace-nowrap" />
              <ThSort colKey="emAndamento" label="Em andamento" {...thProps} className="text-right py-2 px-3 font-semibold text-navy whitespace-nowrap" />
              <ThSort colKey="legAtendida" label="Leg. Atendida" {...thProps} className="text-right py-2 px-3 font-semibold text-navy whitespace-nowrap" />
            </tr>
          </thead>
          <tbody>
            {visiveis.map((r, i) => {
              const pcNC = pct(r.nc, r.total)
              const semExecutora = r.nome === SEM_EXECUTORA
              return (
                <tr
                  key={i}
                  className={`border-b border-slate-100 hover:bg-slate-50 ${
                    semExecutora ? 'italic text-slate-400' : ''
                  }`}
                >
                  <td className="py-2 px-3 max-w-xs truncate" title={r.nome}>
                    {r.nome}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium">
                    {fmtNumero(r.total)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {fmtNumero(r.nc)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <BadgePct valor={pcNC} alto={pcNC >= 30} />
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-slate-600">
                    {fmtNumero(r.solucionado)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-slate-600">
                    {fmtNumero(r.emAndamento)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-slate-600">
                    {fmtNumero(r.legAtendida)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {totalPag > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <span>
            {fmtNumero(pag * PAGE_SIZE + 1)}–
            {fmtNumero(Math.min((pag + 1) * PAGE_SIZE, sorted.length))} de{' '}
            {fmtNumero(sorted.length)}
          </span>
          <div className="flex gap-1">
            <button
              disabled={pag === 0}
              onClick={() => setPagina(pag - 1)}
              className="px-2 py-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
            >
              ‹
            </button>
            <button
              disabled={pag >= totalPag - 1}
              onClick={() => setPagina(pag + 1)}
              className="px-2 py-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Seletor de métrica — botões pill
function SeletorMetrica({ valor, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {METRICAS.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            valor === m.key
              ? 'border-navy bg-navy text-white'
              : 'border-slate-200 text-slate-600 hover:border-navy hover:text-navy bg-white'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

export default function PaginaFisc5Executoras({ rows }) {
  const [permSel, setPermSel] = useState(null)
  const [metrica, setMetrica] = useState('total')
  const [sortKeyPerm, setSortKeyPerm] = useState('total')
  const [sortDirPerm, setSortDirPerm] = useState('desc')

  function handleSortPerm(key) {
    if (key === sortKeyPerm) setSortDirPerm((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKeyPerm(key)
      setSortDirPerm('asc')
    }
  }

  const permissionarias = useMemo(() => agruparPorPermissionaria(rows), [rows])

  const permissionariasSorted = useMemo(() => {
    if (!sortKeyPerm) return permissionarias
    return [...permissionarias].sort((a, b) => {
      const va = sortKeyPerm === 'pctNC' ? pct(a.nc, a.total) : (a[sortKeyPerm] ?? '')
      const vb = sortKeyPerm === 'pctNC' ? pct(b.nc, b.total) : (b[sortKeyPerm] ?? '')
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', { sensitivity: 'base' })
      return sortDirPerm === 'asc' ? cmp : -cmp
    })
  }, [permissionarias, sortKeyPerm, sortDirPerm])

  const executoras = useMemo(() => {
    if (!permSel) return []
    return agruparPorExecutora(rows, permSel)
  }, [rows, permSel])

  const totalComExecutora = useMemo(() => rows.filter((r) => r.executora).length, [rows])
  const totalSemExecutora = rows.length - totalComExecutora
  const executorasUnicas = useMemo(() => {
    const s = new Set(rows.map((r) => r.executora).filter(Boolean))
    return s.size
  }, [rows])

  const thPropsPerm = { sortKey: sortKeyPerm, sortDir: sortDirPerm, onSort: handleSortPerm }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">
            Laudos com executora (Sistema Geo)
          </p>
          <p className="text-2xl font-bold text-navy tabular-nums mt-1">
            {fmtNumero(totalComExecutora)}
          </p>
          <p className="text-[11px] text-gray-400">
            {pct(totalComExecutora, rows.length)}% do total
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">
            Sem executora (não no Sistema Geo)
          </p>
          <p className="text-2xl font-bold text-slate-400 tabular-nums mt-1">
            {fmtNumero(totalSemExecutora)}
          </p>
          <p className="text-[11px] text-gray-400">
            {pct(totalSemExecutora, rows.length)}% do total
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">
            Executoras únicas
          </p>
          <p className="text-2xl font-bold text-navy tabular-nums mt-1">
            {fmtNumero(executorasUnicas)}
          </p>
          <p className="text-[11px] text-gray-400">empresas distintas no Sistema Geo</p>
        </div>
      </div>

      {permSel ? (
        /* ── Detalhe: executoras de uma permissionária ── */
        <div className="space-y-4">
          {/* Cabeçalho + voltar */}
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={() => setPermSel(null)}
                className="flex items-center gap-1 text-xs text-navy hover:underline"
              >
                ← Voltar
              </button>
              <h3 className="font-semibold text-slate-800">
                Executoras de <span className="text-navy">{permSel}</span>
              </h3>
            </div>
            <p className="text-xs text-gray-500">
              Linha em itálico: obras sem registro no Sistema Geo (executora desconhecida). Badge em vermelho quando % NC ≥ 30%.
            </p>
          </div>

          {/* Gráfico top executoras com seletor de métrica */}
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h4 className="text-sm font-semibold text-navy">
                Top 10 executoras
              </h4>
              <SeletorMetrica valor={metrica} onChange={setMetrica} />
            </div>
            <GraficoTopExecutoras
              dados={executoras}
              metrica={metrica}
              permissionaria={permSel}
            />
          </div>

          {/* Tabela completa */}
          <div className="bg-white rounded-lg shadow p-5">
            <h4 className="text-sm font-semibold text-navy mb-3">
              Ranking completo
            </h4>
            <TabelaExecutoras rows={executoras} />
          </div>
        </div>
      ) : (
        /* ── Visão geral: gráfico NC por permissionária + tabela ── */
        <div className="space-y-4">
          {/* Gráfico NC por permissionária com instrução de drill-down */}
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-4">
              <div>
                <h4 className="text-sm font-semibold text-navy">
                  NC por permissionária — top 15
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Clique em uma barra para ver as executoras dessa permissionária
                </p>
              </div>
              <BotaoExportarGrafico
                dados={permissionarias.slice(0, 15).map((r) => ({ nome: r.nome, nc: r.nc, total: r.total }))}
                colunas={[
                  { key: 'nome', label: 'Permissionária' },
                  { key: 'nc', label: 'NC' },
                  { key: 'total', label: 'Total Laudos' },
                ]}
                titulo="NC por Permissionária (Top 15) — Fiscalização"
                modulo="fiscalizacao"
              />
            </div>
            <GraficoNCPermissionarias
              dados={permissionarias}
              onClickPerm={setPermSel}
            />
          </div>

          {/* Tabela de permissionárias */}
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-800">
                Permissionárias
              </h3>
              <BotaoExportarGrafico
                dados={permissionariasSorted}
                colunas={[
                  { key: 'nome', label: 'Permissionária' },
                  { key: 'total', label: 'Total Laudos' },
                  { key: 'comExecutora', label: 'Com Executora' },
                  { key: 'nc', label: 'NC' },
                  { key: 'solucionado', label: 'Solucionado' },
                  { key: 'emAndamento', label: 'Em Andamento' },
                  { key: 'legAtendida', label: 'Leg. Atendida' },
                ]}
                titulo="Permissionárias — Fiscalização"
                modulo="fiscalizacao"
              />
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Clique em uma linha para ver as executoras e a conformidade de cada uma.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <ThSort colKey="nome" label="Permissionária" {...thPropsPerm} className="text-left py-2 px-3 font-semibold text-navy" />
                    <ThSort colKey="total" label="Total laudos" {...thPropsPerm} className="text-right py-2 px-3 font-semibold text-navy whitespace-nowrap" />
                    <ThSort colKey="comExecutora" label="Com executora" {...thPropsPerm} className="text-right py-2 px-3 font-semibold text-navy whitespace-nowrap" />
                    <ThSort colKey="nc" label="NC" {...thPropsPerm} className="text-right py-2 px-3 font-semibold text-navy whitespace-nowrap" />
                    <ThSort colKey="pctNC" label="% NC" {...thPropsPerm} className="text-right py-2 px-3 font-semibold text-navy whitespace-nowrap" />
                  </tr>
                </thead>
                <tbody>
                  {permissionariasSorted.map((p) => {
                    const pcNC = pct(p.nc, p.total)
                    return (
                      <tr
                        key={p.nome}
                        onClick={() => setPermSel(p.nome)}
                        className="border-b border-slate-100 hover:bg-navy/5 cursor-pointer"
                      >
                        <td className="py-2 px-3 font-medium text-navy hover:underline">
                          {p.nome}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {fmtNumero(p.total)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-500">
                          {fmtNumero(p.comExecutora)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {fmtNumero(p.nc)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <BadgePct valor={pcNC} alto={pcNC >= 30} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
