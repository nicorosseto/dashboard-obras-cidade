// Listas compartilhadas de abas por módulo — usadas pelo Header.jsx (renderiza
// as abas) e por App.jsx (título da tela ativa, via TituloTela).

export const ABAS_FISC = [
  { id: 1, label: 'Visão Geral', icon: '👁️' },
  { id: 2, label: 'Evolução Temporal', icon: '📈' },
  { id: 3, label: 'Distribuição Espacial', icon: '🗺️' },
  { id: 6, label: 'Executoras', icon: '🏢' },
  { id: 7, label: 'Busca por Processo', icon: '🔍' },
]

export const ABAS_GEO = [
  { id: 1, label: 'Visão Geral', icon: '👁️' },
  { id: 2, label: 'Linha do Tempo', icon: '⏳' },
  { id: 3, label: 'Subprefeitura', icon: '📍' },
  { id: 6, label: 'Busca por Processo', icon: '🔍' },
]

export const ABAS_ADMIN = [
  { id: 0, label: 'Usuários', icon: '👤' },
  { id: 1, label: 'Perfis de Acesso', icon: '🛡️' },
  { id: 2, label: 'Atualizar Dados', icon: '🔄' },
  { id: 3, label: 'Log de Acessos', icon: '📋' },
]

export const ABAS_EMERG = [
  { id: 'geral', label: 'Visão Geral', icon: '👁️' },
  { id: 'informadas', label: 'Informadas', icon: '🚨' },
  { id: 'prazo48h', label: 'Prazo 48h', icon: '⏱️' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'busca', label: 'Busca por Processo', icon: '🔍' },
  { id: 'motivo_invalido', label: 'Motivo Inválido', icon: '🔄' },
  { id: 'historico', label: 'Histórico', icon: '🕑' },
]

export const ABAS_MULTAS = [
  { id: 'geral', label: 'Visão Geral', icon: '👁️' },
  { id: 'inconsistencias', label: 'Inconsistências', icon: '⚠️' },
  { id: 'busca', label: 'Busca/Lista', icon: '🔍' },
]

export function labelDaAba(lista, id) {
  return lista.find((a) => a.id === id)?.label ?? ''
}
