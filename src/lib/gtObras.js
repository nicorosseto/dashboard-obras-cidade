// Lógica pura do módulo "GT Obras" (compatibilização de obras ×
// programação de recape) — sem JSX, sem hooks, sem chamadas ao Supabase,
// mesmo padrão de src/lib/multas.js. Cruza gt_obras.num_processo_normalizado
// (já calculado pela Edge Function sync-gt-obras) com sistemaGeo.processo e
// fiscalizacoes.id_origem via normProc, em memória no front.
//
// `status_grupo` ('compatibilizada' | 'paralisada' | 'nao_classificado') já
// vem GRAVADO em cada linha pela Edge Function (regra do D1) — este módulo
// nunca reclassifica status, só lê o campo.
import { consolidarNorcrest } from './aggregations.js'
import { normUnidadeNorcrest } from './relatorio.js'
import { buildProcessoMap } from './multas.js'

// ── Cruzamento com Sistema Geo/Fiscalização (mesmo padrão de cruzarMultas) ──

export function cruzarGtObras(gtLinhas, sistemaGeoLinhas, fiscalizacaoLinhas) {
  const geoMap = buildProcessoMap(sistemaGeoLinhas, 'processo')
  const fiscMap = buildProcessoMap(
    fiscalizacaoLinhas,
    'id_origem',
    'data_inicio'
  )
  return (gtLinhas || []).map((l) => {
    const chave = l?.num_processo_normalizado
    const geo = chave ? geoMap.get(chave) : null
    const fisc = chave ? fiscMap.get(chave) : null
    let situacaoVinculo = 'sem_processo'
    if (chave) {
      if (geoMap.has(chave)) situacaoVinculo = 'vinculado_sistemaGeo'
      else if (fiscMap.has(chave)) situacaoVinculo = 'vinculado_fiscalizacao'
      else situacaoVinculo = 'processo_nao_encontrado'
    }
    return {
      ...l,
      _situacao_vinculo: situacaoVinculo,
      _permissionaria_exibir: geo?.permissionaria || l.permissionaria,
      _status_geo: geo?.status_unificado || null,
      _status_geo_nome: geo?.status_nome || null,
      _status_fisc: fisc?.status_simplificado || null,
    }
  })
}

// ── Grupos de status (D1) — rótulo/cor para a UI ──────────────────────
// A classificação em si (qual status cai em qual grupo) já vem gravada
// em `status_grupo` pela Edge Function — aqui só o rótulo/cor de exibição.
export const STATUS_GRUPO_LABEL = {
  compatibilizada: 'Compatibilizada',
  paralisada: 'Paralisada',
  nao_classificado: 'Não classificado',
}

export const STATUS_GRUPO_COR = {
  compatibilizada: '#1F7A4D',
  paralisada: '#D97706',
  nao_classificado: '#9CA3AF',
}

// Os 10 valores possíveis da coluna STATUS (seção 2.2 do plano) — para
// popular filtros/legendas sem depender de já ter dado carregado.
export const STATUS_GT = [
  'AEO EMITIDO',
  'LIBERAR',
  'DOCS ASSINADOS',
  'AGUARDANDO DELIBERAÇÃO',
  'AGUARDANDO COMUNIQUE-SE',
  'CAMILA VERIFICAR',
  'SEGURAR',
  'NÃO EMITIR',
  'AGUARDANDO ASSINATURA',
  'CANCELADO',
]

// ── Agrupamento por processo (achado do usuário, 27/07/2026) ──────────
// Um processo pode ter mais de uma via/trecho na aba "COMPATIB. CAMILA"
// (célula mesclada no Excel para permissionária/status/etc. — a Edge
// Function já "preenche para baixo" esses campos). Sem agrupar, cada
// trecho vira uma linha própria e todo KPI/gráfico contaria o mesmo
// processo várias vezes. `agruparGtPorProcesso` funde as linhas de um
// mesmo processo em UM registro: mantém os campos de processo (iguais em
// todas as vias), SOMA a área de todas as vias em `area_m2` e lista os
// trechos em `_vias` (usado pela Lista para exibir sem duplicar a linha).
// Linhas sem processo não têm como agrupar — cada uma vira seu próprio
// "processo" (mesmo padrão de `_situacao_vinculo: 'sem_processo'`).
export function agruparGtPorProcesso(linhas) {
  const porProcesso = new Map()
  const semProcesso = []
  for (const l of linhas || []) {
    const via = {
      nome_via: l.nome_via,
      trecho_de: l.trecho_de,
      trecho_ate: l.trecho_ate,
      area_m2: Number(l.area_m2) || 0,
      situacao_recape: l.situacao_recape_norm,
      data_conclusao: l.data_conclusao,
    }
    const chave = l.num_processo_normalizado
    if (!chave) {
      semProcesso.push({ ...l, area_m2: via.area_m2, _vias: [via], _qtd_vias: 1 })
      continue
    }
    if (!porProcesso.has(chave)) {
      porProcesso.set(chave, { ...l, area_m2: 0, _vias: [], _qtd_vias: 0 })
    }
    const grupo = porProcesso.get(chave)
    grupo.area_m2 += via.area_m2
    grupo._vias.push(via)
    grupo._qtd_vias += 1
  }
  return [...porProcesso.values(), ...semProcesso]
}

