import { useMemo, useState, useEffect, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import { fmtNumero, fmtData, consolidarNorcrest } from '../../lib/aggregations.js'
import ChartTooltip from '../charts/ChartTooltip.jsx'
import { usePaginadorGrafico, ControlePaginacao } from '../charts/PaginadorGrafico.jsx'
import ThSort from '../ThSort.jsx'
import MapaSP from '../charts/MapaSP.jsx'
import { LoadingInline } from '../Loading.jsx'
import { CampoBusca } from './PaginaBuscaProcesso.jsx'

// ── Constantes de cor ─────────────────────────────────────────────────────────
const NAVY    = '#1F3864'
const RED     = '#C00000'
const VERDE   = '#16a34a'
const AMBER   = '#d97706'
const VIOLET  = '#7c3aed'
const SLATE   = '#64748b'
const TEAL    = '#0891b2'

const PAGE_SIZE = 50

// ── Helpers ───────────────────────────────────────────────────────────────────
function norm(s)    { return (s || '').trim().toLowerCase() }
function getPerm(p) { return consolidarNorcrest(p || '') || '(sem permissionária)' }

function fmtMes(yyyymm) {
  if (!yyyymm || yyyymm.length < 7) return yyyymm || ''
  const m = parseInt(yyyymm.slice(5, 7), 10) - 1
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[m]}/${yyyymm.slice(2, 4)}`
}

function diasEntre(dataA, dataB) {
  if (!dataA || !dataB) return null
  return Math.round((new Date(dataA) - new Date(dataB)) / 86400000)
}

function binPrazo(dias) {
  if (dias === null) return 'Sem data'
  if (dias < 0)   return '< 0 (retroativo)'
  if (dias < 30)  return '< 30 dias'
  if (dias < 90)  return '30–90 dias'
  if (dias < 180) return '90–180 dias'
  if (dias < 365) return '180–365 dias'
  return '> 365 dias'
}
const ORDEM_BINS = ['< 0 (retroativo)','< 30 dias','30–90 dias','90–180 dias','180–365 dias','> 365 dias','Sem data']

// ── Computação principal ───────────────────────────────────────────────────────
function computarCruzamento(rowsFisc, rowsGeo, consolidar = true) {
  const geoMap = new Map()
  for (const r of rowsGeo) {
    if (r.processo) geoMap.set(r.processo, r)
  }

  const fiscMap = new Map()
  for (const r of rowsFisc) {
    if (!r.id_origem) continue
    const entry = fiscMap.get(r.id_origem)
    if (!entry) {
      fiscMap.set(r.id_origem, {
        latest: r, earliest: r, nLaudos: 1,
        hasNc: !!r.tem_nao_conformidade,
      })
    } else {
      entry.nLaudos++
      entry.hasNc = entry.hasNc || !!r.tem_nao_conformidade
      const nova = r.data_inicio
      if (nova) {
        if (!entry.latest.data_inicio || nova > entry.latest.data_inicio) entry.latest = r
        if (!entry.earliest.data_inicio || nova < entry.earliest.data_inicio) entry.earliest = r
      }
    }
  }

  const soFisc = []
  const emComum = []
  for (const [id, { latest, earliest, nLaudos, hasNc }] of fiscMap) {
    const geo = geoMap.get(id)
    if (!geo) {
      soFisc.push({ ...latest, nLaudos, id_origem: id })
    } else {
      emComum.push({
        fisc: { ...latest, earliestDate: earliest.data_inicio, nLaudos, hasNc },
        geo,
      })
    }
  }

  const fiscSet = new Set(fiscMap.keys())
  const soGeo = []
  for (const [proc, geo] of geoMap) {
    if (!fiscSet.has(proc)) soGeo.push(geo)
  }

  const divSubpref = emComum.filter(({ fisc, geo }) =>
    norm(fisc.subprefeitura_origem ?? fisc.subprefeitura) !== norm(geo.subprefeitura)
  )

  const divStatus = emComum.filter(({ fisc, geo }) => {
    const gs = norm(geo.status_unificado || '')
    return (gs.includes('encerr') || gs.includes('cancel') || gs.includes('suspen')) &&
      fisc.status_simplificado === 'Em andamento'
  })

  // ── Cobertura por Permissionária ──────────────────────────────────────────
  const normPerm = (p) => consolidar ? getPerm(p) : (p || '(sem permissionária)')
  const permMap = new Map()
  const addPerm = (perm, field) => {
    if (!permMap.has(perm)) permMap.set(perm, { perm, emComum: 0, soFisc: 0, soGeo: 0 })
    permMap.get(perm)[field]++
  }
  for (const r of soFisc)        addPerm(normPerm(r.permissionaria),   'soFisc')
  for (const r of soGeo)         addPerm(normPerm(r.permissionaria),   'soGeo')
  for (const { geo } of emComum) addPerm(normPerm(geo.permissionaria), 'emComum')

  const porPermissionaria = Array.from(permMap.values()).map(p => {
    const totalGeo = p.emComum + p.soGeo
    return {
      ...p,
      totalFisc: p.emComum + p.soFisc,
      totalGeo,
      pctCob: totalGeo > 0 ? Math.round((p.emComum / totalGeo) * 100) : 0,
    }
  }).sort((a, b) => a.pctCob - b.pctCob)

  // ── Cobertura por Subprefeitura ──────────────────────────────────────────
  const subMap = new Map()
  const addSub = (sub, field) => {
    const k = sub || '(sem)'
    if (!subMap.has(k)) subMap.set(k, { sub: k, emComum: 0, soFisc: 0, soGeo: 0 })
    subMap.get(k)[field]++
  }
  for (const r of soFisc)        addSub(r.subprefeitura,       'soFisc')
  for (const r of soGeo)         addSub(r.subprefeitura,       'soGeo')
  for (const { geo } of emComum) addSub(geo.subprefeitura,     'emComum')

  const porSubpref = Array.from(subMap.values()).map(s => {
    const totalGeo = s.emComum + s.soGeo
    return { ...s, totalGeo, pctCob: totalGeo > 0 ? Math.round((s.emComum / totalGeo) * 100) : 0 }
  }).sort((a, b) => a.pctCob - b.pctCob)

  // ── Matriz status fisc × status geo (agrupado e individual) ───────────────
  const matrizMap = new Map()
  const matrizMapInd = new Map()
  const geoStatusCount = new Map()
  const geoStatusIndCount = new Map()
  for (const { fisc, geo } of emComum) {
    const sf  = fisc.status_simplificado || '(sem)'
    const sg  = geo.status_unificado     || '(sem)'
    const sgi = geo.status_nome          || geo.status || sg
    matrizMap.set(`${sf}||${sg}`,  (matrizMap.get(`${sf}||${sg}`)  || 0) + 1)
    matrizMapInd.set(`${sf}||${sgi}`, (matrizMapInd.get(`${sf}||${sgi}`) || 0) + 1)
    geoStatusCount.set(sg,  (geoStatusCount.get(sg)  || 0) + 1)
    geoStatusIndCount.set(sgi, (geoStatusIndCount.get(sgi) || 0) + 1)
  }
  const topGeoStatuses = Array.from(geoStatusCount.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s]) => s)
  const topGeoStatusesInd = Array.from(geoStatusIndCount.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s]) => s)
  const fiscStatuses = ['Solucionado', 'Em andamento', 'Legislacao Atendida']
  const matrizStatus = fiscStatuses.map(sf => {
    const row = { statusFisc: sf }
    for (const sg of topGeoStatuses) row[sg] = matrizMap.get(`${sf}||${sg}`) || 0
    return row
  })
  const matrizStatusInd = fiscStatuses.map(sf => {
    const row = { statusFisc: sf }
    for (const sgi of topGeoStatusesInd) row[sgi] = matrizMapInd.get(`${sf}||${sgi}`) || 0
    return row
  })

  // ── Linha do tempo ────────────────────────────────────────────────────────
  const prazosBins = {}
  for (const bin of ORDEM_BINS) prazosBins[bin] = 0
  for (const { fisc, geo } of emComum) {
    const dias = diasEntre(fisc.earliestDate, geo.data_cadastro)
    prazosBins[binPrazo(dias)]++
  }
  const prazosBinsArr = ORDEM_BINS.map(bin => ({ bin, count: prazosBins[bin] }))
    .filter(b => b.count > 0)

  const geoMesMap = new Map()
  for (const r of rowsGeo) {
    const m = (r.data_cadastro || '').slice(0, 7)
    if (m.length === 7) geoMesMap.set(m, (geoMesMap.get(m) || 0) + 1)
  }
  const fiscMesMap = new Map()
  for (const [, { latest }] of fiscMap) {
    const m = (latest.data_inicio || '').slice(0, 7)
    if (m.length === 7) fiscMesMap.set(m, (fiscMesMap.get(m) || 0) + 1)
  }
  const allMeses = new Set([...geoMesMap.keys(), ...fiscMesMap.keys()])
  const evolucaoMensal = Array.from(allMeses).sort().slice(-24).map(m => ({
    mes: m,
    sistemaGeo: geoMesMap.get(m) || 0,
    fisc: fiscMesMap.get(m) || 0,
  }))

  // ── Por Permissionária × Subprefeitura ──────────────────────────────────
  // totalGeo por perm+sub (do rowsGeo já passado como parâmetro)
  const geoPermSubCount = new Map()
  for (const r of rowsGeo) {
    const perm = normPerm(r.permissionaria)
    const sub  = r.subprefeitura || '(sem)'
    const k = `${perm}||${sub}`
    geoPermSubCount.set(k, (geoPermSubCount.get(k) || 0) + 1)
  }
  const permSubMap = new Map()
  for (const { fisc, geo } of emComum) {
    const perm = normPerm(geo.permissionaria)
    const sub  = geo.subprefeitura || '(sem)'
    const k = `${perm}||${sub}`
    if (!permSubMap.has(k)) permSubMap.set(k, { perm, sub, fisc: 0, laudos: 0, nc: 0 })
    const e = permSubMap.get(k)
    e.fisc++
    e.laudos += fisc.nLaudos
    if (fisc.hasNc) e.nc++
  }
  const porPermSub = Array.from(permSubMap.values()).map(e => {
    const totalGeo = geoPermSubCount.get(`${e.perm}||${e.sub}`) || e.fisc
    return {
      ...e,
      totalGeo,
      pctCob: totalGeo > 0 ? Math.round((e.fisc / totalGeo) * 100) : 0,
    }
  }).sort((a, b) => b.fisc - a.fisc)

  // ── Por Executora ────────────────────────────────────────────────────────
  const execMap = new Map()
  for (const { fisc, geo } of emComum) {
    const exec = geo.executora || '(sem executora)'
    const perm = normPerm(geo.permissionaria)
    if (!execMap.has(exec)) execMap.set(exec, { executora: exec, permissionaria: perm, processos: 0, laudos: 0, nc: 0 })
    const e = execMap.get(exec)
    e.processos++
    e.laudos += fisc.nLaudos
    if (fisc.hasNc) e.nc++
  }
  const porExecutora = Array.from(execMap.values())
    .map(e => ({ ...e, pctNc: e.processos > 0 ? Math.round((e.nc / e.processos) * 100) : 0 }))
    .sort((a, b) => b.nc - a.nc)

  return {
    totalFisc: fiscMap.size,
    totalGeo: geoMap.size,
    nComum: emComum.length,
    soFisc, soGeo, emComum, divSubpref, divStatus,
    porPermissionaria, porSubpref, porPermSub,
    matrizStatus, topGeoStatuses,
    matrizStatusInd, topGeoStatusesInd,
    prazosBinsArr, evolucaoMensal,
    porExecutora,
  }
}

// ── Filtragem ─────────────────────────────────────────────────────────────────
function filtrarParaCruzamento(rowsFisc, rowsGeo, filtros) {
  if (!filtros) return { fisc: rowsFisc, geo: rowsGeo }
  const permSet = filtros.permissionarias instanceof Set ? filtros.permissionarias : new Set()
  const subSet  = filtros.subprefeituras  instanceof Set ? filtros.subprefeituras  : new Set()
  const sfSet   = filtros.statusFisc      instanceof Set ? filtros.statusFisc      : new Set()
  const sgSet   = filtros.statusGeo       instanceof Set ? filtros.statusGeo       : new Set()
  const etSet   = filtros.etapas          instanceof Set ? filtros.etapas          : new Set()
  const tpSet   = filtros.tiposProcesso   instanceof Set ? filtros.tiposProcesso   : new Set()

  const matchPerm = (p) => {
    if (permSet.size === 0) return true
    const c = consolidarNorcrest(p || '')
    return permSet.has('NORCREST') && c === 'NORCREST' ? true : permSet.has(p)
  }

  const fisc = rowsFisc.filter(r => {
    if (!matchPerm(r.permissionaria)) return false
    if (subSet.size > 0 && !subSet.has(r.subprefeitura)) return false
    if (sfSet.size > 0 && !sfSet.has(r.status_simplificado)) return false
    return true
  })
  const geo = rowsGeo.filter(r => {
    if (!matchPerm(r.permissionaria)) return false
    if (subSet.size > 0 && !subSet.has(r.subprefeitura)) return false
    // suporta seleção por grupo (status_unificado) ou status individual (status_nome)
    if (sgSet.size > 0 && !sgSet.has(r.status_unificado) && !sgSet.has(r.status_nome) && !sgSet.has(r.status)) return false
    if (etSet.size > 0 && !etSet.has(r.etapa_nome)) return false
    const tp = r.tipo_processo_nome || r.tipo_processo
    if (tpSet.size > 0 && !tpSet.has(tp)) return false
    return true
  })
  return { fisc, geo }
}

function contarFiltrosAtivos(filtros) {
  if (!filtros) return 0
  const c = (f) => (f instanceof Set ? f.size : 0)
  const vis = filtros.visibilidade && filtros.visibilidade !== 'todos' ? 1 : 0
  return c(filtros.permissionarias) + c(filtros.subprefeituras) + c(filtros.statusFisc) +
    c(filtros.statusGeo) + c(filtros.etapas) + c(filtros.tiposProcesso) + vis
}

// ── Micro-componentes ─────────────────────────────────────────────────────────
function KPICard({ label, valor, sub, destaque }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 flex flex-col gap-1 transition-all ${destaque ? 'ring-2 ring-violet-500 shadow-violet-100' : ''}`}>
      <span className="text-[11px] text-gray-500 uppercase tracking-wide leading-tight">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${destaque ? 'text-violet-700' : 'text-navy'}`}>{fmtNumero(valor)}</span>
      {sub && <span className="text-[11px] text-gray-400">{sub}</span>}
    </div>
  )
}

function Paginacao({ pagina, totalPaginas, total, onChange }) {
  const ini = pagina * PAGE_SIZE + 1
  const fim = Math.min((pagina + 1) * PAGE_SIZE, total)
  return (
    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
      <span>Mostrando {fmtNumero(ini)}–{fmtNumero(fim)} de {fmtNumero(total)}</span>
      <div className="flex gap-1">
        <button disabled={pagina === 0} onClick={() => onChange(pagina - 1)}
          className="px-2 py-1 rounded-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50">‹</button>
        <span className="px-2 py-1">{pagina + 1}/{totalPaginas}</span>
        <button disabled={pagina >= totalPaginas - 1} onClick={() => onChange(pagina + 1)}
          className="px-2 py-1 rounded-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50">›</button>
      </div>
    </div>
  )
}

function TabelaPaginada({ rows, colunas, emptyMsg, defaultSort, defaultDir = 'desc', rowClassName }) {
  const [pagina, setPagina] = useState(0)
  const [sortKey, setSortKey] = useState(defaultSort || null)
  const [sortDir, setSortDir] = useState(defaultSort ? defaultDir : 'asc')

  function handleSort(key) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPagina(0)
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    const col = colunas.find(c => c.key === sortKey)
    return [...rows].sort((a, b) => {
      const va = col?.sortValue ? col.sortValue(a) : (a[sortKey] ?? '')
      const vb = col?.sortValue ? col.sortValue(b) : (b[sortKey] ?? '')
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, colunas, sortKey, sortDir])

  if (rows.length === 0) return <p className="text-sm text-gray-500 py-8 text-center">{emptyMsg}</p>

  const totalPaginas = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pg = Math.min(pagina, totalPaginas - 1)
  const visiveis = sorted.slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE)
  const thProps = { sortKey, sortDir, onSort: handleSort }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              {colunas.map(c => (
                <ThSort key={c.key} colKey={c.key} label={c.label} {...thProps}
                  className={`text-left py-2 pr-4 font-semibold text-navy whitespace-nowrap ${c.sep ? 'border-l border-slate-200 pl-3' : ''}`} />
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((row, i) => (
              <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 ${rowClassName ? rowClassName(row) : ''}`}>
                {colunas.map(c => (
                  <td key={c.key} className={`py-1.5 pr-4 text-gray-700 ${c.sep ? 'border-l border-slate-100 pl-3' : ''}`}>
                    {c.render ? c.render(row) : (row[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPaginas > 1 && <Paginacao pagina={pg} totalPaginas={totalPaginas} total={sorted.length} onChange={setPagina} />}
    </div>
  )
}

function SecaoCard({ titulo, children, className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-5 ${className}`}>
      {titulo && <h3 className="text-sm font-semibold text-navy mb-4 uppercase tracking-wide">{titulo}</h3>}
      {children}
    </div>
  )
}

// ── Aba 1 — Visão Geral ───────────────────────────────────────────────────────
const CORES_STATUS_GEO = [NAVY, VERDE, AMBER, VIOLET, TEAL, SLATE, RED, '#9f1239']

function AbaVisaoGeral({ dados, visibilidade, norcrestDrillDown = false }) {
  const { totalFisc, totalGeo, nComum, soFisc, soGeo, porPermissionaria, porSubpref,
          matrizStatus, topGeoStatuses, matrizStatusInd, topGeoStatusesInd } = dados
  const coberturaFisc = totalFisc > 0 ? Math.round((nComum / totalFisc) * 100) : 0
  const [modoStatus, setModoStatus] = useState('agrupado')

  const donutData = [
    { nome: 'Em comum',           valor: nComum,        pct: totalFisc > 0 ? Math.round(nComum / totalFisc * 100) : 0 },
    { nome: 'Só na Fiscalização', valor: soFisc.length, pct: totalFisc > 0 ? Math.round(soFisc.length / totalFisc * 100) : 0 },
    { nome: 'Só no Sistema Geo',     valor: soGeo.length,  pct: totalGeo  > 0 ? Math.round(soGeo.length  / totalGeo  * 100) : 0 },
  ]

  // Permissionárias Sistema Geo com mais processos fiscalizados — todas as unidades no drill-down
  const top10GeoFiscalizados = [...porPermissionaria]
    .filter(p => p.totalGeo > 0)
    .sort((a, b) => b.emComum - a.emComum)
    .slice(0, norcrestDrillDown ? Infinity : 10)

  // Barras: perspectiva Sistema Geo — "quanto foi fiscalizado" vs "nunca fiscalizado"
  const topPermGeo = [...porPermissionaria]
    .filter(p => p.totalGeo > 0)
    .sort((a, b) => b.totalGeo - a.totalGeo)
    .slice(0, norcrestDrillDown ? Infinity : 15)
    .map(p => ({ nome: p.perm, emComum: p.emComum, soGeo: p.soGeo }))

  // Paginação no drill-down da NORCREST (8 unidades por vez) — lista e barras.
  const pagFisc = usePaginadorGrafico(top10GeoFiscalizados, { tamanho: 8, ativo: norcrestDrillDown })
  const pagPermGeo = usePaginadorGrafico(topPermGeo, { tamanho: 8, ativo: norcrestDrillDown })

  const topSubGeo = [...porSubpref]
    .filter(s => s.totalGeo > 0)
    .sort((a, b) => b.totalGeo - a.totalGeo).slice(0, 15)
    .map(s => ({ nome: s.sub, emComum: s.emComum, soGeo: s.soGeo }))

  const matrizAtiva      = modoStatus === 'agrupado' ? matrizStatus    : matrizStatusInd
  const statusAtivos     = modoStatus === 'agrupado' ? topGeoStatuses  : topGeoStatusesInd

  // Destaque do card conforme filtro de visibilidade
  const destEmComum = visibilidade === 'em-comum'
  const destSoFisc  = visibilidade === 'so-fisc'
  const destSoGeo   = visibilidade === 'so-geo'

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Processos na Fiscalização" valor={totalFisc} sub="únicos (id_origem)" />
        <KPICard label="Processos no Sistema Geo"    valor={totalGeo}  sub="registros únicos" />
        <KPICard label="Em comum" valor={nComum} sub={`${coberturaFisc}% da fisc. no Sistema Geo`} destaque={destEmComum} />
        <KPICard label="Só na Fiscalização" valor={soFisc.length} sub="não cadastrado no Sistema Geo" destaque={destSoFisc} />
        <KPICard label="Só no Sistema Geo"    valor={soGeo.length}  sub="nunca fiscalizado"        destaque={destSoGeo} />
      </div>

      {/* Donut + alerta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SecaoCard titulo="Distribuição geral">
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={donutData} dataKey="valor" nameKey="nome"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  paddingAngle={2} startAngle={90} endAngle={-270}
                  labelLine={false}
                  label={e => e.pct >= 5 ? `${e.pct}%` : ''}
                  style={{ fontSize: 11 }}
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={[NAVY, RED, AMBER][i]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-gray-500 uppercase">Fisc.</span>
              <span className="text-xl font-bold text-navy">{coberturaFisc}%</span>
              <span className="text-[9px] text-gray-400">no Sistema Geo</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            {donutData.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-xs shrink-0" style={{ background: [NAVY, RED, AMBER][i] }} />
                <span className="flex-1 text-gray-600">{d.nome}</span>
                <span className="font-semibold tabular-nums">{fmtNumero(d.valor)}</span>
              </div>
            ))}
          </div>
        </SecaoCard>

        <div className="lg:col-span-2">
          <SecaoCard titulo={norcrestDrillDown ? 'NORCREST — por unidade (Sistema Geo — processos fiscalizados)' : 'Top 10 permissionárias do Sistema Geo — processos fiscalizados'}>
            <p className="text-xs text-gray-500 mb-3">
              {norcrestDrillDown ? 'Unidades NORCREST com processos no Sistema Geo e quanto cada uma já foi fiscalizada.' : 'Permissionárias com mais processos no Sistema Geo, e quanto cada uma já foi fiscalizada.'}
            </p>
            <div className="space-y-2.5">
              {pagFisc.itens.map((p, i) => {
                const rank = pagFisc.verTodas ? i + 1 : pagFisc.pagina * pagFisc.tamanho + i + 1
                return (
                <div key={p.perm} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-navy text-white font-bold text-[10px] shrink-0">{rank}</span>
                  <span className="w-28 truncate font-medium shrink-0">{p.perm}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${p.pctCob}%`, background: p.pctCob >= 70 ? VERDE : p.pctCob >= 40 ? AMBER : RED }}
                    />
                  </div>
                  <span className={`w-10 text-right font-semibold tabular-nums shrink-0 ${p.pctCob >= 70 ? 'text-verde' : p.pctCob >= 40 ? 'text-amber-600' : 'text-red'}`}>
                    {p.pctCob}%
                  </span>
                  <span className="text-gray-400 tabular-nums shrink-0">{fmtNumero(p.emComum)}/{fmtNumero(p.totalGeo)}</span>
                </div>
                )
              })}
            </div>
            {pagFisc.ligado && <ControlePaginacao {...pagFisc} />}
          </SecaoCard>
        </div>
      </div>

      {/* Status Sistema Geo × Status Fiscalização — com toggle agrupado/individual */}
      <SecaoCard titulo="Status Sistema Geo por status da Fiscalização — processos em comum">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-500">
            Como se distribuem os status do Sistema Geo para cada situação na Fiscalização.
          </p>
          <div className="flex gap-1 shrink-0 ml-4">
            {['agrupado', 'individual'].map(m => (
              <button key={m} onClick={() => setModoStatus(m)}
                className={`text-xs px-3 py-1 rounded-sm font-medium transition-colors ${modoStatus === m ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {m === 'agrupado' ? 'Agrupado' : 'Individual'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={matrizAtiva} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="statusFisc" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {statusAtivos.map((sg, i) => (
              <Bar key={sg} dataKey={sg} name={sg} fill={CORES_STATUS_GEO[i % CORES_STATUS_GEO.length]} stackId="a" />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </SecaoCard>

      {/* Barras por permissionária — perspectiva Sistema Geo */}
      <SecaoCard titulo={norcrestDrillDown ? 'NORCREST — por unidade (fiscalizados × não fiscalizados)' : 'Fiscalização dos processos Sistema Geo por permissionária (top 15)'}>
        <p className="text-xs text-gray-500 mb-3">
          {norcrestDrillDown ? 'Por unidade NORCREST: processos fiscalizados (azul) vs. nunca fiscalizados (âmbar).' : 'De cada permissionária no Sistema Geo, quantos processos foram fiscalizados (azul) vs. nunca fiscalizados (âmbar).'}
        </p>
        <ResponsiveContainer width="100%" height={Math.max(300, pagPermGeo.itens.length * 34)}>
          <BarChart data={pagPermGeo.itens} layout="vertical" margin={{ left: 120, right: 20, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={115} />
            <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="emComum" name="Fiscalizados"        stackId="a" fill={NAVY} />
            <Bar dataKey="soGeo"   name="Não fiscalizados"    stackId="a" fill={AMBER} />
          </BarChart>
        </ResponsiveContainer>
        {pagPermGeo.ligado && <ControlePaginacao {...pagPermGeo} />}
      </SecaoCard>

      {/* Barras por subprefeitura — perspectiva Sistema Geo */}
      <SecaoCard titulo="Fiscalização dos processos Sistema Geo por subprefeitura (top 15)">
        <p className="text-xs text-gray-500 mb-3">
          De cada subprefeitura no Sistema Geo, quantos processos foram fiscalizados (azul) vs. nunca fiscalizados (âmbar).
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topSubGeo} layout="vertical" margin={{ left: 40, right: 20, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={35} />
            <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="emComum" name="Fiscalizados"        stackId="a" fill={NAVY} />
            <Bar dataKey="soGeo"   name="Não fiscalizados"    stackId="a" fill={AMBER} />
          </BarChart>
        </ResponsiveContainer>
      </SecaoCard>
    </div>
  )
}

// ── Aba 2 — Cobertura por Permissionária ──────────────────────────────────────
const COLS_COBERTURA = [
  { key: 'perm',      label: 'Permissionária' },
  { key: 'totalFisc', label: 'Total Fisc.',       render: r => fmtNumero(r.totalFisc) },
  { key: 'totalGeo',  label: 'Total Sistema Geo',    render: r => fmtNumero(r.totalGeo) },
  { key: 'emComum',   label: 'Em comum',          render: r => fmtNumero(r.emComum) },
  { key: 'soFisc',    label: 'Só Fisc.',          render: r => fmtNumero(r.soFisc) },
  { key: 'soGeo',     label: 'Só Sistema Geo',       render: r => fmtNumero(r.soGeo) },
  {
    key: 'pctCob', label: '% Cob. Sistema Geo',
    render: r => (
      <span className={`font-semibold ${r.pctCob < 70 ? 'text-red' : 'text-verde'}`}>
        {r.pctCob}%
      </span>
    ),
  },
]

const COLS_PERM_SUB = [
  { key: 'perm',     label: 'Permissionária' },
  { key: 'sub',      label: 'Subprefeitura' },
  { key: 'totalGeo', label: 'Total Sistema Geo',  render: r => fmtNumero(r.totalGeo) },
  { key: 'fisc',     label: 'Fiscalizados',    render: r => fmtNumero(r.fisc) },
  { key: 'laudos',   label: 'Laudos',          render: r => fmtNumero(r.laudos) },
  {
    key: 'pctCob', label: '% Fiscalizado',
    render: r => (
      <span className={`font-semibold ${r.pctCob < 70 ? 'text-red' : 'text-verde'}`}>
        {r.pctCob}%
      </span>
    ),
  },
]

function AbaCobertura({ porPermissionaria, porPermSub, norcrestDrillDown = false }) {
  const rows = porPermissionaria.filter(p => p.totalGeo > 0)
  return (
    <div className="space-y-5">
      <SecaoCard titulo={norcrestDrillDown ? 'NORCREST — Cobertura Fisc. × Sistema Geo por unidade' : 'Cobertura Fisc. × Sistema Geo por permissionária'}>
        <p className="text-xs text-gray-500 mb-4">
          <strong>% Cob. Sistema Geo</strong> = processos em comum ÷ total no Sistema Geo para aquela permissionária.
          Vermelho quando abaixo de 70% — indica baixa fiscalização.
          Ordenação padrão: menor cobertura primeiro. Permissionárias sem registro no Sistema Geo são omitidas.
        </p>
        <TabelaPaginada
          rows={rows}
          colunas={COLS_COBERTURA}
          emptyMsg="Nenhum dado disponível."
          defaultSort="pctCob"
          defaultDir="asc"
        />
      </SecaoCard>

      <SecaoCard titulo="Permissionária × Subprefeitura — fiscalizações detalhadas">
        <p className="text-xs text-gray-500 mb-4">
          Cada linha é uma combinação de permissionária + subprefeitura nos processos em comum.
          Clique no cabeçalho de qualquer coluna para ordenar. Use para identificar onde a fiscalização está concentrada ou ausente.
        </p>
        <TabelaPaginada
          rows={porPermSub}
          colunas={COLS_PERM_SUB}
          emptyMsg="Nenhum dado disponível."
          defaultSort="fisc"
          defaultDir="desc"
        />
      </SecaoCard>
    </div>
  )
}

// ── Aba 3 — Status Cruzado ────────────────────────────────────────────────────
function AbaStatusCruzado({ matrizStatus, topGeoStatuses, matrizStatusInd, topGeoStatusesInd, divStatus }) {
  const [subAba, setSubAba] = useState('grafico')
  const [modoStatus, setModoStatus] = useState('agrupado')

  const matrizAtiva  = modoStatus === 'agrupado' ? matrizStatus    : matrizStatusInd
  const statusAtivos = modoStatus === 'agrupado' ? topGeoStatuses  : topGeoStatusesInd

  const COLS_DIV_STATUS = [
    { key: 'proc',   label: 'Processo',         render: r => r.fisc.id_origem, sortValue: r => r.fisc.id_origem || '' },
    { key: 'perm',   label: 'Permissionária',   render: r => r.geo.permissionaria || '—', sortValue: r => r.geo.permissionaria || '' },
    { key: 'sub',    label: 'Sub.', render: r => r.geo.subprefeitura || '—', sortValue: r => r.geo.subprefeitura || '' },
    { key: 'geoSt',  label: 'Status Sistema Geo',  render: r => r.geo.status_unificado || '—', sortValue: r => r.geo.status_unificado || '' },
    { key: 'fiscSt', label: 'Status Fisc.',      render: r => r.fisc.status_simplificado || '—', sortValue: r => r.fisc.status_simplificado || '' },
    { key: 'data',   label: 'Últ. laudo',        render: r => fmtData(r.fisc.data_inicio), sortValue: r => r.fisc.data_inicio || '' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {[{ id: 'grafico', l: 'Gráfico' }, { id: 'matriz', l: 'Tabela matriz' }, { id: 'inconsistencias', l: `Inconsistências (${fmtNumero(divStatus.length)})` }].map(s => (
            <button key={s.id} onClick={() => setSubAba(s.id)}
              className={`text-xs px-3 py-1.5 rounded-sm font-medium transition-colors ${subAba === s.id ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {s.l}
            </button>
          ))}
        </div>
        {(subAba === 'grafico' || subAba === 'matriz') && (
          <div className="flex gap-1 ml-2">
            {['agrupado', 'individual'].map(m => (
              <button key={m} onClick={() => setModoStatus(m)}
                className={`text-xs px-3 py-1 rounded-sm font-medium transition-colors ${modoStatus === m ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {m === 'agrupado' ? 'Agrupado' : 'Individual'}
              </button>
            ))}
          </div>
        )}
      </div>

      {subAba === 'grafico' && (
        <SecaoCard titulo="Distribuição de status Sistema Geo por status Fiscalização (processos em comum)">
          <p className="text-xs text-gray-500 mb-4">
            Para os processos presentes nas duas bases, como o status do Sistema Geo se distribui dentro de cada status da Fiscalização?
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={matrizAtiva} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="statusFisc" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {statusAtivos.map((sg, i) => (
                <Bar key={sg} dataKey={sg} name={sg} fill={CORES_STATUS_GEO[i % CORES_STATUS_GEO.length]} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </SecaoCard>
      )}

      {subAba === 'matriz' && (
        <SecaoCard titulo={`Matriz status Fiscalização × status Sistema Geo (${modoStatus === 'agrupado' ? 'top 6 agrupados' : 'top 8 individuais'})`}>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 font-semibold text-navy">Status Fisc. ↓ / Sistema Geo →</th>
                  {statusAtivos.map(sg => <th key={sg} className="text-right py-2 px-2 font-semibold text-navy whitespace-nowrap">{sg}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrizAtiva.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-1.5 pr-4 font-medium text-navy">{row.statusFisc}</td>
                    {statusAtivos.map(sg => (
                      <td key={sg} className="text-right py-1.5 px-2 tabular-nums text-gray-700">
                        {fmtNumero(row[sg] || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SecaoCard>
      )}

      {subAba === 'inconsistencias' && (
        <SecaoCard titulo="Inconsistências de status — Sistema Geo encerrado/cancelado mas Fisc. em andamento">
          <p className="text-xs text-gray-500 mb-4">
            Processos cujo Sistema Geo indica encerramento ou cancelamento, mas a Fiscalização registra "Em andamento".
            Pode indicar atraso na atualização de um dos sistemas.
          </p>
          <TabelaPaginada
            rows={divStatus}
            colunas={COLS_DIV_STATUS}
            emptyMsg="Nenhuma inconsistência de status encontrada."
          />
        </SecaoCard>
      )}
    </div>
  )
}

// ── Aba 4 — Linha do Tempo ────────────────────────────────────────────────────
function AbaLinhaTempo({ prazosBinsArr, evolucaoMensal }) {
  return (
    <div className="space-y-5">
      <SecaoCard titulo="Prazo entre cadastro no Sistema Geo e primeiro laudo de fiscalização">
        <p className="text-xs text-gray-500 mb-4">
          Para os processos em comum, quantos dias passaram entre a data de cadastro no Sistema Geo e
          o laudo de fiscalização mais antigo? Períodos longos indicam atraso na fiscalização.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={prazosBinsArr} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip unidade="processos" />} wrapperStyle={{ zIndex: 50 }} />
            <Bar dataKey="count" name="Processos" fill={VIOLET} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SecaoCard>

      <SecaoCard titulo="Evolução mensal — entradas no Sistema Geo × laudos de Fiscalização (últimos 24 meses)">
        <p className="text-xs text-gray-500 mb-4">
          Comparação mês a mês do volume de novas obras cadastradas no Sistema Geo
          e de laudos de fiscalização emitidos. Divergências prolongadas indicam gargalo.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={evolucaoMensal} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mes" tickFormatter={fmtMes} tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip labelFormatter={fmtMes} />} wrapperStyle={{ zIndex: 50 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="sistemaGeo" name="Entradas Sistema Geo"   stroke={NAVY}  strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="fisc"     name="Laudos Fiscalização" stroke={VERDE} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </SecaoCard>
    </div>
  )
}

// ── Aba 5 — Divergências ──────────────────────────────────────────────────────
function AbaDivergencias({ soFisc, divSubpref, soGeo }) {
  const [subAba, setSubAba] = useState('so-fisc')

  const COLS_SO_FISC = [
    { key: 'id_origem',           label: 'Processo' },
    { key: 'permissionaria_orig', label: 'Permissionária', render: r => r.permissionaria_origem || r.permissionaria || '—' },
    { key: 'subprefeitura_orig',  label: 'Sub.',           render: r => r.subprefeitura_origem  || r.subprefeitura  || '—' },
    { key: 'data_inicio',         label: 'Último laudo',   render: r => fmtData(r.data_inicio) },
    { key: 'status_simplificado', label: 'Status' },
    { key: 'nLaudos',             label: 'Laudos',         render: r => fmtNumero(r.nLaudos) },
  ]
  const COLS_DIV_SUB = [
    { key: 'proc',     label: 'Processo',           render: r => r.fisc.id_origem,                                           sortValue: r => r.fisc.id_origem || '' },
    { key: 'fisc_sub', label: 'Sub. (Fisc.)',       render: r => r.fisc.subprefeitura_origem || r.fisc.subprefeitura || '—', sortValue: r => r.fisc.subprefeitura_origem || r.fisc.subprefeitura || '' },
    { key: 'geo_sub',  label: 'Sub. (Sistema Geo)',    render: r => r.geo.subprefeitura || '—',                                sortValue: r => r.geo.subprefeitura || '' },
    { key: 'perm',     label: 'Permissionária',     render: r => r.fisc.permissionaria || r.geo.permissionaria || '—',      sortValue: r => r.fisc.permissionaria || r.geo.permissionaria || '' },
    { key: 'data',     label: 'Últ. laudo',         render: r => fmtData(r.fisc.data_inicio),                               sortValue: r => r.fisc.data_inicio || '' },
  ]
  const COLS_SO_GEO = [
    { key: 'processo',           label: 'Processo' },
    { key: 'permissionaria',     label: 'Permissionária' },
    { key: 'subprefeitura',      label: 'Sub.' },
    { key: 'status_unificado',   label: 'Status Sistema Geo' },
    { key: 'data_cadastro',      label: 'Data cadastro',   render: r => fmtData(r.data_cadastro) },
    { key: 'tipo_processo_nome', label: 'Tipo' },
  ]

  const SUBS = [
    { id: 'so-fisc', label: `Só na Fiscalização (${fmtNumero(soFisc.length)})` },
    { id: 'div-sub', label: `Div. Subprefeitura (${fmtNumero(divSubpref.length)})` },
    { id: 'so-geo',  label: `Só no Sistema Geo (${fmtNumero(soGeo.length)})` },
  ]

  const DESCRICOES = {
    'so-fisc': 'Processos com laudo de fiscalização cujo número não foi encontrado no Sistema Geo. Pode indicar obra fiscalizada mas não cadastrada no sistema de licenciamento.',
    'div-sub': 'Processos presentes nas duas bases com subprefeitura diferente — compara o dado original da planilha de fiscalização com o Sistema Geo.',
    'so-geo':  'Processos cadastrados no Sistema Geo que não possuem nenhum laudo de fiscalização. Volume alto esperado — nem toda obra licenciada é fiscalizada.',
  }

  const rowsMap = { 'so-fisc': soFisc, 'div-sub': divSubpref, 'so-geo': soGeo }
  const colsMap = { 'so-fisc': COLS_SO_FISC, 'div-sub': COLS_DIV_SUB, 'so-geo': COLS_SO_GEO }
  const emptyMap = {
    'so-fisc': 'Todos os processos da Fiscalização estão no Sistema Geo.',
    'div-sub': 'Nenhuma divergência de subprefeitura encontrada.',
    'so-geo':  'Todos os processos do Sistema Geo foram fiscalizados.',
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {SUBS.map(s => (
          <button key={s.id} onClick={() => setSubAba(s.id)}
            className={`text-xs px-3 py-1.5 rounded-sm font-medium transition-colors ${subAba === s.id ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {s.label}
          </button>
        ))}
      </div>
      <SecaoCard>
        <p className="text-xs text-gray-500 mb-4">{DESCRICOES[subAba]}</p>
        <TabelaPaginada
          key={subAba}
          rows={rowsMap[subAba]}
          colunas={colsMap[subAba]}
          emptyMsg={emptyMap[subAba]}
        />
      </SecaoCard>
    </div>
  )
}

// ── Aba 6 — Executoras ────────────────────────────────────────────────────────
const COLS_EXECUTORAS = [
  { key: 'executora',      label: 'Executora' },
  { key: 'permissionaria', label: 'Permissionária' },
  { key: 'processos',      label: 'Processos',  render: r => fmtNumero(r.processos) },
  { key: 'laudos',         label: 'Laudos',     render: r => fmtNumero(r.laudos) },
  { key: 'nc',             label: 'NC',         render: r => fmtNumero(r.nc) },
  {
    key: 'pctNc', label: '% NC',
    render: r => (
      <span className={`font-semibold ${r.pctNc >= 30 ? 'text-red' : 'text-gray-700'}`}>
        {r.pctNc}%
      </span>
    ),
  },
]

function AbaExecutoras({ porExecutora }) {
  return (
    <SecaoCard titulo="Executoras com processos em comum (Fisc. × Sistema Geo)">
      <p className="text-xs text-gray-500 mb-4">
        Para os processos presentes nas duas bases, mostra a executora registrada no Sistema Geo
        com os laudos de fiscalização correspondentes. <strong>% NC ≥ 30%</strong> destacada em vermelho.
        Ordenação padrão: maior número de não conformidades primeiro.
      </p>
      <TabelaPaginada
        rows={porExecutora}
        colunas={COLS_EXECUTORAS}
        emptyMsg="Nenhum dado de executora disponível."
        defaultSort="nc"
        defaultDir="desc"
      />
    </SecaoCard>
  )
}

// ── Aba 7 — Mapa ──────────────────────────────────────────────────────────────
const COLS_MAPA_SUB = [
  { key: 'sub',      label: 'Subprefeitura' },
  { key: 'totalGeo', label: 'Total Sistema Geo',  render: r => fmtNumero(r.totalGeo) },
  { key: 'emComum',  label: 'Fiscalizados',     render: r => fmtNumero(r.emComum) },
  { key: 'soGeo',    label: 'Não fiscalizados', render: r => fmtNumero(r.soGeo) },
  {
    key: 'pctCob', label: '% Fiscalizado',
    render: r => (
      <span className={`font-semibold ${r.pctCob < 70 ? 'text-red' : 'text-verde'}`}>
        {r.pctCob}%
      </span>
    ),
  },
]

function AbaMapa({ porSubpref }) {
  const [subSelecionada, setSubSelecionada] = useState(null)

  const contagensCobertura = useMemo(() => {
    const m = new Map()
    for (const s of porSubpref) {
      if (s.sub && s.sub !== '(sem)') m.set(s.sub, s.pctCob)
    }
    return m
  }, [porSubpref])

  const selecionadas = useMemo(
    () => new Set(subSelecionada ? [subSelecionada] : []),
    [subSelecionada]
  )

  const detalheSub = subSelecionada
    ? porSubpref.find(s => s.sub === subSelecionada)
    : null

  function handleSelecionar(sigla) {
    setSubSelecionada(s => s === sigla ? null : sigla)
  }

  return (
    <div className="space-y-4">
      {/* Mapa (MapaSP já é um card próprio) + coluna direita, ambos 760px → alinhados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mapa — altura fixa; MapaSP preenche (h-full interno) */}
        <div className="lg:col-span-2" style={{ height: 760 }}>
          <MapaSP
            titulo="Cobertura de Fiscalização por Subprefeitura (%)"
            contagens={contagensCobertura}
            unidade="% cob."
            selecionadas={selecionadas}
            onSelecionar={handleSelecionar}
          />
        </div>

        {/* Coluna direita — mesma altura do mapa, dois painéis meio a meio */}
        <div className="flex flex-col gap-3" style={{ height: 760 }}>

          {/* Painel de detalhe — sempre flex-1 (metade da coluna), tamanho fixo */}
          <SecaoCard
            titulo={detalheSub ? `Subprefeitura: ${detalheSub.sub}` : 'Subprefeitura'}
            className="flex-1 min-h-0 flex flex-col"
          >
            {detalheSub ? (
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 text-sm pr-1">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { l: 'Total Sistema Geo', v: fmtNumero(detalheSub.totalGeo) },
                    { l: 'Em comum',       v: fmtNumero(detalheSub.emComum) },
                    { l: 'Só Fisc.',       v: fmtNumero(detalheSub.soFisc) },
                    { l: 'Só Sistema Geo',    v: fmtNumero(detalheSub.soGeo) },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-slate-50 rounded-sm p-2">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{l}</p>
                      <p className="text-base font-bold text-navy tabular-nums">{v}</p>
                    </div>
                  ))}
                </div>
                <div className={`rounded-sm p-2 text-center ${detalheSub.pctCob < 70 ? 'bg-red/5 border border-red/20' : 'bg-verde/5 border border-verde/20'}`}>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Cobertura Sistema Geo</p>
                  <p className={`text-2xl font-bold tabular-nums ${detalheSub.pctCob < 70 ? 'text-red' : 'text-verde'}`}>
                    {detalheSub.pctCob}%
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {detalheSub.pctCob < 70 ? 'Baixa cobertura' : 'Boa cobertura'}
                  </p>
                </div>
                <button onClick={() => setSubSelecionada(null)}
                  className="w-full text-xs py-1.5 border border-slate-200 rounded-sm text-gray-500 hover:bg-slate-50 shrink-0">
                  Limpar seleção
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                <svg className="w-10 h-10 mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z" />
                </svg>
                <p className="text-sm font-medium">Nenhuma subprefeitura selecionada</p>
                <p className="text-xs mt-1">Clique em uma região do mapa para ver os detalhes.</p>
              </div>
            )}
          </SecaoCard>

          {/* Ranking — sempre flex-1 (metade da coluna), scroll interno */}
          <SecaoCard titulo="Ranking por cobertura" className="flex-1 min-h-0 flex flex-col">
            <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1 px-1 shrink-0">
              <span className="col-span-1">Sub.</span>
              <span className="text-right">Sistema Geo</span>
              <span className="text-right">% cob.</span>
            </div>
            <div className="space-y-0.5 overflow-y-auto pr-1 flex-1 min-h-0">
              {[...porSubpref].sort((a, b) => a.pctCob - b.pctCob)
                .filter(s => s.sub !== '(sem)' && s.totalGeo > 0)
                .map((s) => (
                  <button key={s.sub} onClick={() => handleSelecionar(s.sub)}
                    className={`w-full grid grid-cols-3 gap-1 text-xs px-1 py-1 rounded-sm text-left transition-colors ${subSelecionada === s.sub ? 'bg-navy/10 font-semibold' : 'hover:bg-slate-50'}`}>
                    <span className="truncate">{s.sub}</span>
                    <span className="text-right text-gray-500 tabular-nums">{fmtNumero(s.totalGeo)}</span>
                    <span className={`text-right font-semibold tabular-nums ${s.pctCob < 70 ? 'text-red' : 'text-verde'}`}>{s.pctCob}%</span>
                  </button>
                ))}
            </div>
          </SecaoCard>
        </div>
      </div>

      {/* Tabela completa */}
      <SecaoCard titulo="Todas as subprefeituras">
        <TabelaPaginada
          rows={porSubpref.filter(s => s.sub !== '(sem)')}
          colunas={COLS_MAPA_SUB}
          emptyMsg="Nenhum dado disponível."
          defaultSort="pctCob"
          defaultDir="asc"
        />
      </SecaoCard>
    </div>
  )
}

// ── Aba 8 — Busca por Processo ────────────────────────────────────────────────
// Badge de origem
function BadgeOrigem({ origem }) {
  const cfg = origem === 'Só Fisc.'
    ? 'bg-red/10 text-red'
    : origem === 'Só Sistema Geo'
    ? 'bg-navy/10 text-navy'
    : 'bg-violet-100 text-violet-700'
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${cfg}`}>{origem}</span>
}

// Tooltip flutuante que segue o cursor
function TooltipCursor({ children, texto }) {
  const [pos, setPos] = useState(null)
  return (
    <span
      className="relative"
      onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <span
          style={{ position: 'fixed', left: pos.x + 14, top: pos.y + 14, zIndex: 9999 }}
          className="pointer-events-none bg-gray-800 text-white text-[11px] px-2 py-1 rounded-sm shadow-lg max-w-[220px] leading-snug"
        >
          {texto}
        </span>
      )}
    </span>
  )
}

const COLS_LISTA = [
  {
    key: 'processo', label: 'Nº Processo',
    render: r => r.somenteEmFisc
      ? (
        <TooltipCursor texto="Presente somente na base de Fiscalização — sem correspondente no Sistema Geo">
          <span className="italic text-gray-500 cursor-help">{r.processo}</span>
        </TooltipCursor>
      )
      : r.processo,
  },
  { key: 'permissionaria', label: 'Permissionária' },
  { key: 'executora',      label: 'Executora' },
  { key: 'tipoProcesso',   label: 'Tipo de Processo' },
  { key: 'subprefeitura',  label: 'Sub.' },
  {
    key: 'statusGeo', label: 'Status Sistema Geo',
    render: r => r.statusGeoReal && r.statusGeoReal !== r.statusGeo
      ? (
        <TooltipCursor texto={`Status real: ${r.statusGeoReal}`}>
          <span className="cursor-help border-b border-dotted border-gray-400">{r.statusGeo}</span>
        </TooltipCursor>
      )
      : r.statusGeo,
  },
  { key: 'etapaGeo',   label: 'Etapa Sistema Geo' },
  { key: 'statusFisc', label: 'Status Fiscalização', sep: true },
  { key: 'lote',       label: 'Lote' },
  {
    key: 'origem', label: 'Origem Dados', sep: true,
    render: r => <BadgeOrigem origem={r.origem} />,
  },
]

function buildRows(emComum, soFisc, soGeo) {
  const result = []
  for (const { fisc, geo } of emComum) {
    result.push({
      processo: geo.processo,
      origem: 'Comum',
      somenteEmFisc: false,
      permissionaria: geo.permissionaria || fisc.permissionaria || '—',
      // Sistema Geo manda; se não tiver, usa a executante da Fiscalização (regra geral)
      executora: geo.executora || fisc.executante || '—',
      tipoProcesso: geo.tipo_processo_nome || geo.tipo_processo || '—',
      subprefeitura: geo.subprefeitura || '—',
      statusGeo: geo.status_unificado || '—',
      statusGeoReal: geo.status_nome || geo.status || null,
      etapaGeo: geo.etapa_nome || '—',
      statusFisc: fisc.status_simplificado || '—',
      lote: fisc.lote || '—',
    })
  }
  for (const r of soGeo) {
    result.push({
      processo: r.processo,
      origem: 'Só Sistema Geo',
      somenteEmFisc: false,
      permissionaria: r.permissionaria || '—',
      executora: r.executora || '—',
      tipoProcesso: r.tipo_processo_nome || r.tipo_processo || '—',
      subprefeitura: r.subprefeitura || '—',
      statusGeo: r.status_unificado || '—',
      statusGeoReal: r.status_nome || r.status || null,
      etapaGeo: r.etapa_nome || '—',
      statusFisc: '—',
      lote: '—',
    })
  }
  // "Só Fisc." sempre no final
  for (const r of soFisc) {
    result.push({
      processo: r.id_origem,
      origem: 'Só Fisc.',
      somenteEmFisc: true,
      permissionaria: r.permissionaria || '—',
      executora: r.executante || '—',
      tipoProcesso: '—',
      subprefeitura: r.subprefeitura_origem || r.subprefeitura || '—',
      statusGeo: '—',
      statusGeoReal: null,
      etapaGeo: '—',
      statusFisc: r.status_simplificado || '—',
      lote: r.lote || '—',
    })
  }
  return result
}

function AbaBusca({ emComum, soFisc, soGeo, nFiltrosAtivos, visibilidade }) {
  const [textoBusca, setTextoBusca] = useState('')
  const [termoBusca, setTermoBusca] = useState('')
  const [listarAtivado, setListarAtivado] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [rowsExibidas, setRowsExibidas] = useState([])
  const timerRef = useRef(null)
  const raf2Ref = useRef(0)

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const v = textoBusca.trim().toLowerCase()
      if (v) setCarregando(true)
      setTermoBusca(v)
    }, 250)
    return () => clearTimeout(timerRef.current)
  }, [textoBusca])

  // Respeita a visibilidade da barra lateral (Todos / Só em comum / Só na Fisc. / Só no Sistema Geo)
  const allRows = useMemo(() => {
    const ec = visibilidade === 'so-fisc' || visibilidade === 'so-geo' ? [] : emComum
    const sf = visibilidade === 'em-comum' || visibilidade === 'so-geo' ? [] : soFisc
    const sg = visibilidade === 'em-comum' || visibilidade === 'so-fisc' ? [] : soGeo
    return buildRows(ec, sf, sg)
  }, [emComum, soFisc, soGeo, visibilidade])

  // Os dados filtrados pela barra lateral mudaram (qualquer filtro/visibilidade) →
  // a lista volta a ficar oculta até o usuário clicar em "Filtrar" de novo. Depende
  // da referência de `allRows` (memoizada acima), não de um contador.
  useEffect(() => { setListarAtivado(false) }, [allRows])

  function handleFiltrar() {
    setCarregando(true)
    setListarAtivado(true)
  }

  // A lista só aparece por ação explícita: clicar em "Filtrar" ou buscar por número.
  // Os filtros da barra lateral NÃO disparam a listagem sozinhos.
  const ativo = !!termoBusca || listarAtivado

  const rowsAlvo = useMemo(() => {
    if (!ativo) return []
    if (!termoBusca) return allRows
    return allRows.filter(r => norm(r.processo).includes(termoBusca))
  }, [ativo, allRows, termoBusca])

  // Commit deferido com rAF DUPLO: o 1º rAF roda antes da pintura do frame do
  // spinner; o 2º roda só no frame seguinte — garantindo que o browser PINTE o
  // spinner antes de o commit pesado (ordenação/render) bloquear a thread.
  // (rAF simples roda antes da pintura e o spinner nunca aparecia.)
  useEffect(() => {
    if (!ativo) { setRowsExibidas([]); setCarregando(false); return }
    const raf1 = requestAnimationFrame(() => {
      raf2Ref.current = requestAnimationFrame(() => {
        setRowsExibidas(rowsAlvo)
        setCarregando(false)
      })
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2Ref.current) }
  }, [ativo, rowsAlvo])

  const rows = rowsExibidas

  return (
    <SecaoCard titulo="Lista de Processos">
      <p className="text-xs text-gray-500 mb-3">
        Selecione os <strong>filtros da barra lateral</strong> (permissionária, subprefeitura, status, etapa,
        tipo de processo, visibilidade) e clique em <strong>Filtrar</strong> para listar os processos — ou busque por número abaixo.
        Processos presentes somente na base de Fiscalização aparecem em <span className="italic">itálico</span> ao final.
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Origem dos dados:
        <span className="mx-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-violet-100 text-violet-700">Comum</span> presente nas duas bases ·
        <span className="mx-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-navy/10 text-navy">Só Sistema Geo</span> obra sem fiscalização ·
        <span className="mx-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-red/10 text-red">Só Fisc.</span> sem registro no Sistema Geo
      </p>

      <CampoBusca
        busca={textoBusca}
        onChange={setTextoBusca}
        placeholder="Buscar por número de processo…"
        totalResultados={rows.length}
        totalBase={allRows.length}
        onFiltrar={handleFiltrar}
        nFiltrosAtivos={nFiltrosAtivos}
      />

      {carregando ? (
        <LoadingInline mensagem="Montando a lista de processos…" />
      ) : !ativo ? (
        <p className="text-sm text-gray-400 text-center py-8">
          Aplique os filtros na barra lateral e clique em <strong>Filtrar</strong> para listar os processos,
          ou digite um número de processo acima.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Nenhum processo encontrado com os filtros selecionados.</p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-2">{rows.length.toLocaleString('pt-BR')} processo{rows.length !== 1 ? 's' : ''} encontrado{rows.length !== 1 ? 's' : ''}</p>
          <TabelaPaginada
            key={termoBusca + listarAtivado}
            rows={rows}
            colunas={COLS_LISTA}
            emptyMsg=""
            rowClassName={r => r.somenteEmFisc ? 'italic text-gray-500' : ''}
          />
        </>
      )}
    </SecaoCard>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function PaginaGeo4Cruzamento({ rowsFisc, rowsGeo, filtros, abaAtiva = 'visao-geral' }) {
  const { fisc: fiscFiltrada, geo: geoFiltrado } = useMemo(
    () => filtrarParaCruzamento(rowsFisc, rowsGeo, filtros),
    [rowsFisc, rowsGeo, filtros]
  )

  // Drill-down NORCREST: quando "NORCREST (consolidado)" está no filtro, desagrega por unidade
  const norcrestDrillDown = filtros?.permissionarias?.has?.('NORCREST') ?? false

  const dados = useMemo(
    () => computarCruzamento(fiscFiltrada, geoFiltrado, !norcrestDrillDown),
    [fiscFiltrada, geoFiltrado, norcrestDrillDown]
  )

  const nFiltrosAtivos = useMemo(() => contarFiltrosAtivos(filtros), [filtros])
  const visibilidade = filtros?.visibilidade ?? 'todos'

  const { soFisc, soGeo, emComum, divSubpref, divStatus,
          porPermissionaria, porSubpref, porPermSub,
          matrizStatus, topGeoStatuses,
          matrizStatusInd, topGeoStatusesInd,
          prazosBinsArr, evolucaoMensal, porExecutora } = dados

  return (
    <div className="space-y-4">
      {/* Descrição do módulo */}
      <div className="flex items-start gap-3 px-4 py-3 bg-violet-50 border border-violet-100 rounded-lg">
        <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-violet-600 text-white mt-0.5" style={{ fontSize: 14 }}>⚖️</div>
        <div>
          <p className="text-sm font-semibold text-violet-900">Análise Integrada — Fiscalização × Sistema Geo</p>
          <p className="text-xs text-violet-700 mt-0.5 leading-relaxed">
            Reconcilia as duas bases de dados: identifica processos presentes nas duas (em comum),
            processos da Fiscalização sem registro no Sistema Geo, e obras do Sistema Geo ainda não fiscalizadas.
            Use os filtros da barra lateral para restringir a análise por permissionária, subprefeitura ou status.
          </p>
        </div>
      </div>

      {/* Aviso universo parcial */}
      {nFiltrosAtivos > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-700">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span><strong>Filtros ativos — universo parcial.</strong> Os dados abaixo refletem o subconjunto filtrado.</span>
        </div>
      )}

      {/* Conteúdo da aba ativa */}
      {abaAtiva === 'visao-geral'    && <AbaVisaoGeral    dados={dados} visibilidade={visibilidade} norcrestDrillDown={norcrestDrillDown} />}
      {abaAtiva === 'cobertura'      && <AbaCobertura     porPermissionaria={porPermissionaria} porPermSub={porPermSub} norcrestDrillDown={norcrestDrillDown} />}
      {abaAtiva === 'status-cruzado' && <AbaStatusCruzado
          matrizStatus={matrizStatus} topGeoStatuses={topGeoStatuses}
          matrizStatusInd={matrizStatusInd} topGeoStatusesInd={topGeoStatusesInd}
          divStatus={divStatus} />}
      {abaAtiva === 'linha-tempo'    && <AbaLinhaTempo    prazosBinsArr={prazosBinsArr} evolucaoMensal={evolucaoMensal} />}
      {abaAtiva === 'divergencias'   && <AbaDivergencias  soFisc={soFisc} divSubpref={divSubpref} soGeo={soGeo} />}
      {abaAtiva === 'executoras'     && <AbaExecutoras    porExecutora={porExecutora} />}
      {abaAtiva === 'mapa'           && <AbaMapa          porSubpref={porSubpref} />}
      {abaAtiva === 'busca'          && <AbaBusca         emComum={emComum} soFisc={soFisc} soGeo={soGeo} nFiltrosAtivos={nFiltrosAtivos} visibilidade={visibilidade} />}
    </div>
  )
}
