// Dados fictícios do painel de Configurações no modo demo (portfólio
// público — ver `demo.js` e o bloco "Modo demo" em `.claude/rules/dominio.md`).
//
// O visitante da demo pode abrir Configurações (App.jsx, `podeVerConfiguracoes`),
// mas nunca é admin de verdade e o modo demo não faz NENHUMA chamada ao
// Supabase — então as abas "Usuários" e "Perfis de Acesso" (AbaUsuariosDemo,
// AbaPerfisDemo) e o histórico de "Atualizar Dados" (AtualizarDadosDemo)
// mostram esta massa de dados escrita à mão, plausível mas 100% fictícia
// (sem nomes reais). Baixo volume — não precisa de gerador/script como o
// `scripts/gerar-dados-demo.mjs` (esse gera as bases grandes de Sistema Geo/
// Fiscalização/Emergências/Multas).

import { TODAS_PERMISSOES } from './permissoes.js'

// ── Perfis de acesso fictícios ──────────────────────────────────────
export const PERFIS_DEMO = [
  {
    id: 1,
    nome: 'Visualização completa',
    descricao: 'Acesso de leitura a todos os módulos do sistema.',
  },
  {
    id: 2,
    nome: 'Fiscalização',
    descricao: 'Acesso ao módulo de Fiscalização de vias.',
  },
  {
    id: 3,
    nome: 'Sistema Geo',
    descricao:
      'Acesso ao módulo de infraestrutura por subprefeitura (Sistema Geo).',
  },
  {
    id: 4,
    nome: 'Emergências',
    descricao: 'Acompanhamento de emergências e prazos de atendimento.',
  },
  {
    id: 5,
    nome: 'Multas',
    descricao: 'Consulta às multas aplicadas e cruzamento com processos.',
  },
]

// Ações de escrita nunca entram num perfil fictício de demonstração — o
// modo demo é só leitura (mesmo critério de `EXCLUIDAS_DEMO` em permissoes.js).
const SOMENTE_LEITURA = TODAS_PERMISSOES.filter(
  (c) => c !== 'emerg.upload' && c !== 'multas.atualizar'
)
const porPrefixo = (prefixo) =>
  SOMENTE_LEITURA.filter((c) => c.startsWith(prefixo))

// Mapa perfil (id) → Set de códigos de permissão, usando os códigos REAIS
// do catálogo (`TODAS_PERMISSOES`) — assim a matriz da aba Perfis fica
// coerente com o sistema de verdade, mesmo sendo dados de demonstração.
export const PERFIL_PERMISSOES_DEMO = {
  1: new Set(SOMENTE_LEITURA), // Visualização completa: quase tudo
  2: new Set(porPrefixo('fisc.')), // Fiscalização
  3: new Set(porPrefixo('geo.')), // Sistema Geo
  4: new Set(porPrefixo('emerg.')), // Emergências
  5: new Set(porPrefixo('multas.')), // Multas
}

// Módulo de cada código de permissão — só para agrupar a matriz da aba
// Perfis no modo demo (a tabela real `permissoes_catalogo` não é
// consultada). Segue a mesma convenção de prefixo do catálogo real.
export function moduloDoCodigo(codigo) {
  if (codigo.startsWith('fisc.')) return 'fiscalizacao'
  if (codigo === 'geo.aba_cruzamento' || codigo.startsWith('ai.'))
    return 'analise_integrada'
  if (codigo.startsWith('geo.')) return 'sistemaGeo'
  if (codigo.startsWith('emerg.')) return 'emergencias'
  if (codigo.startsWith('relatorio.')) return 'relatorio'
  if (codigo.startsWith('multas.')) return 'multas'
  return 'outro'
}

// Catálogo demo: mesma forma de {codigo, modulo} que a tabela real —
// usado por AbaPerfisDemo.jsx para desenhar a matriz agrupada por módulo.
export const CATALOGO_DEMO = TODAS_PERMISSOES.map((codigo) => ({
  codigo,
  modulo: moduloDoCodigo(codigo),
}))

