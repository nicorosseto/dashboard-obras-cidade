-- ============================================================
-- 24 — GT Obras (compatibilização de obras × recape)
-- ============================================================
-- Tabelas que recebem a planilha "[GT - Obras]" (PROCESSOS_SISTEMA GEO -
-- 2026.xlsx, Google Drive), abas "COMPATIB. CAMILA" (granular) e
-- "DASH (GT)" (consolidado), sincronizadas por uma Edge Function
-- (sync-gt-obras) que baixa o .xlsx via Google Drive API e faz upsert
-- aqui. Dashboard é READ-ONLY (edição continua só na planilha, pela área
-- do GT) — mesma filosofia do módulo Multas.
--
-- ⚠️ Rodar nos DOIS bancos (obras-dev e produção). Idempotente.
--
-- Decisões de negócio (docs/plano-modulo-gt-obras.md, seção 3):
-- D1 — "obra compatibilizada" = status AEO EMITIDO ou LIBERAR; os outros
--      8 status (AGUARDANDO DELIBERAÇÃO, CANCELADO, DOCS ASSINADOS,
--      AGUARDANDO COMUNIQUE-SE, CAMILA VERIFICAR, SEGURAR, NÃO EMITIR,
--      AGUARDANDO ASSINATURA) contam todos como "paralisada" — dicotomia
--      binária, decisão do usuário em 27/07/2026. `status_grupo` também
--      aceita 'nao_classificado' como rede de segurança: se a planilha
--      (viva, editada por várias pessoas) trouxer um status novo/nunca
--      visto, a linha entra MARCADA em vez de quebrar a sincronização ou
--      cair silenciosamente num dos dois grupos errado.
-- D2 — o "DASH (GT)" é espelhado (gt_dash) E recalculado a partir da base
--      granular (em memória, no front); `tem_erro_formula` sinaliza as
--      divergências já confirmadas pelo usuário via screenshot (soma dos
--      anos ≠ Total Geral do bloco consolidado; linhas onde
--      compatibilizadas + paralisadas ≠ qtde_obras).
--
-- Chave de upsert: nº de processo NÃO é único (48 processos aparecem em
-- mais de uma linha — um processo pode ter vários trechos). Usa-se
-- `chave_sintetica` (hash de processo + via + trechos + linha da
-- planilha), igual ao padrão já validado no sync-multas (A2) para linhas
-- sem auto_multa.
--
-- Regra de ouro: o dado cru nunca é descartado; linha problemática entra
-- marcada (situacao_vinculo / status_grupo), não some. `linha_planilha`
-- guarda a rastreabilidade até a linha original da aba.

create table if not exists public.gt_obras (
  id                        uuid        primary key default gen_random_uuid(),

  -- Colunas cruas da planilha (posição 0-based na aba "COMPATIB. CAMILA")
  permissionaria            text,        -- A (0)  — NORCREST vem com unidade: "NORCREST/QX"…
  num_processo              text,        -- B (1)  — SEI 6012.AAAA/NNNNNNN-D (não é chave única)
  obra_servico              text,        -- C (2)
  executora                 text,        -- D (3)
  subprefeitura             text,        -- E (4)  — sigla (VM, PI, MO, SE…)
  nome_via                  text,        -- F (5)
  trecho_de                 text,        -- G (6)
  trecho_ate                text,        -- H (7)
  previsao_execucao         text,        -- J (9)  — TEXTO livre ("4 DIAS"…), nunca data
  status                    text,        -- K (10) — 10 valores, zero vazios (D1)
  observacao                text,        -- L (11)
  area_m2                   numeric,     -- N (13) — a "metragem" (coluna I é lixo, não ingerida)
  revestimento              text,        -- O (14)
  recape_trecho_de          text,        -- P (15) — trecho do recape
  recape_trecho_ate         text,        -- Q (16)
  responsavel_recape        text,        -- R (17)
  situacao_recape           text,        -- S (18) — CONCLUÍDO/CONCLUIDO, exige normalização
  data_conclusao            date,        -- T (19) — via toIsoDate (Date + texto misturados)
  observacao_obras        text,        -- V (21)
  tecnica_analise           text,        -- X (23) — Samara, Douglas, Luísa… (ver D7, mirror)
  observacao_gt             text,        -- Z (25)

  -- Colunas derivadas (tratamento na Edge Function)
  num_processo_normalizado  text,        -- normProc() — casa com sistemaGeo/fiscalizacoes
  ano_processo              int,         -- extraído do SEI 6012.AAAA/...
  status_norm               text,        -- status normalizado (trim/caixa/acento)
  status_grupo              text         not null default 'nao_classificado'
                               check (status_grupo in (
                                 'compatibilizada', 'paralisada', 'nao_classificado'
                               )),
  obra_servico_norm         text,        -- canoniza variações ("Manut. Preventiva"…)
  situacao_recape_norm      text,        -- CONCLUIDO → CONCLUÍDO (ambíguos ficam como estão)
  permissionaria_norm       text,        -- NORCREST consolidada
  unidade_norcrest            text,        -- 'TG', 'MNED'… (null se não-NORCREST)
  situacao_vinculo          text         not null default 'nao_avaliado'
                               check (situacao_vinculo in (
                                 'vinculado_sistemaGeo',
                                 'vinculado_fiscalizacao',
                                 'sem_processo',
                                 'processo_nao_encontrado',
                                 'nao_avaliado'
                               )),

  chave_sintetica           text,        -- alvo do upsert (hash processo+via+trechos+linha)
  linha_planilha            int,         -- rastreabilidade até a linha original

  criado_em                 timestamptz  not null default now(),
  atualizado_em             timestamptz  not null default now()
);

