// Lógica pura do módulo "Multas" (Trilha A, A3 — cruzamento com processos):
// sem JSX, sem hooks, sem chamadas ao Supabase — mesmo padrão de
// src/lib/cruzamento.js e src/lib/emergencias.js. A3 do plano
// (docs/plano-melhorias-2026-07.md): cruza multas.num_processo_normalizado
// (já calculado pela Edge Function sync-multas) com sistemaGeo.processo e
// fiscalizacoes.id_origem via normProc, em memória no front — a UI (A4)
// ainda não existe, este módulo é a matéria-prima dela.
import { normProc } from './emergencias.js'
import { consolidarNorcrest } from './aggregations.js'
import { normUnidadeNorcrest } from './relatorio.js'
import { RED } from './cores.js'

export function buildProcessoSet(linhas, campo) {
  const s = new Set()
  for (const r of linhas || []) {
    const chave = normProc(r[campo])
    if (chave) s.add(chave)
  }
  return s
}

// Mapa chave normalizada (normProc) → linha, para enriquecer a multa com os
// dados reais de Sistema Geo/Fiscalização (não só marcar presença, como o
// `buildProcessoSet` — usado no item A3/Trilha melhorias de 16/07/2026:
// permissionária/status "como estão no Sistema Geo"). `Map` tem `.has()` igual
// `Set`, então serve direto onde antes só se usava o Set (`situacaoVinculoDe`).
// ⚠️ A fiscalização pode ter MÚLTIPLAS linhas por id_origem (vários laudos);
// quando `dataCampo` é informado, mantém a linha com a data mais recente
// (mesmo critério do `buildVistoriaMap` de emergencias.js). Sem `dataCampo`
// (caso do Sistema Geo, ~1 linha por processo), fica a última encontrada.
export function buildProcessoMap(linhas, campo, dataCampo = null) {
  const m = new Map()
  for (const r of linhas || []) {
    const chave = normProc(r[campo])
    if (!chave) continue
    if (!dataCampo) {
      m.set(chave, r)
      continue
    }
    const existente = m.get(chave)
    if (!existente) {
      m.set(chave, r)
      continue
    }
    const a = r[dataCampo] || ''
    const b = existente[dataCampo] || ''
    if (a > b) m.set(chave, r)
  }
  return m
}

// Situação do vínculo de uma multa com os processos de Sistema Geo/Fiscalização.
// Recalculada sempre em memória a partir de num_processo_normalizado — não
// depende do valor gravado em multas.situacao_vinculo (que a Edge Function só
// marca como 'sem_processo'/'nao_avaliado', sem acesso aos dados de
// sistemaGeo/fiscalizacoes). Aceita Set (checagem de presença) ou Map
// (enriquecimento) — ambos têm `.has()`.
export function situacaoVinculoDe(multa, geoSet, fiscSet) {
  const chave = multa?.num_processo_normalizado
  if (!chave) return 'sem_processo'
  if (geoSet.has(chave)) return 'vinculado_sistemaGeo'
  if (fiscSet.has(chave)) return 'vinculado_fiscalizacao'
  return 'processo_nao_encontrado'
}

// Cruza as multas com os processos carregados de Sistema Geo/Fiscalização,
// devolvendo cada linha enriquecida com `_situacao_vinculo` e, quando há
// vínculo, com os campos "como estão" na base de origem (melhoria de
// 16/07/2026, validação da homologação):
//   - `_permissionaria_exibir`: nome da permissionária no padrão do Sistema Geo
//     (`geo.permissionaria`), com fallback para o texto cru da planilha de
//     multas quando não há vínculo com o Sistema Geo.
//   - `_status_geo` / `_status_geo_nome`: status unificado (grupo) e o status
//     real (para tooltip), no mesmo padrão de `cruzamento.js` (`buildRows`).
//   - `_status_fisc`: status simplificado da Fiscalização (laudo mais
//     recente, quando há mais de um por processo).
export function cruzarMultas(multasLinhas, sistemaGeoLinhas, fiscalizacaoLinhas) {
  const geoMap = buildProcessoMap(sistemaGeoLinhas, 'processo')
  const fiscMap = buildProcessoMap(
    fiscalizacaoLinhas,
    'id_origem',
    'data_inicio'
  )
  return (multasLinhas || []).map((m) => {
    const chave = m?.num_processo_normalizado
    const geo = chave ? geoMap.get(chave) : null
    const fisc = chave ? fiscMap.get(chave) : null
    return {
      ...m,
      _situacao_vinculo: situacaoVinculoDe(m, geoMap, fiscMap),
      _permissionaria_exibir: geo?.permissionaria || m.permissionaria,
      _status_geo: geo?.status_unificado || null,
      _status_geo_nome: geo?.status_nome || null,
      _status_fisc: fisc?.status_simplificado || null,
    }
  })
}

