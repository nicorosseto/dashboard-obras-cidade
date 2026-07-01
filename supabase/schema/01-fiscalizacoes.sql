-- =====================================================================
-- DASHBOARD OBRAS/SP - Schema do banco de dados (Supabase / PostgreSQL)
-- =====================================================================
-- COMO USAR:
--   1. Acesse o painel do Supabase: https://supabase.com/dashboard
--   2. Va em "SQL Editor" no menu lateral
--   3. Clique em "New query"
--   4. Cole TODO este arquivo
--   5. Clique em "Run" (canto inferior direito)
--   6. Verifique se rodou sem erros - deve aparecer "Success. No rows returned"
--
-- Este script e' IDEMPOTENTE: pode rodar quantas vezes quiser. Ele apaga
-- as tabelas antigas e recria. Depois de rodar, voce precisa reimportar
-- os dados pelo Colab.
-- =====================================================================


-- =====================================================================
-- 1. TABELA PRINCIPAL: fiscalizacoes
--    Cada linha = 1 laudo de fiscalizacao (corresponde a uma linha
--    da aba CONTROLE_GERAL da planilha Excel - dados a partir da row 3)
-- =====================================================================

DROP VIEW IF EXISTS vw_kpis_mensais CASCADE;
DROP TABLE IF EXISTS fiscalizacoes CASCADE;

CREATE TABLE fiscalizacoes (
    id              BIGSERIAL PRIMARY KEY,
    id_origem       TEXT,                          -- col A da planilha (PROCESSOS/VIA)

    -- Dados principais
    permissionaria      TEXT NOT NULL,             -- col C
    data_inicio         DATE,                      -- col E (DATA DA VISTORIA)
    subprefeitura       TEXT,                      -- col G (SUB)
    classificacao_viaria TEXT,                     -- col H (LOCAL/COLETORA/ARTERIAL)
    area_m2             NUMERIC(12,2),             -- col J ((M²) - o valor numerico)

    -- Status
    em_andamento        BOOLEAN DEFAULT FALSE,     -- col X (Em andamento)
    legislacao_atendida BOOLEAN DEFAULT FALSE,     -- col Y (Legislacao Atendida)
    solucionado         BOOLEAN DEFAULT FALSE,     -- col AA (Solucionados)
    data_conclusao      DATE,                      -- col AB (Data do Encerramento)

    -- 10 tipos de falha (cols O ate W mais Z, da planilha real)
    falha_geometria        BOOLEAN DEFAULT FALSE,  -- col O
    falha_recomposicao     BOOLEAN DEFAULT FALSE,  -- col P (Recomposicao em desacordo)
    falha_sinalizacao      BOOLEAN DEFAULT FALSE,  -- col Q
    falha_sarjeta          BOOLEAN DEFAULT FALSE,  -- col R
    falha_guia             BOOLEAN DEFAULT FALSE,  -- col S
    falha_reposicao        BOOLEAN DEFAULT FALSE,  -- col T (Falha na reposicao do revestimento)
    falha_trincas          BOOLEAN DEFAULT FALSE,  -- col U
    falha_afundamento      BOOLEAN DEFAULT FALSE,  -- col V
    falha_nivelamento      BOOLEAN DEFAULT FALSE,  -- col W
    falha_outros           BOOLEAN DEFAULT FALSE,  -- col Z

    -- Campos calculados automaticamente pelo Postgres
    tem_nao_conformidade BOOLEAN GENERATED ALWAYS AS (
        falha_geometria OR falha_recomposicao OR falha_sinalizacao
        OR falha_sarjeta OR falha_guia OR falha_reposicao
        OR falha_trincas OR falha_afundamento OR falha_nivelamento OR falha_outros
    ) STORED,

    status_simplificado TEXT GENERATED ALWAYS AS (
        CASE
            WHEN solucionado          THEN 'Solucionado'
            WHEN legislacao_atendida  THEN 'Legislacao Atendida'
            WHEN em_andamento         THEN 'Em andamento'
            ELSE 'Sem status'
        END
    ) STORED,

    grupo_norcrest TEXT GENERATED ALWAYS AS (
        CASE WHEN permissionaria LIKE '%NORCREST%' THEN 'NORCREST' ELSE 'Outras' END
    ) STORED,

    importado_em TIMESTAMPTZ DEFAULT NOW()
);
-- Obs: campos derivados de data (ano, mes, ano_mes) ficam na view abaixo.

CREATE INDEX idx_fisc_permissionaria  ON fiscalizacoes (permissionaria);
CREATE INDEX idx_fisc_data_inicio     ON fiscalizacoes (data_inicio);
CREATE INDEX idx_fisc_subprefeitura   ON fiscalizacoes (subprefeitura);
CREATE INDEX idx_fisc_grupo_norcrest    ON fiscalizacoes (grupo_norcrest);
CREATE INDEX idx_fisc_status          ON fiscalizacoes (status_simplificado);
CREATE INDEX idx_fisc_classificacao   ON fiscalizacoes (classificacao_viaria);


