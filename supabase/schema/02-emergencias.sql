-- =============================================================
-- MÓDULO EMERGÊNCIAS — Schema das tabelas
-- Cole no Supabase → SQL Editor → New query e rode.
-- Idempotente: pode rodar várias vezes sem dano.
-- =============================================================

-- 1) Tabela de dados brutos: substituída a cada upload (REPLACE ALL)
create table if not exists public.emergencias (
  id              bigserial primary key,
  num_processo    text not null,
  data_cadastro   date,
  etapa           text,
  permissionaria  text,
  status          text,
  status_unificado text,
  subprefeitura   text,
  created_at      timestamptz default now()
);

create index if not exists idx_emerg_status         on public.emergencias(status);
create index if not exists idx_emerg_permissionaria on public.emergencias(permissionaria);
create index if not exists idx_emerg_data_cadastro  on public.emergencias(data_cadastro);
create index if not exists idx_emerg_subprefeitura  on public.emergencias(subprefeitura);

alter table public.emergencias enable row level security;

drop policy if exists "Authenticated read emergencias"   on public.emergencias;
drop policy if exists "Authenticated insert emergencias" on public.emergencias;
drop policy if exists "Authenticated delete emergencias" on public.emergencias;

create policy "Authenticated read emergencias"
  on public.emergencias for select
  using (auth.uid() is not null);

create policy "Authenticated insert emergencias"
  on public.emergencias for insert
  with check (auth.uid() is not null);

create policy "Authenticated delete emergencias"
  on public.emergencias for delete
  using (auth.uid() is not null);


-- 2) Tabela de histórico (snapshots agregados a cada upload)
create table if not exists public.emergencias_snapshots (
  id                            uuid primary key default gen_random_uuid(),
  uploaded_at                   timestamptz not null default now(),
  uploaded_by                   uuid references auth.users(id) on delete set null,
  uploaded_by_email             text,
  total_processos               integer not null,
  por_status                    jsonb not null,
  informadas_por_permissionaria jsonb not null,
  nome_arquivo                  text
);

create index if not exists idx_snap_uploaded_at on public.emergencias_snapshots(uploaded_at desc);

alter table public.emergencias_snapshots enable row level security;

drop policy if exists "Authenticated read snapshots"   on public.emergencias_snapshots;
drop policy if exists "Authenticated insert snapshots" on public.emergencias_snapshots;
drop policy if exists "Admin delete snapshots"         on public.emergencias_snapshots;

create policy "Authenticated read snapshots"
  on public.emergencias_snapshots for select
  using (auth.uid() is not null);

create policy "Authenticated insert snapshots"
  on public.emergencias_snapshots for insert
  with check (auth.uid() is not null);

create policy "Admin delete snapshots"
  on public.emergencias_snapshots for delete
  using (public.is_admin(auth.uid()));


-- 3) View opcional: contagem rápida
create or replace view public.vw_emergencias_status as
select status, count(*) as qtd
from public.emergencias
group by status
order by qtd desc;

grant select on public.vw_emergencias_status to anon, authenticated;
