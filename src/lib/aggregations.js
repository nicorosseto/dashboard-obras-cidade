// Funcoes puras de agregacao para o dashboard. Todas recebem array de linhas
// e devolvem dados prontos para os componentes visuais. Tudo roda no browser.

import { SIGLA_TO_REGIAO, REGIOES } from '../data/subprefeituras-sp.js'

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
export function consolidarNorcrest(permissionaria) {
  if (!permissionaria) return permissionaria
  return String(permissionaria).toUpperCase().startsWith('NORCREST')
    ? 'NORCREST'
    : permissionaria
}

function isNorcrestRow(r) {
  if (r.grupo_norcrest === 'NORCREST') return true
  const p = r.permissionaria
  return p && String(p).toUpperCase().startsWith('NORCREST')
}

// ----------------------------------------------------------------------------
// Filtros
// ----------------------------------------------------------------------------
export function aplicarFiltros(rows, filtros) {
  const { dataIni, dataFim, permissionarias, subprefeituras, temNc } = filtros
  const permSet = permissionarias instanceof Set ? permissionarias : new Set()
  const subSet = subprefeituras instanceof Set ? subprefeituras : new Set()
  const usePerm = permSet.size > 0 && !permSet.has('TODAS')
  const useSub = subSet.size > 0 && !subSet.has('TODAS')
  const permHasNorcrest = permSet.has('NORCREST')

  return rows.filter((r) => {
    if (dataIni && (!r.data_inicio || r.data_inicio < dataIni)) return false
    if (dataFim && (!r.data_inicio || r.data_inicio > dataFim)) return false
    if (usePerm) {
      const ok =
        (permHasNorcrest && isNorcrestRow(r)) || permSet.has(r.permissionaria)
      if (!ok) return false
    }
    if (useSub && !subSet.has(r.subprefeitura)) return false
    if (temNc === true && !r.tem_nao_conformidade) return false
    if (temNc === false && r.tem_nao_conformidade) return false
    return true
  })
}

// Conta quantos registros NÃO têm o campo de data preenchido. Usado para
// avisar o usuário, ao filtrar por período, que esses registros ficam de fora
// (evita a sensação de que "sumiram dados"). `campo` = 'data_inicio'
// (Fiscalização) ou 'data_cadastro' (Sistema Geo).
export function contarSemData(rows, campo) {
  let n = 0
  for (const r of rows) if (!r[campo]) n++
  return n
}

export function listaPermissionarias(rows) {
  const set = new Set(rows.map((r) => r.permissionaria).filter(Boolean))
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'))
}

export function listaSubprefeituras(rows) {
  const set = new Set(rows.map((r) => r.subprefeitura).filter(Boolean))
  return Array.from(set).sort()
}

// Retorna Map<sigla, nome> para exibir o nome por extenso nos tooltips.
// Usa subprefeitura_nome quando disponível (view enriquecida).
export function mapaSubprefeituras(rows) {
  const mapa = new Map()
  for (const r of rows) {
    if (r.subprefeitura && r.subprefeitura_nome && !mapa.has(r.subprefeitura)) {
      mapa.set(r.subprefeitura, r.subprefeitura_nome)
    }
  }
  return mapa
}

export function listaAnos(rows) {
  const set = new Set()
  for (const r of rows) {
    if (r.data_inicio) set.add(parseInt(r.data_inicio.slice(0, 4), 10))
  }
  return Array.from(set).sort()
}

