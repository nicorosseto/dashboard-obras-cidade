-- =============================================================
-- 06 — Permissões por perfil de acesso (A3)
--
-- Controle fino de QUAIS telas/ações cada usuário enxerga:
--   - permissoes_catalogo: lista fixa de permissões que o sistema entende
--     (cada aba de cada módulo + ações como exportar e upload).
--   - perfis_acesso: perfis criados pelo admin (ex.: "Equipe Sistema Geo").
--   - perfil_permissoes: quais permissões cada perfil concede.
--   - profiles.perfil_acesso_id: qual perfil cada usuário usa.
--
-- Regras:
--   - Admin (role='admin') ignora tudo isso: enxerga sempre o sistema
--     inteiro (bypass no front; as funções de escrita exigem is_admin).
--   - Usuário comum SEM perfil não enxerga nenhum módulo.
--   - Editar um perfil muda na hora o acesso de todos os usuários dele.
--
-- Idempotente: pode rodar mais de uma vez sem duplicar nada.
-- Rodar nos DOIS bancos (produção e obras-dev).
-- =============================================================

-- 1) Catálogo de permissões -----------------------------------
create table if not exists public.permissoes_catalogo (
  codigo    text primary key,          -- ex.: 'geo.aba_geral'
  modulo    text not null,             -- 'fiscalizacao' | 'sistemaGeo' | 'emergencias'
  nome      text not null,             -- rótulo exibido no painel admin
  descricao text,
  ordem     int  not null default 0    -- ordem de exibição dentro do módulo
);
alter table public.permissoes_catalogo enable row level security;

drop policy if exists "Authenticated read catalogo" on public.permissoes_catalogo;
create policy "Authenticated read catalogo" on public.permissoes_catalogo
  for select using (auth.uid() is not null);

insert into public.permissoes_catalogo (codigo, modulo, nome, descricao, ordem) values
  -- Fiscalização
  ('fisc.aba_geral',    'fiscalizacao', 'Aba Visão Geral',            'Gráficos gerais da fiscalização',                        1),
  ('fisc.aba_temporal', 'fiscalizacao', 'Aba Evolução Temporal',      'Séries históricas da fiscalização',                      2),
  ('fisc.aba_espacial', 'fiscalizacao', 'Aba Distribuição Espacial',  'Mapa e distribuição por subprefeitura',                  3),
  ('fisc.aba_detalhes', 'fiscalizacao', 'Aba Detalhes',               'Tabela detalhada dos laudos',                            4),
  ('fisc.exportar',     'fiscalizacao', 'Exportar dados',             'Baixar os dados de fiscalização em CSV/Excel',           5),
  ('fisc.upload',       'fiscalizacao', 'Upload da base',             'Substituir a base de fiscalização (em breve — D2)',      6),
  -- Sistema Geo
  ('geo.aba_geral',     'sistemaGeo',     'Aba Visão Geral',            'Gráficos gerais do Sistema Geo',                            1),
  ('geo.aba_temporal',  'sistemaGeo',     'Aba Linha do Tempo',         'Séries históricas do Sistema Geo',                          2),
  ('geo.aba_subpref',   'sistemaGeo',     'Aba Subprefeitura',          'Mapa e distribuição por subprefeitura',                  3),
  ('geo.exportar',      'sistemaGeo',     'Exportar dados',             'Baixar os dados do Sistema Geo em CSV/Excel',               4),
  ('geo.upload',        'sistemaGeo',     'Upload da base',             'Substituir a base do Sistema Geo (em breve — D1)',          5),
  -- Emergências
  ('emerg.ver',         'emergencias',  'Visualizar emergências',     'Tela de acompanhamento de emergências em aberto',        1),
  ('emerg.upload',      'emergencias',  'Upload da planilha',         'Substituir os dados de emergências (apaga e regrava)',   2)
on conflict (codigo) do update
  set modulo = excluded.modulo,
      nome = excluded.nome,
      descricao = excluded.descricao,
      ordem = excluded.ordem;

-- 2) Perfis de acesso ------------------------------------------
create table if not exists public.perfis_acesso (
  id         serial primary key,
  nome       text not null unique,
  descricao  text,
  created_at timestamptz default now()
);
alter table public.perfis_acesso enable row level security;

