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

// Cor por status individual (seção 8.2 do plano — funil/drill-down e
// "Status × Ano"). Grupados visualmente pela cor-base do status_grupo
// (verde = compatibilizada, âmbar = paralisada), mas cada status ganha um
// tom distinto para não confundir séries num gráfico empilhado.
export const STATUS_GT_COR = {
  'AEO EMITIDO': '#1F7A4D',
  LIBERAR: '#3FA872',
  'DOCS ASSINADOS': '#0EA5E9',
  'AGUARDANDO DELIBERAÇÃO': '#D97706',
  'AGUARDANDO COMUNIQUE-SE': '#F59E0B',
  'CAMILA VERIFICAR': '#8B5CF6',
  SEGURAR: '#EF4444',
  'NÃO EMITIR': '#6B7280',
  'AGUARDANDO ASSINATURA': '#EC4899',
  CANCELADO: '#9CA3AF',
}

// Os 5 status "parados esperando alguém" (painel "Pendências acionáveis",
// seção 8.2.2 do plano) — chave = texto exato da coluna STATUS, valor =
// quem precisa agir para destravar.
export const STATUS_PENDENCIA_ESPERA = {
  'AGUARDANDO DELIBERAÇÃO': 'Decisão interna OBRAS',
  'AGUARDANDO COMUNIQUE-SE': 'Resposta da permissionária',
  'CAMILA VERIFICAR': 'Conferência nominal',
  SEGURAR: 'Retido deliberadamente',
  'AGUARDANDO ASSINATURA': 'Assinatura',
}

// ── Texto de uma via (nome + trecho) — usado pela Lista e pela seção de
// Inconsistências, fonte única para não duplicar a lógica em 2 telas ──
// Trecho (De → Até) de uma via, ou string vazia se a planilha não trouxe
// nenhum dos dois (colunas G/H — distintas do nome da via, coluna F).
export function textoTrechoGt(via) {
  if (!via.trecho_de && !via.trecho_ate) return ''
  return `${via.trecho_de || '?'} → ${via.trecho_ate || '?'}`
}

// Texto plano (nome + trecho) de uma via, para tooltip/exportação — a
// versão em tela (JSX) destaca o nome em negrito à parte.
export function textoViaGt(via) {
  const partes = [via.nome_via, textoTrechoGt(via)].filter(Boolean)
  return partes.length ? partes.join(' — ') : '(via não informada)'
}

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

// Status individual × ano do processo (barras empilhadas, seção 8.2.3 do
// plano) — mais granular que `agregaGtStatusGrupoPorAno` (que só separa
// compatibilizada/paralisada): evidencia achados como "AGUARDANDO
// DELIBERAÇÃO concentra em 2026" que o agrupamento por status_grupo
// esconde (LIBERAR e AGUARDANDO DELIBERAÇÃO caem em grupos diferentes).
// Cada linha do retorno tem uma chave por status de `STATUS_GT` (0 quando
// ausente naquele ano) — pronta para um `<Bar>` por status com `stackId`.
export function agregaGtPorStatusEAno(linhas) {
  const porAno = new Map()
  for (const r of agruparGtPorProcesso(linhas)) {
    const ano = r.ano_processo
    if (!ano || !r.status) continue
    if (!porAno.has(ano)) {
      const bucket = { ano }
      for (const s of STATUS_GT) bucket[s] = 0
      porAno.set(ano, bucket)
    }
    const bucket = porAno.get(ano)
    if (bucket[r.status] === undefined) bucket[r.status] = 0
    bucket[r.status] += 1
  }
  return Array.from(porAno.values()).sort((a, b) => a.ano - b.ano)
}