// ----------------------------------------------------------------------------
// KPIs estilo Power BI: % de NC sobre o total, % de Soluc/EmAnd sobre NC.
// ----------------------------------------------------------------------------
export function calcularKPIsPBI(rows) {
  const total = rows.length
  const legAtendida = rows.filter((r) => r.legislacao_atendida).length
  const naoConform = rows.filter((r) => r.tem_nao_conformidade).length
  const solucionados = rows.filter(
    (r) => r.tem_nao_conformidade && r.solucionado
  ).length
  const emAndamento = rows.filter(
    (r) => r.tem_nao_conformidade && r.em_andamento
  ).length

  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0)

  return {
    total,
    legAtendida,
    naoConform,
    solucionados,
    emAndamento,
    pctLegAtendida: pct(legAtendida, total),
    pctNaoConform: pct(naoConform, total),
    pctSolucNC: pct(solucionados, naoConform),
    pctEmAndNC: pct(emAndamento, naoConform),
    areaTotal: rows.reduce((s, r) => s + (Number(r.area_m2) || 0), 0),
  }
}

// ----------------------------------------------------------------------------
// Ranking de permissionarias agrupado por Legislacao Atendida vs Nao Atendida
// (formato para gráfico de barras agrupadas — pagina 1)
// Por padrão consolida todas as NORCREST/* numa só "NORCREST".
// ----------------------------------------------------------------------------
export function rankingLegislacaoVsNC(rows, limit = 7, consolidar = true) {
  const map = new Map()
  for (const r of rows) {
    const k = consolidar
      ? consolidarNorcrest(r.permissionaria)
      : r.permissionaria || '(sem)'
    if (!k) continue
    if (!map.has(k))
      map.set(k, { nome: k, leg_atendida: 0, nao_atendida: 0, total: 0 })
    const o = map.get(k)
    if (r.legislacao_atendida) o.leg_atendida++
    if (r.tem_nao_conformidade) o.nao_atendida++
    o.total++
  }
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

// ----------------------------------------------------------------------------
// Pagina 1: distribuicao Legislacao vs Nao Conformidades (donut esquerdo)
// e Solucionados vs Em Andamento dentro de NC (donut direito)
// ----------------------------------------------------------------------------
export function distribuicaoLegislacaoVsNC(rows) {
  const kpis = calcularKPIsPBI(rows)
  return [
    {
      nome: 'Legislação Atendida',
      valor: kpis.legAtendida,
      pct: kpis.pctLegAtendida,
    },
    {
      nome: 'Não Conformidades',
      valor: kpis.naoConform,
      pct: kpis.pctNaoConform,
    },
  ]
}

export function distribuicaoSolucVsEmAnd(rows) {
  const kpis = calcularKPIsPBI(rows)
  return [
    { nome: 'Solucionados', valor: kpis.solucionados, pct: kpis.pctSolucNC },
    { nome: 'Em andamento', valor: kpis.emAndamento, pct: kpis.pctEmAndNC },
  ]
}

// ----------------------------------------------------------------------------
// Evolucao temporal: anual, mensal, trimestral
// ----------------------------------------------------------------------------
function inicializaSerie() {
  return { leg_atendida: 0, nao_atendida: 0 }
}

export function evolucaoAnual(rows) {
  const map = new Map()
  for (const r of rows) {
    if (!r.data_inicio) continue
    const ano = r.data_inicio.slice(0, 4)
    if (!map.has(ano)) map.set(ano, { periodo: ano, ...inicializaSerie() })
    const o = map.get(ano)
    if (r.legislacao_atendida) o.leg_atendida++
    if (r.tem_nao_conformidade) o.nao_atendida++
  }
  return Array.from(map.values()).sort((a, b) =>
    a.periodo.localeCompare(b.periodo)
  )
}

export function evolucaoMensal(rows) {
  const map = new Map()
  for (const r of rows) {
    if (!r.data_inicio) continue
    const periodo = r.data_inicio.slice(0, 7) // YYYY-MM
    if (!map.has(periodo)) map.set(periodo, { periodo, ...inicializaSerie() })
    const o = map.get(periodo)
    if (r.legislacao_atendida) o.leg_atendida++
    if (r.tem_nao_conformidade) o.nao_atendida++
  }
  return Array.from(map.values()).sort((a, b) =>
    a.periodo.localeCompare(b.periodo)
  )
}

// Trimestres com filtro por status (default: solucionados, como no PBI)
export function evolucaoTrimestral(rows, statusFilter = 'solucionado') {
  const map = new Map()
  for (const r of rows) {
    const dataRef =
      statusFilter === 'solucionado' ? r.data_conclusao : r.data_inicio
    if (!dataRef) continue
    if (statusFilter === 'solucionado' && !r.solucionado) continue
    const ano = dataRef.slice(0, 4)
    const mes = parseInt(dataRef.slice(5, 7), 10)
    const t = `T${Math.ceil(mes / 3)}`
    const periodo = `${t} ${ano}`
    const sortKey = `${ano}-${t}`
    if (!map.has(sortKey))
      map.set(sortKey, { periodo, valor: 0, _sort: sortKey })
    map.get(sortKey).valor++
  }
  return Array.from(map.values()).sort((a, b) => a._sort.localeCompare(b._sort))
}

// ----------------------------------------------------------------------------
// Distribuicao geografica
// ----------------------------------------------------------------------------
export function contagemPorSubprefeitura(rows) {
  const map = new Map()
  for (const r of rows) {
    const k = r.subprefeitura || '(sem)'
    map.set(k, (map.get(k) || 0) + 1)
  }
  return map
}

export function contagemPorRegiao(rows) {
  const map = new Map(REGIOES.map((r) => [r, 0]))
  for (const r of rows) {
    const reg = SIGLA_TO_REGIAO[r.subprefeitura]
    if (reg) map.set(reg, (map.get(reg) || 0) + 1)
  }
  const total = Array.from(map.values()).reduce((s, n) => s + n, 0)
  return Array.from(map.entries()).map(([regiao, laudos]) => ({
    regiao,
    laudos,
    pct: total > 0 ? Math.round((laudos / total) * 100) : 0,
  }))
}

// ----------------------------------------------------------------------------
// Tipos de falha (10 categorias, ordenadas)
// ----------------------------------------------------------------------------
const TIPOS_FALHA = [
  { campo: 'falha_geometria', nome: 'Geometria' },
  { campo: 'falha_recomposicao', nome: 'Recomposição em desacordo' },
  { campo: 'falha_sinalizacao', nome: 'Sinalização em desacordo' },
  { campo: 'falha_sarjeta', nome: 'Sarjeta em desacordo' },
  { campo: 'falha_guia', nome: 'Guia em desacordo' },
  { campo: 'falha_reposicao', nome: 'Falha na reposição' },
  { campo: 'falha_trincas', nome: 'Trincas' },
  { campo: 'falha_afundamento', nome: 'Afundamento' },
  { campo: 'falha_nivelamento', nome: 'Nivelamento' },
  { campo: 'falha_outros', nome: 'Outros' },
]

export function rankingTiposFalha(rows) {
  return TIPOS_FALHA.map((t) => ({
    nome: t.nome,
    laudos: rows.filter((r) => r[t.campo]).length,
  })).sort((a, b) => b.laudos - a.laudos)
}

// ----------------------------------------------------------------------------
// Formatacao
// ----------------------------------------------------------------------------
export function fmtNumero(n) {
  return new Intl.NumberFormat('pt-BR').format(Math.round(n || 0))
}
// Sempre 2 casas decimais, padrao brasileiro (ex: "1.234,56")
export function fmtAreaDecimal(n) {
  if (n === null || n === undefined || n === '') return '-'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n))
}
// Converte "YYYY-MM-DD" em "DD/MM/AAAA"
export function fmtData(s) {
  if (!s) return '-'
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return s
  return `${m[3]}/${m[2]}/${m[1]}`
}

