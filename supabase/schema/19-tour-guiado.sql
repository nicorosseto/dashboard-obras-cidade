-- ============================================================
-- 19 — Tour guiado (onboarding interativo)
-- ============================================================
-- Registra quais tours cada usuário já viu (ou dispensou), para o
-- sistema oferecer o tour SÓ no primeiro acesso a cada tela/módulo —
-- em qualquer navegador ou máquina (fonte da verdade no banco, não
-- no localStorage).
--
-- ⚠️ Rodar nos DOIS bancos (obras-dev e produção). Idempotente.
--
-- Não entra no catálogo de permissões: o tour não é uma aba/módulo,
-- é um auxílio de interface disponível a todo usuário autenticado.
-- O conteúdo dos tours vive no front (src/lib/toursConteudo/) e cada
-- passo é filtrado pelas permissões do usuário em tempo de execução.

create table if not exists public.tour_visto (
  user_id  uuid        not null references auth.users (id) on delete cascade,
  tour_id  text        not null,
  -- concluido  = assistiu (inteiro ou parte) | dispensado = clicou "Agora não"
  status   text        not null default 'concluido'
             check (status in ('concluido', 'dispensado')),
  -- versão do tour na época (bump no front quando o conteúdo mudar muito;
  -- hoje é só registro — não re-oferece automaticamente)
  versao   int         not null default 1,
  visto_em timestamptz not null default now(),
  primary key (user_id, tour_id)
);

alter table public.tour_visto enable row level security;

-- Cada usuário enxerga e grava APENAS as próprias linhas.
drop policy if exists "tour_visto_select_proprio" on public.tour_visto;
create policy "tour_visto_select_proprio"
  on public.tour_visto for select
  using (auth.uid() = user_id);

drop policy if exists "tour_visto_insert_proprio" on public.tour_visto;
create policy "tour_visto_insert_proprio"
  on public.tour_visto for insert
  with check (auth.uid() = user_id);

drop policy if exists "tour_visto_update_proprio" on public.tour_visto;
create policy "tour_visto_update_proprio"
  on public.tour_visto for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.tour_visto is
  'Tours guiados (onboarding) já vistos/dispensados por usuário. RLS: cada um só a própria linha.';
