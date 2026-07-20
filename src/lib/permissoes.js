// ⚠️ Sem import estático do supabase.js aqui: ele lança erro no topo do
// módulo quando faltam as variáveis de ambiente, o que quebrava os testes
// em node (CI) que importam só o catálogo puro (ex.: tour.test.js). O
// carregarPermissoes importa sob demanda — é async e só roda no navegador.

import { ehModoDemo } from './demo.js'

// Espelho do catálogo do banco (supabase/schema/06-permissoes.sql + 12).
// Admin recebe todas; usuário comum recebe as do seu perfil de acesso.
export const TODAS_PERMISSOES = [
  'fisc.aba_geral',
  'fisc.aba_temporal',
  'fisc.aba_espacial',
  'fisc.aba_executoras',
  'fisc.aba_processo',
  'fisc.exportar',
  'geo.aba_geral',
  'geo.aba_temporal',
  'geo.aba_subpref',
  'geo.aba_processo',
  'geo.exportar',
  'geo.aba_cruzamento', // acesso ao módulo Análise Integrada (legado + compat.)
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
  'multas.ver',
  'multas.aba_inconsistencias',
  'multas.aba_busca',
  'multas.atualizar',
]

// Permissão exigida por cada aba (id usado em paginaAtiva) de cada seção.
export const PERMISSAO_POR_ABA = {
  fiscalizacao: {
    1: 'fisc.aba_geral',
    2: 'fisc.aba_temporal',
    3: 'fisc.aba_espacial',
    6: 'fisc.aba_executoras', // 4 (Detalhes) foi eliminada e o 5 é reservado para o painel Admin (ícone ⚙)
    7: 'fisc.aba_processo',
  },
  sistemaGeo: {
    1: 'geo.aba_geral',
    2: 'geo.aba_temporal',
    3: 'geo.aba_subpref',
    4: 'geo.aba_cruzamento',
    6: 'geo.aba_processo', // 5 é reservado para o painel Admin (ícone ⚙)
  },
}

// Permissões que o visitante da demo NUNCA recebe, mesmo sendo todas de
// visualização: upload/atualização de dados (não há gravação no modo demo),
// nada de admin (o visitante nunca é admin — ver DEMO_PROFILE), e o módulo
// Apresentação (decisão do usuário em 19/07/2026 — fora do escopo do
// portfólio público por ora).
const EXCLUIDAS_DEMO = new Set([
  'emerg.upload',
  'multas.atualizar',
  'relatorio.ver',
])

// Conjunto de permissões do visitante da demo: todas as de visualização do
// catálogo, exceto as de escrita. Exportada também para o gerador de testes.
export function permissoesDemo() {
  return new Set(TODAS_PERMISSOES.filter((p) => !EXCLUIDAS_DEMO.has(p)))
}

// Carrega o conjunto de permissões do usuário logado.
// Modo demo: nunca consulta o banco — devolve o conjunto fixo do visitante.
// Admin não consulta o banco: enxerga tudo por definição.
export async function carregarPermissoes(isAdmin) {
  if (ehModoDemo()) return permissoesDemo()
  if (isAdmin) return new Set(TODAS_PERMISSOES)
  const { supabase } = await import('./supabase.js')
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