drop policy if exists "Authenticated read perfis" on public.perfis_acesso;
create policy "Authenticated read perfis" on public.perfis_acesso
  for select using (auth.uid() is not null);

drop policy if exists "Admins manage perfis" on public.perfis_acesso;
create policy "Admins manage perfis" on public.perfis_acesso
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 3) Permissões de cada perfil ---------------------------------
create table if not exists public.perfil_permissoes (
  perfil_id int  not null references public.perfis_acesso(id) on delete cascade,
  permissao text not null references public.permissoes_catalogo(codigo) on delete cascade,
  primary key (perfil_id, permissao)
);
alter table public.perfil_permissoes enable row level security;

drop policy if exists "Authenticated read perfil_permissoes" on public.perfil_permissoes;
create policy "Authenticated read perfil_permissoes" on public.perfil_permissoes
  for select using (auth.uid() is not null);

drop policy if exists "Admins manage perfil_permissoes" on public.perfil_permissoes;
create policy "Admins manage perfil_permissoes" on public.perfil_permissoes
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 4) Vínculo usuário → perfil ----------------------------------
alter table public.profiles
  add column if not exists perfil_acesso_id int references public.perfis_acesso(id) on delete set null;

-- 5) Função para o front carregar as permissões do usuário logado
--    SECURITY DEFINER para ler o próprio profile sem depender das
--    políticas de RLS (retorna só as permissões de quem chamou).
create or replace function public.minhas_permissoes()
returns text[]
language sql
security definer
set search_path = public
as $$
  select coalesce(array_agg(pp.permissao order by pp.permissao), '{}')
  from public.profiles pr
  join public.perfil_permissoes pp on pp.perfil_id = pr.perfil_acesso_id
  where pr.id = auth.uid()
$$;

grant execute on function public.minhas_permissoes to authenticated;

-- 6) Perfis iniciais (seed) ------------------------------------
--    Uploads de base (fisc.upload / geo.upload / emerg.upload) NÃO
--    entram em nenhum perfil inicial: nascem restritos ao admin, que
--    pode concedê-los editando um perfil no painel.
insert into public.perfis_acesso (nome, descricao) values
  ('Visualização completa', 'Todas as abas de todos os módulos + exportar. Sem uploads.'),
  ('Equipe Fiscalização',   'Todas as abas de Fiscalização + exportar.'),
  ('Equipe Sistema Geo',       'Todas as abas do Sistema Geo + exportar.'),
  ('Emergências',           'Somente a tela de acompanhamento de emergências.')
on conflict (nome) do nothing;

insert into public.perfil_permissoes (perfil_id, permissao)
select p.id, c.codigo
from public.perfis_acesso p
join public.permissoes_catalogo c on (
  (p.nome = 'Visualização completa' and c.codigo in (
    'fisc.aba_geral','fisc.aba_temporal','fisc.aba_espacial','fisc.aba_detalhes','fisc.exportar',
    'geo.aba_geral','geo.aba_temporal','geo.aba_subpref','geo.exportar',
    'emerg.ver'))
  or (p.nome = 'Equipe Fiscalização' and c.codigo in (
    'fisc.aba_geral','fisc.aba_temporal','fisc.aba_espacial','fisc.aba_detalhes','fisc.exportar'))
  or (p.nome = 'Equipe Sistema Geo' and c.codigo in (
    'geo.aba_geral','geo.aba_temporal','geo.aba_subpref','geo.exportar'))
  or (p.nome = 'Emergências' and c.codigo in ('emerg.ver'))
)
on conflict do nothing;

-- 7) Migração: usuários comuns existentes ----------------------
--    Antes do A3 todo usuário logado via tudo. Para ninguém perder
--    acesso no dia da virada, quem é 'user' e ainda não tem perfil
--    recebe "Visualização completa" (o admin ajusta depois no painel).
update public.profiles
set perfil_acesso_id = (select id from public.perfis_acesso where nome = 'Visualização completa')
where role = 'user' and perfil_acesso_id is null;

-- =============================================================
-- Verificação rápida (rodar à parte, se quiser conferir):
-- select codigo, modulo, nome from public.permissoes_catalogo order by modulo, ordem;
-- select p.nome, count(*) as permissoes from public.perfis_acesso p
--   join public.perfil_permissoes pp on pp.perfil_id = p.id group by p.nome;
-- select email, role, perfil_acesso_id from public.profiles;
-- =============================================================
