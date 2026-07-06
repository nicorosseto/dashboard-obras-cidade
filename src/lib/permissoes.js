import { supabase } from './supabase.js'

// Espelho do catálogo do banco (supabase/schema/06-permissoes.sql + 12).
// Admin recebe todas; usuário comum recebe as do seu perfil de acesso.
export const TODAS_PERMISSOES = [
  'fisc.aba_geral',
  'fisc.aba_temporal',
  'fisc.aba_espacial',
  'fisc.aba_detalhes',
  'fisc.aba_executoras',
  'fisc.aba_processo',
  'fisc.exportar',
  'geo.aba_geral',
  'geo.aba_temporal',
  'geo.aba_subpref',
  'geo.aba_processo',
  'geo.exportar',
  'geo.aba_cruzamento',   // acesso ao módulo Análise Integrada (legado + compat.)
  'ai.aba_geral',
  'ai.aba_cobertura',
  'ai.aba_status',
  'ai.aba_linha_tempo',
  'ai.aba_divergencias',
  'ai.aba_executoras',
  'ai.aba_mapa',
  'ai.aba_busca',
  'emerg.ver',
  'emerg.upload',
  'emerg.aba_processo',
  'emerg.aba_prazo48h',
  'emerg.aba_motivo_invalido',
  'relatorio.ver',
]

// Permissão exigida por cada aba (id usado em paginaAtiva) de cada seção.
export const PERMISSAO_POR_ABA = {
  fiscalizacao: {
    1: 'fisc.aba_geral',
    2: 'fisc.aba_temporal',
    3: 'fisc.aba_espacial',
    4: 'fisc.aba_detalhes',
    6: 'fisc.aba_executoras',  // 5 é reservado para o painel Admin (ícone ⚙)
    7: 'fisc.aba_processo',
  },
  sistemaGeo: {
    1: 'geo.aba_geral',
    2: 'geo.aba_temporal',
    3: 'geo.aba_subpref',
    4: 'geo.aba_cruzamento',
    6: 'geo.aba_processo',     // 5 é reservado para o painel Admin (ícone ⚙)
  },
}

// Carrega o conjunto de permissões do usuário logado.
// Admin não consulta o banco: enxerga tudo por definição.
export async function carregarPermissoes(isAdmin) {
  if (isAdmin) return new Set(TODAS_PERMISSOES)
  const { data, error } = await supabase.rpc('minhas_permissoes')
  if (error) throw error
  return new Set(data || [])
}

// IDs das abas que o usuário pode ver numa seção, na ordem original.
export function abasPermitidas(permissoes, secao) {
  const mapa = PERMISSAO_POR_ABA[secao] || {}
  return Object.keys(mapa)
    .map(Number)
    .filter((id) => permissoes?.has(mapa[id]))
}

// Abas da Análise Integrada que o usuário pode ver.
// Quem tem geo.aba_cruzamento (permissão legada) vê todas.
// Quem tem permissões ai.* individuais vê só as concedidas.
export function abasCruzamentoPermitidas(permissoes, todasAbas) {
  if (!permissoes) return []
  if (permissoes.has('geo.aba_cruzamento')) return todasAbas
  return todasAbas.filter((a) => permissoes.has(a.permissao))
}
