-- =============================================================
-- CONSERTA A RECURSAO INFINITA NAS REGRAS DE SEGURANCA (erro 500)
-- Cole tudo no SQL Editor do Supabase e clique em Run
-- =============================================================

-- 1. Funcao "especial" que verifica se alguem e admin SEM disparar
--    as regras de seguranca da tabela profiles (quebra o loop).
--    SECURITY DEFINER = roda com permissao elevada e ignora o RLS.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'admin' and ativo = true
  );
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated;

-- 2. Recria as regras que causavam o loop, agora usando a funcao acima.

-- profiles: admin le todos
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" on public.profiles
  for select using (public.is_admin(auth.uid()));

-- profiles: admin atualiza
drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles" on public.profiles
  for update using (public.is_admin(auth.uid()));

-- email_exceptions: admin gerencia
drop policy if exists "Admins manage email exceptions" on public.email_exceptions;
create policy "Admins manage email exceptions" on public.email_exceptions
  for all using (public.is_admin(auth.uid()));

-- access_logs: admin le todos
drop policy if exists "Admins can read all logs" on public.access_logs;
create policy "Admins can read all logs" on public.access_logs
  for select using (public.is_admin(auth.uid()));