// ── Usuários fictícios (espelham a tabela `profiles`) ───────────────
// username/e-mail são só exemplos genéricos (@obras.app = domínio interno,
// mesma convenção do sistema real) — nenhum nome real.
export const USUARIOS_DEMO = [
  {
    id: 'demo-user-01',
    username: 'admin.demo',
    email: 'admin.demo@obras.app',
    role: 'admin',
    ativo: true,
    perfil_acesso_id: null,
    created_at: '2024-03-11T09:00:00-03:00',
  },
  {
    id: 'demo-user-02',
    username: 'maria.souza',
    email: 'maria.souza@obras.app',
    role: 'user',
    ativo: true,
    perfil_acesso_id: 1,
    created_at: '2024-05-02T13:20:00-03:00',
  },
  {
    id: 'demo-user-03',
    username: 'joao.lima',
    email: 'joao.lima@obras.app',
    role: 'user',
    ativo: true,
    perfil_acesso_id: 2,
    created_at: '2024-06-18T10:45:00-03:00',
  },
  {
    id: 'demo-user-04',
    username: 'ana.pereira',
    email: 'ana.pereira@obras.app',
    role: 'user',
    ativo: false,
    perfil_acesso_id: 3,
    created_at: '2024-09-30T16:05:00-03:00',
  },
  {
    id: 'demo-user-05',
    username: 'carlos.santos',
    email: 'carlos.santos@obras.app',
    role: 'user',
    ativo: true,
    perfil_acesso_id: 3,
    created_at: '2025-01-14T08:30:00-03:00',
  },
  {
    id: 'demo-user-06',
    username: 'patricia.oliveira',
    email: 'patricia.oliveira@obras.app',
    role: 'user',
    ativo: true,
    perfil_acesso_id: 4,
    created_at: '2025-03-22T11:10:00-03:00',
  },
  {
    id: 'demo-user-07',
    username: 'rafael.costa',
    email: 'rafael.costa@obras.app',
    role: 'user',
    ativo: false,
    perfil_acesso_id: null,
    created_at: '2025-06-09T14:50:00-03:00',
  },
  {
    id: 'demo-user-08',
    username: 'juliana.almeida',
    email: 'juliana.almeida@obras.app',
    role: 'user',
    ativo: true,
    perfil_acesso_id: 5,
    created_at: '2025-08-27T09:40:00-03:00',
  },
  {
    id: 'demo-user-09',
    username: 'bruno.ferreira',
    email: 'bruno.ferreira@obras.app',
    role: 'user',
    ativo: true,
    perfil_acesso_id: 2,
    created_at: '2025-11-05T15:15:00-03:00',
  },
  {
    id: 'demo-user-10',
    username: 'camila.rodrigues',
    email: 'camila.rodrigues@obras.app',
    role: 'admin',
    ativo: true,
    perfil_acesso_id: null,
    created_at: '2026-02-19T10:00:00-03:00',
  },
]

// ── Histórico de importações fictício (espelha `importacoes_snapshots`) ──
// Mesmas colunas consultadas por `HistoricoImportacoes`/`TabelaHistoricoImportacoes`
// em AtualizarDados.jsx: id, fonte, nome_arquivo, total_linhas,
// duplicados_removidos, status_novos, uploaded_by_email, uploaded_at.
export const SNAPSHOTS_DEMO = [
  {
    id: 'demo-snap-01',
    fonte: 'sistemaGeo',
    nome_arquivo: 'consolidado_sistemaGeo ref 07-2026.xlsx',
    total_linhas: 8214,
    duplicados_removidos: 37,
    status_novos: [],
    uploaded_by_email: 'admin.demo@obras.app',
    uploaded_at: '2026-07-05T08:12:00-03:00',
  },
  {
    id: 'demo-snap-02',
    fonte: 'fiscalizacoes',
    nome_arquivo: 'consolidado_fiscalizacao ref 04-07-2026.xlsx',
    total_linhas: 6532,
    duplicados_removidos: 12,
    status_novos: [{ status: 'Em Reanálise', grupo: 'Verificar Novo Status' }],
    uploaded_by_email: 'admin.demo@obras.app',
    uploaded_at: '2026-07-04T17:40:00-03:00',
  },
  {
    id: 'demo-snap-03',
    fonte: 'sistemaGeo',
    nome_arquivo: 'consolidado_sistemaGeo ref 06-2026.xlsx',
    total_linhas: 7998,
    duplicados_removidos: 41,
    status_novos: [],
    uploaded_by_email: 'camila.rodrigues@obras.app',
    uploaded_at: '2026-06-03T09:05:00-03:00',
  },
  {
    id: 'demo-snap-04',
    fonte: 'fiscalizacoes',
    nome_arquivo: 'consolidado_fiscalizacao ref 02-06-2026.xlsx',
    total_linhas: 6104,
    duplicados_removidos: 9,
    status_novos: [],
    uploaded_by_email: 'admin.demo@obras.app',
    uploaded_at: '2026-06-02T14:22:00-03:00',
  },
  {
    id: 'demo-snap-05',
    fonte: 'sistemaGeo',
    nome_arquivo: 'consolidado_sistemaGeo ref 05-2026.xlsx',
    total_linhas: 7711,
    duplicados_removidos: 28,
    status_novos: [{ status: 'Obra Paralisada', grupo: 'Em Andamento' }],
    uploaded_by_email: 'camila.rodrigues@obras.app',
    uploaded_at: '2026-05-04T10:50:00-03:00',
  },
  {
    id: 'demo-snap-06',
    fonte: 'fiscalizacoes',
    nome_arquivo: 'consolidado_fiscalizacao ref 30-04-2026.xlsx',
    total_linhas: 5876,
    duplicados_removidos: 15,
    status_novos: [],
    uploaded_by_email: 'admin.demo@obras.app',
    uploaded_at: '2026-04-30T16:00:00-03:00',
  },
  {
    id: 'demo-snap-07',
    fonte: 'sistemaGeo',
    nome_arquivo: 'consolidado_sistemaGeo ref 04-2026.xlsx',
    total_linhas: 7422,
    duplicados_removidos: 19,
    status_novos: [],
    uploaded_by_email: 'admin.demo@obras.app',
    uploaded_at: '2026-04-02T08:35:00-03:00',
  },
  {
    id: 'demo-snap-08',
    fonte: 'fiscalizacoes',
    nome_arquivo: 'consolidado_fiscalizacao ref 01-04-2026.xlsx',
    total_linhas: 5590,
    duplicados_removidos: 6,
    status_novos: [],
    uploaded_by_email: 'camila.rodrigues@obras.app',
    uploaded_at: '2026-04-01T09:18:00-03:00',
  },
]