export const SITUACOES_VINCULO = [
  'vinculado_sistemaGeo',
  'vinculado_fiscalizacao',
  'sem_processo',
  'processo_nao_encontrado',
]

// Rótulos e cores amigáveis da situação de vínculo (badges, legendas, donut).
export const SITUACAO_VINCULO_LABEL = {
  vinculado_sistemaGeo: 'Vinculada (Sistema Geo)',
  vinculado_fiscalizacao: 'Vinculada (Fiscalização)',
  sem_processo: 'Sem processo',
  processo_nao_encontrado: 'Processo inexistente',
}

export const SITUACAO_VINCULO_COR = {
  vinculado_sistemaGeo: '#1F7A4D',
  vinculado_fiscalizacao: '#3B82F6',
  sem_processo: '#9CA3AF',
  processo_nao_encontrado: RED,
}

// Agrupa multas já cruzadas (via cruzarMultas) por situação de vínculo.
export function agruparPorVinculo(multasCruzadas) {
  const grupos = Object.fromEntries(SITUACOES_VINCULO.map((s) => [s, []]))
  for (const m of multasCruzadas || []) {
    const key = grupos[m._situacao_vinculo]
      ? m._situacao_vinculo
      : 'processo_nao_encontrado'
    grupos[key].push(m)
  }
  return grupos
}

// As 3 visões da tela (A4): vinculadas (a Sistema Geo ou Fiscalização), de
// processo inexistente (tem nº de processo, mas não bate com nenhuma base) e
// sem processo (planilha não trouxe nº de processo).
export function resumoVinculo(multasCruzadas) {
  const grupos = agruparPorVinculo(multasCruzadas)
  return {
    total: multasCruzadas?.length || 0,
    vinculadas:
      grupos.vinculado_sistemaGeo.length + grupos.vinculado_fiscalizacao.length,
    vinculadoSistemaGeo: grupos.vinculado_sistemaGeo.length,
    vinculadoFiscalizacao: grupos.vinculado_fiscalizacao.length,
    processoInexistente: grupos.processo_nao_encontrado.length,
    semProcesso: grupos.sem_processo.length,
  }
}

// Distribuição por situação de vínculo pronta para o donut da Visão Geral
// (A4) — só os baldes com pelo menos 1 multa, já com label/cor.
export function agregaSituacaoVinculo(multasCruzadas) {
  const grupos = agruparPorVinculo(multasCruzadas)
  return SITUACOES_VINCULO.map((s) => ({
    situacao: s,
    nome: SITUACAO_VINCULO_LABEL[s],
    cor: SITUACAO_VINCULO_COR[s],
    qtd: grupos[s].length,
  })).filter((g) => g.qtd > 0)
}

// ── Agregações para os gráficos/KPIs da Visão Geral (A4) ──────────────