// Painel "Pendências acionáveis" (seção 8.2.2 do plano) — separa o que
// está parado esperando alguém, com a metragem em risco de cada status.
// Mantém as 5 linhas mesmo com contagem zero (tabela estável, mesmo shape
// da planilha de referência do plano).
export function pendenciasAcionaveisGt(linhas) {
  const porStatus = new Map()
  for (const status of Object.keys(STATUS_PENDENCIA_ESPERA)) {
    porStatus.set(status, {
      status,
      esperaQuem: STATUS_PENDENCIA_ESPERA[status],
      qtd: 0,
      metragem: 0,
    })
  }
  for (const r of agruparGtPorProcesso(linhas)) {
    const bucket = porStatus.get(r.status)
    if (!bucket) continue
    bucket.qtd += 1
    bucket.metragem += Number(r.area_m2) || 0
  }
  const linhasPend = Array.from(porStatus.values())
  const totalQtd = linhasPend.reduce((acc, b) => acc + b.qtd, 0)
  const totalMetragem = linhasPend.reduce((acc, b) => acc + b.metragem, 0)
  return { linhas: linhasPend, totalQtd, totalMetragem }
}

// Metragem por status individual (seção 8.2.6 do plano) — não só
// contagem, quanto de m² está em cada etapa.
export function agregaGtMetragemPorStatus(linhas) {
  const m = new Map()
  for (const r of agruparGtPorProcesso(linhas)) {
    if (!r.status) continue
    m.set(r.status, (m.get(r.status) || 0) + (Number(r.area_m2) || 0))
  }
  return Array.from(m.entries())
    .map(([status, metragem]) => ({ status, metragem }))
    .sort((a, b) => b.metragem - a.metragem)
}

// Situação do recape × status da obra (matriz, seção 8.2.5 do plano) — o
// cruzamento que é a razão de ser do GT: obra ainda paralisada numa via
// cujo recape já está CONCLUÍDO é o pior caso (via nova que será aberta de
// novo). ⚠️ Opera no nível de VIA (linhas cruas, sem agrupar por
// processo) — a situação do recape é um atributo do trecho, não do
// processo (mesma ressalva de `agregaGtPorSituacaoRecape`).
export function matrizGtRecapeStatus(linhas) {
  const m = new Map()
  for (const r of linhas || []) {
    const situacao = r.situacao_recape_norm || 'SEM INFORMAÇÃO'
    if (!m.has(situacao)) {
      m.set(situacao, {
        situacao,
        compatibilizada: 0,
        paralisada: 0,
        nao_classificado: 0,
        total: 0,
      })
    }
    const bucket = m.get(situacao)
    const grupo = bucket[r.status_grupo] !== undefined ? r.status_grupo : 'nao_classificado'
    bucket[grupo] += 1
    bucket.total += 1
  }
  return Array.from(m.values()).sort((a, b) => b.total - a.total)
}

// "Pior caso" do cruzamento acima: recape já CONCLUÍDO mas obra ainda
// paralisada — a via será reaberta pela permissionária depois de recapeada.
export function recapeConcluidoParalisadoGt(linhas) {
  return (linhas || []).filter(
    (r) => r.situacao_recape_norm === 'CONCLUIDO' && r.status_grupo === 'paralisada'
  ).length
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
  // ⚠️ Confia só em `tipo_linha === 'total'` (já calculado pela Edge
  // Function via `startsWith('TOTAL GERAL')` — acha 27/07/2026: exigir
  // aqui também um match EXATO de "Total Geral" era mais rígido que a
  // classificação de origem e não achava a linha de totalização dos
  // blocos anuais quando o texto trazia algo além de "Total Geral" — a
  // soma dos anos saía zerada e virava uma "divergência" de -100% falsa,
  // completamente diferente do erro de 1 obra que este painel existe
  // para pegar).
  for (const d of gtDash || []) {
    if (d.tipo_linha === 'total') {
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
  // ⚠️ Bug corrigido (28/07/2026): `PLANEJADO` sozinho é um status VÁLIDO
  // (recape agendado, ainda não iniciado) — não é ambíguo. O caso real é
  // "PLANEJADO - CONCLUIDO" (mistura os dois), por isso a condição exige
  // os DOIS termos no mesmo texto, não só "PLANEJADO" isolado.
  const situacaoRecapeAmbigua = arr.filter((l) => {
    const norm = l.situacao_recape_norm || ''
    return (
      norm.includes(' OU ') ||
      (norm.includes('PLANEJADO') && norm.includes('CONCLU'))
    )
  })

  return { semProcesso, processoNaoEncontrado, duplicados, situacaoRecapeAmbigua }
}
