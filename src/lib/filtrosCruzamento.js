// Estado inicial (vazio) dos filtros do módulo Cruzamento.
// Arquivo separado para não quebrar o Fast Refresh do Vite.

export const FILTROS_CRUZAMENTO_VAZIOS = {
  permissionarias: new Set(),
  subprefeituras: new Set(),
  statusFisc: new Set(),     // status_simplificado
  statusGeo: new Set(),      // status_unificado
  etapas: new Set(),         // etapa_nome
  tiposProcesso: new Set(),  // tipo_processo_nome
  visibilidade: 'todos',     // 'todos' | 'so-fisc' | 'em-comum' | 'so-geo'
}