const TZ_SP = 'America/Sao_Paulo'

// Formata timestamp ISO (UTC) como "DD/MM/AAAA, HH:MM" no fuso de São Paulo
export function fmtDataHora(s) {
  if (!s) return '—'
  return new Date(s).toLocaleString('pt-BR', {
    timeZone: TZ_SP,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Formata timestamp ISO (UTC) como "DD/MM/AAAA" no fuso de São Paulo
export function fmtDataSP(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { timeZone: TZ_SP })
}

// ----------------------------------------------------------------------------
// Sistema Geo – filtros e KPIs
// ----------------------------------------------------------------------------
export function aplicarFiltrosGeo(rows, filtros) {
  const {
    dataIni,
    dataFim,
    permissionarias,
    subprefeituras,
    tiposProcesso,
    etapas,
    statusUnificados,
    tiposObra,
  } = filtros
  const permSet = permissionarias instanceof Set ? permissionarias : new Set()
  const subSet = subprefeituras instanceof Set ? subprefeituras : new Set()
  const tpSet = tiposProcesso instanceof Set ? tiposProcesso : new Set()
  const etSet = etapas instanceof Set ? etapas : new Set()
  const stSet = statusUnificados instanceof Set ? statusUnificados : new Set()
  const toSet = tiposObra instanceof Set ? tiposObra : new Set()

  const usePerm = permSet.size > 0 && !permSet.has('TODAS')
  const useSub = subSet.size > 0 && !subSet.has('TODAS')
  const useTp = tpSet.size > 0 && !tpSet.has('TODOS')
  const useEt = etSet.size > 0 && !etSet.has('TODAS')
  const useSt = stSet.size > 0 && !stSet.has('TODOS')
  const useTo = toSet.size > 0 && !toSet.has('TODOS')
  const permHasNorcrest = permSet.has('NORCREST')

  return rows.filter((r) => {
    if (dataIni && (!r.data_cadastro || r.data_cadastro < dataIni)) return false
    if (dataFim && (!r.data_cadastro || r.data_cadastro > dataFim)) return false
    if (usePerm) {
      const p = r.permissionaria
      const isNorcrest = p && String(p).toUpperCase().startsWith('NORCREST')
      const ok = (permHasNorcrest && isNorcrest) || permSet.has(p)
      if (!ok) return false
    }
    if (useSub && !subSet.has(r.subprefeitura)) return false
    if (useTp) {
      const tp = r.tipo_processo_nome || r.tipo_processo
      if (!tpSet.has(tp)) return false
    }
    if (useEt) {
      const et = r.etapa_nome || '(sem)'
      if (!etSet.has(et)) return false
    }
    if (useSt) {
      // Marcar um grupo no sidebar adiciona o grupo E todos os seus sub-status
      // ao conjunto. A linha passa pelo status INDIVIDUAL: assim, desmarcar um
      // sub-status exclui essas linhas mesmo com o grupo ainda marcado.
      const individual =
        r.status_nome || r.status || r.status_unificado || '(sem status)'
      if (!stSet.has(individual)) return false
    }
    if (useTo) {
      const to = r.tipo_obra_nome || r.tipo_obra || '(sem)'
      if (!toSet.has(to)) return false
    }
    return true
  })
}

export function listaAnosGeo(rows) {
  const set = new Set(
    rows.map((r) => r.data_cadastro?.slice(0, 4)).filter(Boolean)
  )
  return Array.from(set).sort().reverse()
}

// ----------------------------------------------------------------------------
// Sistema Geo – evolução temporal
// ----------------------------------------------------------------------------
export function evolucaoGeoAnual(rows) {
  const byYear = {}
  rows.forEach((r) => {
    const ano = r.data_cadastro?.slice(0, 4)
    if (!ano) return
    if (!byYear[ano])
      byYear[ano] = { ano, encerrados: 0, emAndamento: 0, total: 0 }
    byYear[ano].total++
    if (r.status_unificado === 'Obra Realizada') byYear[ano].encerrados++
    else if (
      !['Cancelamento', 'Processo Encerrado'].includes(r.status_unificado)
    )
      byYear[ano].emAndamento++
  })
  return Object.values(byYear).sort((a, b) => a.ano.localeCompare(b.ano))
}

export function evolucaoGeoMensal(rows) {
  const byMonth = {}
  rows.forEach((r) => {
    const m = r.data_cadastro?.slice(0, 7) // "2023-06"
    if (!m) return
    if (!byMonth[m])
      byMonth[m] = { mes: m, encerrados: 0, emAndamento: 0, total: 0 }
    byMonth[m].total++
    if (r.status_unificado === 'Obra Realizada') byMonth[m].encerrados++
    else if (
      !['Cancelamento', 'Processo Encerrado'].includes(r.status_unificado)
    )
      byMonth[m].emAndamento++
  })
  return Object.values(byMonth)
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-36)
}

// ----------------------------------------------------------------------------
// Sistema Geo – distribuição por subprefeitura
// ----------------------------------------------------------------------------
export function contagemPorSubprefeituraGeo(rows) {
  const map = new Map()
  for (const r of rows) {
    const k = r.subprefeitura || '(sem)'
    map.set(k, (map.get(k) || 0) + 1)
  }
  return map
}

// ----------------------------------------------------------------------------
// Sistema Geo – agregações para a Visão Geral fiel ao BI
// ----------------------------------------------------------------------------
export function topPermissionarias(rows, n = 10, consolidar = true) {
  const counts = {}
  for (const r of rows) {
    const raw = r.permissionaria
    if (!raw) continue
    const p = consolidar ? consolidarNorcrest(raw) : raw
    counts[p] = (counts[p] || 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([nome, count]) => ({ nome, count }))
}

export function topTiposProcesso(rows, n = 6) {
  const counts = {}
  for (const r of rows) {
    const t = r.tipo_processo_nome || r.tipo_processo || '(sem)'
    counts[t] = (counts[t] || 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([nome, count]) => ({ nome, count }))
}

export function topStatus(rows, n = 6) {
  const counts = {}
  for (const r of rows) {
    const s = r.status_unificado || r.status_nome || r.status || '(sem status)'
    counts[s] = (counts[s] || 0) + 1
  }
  const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const top = ordered.slice(0, n)
  const outros = ordered.slice(n).reduce((sum, [, v]) => sum + v, 0)
  const result = top.map(([nome, count]) => ({ nome, count }))
  if (outros > 0) result.push({ nome: 'Outros', count: outros })
  return result
}

export function tiposObraCount(rows) {
  const counts = {}
  for (const r of rows) {
    const t = r.tipo_obra_nome || r.tipo_obra || '(sem)'
    counts[t] = (counts[t] || 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([nome, count]) => ({ nome, count }))
}

export function mediaDiaria(rows, dataIni, dataFim) {
  if (!rows || rows.length === 0) return 0
  let inicio, fim
  if (dataIni && dataFim) {
    inicio = new Date(dataIni)
    fim = new Date(dataFim)
  } else {
    const datas = rows
      .map((r) => r.data_cadastro)
      .filter(Boolean)
      .sort()
    if (datas.length === 0) return rows.length
    inicio = new Date(datas[0])
    fim = new Date(datas[datas.length - 1])
  }
  const dias = Math.max(
    1,
    Math.round((fim - inicio) / (1000 * 60 * 60 * 24)) + 1
  )
  return Math.round(rows.length / dias)
}

export function maisProtocolos(rows) {
  const tops = topPermissionarias(rows, 1, true)
  return tops[0]?.nome || '—'
}

export function pctPermissionaria(filtered, all, permissionariasSet) {
  if (
    !permissionariasSet ||
    permissionariasSet.size === 0 ||
    permissionariasSet.has('TODAS')
  )
    return 100
  return all.length > 0 ? (filtered.length / all.length) * 100 : 0
}

// ----------------------------------------------------------------------------
// Sistema Geo – Linha do tempo
// ----------------------------------------------------------------------------
export function totaisAnuais(rows) {
  const byYear = {}
  for (const r of rows) {
    const ano = r.data_cadastro?.slice(0, 4)
    if (!ano) continue
    byYear[ano] = (byYear[ano] || 0) + 1
  }
  return Object.entries(byYear)
    .map(([ano, count]) => ({ label: ano, value: count }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function totaisMensais(rows) {
  const byMonth = {}
  for (const r of rows) {
    const m = r.data_cadastro?.slice(0, 7)
    if (!m) continue
    byMonth[m] = (byMonth[m] || 0) + 1
  }
  return Object.entries(byMonth)
    .map(([mes, count]) => ({ label: mes, value: count }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function totaisDiarios(rows) {
  const byDay = {}
  for (const r of rows) {
    const d = r.data_cadastro?.slice(0, 10)
    if (!d) continue
    byDay[d] = (byDay[d] || 0) + 1
  }
  return Object.entries(byDay)
    .map(([dia, count]) => ({ label: dia, value: count }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function comparativoAnualPorMes(rows) {
  const meses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  const byMonthYear = {}
  const anos = new Set()
  for (const r of rows) {
    const d = r.data_cadastro
    if (!d) continue
    const ano = d.slice(0, 4)
    const mes = parseInt(d.slice(5, 7), 10) - 1
    if (mes < 0 || mes > 11) continue
    if (!byMonthYear[mes]) byMonthYear[mes] = {}
    byMonthYear[mes][ano] = (byMonthYear[mes][ano] || 0) + 1
    anos.add(ano)
  }
  const anosArr = Array.from(anos).sort()
  return {
    anos: anosArr,
    data: meses.map((nome, i) => ({
      mes: nome,
      ...anosArr.reduce(
        (obj, ano) => ({ ...obj, [ano]: byMonthYear[i]?.[ano] || 0 }),
        {}
      ),
    })),
  }
}

// ----------------------------------------------------------------------------
// Sistema Geo – por região
// ----------------------------------------------------------------------------
export function processosPorRegiao(rows, mapRegiao = SIGLA_TO_REGIAO) {
  const counts = {}
  for (const r of rows) {
    const reg = mapRegiao[r.subprefeitura] || 'Não classificado'
    counts[reg] = (counts[reg] || 0) + 1
  }
  const total = rows.length
  return Object.entries(counts)
    .map(([regiao, count]) => ({
      regiao,
      count,
      pct: total ? Number(((count / total) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

// ----------------------------------------------------------------------------
// Compartilhado entre módulos (Fase M5, Frente 3, Etapa 4 — extraído de App.jsx)
// ----------------------------------------------------------------------------

// Data da atualização mais recente entre as duas bases: máximo entre
// `data_inicio` (Fiscalização) e `data_cadastro` (Sistema Geo).
export function ultimaAtualizacao(rowsFisc, rowsGeo) {
  let maior = ''
  for (const r of rowsFisc) {
    if (r.data_inicio && r.data_inicio > maior) maior = r.data_inicio
  }
  for (const r of rowsGeo) {
    if (r.data_cadastro && r.data_cadastro > maior) maior = r.data_cadastro
  }
  return maior || null
}

// Conta quantos filtros da barra lateral estão ativos — usado no badge da
// aba "Busca por Processo". `camposSet`: nomes de campos do tipo Set (soma
// o .size de cada um); `extras`: funções opcionais (filtros, ex.: temNc)
// que somam 1 quando retornam true.
export function contarFiltrosAtivos(filtros, { camposSet = [], extras = [] } = {}) {
  let n = filtros.dataIni || filtros.dataFim ? 1 : 0
  for (const campo of camposSet) n += filtros[campo]?.size ?? 0
  for (const extra of extras) if (extra(filtros)) n += 1
  return n
}

// Clique numa subprefeitura do mapa: seleciona só ela; clicar de novo na
// mesma (quando é a única selecionada) limpa o filtro. Devolve o próximo
// Set — quem chama decide em qual campo do objeto de filtros gravar.
export function toggleSubSelecionada(atual, sigla) {
  if (atual.size === 1 && atual.has(sigla)) return new Set()
  return new Set([sigla])
}