create unique index if not exists gt_obras_chave_sintetica_key
  on public.gt_obras (chave_sintetica);

create index if not exists gt_obras_num_processo_normalizado_idx
  on public.gt_obras (num_processo_normalizado);

create index if not exists gt_obras_status_grupo_idx
  on public.gt_obras (status_grupo);

create index if not exists gt_obras_ano_processo_idx
  on public.gt_obras (ano_processo);

create index if not exists gt_obras_subprefeitura_idx
  on public.gt_obras (subprefeitura);

alter table public.gt_obras enable row level security;

-- Leitura só autenticado (mesmo padrão do sistemaGeo/multas pós-09/06/2026).
drop policy if exists "gt_obras_select_autenticado" on public.gt_obras;
create policy "gt_obras_select_autenticado"
  on public.gt_obras for select
  to authenticated
  using (true);

-- Escrita só via service_role (a Edge Function sync-gt-obras) — sem
-- política para authenticated/anon, igual ao sistemaGeo/multas.

comment on table public.gt_obras is
  'Base granular da planilha [GT - Obras] (aba COMPATIB. CAMILA), sincronizada via Edge Function sync-gt-obras. Read-only no dashboard.';

-- ============================================================
-- Painel consolidado (aba "DASH (GT)")
-- ============================================================
-- 4 blocos empilhados na planilha (Total Geral 2023+2024+2025/26, 2025/2026,
-- 2024, 2023), cada um com linhas por permissionária + 3 linhas de
-- totalização (Total Geral, Total Norcrest+Winslow, OUTROS). Serve de
-- conferência (D2) contra o que o dashboard recalcula da base granular.

create table if not exists public.gt_dash (
  id                        uuid        primary key default gen_random_uuid(),
  bloco                     text        not null check (bloco in (
                               'total_geral', '2025_2026', '2024', '2023'
                             )),
  permissionaria            text        not null,  -- ou 'Total Geral' / 'Total Norcrest+Winslow' / 'OUTROS'
  tipo_linha                text        not null check (tipo_linha in (
                               'permissionaria', 'total', 'agrupamento'
                             )),
  qtde_obras                numeric,
  obras_compatibilizadas    numeric,
  obras_paralisadas         numeric,
  metragem_compatibilizada  numeric,
  pct_compatibilizada       numeric,
  valor_estimado            numeric,     -- coluna G ("Metragem /10", formatada como R$ na planilha)
  tem_erro_formula          boolean      not null default false,
  linha_planilha            int,
  atualizado_em             timestamptz  not null default now(),
  unique (bloco, permissionaria)
);

-- `tem_erro_formula = true` quando: valor negativo, ou
-- `obras_compatibilizadas + obras_paralisadas <> qtde_obras` (rede de
-- segurança geral — nenhum caso real confirmado até 27/07/2026; o
-- exemplo citado inicialmente, AXWELL TELECOM, era erro de
-- leitura de screenshot pelo executor, não da planilha). A soma dos 3
-- blocos anuais ≠ bloco "total_geral" (achado confirmado: 3.135 somado
-- vs. 3.134 declarado) é checada à parte, no front-end. Ver
-- docs/plano-modulo-gt-obras.md, seção 6.6/8.3.

alter table public.gt_dash enable row level security;

drop policy if exists "gt_dash_select_autenticado" on public.gt_dash;
create policy "gt_dash_select_autenticado"
  on public.gt_dash for select
  to authenticated
  using (true);

comment on table public.gt_dash is
  'Painel consolidado da planilha [GT - Obras] (aba DASH (GT)), espelhado da planilha para conferência contra o recálculo do dashboard (D2). Sincronizado via Edge Function sync-gt-obras.';

-- ============================================================
-- Configuração da sincronização (SEM cron — D4)
-- ============================================================
-- Diferente do multas_sync_config: aqui não há agendador/intervalo — a
-- sincronização só roda quando o admin clica "Atualizar agora" (decisão
-- do usuário em 27/07/2026). Guarda só o status da última execução.

create table if not exists public.gt_sync_config (
  id                  int         primary key default 1 check (id = 1),
  ultima_sync_em      timestamptz,
  ultima_sync_status  text,        -- 'sucesso' | 'erro'
  ultima_sync_detalhe text,        -- mensagem de erro ou resumo (nº de linhas)
  atualizado_em       timestamptz not null default now()
);

insert into public.gt_sync_config (id) values (1)
  on conflict (id) do nothing;

alter table public.gt_sync_config enable row level security;

drop policy if exists "gt_sync_config_select_autenticado" on public.gt_sync_config;
create policy "gt_sync_config_select_autenticado"
  on public.gt_sync_config for select
  to authenticated
  using (true);

comment on table public.gt_sync_config is
  'Status da última sincronização do módulo GT Obras. Sem cron (D4) — só roda pelo botão "Atualizar agora". Escrita via service_role (Edge Function).';
