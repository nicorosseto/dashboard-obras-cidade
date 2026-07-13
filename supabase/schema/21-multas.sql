-- ============================================================
-- 21 — Multas (Trilha A, A1 — spike de sincronização)
-- ============================================================
-- Tabela que recebe a planilha "CONTROLE DE AÇÕES FISCAIS - OBRAS /
-- CORBETT" (aba "PENALIDADES CORBETT"), sincronizada por uma Edge Function
-- que baixa o .xlsx via Google Drive API e faz upsert aqui. Dashboard é
-- READ-ONLY (edição continua só na planilha) — decisão do usuário no A0.
--
-- ⚠️ Rodar nos DOIS bancos (obras-dev e produção). Idempotente.
--
-- Regra de ouro (A2 do plano): o dado cru da planilha nunca é
-- descartado — linhas problemáticas entram MARCADAS (situacao_vinculo),
-- não somem. `linha_planilha` guarda a rastreabilidade até a linha
-- original (cabeçalho real é a linha 8 da aba).
--
-- Chave de identificação escolhida: AUTO DA MULTA (`auto_multa`) — é a
-- melhor quase-chave levantada no A0 (8.010 distintos de 8.178 linhas,
-- só 1 duplicado real). Nº de processo NÃO é chave (repete de
-- propósito: 65 processos com mais de uma multa).

create table if not exists public.multas (
  id                       uuid        primary key default gen_random_uuid(),

  -- Colunas da planilha (nomes internos, valores crus — sem normalizar)
  num_processo             text,        -- "N° PROCESSO/ PROTOCOLO SISTEMA GEO"
  tipo_processo            text,
  lote                     text,
  permissionaria           text,        -- "PERMISSIONÁRIA/ CONCESSIONÁRIA"
  logradouro               text,
  subprefeitura            text,        -- "SUB"
  data_relatorio           date,
  area_m2                  numeric,
  data_encaminhamento      date,
  num_processo_sei         text,
  status_sei               text,
  data_infracao            date,
  hora_infracao            text,
  auto_multa               text,        -- "AUTO DA MULTA" — quase-chave
  data_auto_multa          date,
  num_demanda              text,
  sei_sgf                  text,
  gerada_por               text,
  status                   text,        -- LAVRADO / NÃO LAVRADO / PENDENTE
  valor                    numeric,     -- "VALOR (R$)", parseado de texto US
  defesa                   text,
  recurso                  text,
  fiscal                   text,
  motivo                   text,

  -- Colunas de tratamento (A2 do plano)
  num_processo_normalizado text,        -- via normProc(), casa com sistemaGeo/fiscalizacoes
  situacao_vinculo         text         not null default 'nao_avaliado'
                             check (situacao_vinculo in (
                               'vinculado_sistemaGeo',
                               'vinculado_fiscalizacao',
                               'sem_processo',
                               'processo_nao_encontrado',
                               'nao_avaliado'
                             )),
  linha_planilha           int,         -- nº da linha na aba (rastreabilidade)

  criado_em                timestamptz not null default now(),
  atualizado_em             timestamptz not null default now()
);

-- Upsert por AUTO DA MULTA quando presente; linhas sem auto_multa (168
-- na planilha levantada) são só inseridas (sem chave de dedup confiável).
create unique index if not exists multas_auto_multa_key
  on public.multas (auto_multa)
  where auto_multa is not null and auto_multa <> '';

create index if not exists multas_num_processo_normalizado_idx
  on public.multas (num_processo_normalizado);

create index if not exists multas_situacao_vinculo_idx
  on public.multas (situacao_vinculo);

alter table public.multas enable row level security;

-- Leitura só autenticado (mesmo padrão do sistemaGeo pós-09/06/2026).
drop policy if exists "multas_select_autenticado" on public.multas;
create policy "multas_select_autenticado"
  on public.multas for select
  to authenticated
  using (true);

-- Escrita só via service_role (a Edge Function de sincronização) — sem
-- política para authenticated/anon, igual ao sistemaGeo.

comment on table public.multas is
  'Multas da planilha "CONTROLE DE AÇÕES FISCAIS - OBRAS / CORBETT" (aba PENALIDADES CORBETT), sincronizada via Edge Function (Trilha A, A1). Read-only no dashboard.';

-- ============================================================
-- Configuração da sincronização (intervalo ajustável + status)
-- ============================================================
-- Linha única (id fixo) editável pelo admin para o intervalo do cron e
-- para o botão "Atualizar agora" registrar a última execução.

create table if not exists public.multas_sync_config (
  id                  int         primary key default 1 check (id = 1),
  intervalo_minutos   int         not null default 30 check (intervalo_minutos >= 5),
  ultima_sync_em      timestamptz,
  ultima_sync_status  text,        -- 'sucesso' | 'erro'
  ultima_sync_detalhe text,        -- mensagem de erro ou resumo (nº de linhas)
  atualizado_em       timestamptz not null default now()
);

insert into public.multas_sync_config (id) values (1)
  on conflict (id) do nothing;

alter table public.multas_sync_config enable row level security;

drop policy if exists "multas_sync_config_select_autenticado" on public.multas_sync_config;
create policy "multas_sync_config_select_autenticado"
  on public.multas_sync_config for select
  to authenticated
  using (true);

comment on table public.multas_sync_config is
  'Config de sincronização das Multas: intervalo do cron (minutos) e status da última execução. Escrita via service_role (Edge Function) ou admin (a definir no A4).';