// ── KPIs (os 5 indicadores pedidos — seção 1.3 do plano) ──────────────
// Conta PROCESSOS (via agruparGtPorProcesso), não linhas — um processo com
// 3 vias é 1 obra, não 3. `pct` é devolvido como número 0-100 (pronto para
// exibir "76%") — ⚠️ diferente de `gt_dash.pct_compatibilizada`, que vem da
// planilha como fração 0-1 (célula formatada como %) e precisa de ×100 na
// exibição.
export function kpisGt(linhas) {
  const arr = agruparGtPorProcesso(linhas)
  const compatibilizadas = arr.filter(
    (l) => l.status_grupo === 'compatibilizada'
  ).length
  const paralisadas = arr.filter((l) => l.status_grupo === 'paralisada').length
  const metragem = arr
    .filter((l) => l.status_grupo === 'compatibilizada')
    .reduce((acc, l) => acc + (Number(l.area_m2) || 0), 0)
  const total = arr.length
  const pct = total > 0 ? (compatibilizadas / total) * 100 : 0
  return { total, compatibilizadas, paralisadas, metragem, pct }
}

// ── Agregações para os gráficos (seção 8.1/8.2 do plano) ──────────────
// Todas contam por PROCESSO (agruparGtPorProcesso), não por via/linha —
// exceto `agregaGtPorSituacaoRecape`, que é sobre a via (a situação do
// recape pode ser diferente entre os trechos de um mesmo processo).

export function agregaGtPorStatusGrupo(linhas) {
  const m = new Map()
  for (const r of agruparGtPorProcesso(linhas)) {
    const grupo = r.status_grupo || 'nao_classificado'
    m.set(grupo, (m.get(grupo) || 0) + 1)
  }
  return Object.keys(STATUS_GRUPO_LABEL)
    .map((grupo) => ({
      grupo,
      nome: STATUS_GRUPO_LABEL[grupo],
      cor: STATUS_GRUPO_COR[grupo],
      qtd: m.get(grupo) || 0,
    }))
    .filter((g) => g.qtd > 0)
}

