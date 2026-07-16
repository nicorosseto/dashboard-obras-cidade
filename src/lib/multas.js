// Lógica pura do módulo "Multas" (Trilha A, A3 — cruzamento com processos):
// sem JSX, sem hooks, sem chamadas ao Supabase — mesmo padrão de
// src/lib/cruzamento.js e src/lib/emergencias.js. A3 do plano
// (docs/plano-melhorias-2026-07.md): cruza multas.num_processo_normalizado
// (já calculado pela Edge Function sync-multas) com sistemaGeo.processo e
// fiscalizacoes.id_origem via normProc, em memória no front — a UI (A4)
// ainda não existe, este módulo é a matéria-prima dela.
import { normProc } from './emergencias.js'
import { consolidarNorcrest } from './aggregations.js'
import { RED } from './cores.js'

export function buildProcessoSet(linhas, campo) {
  const s = new Set()
  for (const r of linhas || []) {
    const chave = normProc(r[campo])
    if (chave) s.add(chave)
  }
  return s
}

// Situação do vínculo de uma multa com os processos de Sistema Geo/Fiscalização.
// Recalculada sempre em memória a partir de num_processo_normalizado — não
// depende do valor gravado em multas.situacao_vinculo (que a Edge Function só
// marca como 'sem_processo'/'nao_avaliado', sem acesso aos dados de
// sistemaGeo/fiscalizacoes).
export function situacaoVinculoDe(multa, geoSet, fiscSet) {
  const chave = multa?.num_processo_normalizado
  if (!chave) return 'sem_processo'
  if (geoSet.has(chave)) return 'vinculado_sistemaGeo'
  if (fiscSet.has(chave)) return 'vinculado_fiscalizacao'
  return 'processo_nao_encontrado'
}

// Cruza as multas com os processos carregados de Sistema Geo/Fiscalização,
// devolvendo cada linha enriquecida com `_situacao_vinculo`.
export function cruzarMultas(multasLinhas, sistemaGeoLinhas, fiscalizacaoLinhas) {
  const geoSet = buildProcessoSet(sistemaGeoLinhas, 'processo')
  const fiscSet = buildProcessoSet(fiscalizacaoLinhas, 'id_origem')
  return (multasLinhas || []).map((m) => ({
    ...m,
    _situacao_vinculo: situacaoVinculoDe(m, geoSet, fiscSet),
  }))
}

export const SITUACOES_VINCULO = ['vinculado_sistemaGeo', 'vinculado_fiscalizacao', 'sem_processo', 'processo_nao_encontrado']

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
    const key = grupos[m._situacao_vinculo] ? m._situacao_vinculo : 'processo_nao_encontrado'
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
    vinculadas: grupos.vinculado_sistemaGeo.length + grupos.vinculado_fiscalizacao.length,
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
// ordenado do maior para o menor.
export function agregaMultasPorPermissionaria(linhas, { consolidar = true } = {}) {
  const m = new Map()
  for (const r of linhas || []) {
    const key = consolidar ? consolidarNorcrest(r.permissionaria) : r.permissionaria || '(sem permissionária)'
    if (!key) continue
    m.set(key, (m.get(key) || 0) + 1)
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
