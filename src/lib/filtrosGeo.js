// Estado inicial (vazio) dos filtros do módulo Sistema Geo.
// Mora num arquivo próprio (e não no SidebarSistemaGeo) para não quebrar o
// Fast Refresh do Vite — um arquivo de componente deve exportar só componentes.

export const FILTROS_GEO_VAZIOS = {
  dataIni: null,
  dataFim: null,
  permissionarias: new Set(),
  subprefeituras: new Set(),
  tiposProcesso: new Set(),
  etapas: new Set(),
  statusUnificados: new Set(),
  tiposObra: new Set(),
}
