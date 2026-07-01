-- =============================================================
-- SEGURANÇA: exige LOGIN para ler os dados do Sistema Geo
-- Rode nos DOIS bancos (produção e obras-dev):
-- SQL Editor → New query → cole tudo → Run
-- =============================================================
--
-- Por quê: a política antiga era "for select using (true)" — ou seja,
-- QUALQUER pessoa com a URL do projeto conseguia ler os 175 mil
-- registros sem estar logada. Agora a leitura exige usuário autenticado
-- (mesma regra já usada nas tabelas de emergências).
--
-- Obs.: a importação via notebook usa a chave secreta (service_role),
-- que ignora RLS — continua funcionando normalmente.

-- 1. Leitura do sistemaGeo só para quem está logado
drop policy if exists "Public read sistemaGeo" on public.sistemaGeo;
drop policy if exists "Authenticated read sistemaGeo" on public.sistemaGeo;
create policy "Authenticated read sistemaGeo"
  on public.sistemaGeo for select
  using (auth.uid() is not null);

-- 2. Remove a leitura pública de email_exceptions.
--    Ela existia porque o app checava o domínio do e-mail ANTES do login.
--    Com a restrição de domínio removida do sistema, visitante não precisa
--    (nem deve) enxergar a lista de e-mails autorizados.
drop policy if exists "Public can check email exceptions" on public.email_exceptions;

-- 3. Confere o resultado (deve listar só as políticas autenticadas/admin)
select tablename, policyname, qual
from pg_policies
where tablename in ('sistemaGeo', 'email_exceptions')
order by tablename, policyname;