// Drill-down por status individual (dentro de um grupo já filtrado, ou
// dos 10 valores inteiros se nada estiver filtrado).
export function agregaGtPorStatus(linhas) {
  const m = new Map()
  for (const r of agruparGtPorProcesso(linhas)) {
    const status = r.status || 'Sem status'
    m.set(status, (m.get(status) || 0) + 1)
  }
  return Array.from(m.entries())
    .map(([status, qtd]) => ({ status, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
}

export function agregaGtPorPermissionaria(linhas, { consolidar = true } = {}) {
  const m = new Map()
  for (const r of agruparGtPorProcesso(linhas)) {
    const bruta = r._permissionaria_exibir || r.permissionaria
    const key = consolidar
      ? consolidarNorcrest(bruta)
      : bruta || '(sem permissionária)'
    if (!key) continue
    m.set(key, (m.get(key) || 0) + 1)
  }
  return Array.from(m.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
}

// Verdadeiro quando TODAS as linhas (já filtradas) são da NORCREST —
// critério para trocar o gráfico "por permissionária" pelo drill-down por
// unidade (mesmo padrão de `todasNorcrest` em multas.js).
export function todasGtNorcrest(linhas) {
  const arr = linhas || []
  return (
    arr.length > 0 &&
    arr.every((r) =>
      String(r._permissionaria_exibir || r.permissionaria || '')
        .toUpperCase()
        .startsWith('NORCREST')
    )
  )
}

// Usa `unidade_norcrest` já separado pela Edge Function (não reimplementa o
// parsing de "NORCREST/QX" aqui) — só agrupa NCRV/NCRS→NCR etc. via
// `normUnidadeNorcrest` (relatorio.js).
export function agregaGtPorUnidadeNorcrest(linhas) {
  const m = new Map()
  for (const r of agruparGtPorProcesso(linhas)) {
    const unidade = r.unidade_norcrest
      ? normUnidadeNorcrest(r.unidade_norcrest)
      : 'NORCREST'
    m.set(unidade, (m.get(unidade) || 0) + 1)
  }
  return Array.from(m.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
}

export function agregaGtPorSubprefeitura(linhas) {
  const m = new Map()
  for (const r of agruparGtPorProcesso(linhas)) {
    const key = r.subprefeitura
    if (!key) continue
    m.set(key, (m.get(key) || 0) + 1)
  }
  return Array.from(m.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
}

export function agregaGtPorAno(linhas) {
  const m = new Map()
  for (const r of agruparGtPorProcesso(linhas)) {
    const ano = r.ano_processo
    if (!ano) continue
    m.set(ano, (m.get(ano) || 0) + 1)
  }
  return Array.from(m.entries())
    .map(([ano, total]) => ({ ano, total }))
    .sort((a, b) => a.ano - b.ano)
}

// Status × ano do processo (barras empilhadas — separa passivo antigo de
// fluxo corrente, seção 8.2.3 do plano).
export function agregaGtStatusGrupoPorAno(linhas) {
  const porAno = new Map()
  for (const r of agruparGtPorProcesso(linhas)) {
    const ano = r.ano_processo
    if (!ano) continue
    if (!porAno.has(ano)) {
      porAno.set(ano, {
        ano,
        compatibilizada: 0,
        paralisada: 0,
        nao_classificado: 0,
      })
    }
    const bucket = porAno.get(ano)
    const grupo =
      bucket[r.status_grupo] !== undefined ? r.status_grupo : 'nao_classificado'
    bucket[grupo] += 1
  }
  return Array.from(porAno.values()).sort((a, b) => a.ano - b.ano)
}

// Carga por técnica (coluna X) + taxa de compatibilização de cada uma
// (seção 8.2.4). Normaliza só caixa/espaço (não há campo dedicado na
// Edge Function para isso — ver dominio.md, achado 2.4 "Daniela vs
// DANIELA") — a exibição usa a própria chave normalizada.
export function agregaGtPorTecnica(linhas) {
  const m = new Map()
  for (const r of agruparGtPorProcesso(linhas)) {
    const key = String(r.tecnica_analise || '').trim().toUpperCase()
    if (!key) continue
    if (!m.has(key)) m.set(key, { tecnica: key, total: 0, compatibilizadas: 0 })
    const bucket = m.get(key)
    bucket.total += 1
    if (r.status_grupo === 'compatibilizada') bucket.compatibilizadas += 1
  }
  return Array.from(m.values())
    .map((b) => ({
      ...b,
      pct: b.total > 0 ? (b.compatibilizadas / b.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

// ⚠️ Fica no nível de VIA (não agrupa por processo, ao contrário das
// demais agregações acima) — a situação do recape é um atributo do
// trecho, e um processo com várias vias pode ter recapes em situações
// diferentes por trecho.
export function agregaGtPorSituacaoRecape(linhas) {
  const m = new Map()
  for (const r of linhas || []) {
    const key = r.situacao_recape_norm || 'SEM INFORMAÇÃO'
    m.set(key, (m.get(key) || 0) + 1)
  }
  return Array.from(m.entries())
    .map(([situacao, total]) => ({ situacao, total }))
    .sort((a, b) => b.total - a.total)
}

// ── Filtros da sidebar (padrão SidebarMultas — FILTROS_VAZIOS_MULTAS) ──

export const FILTROS_VAZIOS_GT = {
  permissionarias: new Set(),
  statusGrupo: new Set(),
  subprefeituras: new Set(),
  anos: new Set(),
}

export function contarFiltrosAtivosGt(filtros) {
  const c = (s) => (s instanceof Set ? s.size : 0)
  return (
    c(filtros.permissionarias) +
    c(filtros.statusGrupo) +
    c(filtros.subprefeituras) +
    c(filtros.anos)
  )
}

export function aplicarFiltrosGt(linhas, filtros) {
  const { permissionarias, statusGrupo, subprefeituras, anos } = filtros || {}
  const permSet = permissionarias instanceof Set ? permissionarias : new Set()
  const statusSet = statusGrupo instanceof Set ? statusGrupo : new Set()
  const subSet = subprefeituras instanceof Set ? subprefeituras : new Set()
  const anoSet = anos instanceof Set ? anos : new Set()
  const usaNorcrestCons = permSet.has('NORCREST')

  return (linhas || []).filter((r) => {
    if (permSet.size > 0) {
      const p = r._permissionaria_exibir || r.permissionaria || ''
      if (usaNorcrestCons && String(p).toUpperCase().startsWith('NORCREST')) {
        // ok — consolidado
      } else if (!permSet.has(p)) {
        return false
      }
    }
    if (statusSet.size > 0 && !statusSet.has(r.status_grupo)) return false
    if (subSet.size > 0 && !subSet.has(r.subprefeitura)) return false
    if (anoSet.size > 0 && !anoSet.has(r.ano_processo)) return false
    return true
  })
}

// ── Conferência DASH × base recalculada (D2, seção 8.3) ───────────────
// ⚠️ Escopo desta 1ª versão: só a divergência JÁ CONFIRMADA (soma dos 3
// blocos anuais do gt_dash ≠ bloco "total_geral" — 3.135 somado vs. 3.134
// declarado, achado de 27/07/2026). Recalcular por permissionária a partir
// da base granular (gt_obras) e comparar com cada linha do gt_dash não é
// feito aqui ainda: a base só cobre bem 2025/2026 (2023/2024 têm poucas
// linhas na aba COMPATIB. CAMILA), então a comparação linha a linha
// produziria divergência esperada em quase todo bloco 2023/2024 — não é
// "erro da planilha", é cobertura de dado diferente. Ver seção 9
// ("futuro") do plano para recalcular 2023/2024 do zero com as abas-base.
export function conferirDashVsBase(gtDash) {
  const divergencias = []
  const totalGeralPorBloco = new Map()
  for (const d of gtDash || []) {
    if (
      d.tipo_linha === 'total' &&
      /^total geral$/i.test(String(d.permissionaria || '').trim())
    ) {
      totalGeralPorBloco.set(d.bloco, d)
    }
  }

  const somaAnos = {
    qtde_obras: 0,
    obras_compatibilizadas: 0,
    obras_paralisadas: 0,
  }
  for (const bloco of ['2023', '2024', '2025_2026']) {
    const linha = totalGeralPorBloco.get(bloco)
    if (!linha) continue
    somaAnos.qtde_obras += Number(linha.qtde_obras) || 0
    somaAnos.obras_compatibilizadas += Number(linha.obras_compatibilizadas) || 0
    somaAnos.obras_paralisadas += Number(linha.obras_paralisadas) || 0
  }

  const totalGeralDeclarado = totalGeralPorBloco.get('total_geral')
  if (totalGeralDeclarado) {
    const campos = [
      ['qtde_obras', 'Qtde de Obras'],
      ['obras_compatibilizadas', 'Obras compatibilizadas'],
      ['obras_paralisadas', 'Obras paralisadas'],
    ]
    for (const [campo, label] of campos) {
      const somado = somaAnos[campo]
      const declarado = Number(totalGeralDeclarado[campo]) || 0
      if (somado !== declarado) {
        divergencias.push({
          tipo: 'soma_anos_diverge',
          campo: label,
          somaDosAnos: somado,
          totalGeralDeclarado: declarado,
          diferenca: somado - declarado,
        })
      }
    }
  }
  return divergencias
}

// ── Inconsistências (seção 8.3 do plano) ──────────────────────────────
// Recebe linhas já cruzadas (cruzarGtObras) — precisa de `_situacao_vinculo`.
export function inconsistenciasGt(linhasCruzadas) {
  const arr = linhasCruzadas || []
  const semProcesso = arr.filter((l) => l._situacao_vinculo === 'sem_processo')
  const processoNaoEncontrado = arr.filter(
    (l) => l._situacao_vinculo === 'processo_nao_encontrado'
  )

  // ⚠️ Chave inclui a via (nome_via + trechos) — mesmo processo com vias
  // DIFERENTES é normal (processo com várias vias/trechos, achado do
  // usuário em 27/07/2026, tratado em agruparGtPorProcesso), não uma
  // duplicata. Só conta como duplicado quando processo E via são iguais.
  const porProcessoVia = new Map()
  for (const l of arr) {
    const chave = l.num_processo_normalizado
    if (!chave) continue
    const chaveVia = `${chave}|${l.nome_via || ''}|${l.trecho_de || ''}|${l.trecho_ate || ''}`
    if (!porProcessoVia.has(chaveVia)) porProcessoVia.set(chaveVia, [])
    porProcessoVia.get(chaveVia).push(l)
  }
  const duplicados = Array.from(porProcessoVia.values())
    .filter((g) => g.length > 1)
    .flat()

  // Grafias ambíguas da situação do recape (seção 2.4 item 5) — valores
  // que misturam duas situações no mesmo texto, não dá para resolver por
  // normalização de acento/caixa (essas já foram unificadas por
  // situacao_recape_norm). Fica como conferência manual.
  const situacaoRecapeAmbigua = arr.filter((l) => {
    const norm = l.situacao_recape_norm || ''
    return norm.includes(' OU ') || norm.includes('PLANEJADO')
  })

  return { semProcesso, processoNaoEncontrado, duplicados, situacaoRecapeAmbigua }
}
