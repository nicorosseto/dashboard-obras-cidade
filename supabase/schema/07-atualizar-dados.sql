-- =============================================================
-- 07 — Atualizar Dados pela tela (D1: Sistema Geo; preparado p/ D2: Fiscalização)
--
-- Habilita a importação de planilhas PELA INTERFACE para quem tem a
-- permissão de upload do módulo (admin sempre pode):
--   - tem_permissao(codigo): checa a permissão do usuário logado.
--   - Políticas de ESCRITA em sistemaGeo (geo.upload) e fiscalizacoes
--     (fisc.upload) — antes a escrita era só da chave secreta.
--   - Escrita no catálogo status_sistemaGeo (geo.upload) — a tela
--     classifica status novos ANTES de importar.
--   - importacoes_snapshots: histórico de TODAS as importações pela
--     tela (coluna `fonte` identifica a planilha — extensível a
--     futuras bases ligadas pelo nº de processo).
--
-- Idempotente. Rodar nos DOIS bancos (produção e obras-dev).
-- Requer: 06-permissoes.sql (tabelas de perfil) e is_admin().
-- =============================================================

-- 1) Permissão do usuário logado (admin ignora perfis) ----------
create or replace function public.tem_permissao(p_codigo text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_admin(auth.uid())
      or exists (
        select 1
        from public.profiles pr
        join public.perfil_permissoes pp on pp.perfil_id = pr.perfil_acesso_id
        where pr.id = auth.uid()
          and pp.permissao = p_codigo
      )
$$;

grant execute on function public.tem_permissao to authenticated;

-- 2) Escrita no sistemaGeo para quem tem geo.upload ---------------
drop policy if exists "Upload escreve sistemaGeo" on public.sistemaGeo;
create policy "Upload escreve sistemaGeo" on public.sistemaGeo
  for insert with check (public.tem_permissao('geo.upload'));

drop policy if exists "Upload atualiza sistemaGeo" on public.sistemaGeo;
create policy "Upload atualiza sistemaGeo" on public.sistemaGeo
  for update using (public.tem_permissao('geo.upload'))
  with check (public.tem_permissao('geo.upload'));

drop policy if exists "Upload apaga sistemaGeo" on public.sistemaGeo;
create policy "Upload apaga sistemaGeo" on public.sistemaGeo
  for delete using (public.tem_permissao('geo.upload'));

-- 3) Escrita na fiscalizacoes para quem tem fisc.upload (D2) ----
drop policy if exists "Upload escreve fiscalizacoes" on public.fiscalizacoes;
create policy "Upload escreve fiscalizacoes" on public.fiscalizacoes
  for insert with check (public.tem_permissao('fisc.upload'));

drop policy if exists "Upload atualiza fiscalizacoes" on public.fiscalizacoes;
create policy "Upload atualiza fiscalizacoes" on public.fiscalizacoes
  for update using (public.tem_permissao('fisc.upload'))
  with check (public.tem_permissao('fisc.upload'));

drop policy if exists "Upload apaga fiscalizacoes" on public.fiscalizacoes;
create policy "Upload apaga fiscalizacoes" on public.fiscalizacoes
  for delete using (public.tem_permissao('fisc.upload'));

-- 4) Classificação de status novos (catálogo) -------------------
drop policy if exists "Upload classifica status" on public.status_sistemaGeo;
create policy "Upload classifica status" on public.status_sistemaGeo
  for insert with check (public.tem_permissao('geo.upload'));

drop policy if exists "Upload atualiza status" on public.status_sistemaGeo;
create policy "Upload atualiza status" on public.status_sistemaGeo
  for update using (public.tem_permissao('geo.upload'))
  with check (public.tem_permissao('geo.upload'));

-- 5) Histórico de importações pela tela --------------------------
create table if not exists public.importacoes_snapshots (
  id                   bigserial primary key,
  fonte                text not null,            -- 'sistemaGeo' | 'fiscalizacoes' | futuras
  nome_arquivo         text,
  total_linhas         int  not null default 0,  -- linhas importadas (após dedup)
  duplicados_removidos int  not null default 0,
  status_novos         jsonb,                    -- status classificados neste upload
  resumo               jsonb,                    -- agregados (ex.: por status unificado)
  uploaded_by          uuid references auth.users(id),
  uploaded_by_email    text,
  uploaded_at          timestamptz default now()
);
alter table public.importacoes_snapshots enable row level security;

drop policy if exists "Authenticated read importacoes" on public.importacoes_snapshots;
create policy "Authenticated read importacoes" on public.importacoes_snapshots
  for select using (auth.uid() is not null);

drop policy if exists "Upload grava importacoes" on public.importacoes_snapshots;
create policy "Upload grava importacoes" on public.importacoes_snapshots
  for insert with check (
    auth.uid() = uploaded_by
    and (public.tem_permissao('geo.upload') or public.tem_permissao('fisc.upload'))
  );

drop policy if exists "Admins apagam importacoes" on public.importacoes_snapshots;
create policy "Admins apagam importacoes" on public.importacoes_snapshots
  for delete using (public.is_admin(auth.uid()));

-- =============================================================
-- Verificação (rodar à parte):
-- select public.tem_permissao('geo.upload');  -- true para admin
-- select count(*) from public.importacoes_snapshots;
-- =============================================================