// Formata um valor numérico como moeda BRL ("R$ 1.234,56"). Aceita null/undefined.
export function fmtValorBRL(valor) {
  const n = Number(valor) || 0
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Soma o campo `valor` de uma lista de multas.
export function valorTotalMultas(linhas) {
  return (linhas || []).reduce((acc, m) => acc + (Number(m.valor) || 0), 0)
}

// Agrupa por permissionária (consolidando unidades NORCREST por padrão, mesma
// régua usada nas demais telas do sistema), devolvendo [{ nome, total }]
// ordenado do maior para o menor. Usa `_permissionaria_exibir` (nome no
// padrão do Sistema Geo, quando a multa está vinculada — item 3 da melhoria de
// 16/07/2026), com fallback para o texto cru da planilha.
export function agregaMultasPorPermissionaria(
  linhas,
  { consolidar = true } = {}
) {
  const m = new Map()
  for (const r of linhas || []) {
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

// Agrupa por subprefeitura (coluna "SUB" da planilha, já em sigla — mesmo
// padrão de `agregaPorSubprefeitura` de emergencias.js), devolvendo
// [{ nome, total }] ordenado do maior para o menor.
export function agregaMultasPorSubprefeitura(linhas) {
  const m = new Map()
  for (const r of linhas || []) {
    const key = r.subprefeitura
    if (!key) continue
    m.set(key, (m.get(key) || 0) + 1)
  }
  return Array.from(m.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
}

// Multas sem número de processo (planilha não trouxe o dado) são ruído para
// as métricas gerais — não representam obras/processos reais a acompanhar.
// A Visão Geral (KPIs e gráficos) exclui essas linhas; a auditoria delas
// fica só na seção de Inconsistências (dentro da aba Lista). Melhoria de
// 16/07/2026, 2ª rodada de feedback.
export function excluirSemProcesso(linhas) {
  return (linhas || []).filter((r) => r._situacao_vinculo !== 'sem_processo')
}

// ── Drill-down NORCREST por unidade (mesmo padrão usado em toda a base NORCREST
// do sistema — ver AbaMotivosInvalidos.jsx e relatorio.js) ────────────────

// Verdadeiro quando TODAS as linhas (já filtradas) são da NORCREST — critério
// para trocar o gráfico "por permissionária" pelo drill-down por unidade.
export function todasNorcrest(linhas) {
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

// Agrupa as multas por unidade da NORCREST (NCRV/NCRS → NCR, NCJV/NCJL → NCJ,
// via `normUnidadeNorcrest` de relatorio.js — não reimplementar o agrupamento
// aqui). Linhas sem unidade identificável (ex.: "NORCREST" solto, sem sufixo)
// caem no balde "NORCREST".
export function agregaMultasPorUnidadeNorcrest(linhas) {
  const m = new Map()
  for (const r of linhas || []) {
    const bruta = String(r._permissionaria_exibir || r.permissionaria || '')
    const match = bruta.match(/NORCREST\s*[-–/]*\s*(.+)$/i)
    const unidadeCrua = match ? match[1].replace(/^[-–/\s]+/, '').trim() : ''
    const unidade = unidadeCrua ? normUnidadeNorcrest(unidadeCrua) : 'NORCREST'
    m.set(unidade, (m.get(unidade) || 0) + 1)
  }
  return Array.from(m.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
}

// Agrupa por status da multa (LAVRADO / NÃO LAVRADO / PENDENTE / vazio).
export function agregaMultasPorStatus(linhas) {
  const m = new Map()
  for (const r of linhas || []) {
    const status = r.status || 'Sem status'
    m.set(status, (m.get(status) || 0) + 1)
  }
  return Array.from(m.entries())
    .map(([status, qtd]) => ({ status, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
}

// Agrupa por mês da infração (YYYY-MM), a partir de `data_infracao`. Linhas
// sem data ficam de fora (mesmo padrão de `evolucaoMensal` de emergencias.js).
export function agregaMultasPorMes(linhas) {
  const m = new Map()
  for (const r of linhas || []) {
    if (!r.data_infracao) continue
    const mes = String(r.data_infracao).slice(0, 7)
    m.set(mes, (m.get(mes) || 0) + 1)
  }
  return Array.from(m.entries())
    .map(([mes, qtd]) => ({ mes, qtd }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
}

// ── Filtros da sidebar (item 1 da melhoria de 16/07/2026) ────────────────
// Mesmo padrão de `FILTROS_VAZIOS_EMERG`/`aplicarFiltrosEmerg` de
// emergencias.js: Sets para multi-seleção, permissionária casa pelo valor
// consolidado/exibido (`_permissionaria_exibir`, com fallback ao cru) e as
// datas comparam string ISO (`data_infracao`, formato `AAAA-MM-DD`).
export const FILTROS_VAZIOS_MULTAS = {
  dataIni: null,
  dataFim: null,
  permissionarias: new Set(),
  status: new Set(),
  situacaoVinculo: new Set(),
  subprefeituras: new Set(),
}

export function contarFiltrosAtivosMultas(filtros) {
  const c = (s) => (s instanceof Set ? s.size : 0)
  return (
    (filtros.dataIni ? 1 : 0) +
    (filtros.dataFim ? 1 : 0) +
    c(filtros.permissionarias) +
    c(filtros.status) +
    c(filtros.situacaoVinculo) +
    c(filtros.subprefeituras)
  )
}

export function aplicarFiltrosMultas(linhas, filtros) {
  const {
    dataIni,
    dataFim,
    permissionarias,
    status,
    situacaoVinculo,
    subprefeituras,
  } = filtros || {}
  const permSet = permissionarias instanceof Set ? permissionarias : new Set()
  const statusSet = status instanceof Set ? status : new Set()
  const vinculoSet =
    situacaoVinculo instanceof Set ? situacaoVinculo : new Set()
  const subSet = subprefeituras instanceof Set ? subprefeituras : new Set()
  const usaNorcrestCons = permSet.has('NORCREST')

  return (linhas || []).filter((r) => {
    if (dataIni && (!r.data_infracao || r.data_infracao < dataIni)) return false
    if (dataFim && (!r.data_infracao || r.data_infracao > dataFim)) return false
    if (permSet.size > 0) {
      const p = r._permissionaria_exibir || r.permissionaria || ''
      if (usaNorcrestCons && String(p).toUpperCase().startsWith('NORCREST')) {
        // ok — consolidado
      } else if (!permSet.has(p)) {
        return false
      }
    }
    if (statusSet.size > 0 && !statusSet.has(r.status || 'Sem status'))
      return false
    if (vinculoSet.size > 0 && !vinculoSet.has(r._situacao_vinculo))
      return false
    if (subSet.size > 0 && !subSet.has(r.subprefeitura)) return false
    return true
  })
}
