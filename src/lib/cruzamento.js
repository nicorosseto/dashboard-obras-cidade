// Lógica pura do módulo "Análise Integrada" (Cruzamento Fiscalização × Sistema Geo):
// cálculo, filtragem e montagem de linhas. Sem JSX, sem hooks, sem chamadas ao
// Supabase — mesmo padrão de src/lib/emergencias.js. Extraído de
// PaginaGeo4Cruzamento.jsx na Fase M5, Etapa 2.
import { consolidarNorcrest } from './aggregations.js'

export function norm(s) {
  return (s || '').trim().toLowerCase()
}

export function getPerm(p) {
  return consolidarNorcrest(p || '') || '(sem permissionária)'
}

export function fmtMes(yyyymm) {
  if (!yyyymm || yyyymm.length < 7) return yyyymm || ''
  const m = parseInt(yyyymm.slice(5, 7), 10) - 1
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${meses[m]}/${yyyymm.slice(2, 4)}`
}

export function diasEntre(dataA, dataB) {
  if (!dataA || !dataB) return null
  return Math.round((new Date(dataA) - new Date(dataB)) / 86400000)
}

export function binPrazo(dias) {
  if (dias === null) return 'Sem data'
  if (dias < 0) return '< 0 (retroativo)'
  if (dias < 30) return '< 30 dias'
  if (dias < 90) return '30–90 dias'
  if (dias < 180) return '90–180 dias'
  if (dias < 365) return '180–365 dias'
  return '> 365 dias'
}
export const ORDEM_BINS = ['< 0 (retroativo)', '< 30 dias', '30–90 dias', '90–180 dias', '180–365 dias', '> 365 dias', 'Sem data']

// ── Computação principal ─────────────────────────────────────────────────
export function computarCruzamento(rowsFisc, rowsGeo, consolidar = true) {
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

  // ── Cobertura por Permissionária ──────────────────────────────────────
  const normPerm = (p) => consolidar ? getPerm(p) : (p || '(sem permissionária)')
  const permMap = new Map()
  const addPerm = (perm, field) => {
    if (!permMap.has(perm)) permMap.set(perm, { perm, emComum: 0, soFisc: 0, soGeo: 0 })
    permMap.get(perm)[field]++
  }
  for (const r of soFisc) addPerm(normPerm(r.permissionaria), 'soFisc')
  for (const r of soGeo) addPerm(normPerm(r.permissionaria), 'soGeo')
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

  // ── Cobertura por Subprefeitura ───────────────────────────────────────
  const subMap = new Map()
  const addSub = (sub, field) => {
    const k = sub || '(sem)'
    if (!subMap.has(k)) subMap.set(k, { sub: k, emComum: 0, soFisc: 0, soGeo: 0 })
    subMap.get(k)[field]++
  }
  for (const r of soFisc) addSub(r.subprefeitura, 'soFisc')
  for (const r of soGeo) addSub(r.subprefeitura, 'soGeo')
  for (const { geo } of emComum) addSub(geo.subprefeitura, 'emComum')

  const porSubpref = Array.from(subMap.values()).map(s => {
    const totalGeo = s.emComum + s.soGeo
    return { ...s, totalGeo, pctCob: totalGeo > 0 ? Math.round((s.emComum / totalGeo) * 100) : 0 }
  }).sort((a, b) => a.pctCob - b.pctCob)

  // ── Matriz status fisc × status geo (agrupado e individual) ────────────
  const matrizMap = new Map()
  const matrizMapInd = new Map()
  const geoStatusCount = new Map()
  const geoStatusIndCount = new Map()
  for (const { fisc, geo } of emComum) {
    const sf = fisc.status_simplificado || '(sem)'
    const sg = geo.status_unificado || '(sem)'
    const sgi = geo.status_nome || geo.status || sg
    matrizMap.set(`${sf}||${sg}`, (matrizMap.get(`${sf}||${sg}`) || 0) + 1)
    matrizMapInd.set(`${sf}||${sgi}`, (matrizMapInd.get(`${sf}||${sgi}`) || 0) + 1)
    geoStatusCount.set(sg, (geoStatusCount.get(sg) || 0) + 1)
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

  // ── Linha do tempo ──────────────────────────────────────────────────────
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

  // ── Por Permissionária × Subprefeitura ─────────────────────────────────
  const geoPermSubCount = new Map()
  for (const r of rowsGeo) {
    const perm = normPerm(r.permissionaria)
    const sub = r.subprefeitura || '(sem)'
    const k = `${perm}||${sub}`
    geoPermSubCount.set(k, (geoPermSubCount.get(k) || 0) + 1)
  }
  const permSubMap = new Map()
  for (const { fisc, geo } of emComum) {
    const perm = normPerm(geo.permissionaria)
    const sub = geo.subprefeitura || '(sem)'
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

// ── Filtragem ───────────────────────────────────────────────────────────
export function filtrarParaCruzamento(rowsFisc, rowsGeo, filtros) {
  if (!filtros) return { fisc: rowsFisc, geo: rowsGeo }
  const permSet = filtros.permissionarias instanceof Set ? filtros.permissionarias : new Set()
  const subSet = filtros.subprefeituras instanceof Set ? filtros.subprefeituras : new Set()
  const sfSet = filtros.statusFisc instanceof Set ? filtros.statusFisc : new Set()
  const sgSet = filtros.statusGeo instanceof Set ? filtros.statusGeo : new Set()
  const etSet = filtros.etapas instanceof Set ? filtros.etapas : new Set()
  const tpSet = filtros.tiposProcesso instanceof Set ? filtros.tiposProcesso : new Set()

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

export function contarFiltrosAtivos(filtros) {
  if (!filtros) return 0
  const c = (f) => (f instanceof Set ? f.size : 0)
  const vis = filtros.visibilidade && filtros.visibilidade !== 'todos' ? 1 : 0
  return c(filtros.permissionarias) + c(filtros.subprefeituras) + c(filtros.statusFisc) +
    c(filtros.statusGeo) + c(filtros.etapas) + c(filtros.tiposProcesso) + vis
}

// ── Linhas da aba "Busca" ─────────────────────────────────────────────────
export function buildRows(emComum, soFisc, soGeo) {
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