-- =====================================================================
-- 2. TABELA: recape_obras (historico fixo)
-- =====================================================================

DROP TABLE IF EXISTS recape_obras CASCADE;

CREATE TABLE recape_obras (
    id              BIGSERIAL PRIMARY KEY,
    permissionaria  TEXT NOT NULL,
    via             TEXT,
    trecho_de       TEXT,
    trecho_ate      TEXT,
    subprefeitura   TEXT,
    extensao_m      NUMERIC(12,2),
    area_m2         NUMERIC(12,2),
    data_termino    DATE
);

CREATE INDEX idx_recape_permissionaria ON recape_obras (permissionaria);
CREATE INDEX idx_recape_data           ON recape_obras (data_termino);


-- =====================================================================
-- 3. TABELA: termo_cooperacao_norcrest (historico fixo)
-- =====================================================================

DROP TABLE IF EXISTS termo_cooperacao_norcrest CASCADE;

CREATE TABLE termo_cooperacao_norcrest (
    id              BIGSERIAL PRIMARY KEY,
    subprefeitura   TEXT,
    via             TEXT,
    trecho_de       TEXT,
    trecho_ate      TEXT,
    extensao_m      NUMERIC(12,2),
    area_m2         NUMERIC(12,2),
    data_termino    DATE
);

CREATE INDEX idx_termo_subprefeitura ON termo_cooperacao_norcrest (subprefeitura);
CREATE INDEX idx_termo_data          ON termo_cooperacao_norcrest (data_termino);


-- =====================================================================
-- 4. VIEW: vw_kpis_mensais
-- =====================================================================

CREATE OR REPLACE VIEW vw_kpis_mensais AS
SELECT
    TO_CHAR(DATE_TRUNC('month', data_inicio), 'YYYY-MM') AS ano_mes,
    DATE_TRUNC('month', data_inicio)::DATE               AS mes_data,
    EXTRACT(YEAR  FROM data_inicio)::INT                 AS ano,
    EXTRACT(MONTH FROM data_inicio)::INT                 AS mes,
    permissionaria,
    grupo_norcrest,
    COUNT(*)                                                    AS total_laudos,
    COUNT(*) FILTER (WHERE tem_nao_conformidade)                AS nao_conformidades,
    COUNT(*) FILTER (WHERE status_simplificado = 'Solucionado') AS solucionados,
    COUNT(*) FILTER (WHERE status_simplificado = 'Em andamento') AS em_andamento,
    COUNT(*) FILTER (WHERE status_simplificado = 'Legislacao Atendida') AS legislacao_atendida,
    COALESCE(SUM(area_m2), 0)                                   AS area_total_m2
FROM fiscalizacoes
WHERE data_inicio IS NOT NULL
GROUP BY DATE_TRUNC('month', data_inicio),
         EXTRACT(YEAR FROM data_inicio),
         EXTRACT(MONTH FROM data_inicio),
         permissionaria,
         grupo_norcrest;


-- =====================================================================
-- 5. SEGURANCA (Row Level Security)
-- =====================================================================

ALTER TABLE fiscalizacoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recape_obras         ENABLE ROW LEVEL SECURITY;
ALTER TABLE termo_cooperacao_norcrest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura publica fiscalizacoes"      ON fiscalizacoes;
DROP POLICY IF EXISTS "leitura publica recape"             ON recape_obras;
DROP POLICY IF EXISTS "leitura publica termo"              ON termo_cooperacao_norcrest;

CREATE POLICY "leitura publica fiscalizacoes"
    ON fiscalizacoes      FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "leitura publica recape"
    ON recape_obras     FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "leitura publica termo"
    ON termo_cooperacao_norcrest FOR SELECT TO anon, authenticated USING (true);


-- =====================================================================
-- 6. AUTENTICAÇÃO E CONTROLE DE ACESSO
-- =====================================================================

-- User profiles (linked to Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text,
  role text not null default 'user' check (role in ('admin', 'user')),
  ativo boolean not null default true,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Admins can read all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy "Admins can update profiles" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Email exceptions (emails outside the allowed domain that are explicitly permitted)
create table if not exists public.email_exceptions (
  id serial primary key,
  email text not null unique,
  nota text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.email_exceptions enable row level security;
create policy "Admins manage email exceptions" on public.email_exceptions
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Access logs
create table if not exists public.access_logs (
  id serial primary key,
  user_id uuid references auth.users(id),
  email text not null,
  evento text not null, -- 'login' | 'logout'
  user_agent text,
  created_at timestamptz default now()
);
alter table public.access_logs enable row level security;
create policy "Users can insert own logs" on public.access_logs
  for insert with check (auth.uid() = user_id);
create policy "Admins can read all logs" on public.access_logs
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, nome)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
