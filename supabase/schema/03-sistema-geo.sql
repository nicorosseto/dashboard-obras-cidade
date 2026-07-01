-- Sistema Geo: processos de licenciamento de obras na via pública (170k linhas)
-- Adiciona tabela de forma não destrutiva (IF NOT EXISTS)

-- Table sistemaGeo
create table if not exists public.sistemaGeo (
  id bigserial primary key,
  processo text unique not null,
  tipo_processo text,
  tipo_processo_nome text,  -- mapped label from Página2
  permissionaria text,
  executora text,
  data_cadastro date,
  etapa text,
  etapa_nome text,          -- mapped label
  subprefeitura text,
  status text,
  status_nome text,         -- mapped label
  status_unificado text,    -- grouped status from Página2
  tipo_obra text,
  tipo_obra_nome text,      -- mapped label
  created_at timestamptz default now()
);

-- Indexes for common filter columns
create index if not exists idx_sistemaGeo_permissionaria on public.sistemaGeo(permissionaria);
create index if not exists idx_sistemaGeo_subprefeitura on public.sistemaGeo(subprefeitura);
create index if not exists idx_sistemaGeo_data_cadastro on public.sistemaGeo(data_cadastro);
create index if not exists idx_sistemaGeo_status_unificado on public.sistemaGeo(status_unificado);
create index if not exists idx_sistemaGeo_tipo_processo on public.sistemaGeo(tipo_processo);

-- RLS: leitura exige login (mesma regra das tabelas de emergências).
-- A escrita não tem política nenhuma de propósito: só a chave secreta
-- (service_role, que ignora RLS) consegue importar dados.
alter table public.sistemaGeo enable row level security;
drop policy if exists "Public read sistemaGeo" on public.sistemaGeo;
drop policy if exists "Authenticated read sistemaGeo" on public.sistemaGeo;
create policy "Authenticated read sistemaGeo"
  on public.sistemaGeo for select
  using (auth.uid() is not null);
