// Lista compartilhada de abas do módulo Análise Integrada.
// Usada pelo Header.jsx (renderiza as abas) e PaginaGeo4Cruzamento.jsx (renderiza o conteúdo).
// O campo `permissao` referencia o slug ai.* do banco (12-revisao-permissoes.sql).

export const ABAS_CRUZAMENTO = [
  { id: 'visao-geral',    label: 'Visão Geral',       icon: '👁️', permissao: 'ai.aba_geral'        },
  { id: 'cobertura',      label: 'Cobertura',          icon: '🎯', permissao: 'ai.aba_cobertura'    },
  { id: 'status-cruzado', label: 'Status Cruzado',     icon: '⚖️', permissao: 'ai.aba_status'       },
  { id: 'linha-tempo',    label: 'Linha do Tempo',     icon: '⏳', permissao: 'ai.aba_linha_tempo'  },
  { id: 'divergencias',   label: 'Divergências',       icon: '⚠️', permissao: 'ai.aba_divergencias' },
  { id: 'executoras',     label: 'Executoras',         icon: '🏗️', permissao: 'ai.aba_executoras'   },
  { id: 'mapa',           label: 'Mapa',               icon: '🗺️', permissao: 'ai.aba_mapa'         },
  { id: 'busca',          label: 'Busca por Processo', icon: '🔍', permissao: 'ai.aba_busca'        },
]
