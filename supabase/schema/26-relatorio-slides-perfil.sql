-- 26-relatorio-slides-perfil.sql
-- =============================================================
-- Controle de QUAIS SLIDES do módulo Apresentação cada perfil de acesso
-- enxerga (pedido do usuário em 31/07/2026: "quebrar" o módulo por slide,
-- não só liberar/bloquear o módulo inteiro via `relatorio.ver`).
-- Cole no Supabase → SQL Editor → New query e rode.
-- Idempotente: pode rodar várias vezes sem dano.
-- ⚠️ Rodar nos DOIS bancos (produção e obras-dev/homologação).
-- =============================================================
--
-- Semântica de BLOCKLIST (não allow-list): a tabela guarda quais slides
-- ficam OCULTOS para o perfil. Ausência de linhas = nada oculto = todos os
-- slides aparecem — mesmo comportamento de hoje (`relatorio.ver` sozinho já
-- libera a apresentação inteira), sem precisar migrar/backfillar os perfis
-- existentes. O admin ignora perfis e sempre enxerga a apresentação
-- completa (mesma regra de toda a matriz de permissões).
--
-- Front-end grava a lista completa a cada salvamento do perfil (substituição
-- atômica, mesmo padrão de perfil_permissoes/salvar_perfil_acesso) — não há
-- INSERT incremental direto na tabela.

-- ── 1) Tabela ────────────────────────────────────────────────────────
create table if not exists public.relatorio_perfil_slides_ocultos (
  perfil_id int     not null references public.perfis_acesso(id) on delete cascade,
  slide_n   numeric not null,
  primary key (perfil_id, slide_n)
);
alter table public.relatorio_perfil_slides_ocultos enable row level security;

drop policy if exists "Authenticated read relatorio_perfil_slides_ocultos" on public.relatorio_perfil_slides_ocultos;
create policy "Authenticated read relatorio_perfil_slides_ocultos"
  on public.relatorio_perfil_slides_ocultos for select
  using (auth.uid() is not null);

drop policy if exists "Admins manage relatorio_perfil_slides_ocultos" on public.relatorio_perfil_slides_ocultos;
create policy "Admins manage relatorio_perfil_slides_ocultos"
  on public.relatorio_perfil_slides_ocultos for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── 2) RPC de leitura — slides ocultos do PRÓPRIO usuário logado ───────
-- SECURITY DEFINER, mesmo padrão de minhas_permissoes(): ignora RLS e só
-- devolve o que é do perfil do próprio chamador.
create or replace function public.meus_slides_ocultos_relatorio()
returns numeric[]
language sql
security definer
set search_path = public
as $$
  select coalesce(array_agg(rso.slide_n order by rso.slide_n), '{}')
  from public.profiles pr
  join public.relatorio_perfil_slides_ocultos rso on rso.perfil_id = pr.perfil_acesso_id
  where pr.id = auth.uid()
$$;

grant execute on function public.meus_slides_ocultos_relatorio to authenticated;

-- ── 3) RPC de escrita — substituição atômica (só admin) ────────────────
create or replace function public.salvar_slides_ocultos_relatorio(
  p_perfil_id integer,
  p_ocultos   numeric[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado: apenas administradores podem editar perfis';
  end if;

  delete from public.relatorio_perfil_slides_ocultos where perfil_id = p_perfil_id;

  if p_ocultos is not null and array_length(p_ocultos, 1) > 0 then
    insert into public.relatorio_perfil_slides_ocultos (perfil_id, slide_n)
    select p_perfil_id, unnest(p_ocultos);
  end if;
end;
$$;

grant execute on function public.salvar_slides_ocultos_relatorio to authenticated;

-- =============================================================
-- Verificação rápida (rodar à parte, se quiser conferir):
-- select p.nome, array_agg(rso.slide_n order by rso.slide_n) as slides_ocultos
--   from public.relatorio_perfil_slides_ocultos rso
--   join public.perfis_acesso p on p.id = rso.perfil_id
--   group by p.nome;
-- =============================================================
