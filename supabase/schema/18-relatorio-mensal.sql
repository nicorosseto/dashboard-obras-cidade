-- 18-relatorio-mensal.sql
-- =============================================================
-- MÓDULO "APRESENTAÇÃO" (Relatório Mensal) — tabela de modelos + permissão
-- Cole no Supabase → SQL Editor → New query e rode.
-- Idempotente: pode rodar várias vezes sem dano.
-- ⚠️ Rodar nos DOIS bancos (produção e obras-dev/homologação).
-- =============================================================
--
-- O módulo "Apresentação" gera uma prévia da apresentação mensal em slides
-- (KPIs / gráficos / banners), espelhando a apresentação institucional do
-- Departamento. Cada MODELO é uma lista ordenada de slides guardada como JSONB
-- (um modelo = um registro). O seed inicial (o "modelo institucional") é montado
-- no front-end (src/lib/relatorio.js); esta tabela guarda os modelos que o admin
-- criar/editar no futuro (Fase C — editor de slides).
--
-- Slug interno do módulo: `relatorio`. Rótulo visível ao usuário: "Apresentação".
-- Edição de modelos: implícita ao admin (que ignora perfis). A permissão abaixo
-- (`relatorio.ver`) apenas libera VER o módulo.

-- ── 1) Tabela de modelos de apresentação ────────────────────────────
create table if not exists public.relatorio_modelos (
  id          bigserial primary key,
  nome        text not null,
  descricao   text,
  slides      jsonb not null default '[]',   -- array de configs de slide
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 2) RLS (mesmo padrão dos scripts 13/14/16) ──────────────────────
alter table public.relatorio_modelos enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'relatorio_modelos' and policyname = 'leitura autenticado'
  ) then
    create policy "leitura autenticado"
      on public.relatorio_modelos for select
      using (auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'relatorio_modelos' and policyname = 'escrita autenticado'
  ) then
    create policy "escrita autenticado"
      on public.relatorio_modelos for all
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;
end $$;

-- ── 3) Permissão de acesso ao módulo ────────────────────────────────
insert into public.permissoes_catalogo (codigo, modulo, nome, descricao, ordem) values
  ('relatorio.ver', 'relatorio', 'Módulo Apresentação',
   'Acessa o módulo "Apresentação" (prévia do relatório mensal em slides, com download dos dados por slide)', 1)
on conflict (codigo) do update
  set modulo    = excluded.modulo,
      nome      = excluded.nome,
      descricao = excluded.descricao,
      ordem     = excluded.ordem;

-- ── 4) Concede aos perfis de visão ampla ────────────────────────────
--    (admin ignora perfis e já enxerga tudo; a edição fica implícita ao admin).
insert into public.perfil_permissoes (perfil_id, permissao)
select p.id, 'relatorio.ver'
from public.perfis_acesso p
where p.nome = 'Visualização completa'
on conflict do nothing;
