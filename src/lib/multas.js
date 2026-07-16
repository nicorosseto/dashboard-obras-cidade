// Lógica pura do módulo "Multas" (Trilha A, A3 — cruzamento com processos):
// sem JSX, sem hooks, sem chamadas ao Supabase — mesmo padrão de
// src/lib/cruzamento.js e src/lib/emergencias.js. A3 do plano
// (docs/plano-melhorias-2026-07.md): cruza multas.num_processo_normalizado
// (já calculado pela Edge Function sync-multas) com sistemaGeo.processo e
// fiscalizacoes.id_origem via normProc, em memória no front — a UI (A4)
// ainda não existe, este módulo é a matéria-prima dela.
import { normProc } from './emergencias.js'

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

const SITUACOES_VINCULO = ['vinculado_sistemaGeo', 'vinculado_fiscalizacao', 'sem_processo', 'processo_nao_encontrado']

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
