-- =============================================================
-- Suporte a usuários internos (sem e-mail real)
-- - username único por usuário
-- - flag primeiro_acesso para forçar troca de senha
-- - função RPC para admin resetar senha diretamente
-- =============================================================

-- 1) Colunas na tabela profiles
alter table public.profiles
  add column if not exists username     text unique,
  add column if not exists primeiro_acesso boolean not null default false;

-- 2) Função para o admin redefinir a senha de qualquer usuário
--    Usa SECURITY DEFINER para poder escrever em auth.users.
--    Exige que o chamador seja admin (verificado via is_admin).
create or replace function public.admin_reset_user_password(
  p_user_id    uuid,
  p_new_password text
)
returns void
language plpgsql
security definer
set search_path = extensions, public, auth
as $$
begin
  -- Apenas admins podem chamar
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado: apenas administradores podem redefinir senhas';
  end if;

  if length(p_new_password) < 6 then
    raise exception 'A senha deve ter no mínimo 6 caracteres';
  end if;

  -- Atualiza o hash da senha no schema de auth do Supabase
  update auth.users
  set
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'Usuário não encontrado';
  end if;

  -- Marca que o usuário precisa trocar a senha no próximo acesso
  update public.profiles
  set primeiro_acesso = true
  where id = p_user_id;
end;
$$;

grant execute on function public.admin_reset_user_password to authenticated;

-- 3) Função para o próprio usuário desmarcar o flag após trocar a senha
create or replace function public.concluir_primeiro_acesso()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Marca como ativo só depois do 1º acesso bem-sucedido (troca de senha)
  update public.profiles
  set primeiro_acesso = false,
      ativo = true
  where id = auth.uid();
end;
$$;

grant execute on function public.concluir_primeiro_acesso to authenticated;

-- =============================================================
-- 4) Função para o admin criar usuário interno (username, sem e-mail real)
--
--    Por que existe: o validador de e-mail do Supabase Auth (chamado
--    pelo client supabase.auth.signUp) rejeita domínios como
--    "@obras.app" / "@obras.interno". Como o admin é um humano de
--    confiança operando dentro do app autenticado, inserimos
--    diretamente em auth.users via SECURITY DEFINER, pulando a
--    validação. Trigger handle_new_user cria o profile; nós então
--    completamos username + primeiro_acesso.
--
--    Aceita username puro (sem @). Internamente vira
--    "<username>@obras.app" só para satisfazer o NOT NULL do email.
-- =============================================================
create or replace function public.admin_create_internal_user(
  p_username text,
  p_password text,
  p_role     text default 'user'
)
returns uuid
language plpgsql
security definer
set search_path = extensions, public, auth
as $$
declare
  v_user_id uuid := gen_random_uuid();
  v_username text := lower(trim(p_username));
  v_role text := lower(coalesce(p_role, 'user'));
  v_email text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado: apenas administradores podem criar usuários';
  end if;

  if v_username is null or v_username = '' then
    raise exception 'Username obrigatório';
  end if;

  if v_username !~ '^[a-z0-9._-]+$' then
    raise exception 'Username só pode conter letras, números, ponto, hífen e underline';
  end if;

  if length(p_password) < 6 then
    raise exception 'A senha deve ter no mínimo 6 caracteres';
  end if;

  if v_role not in ('user', 'admin') then
    raise exception 'Perfil inválido: use "user" ou "admin"';
  end if;

  if exists (select 1 from public.profiles where username = v_username) then
    raise exception 'Username "%" já está em uso', v_username;
  end if;

  v_email := v_username || '@obras.app';

  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Já existe um usuário com este login';
  end if;

  -- Insere direto em auth.users, ignorando o validador de e-mail do GoTrue.
  -- email_confirmed_at já preenchido para login imediato.
  -- ⚠️ Os campos de token vão como '' (string vazia), nunca NULL: o GoTrue
  -- quebra no login ("Database error querying schema") se forem NULL
  -- (corrigido em fixes/login-usuarios-internos.sql, 11/06/2026).
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    '{}'::jsonb,
    now(),
    now(),
    '', '', '', '', '', '', '', ''
  );

  -- Garante profile (trigger handle_new_user pode já ter criado o registro).
  -- Usuário começa Inativo; vira Ativo após o primeiro login + troca de senha
  -- (ver public.concluir_primeiro_acesso).
  insert into public.profiles (id, email, username, primeiro_acesso, role, ativo)
  values (v_user_id, v_email, v_username, true, v_role, false)
  on conflict (id) do update
    set username = excluded.username,
        primeiro_acesso = true,
        role = excluded.role,
        ativo = false;

  return v_user_id;
end;
$$;

grant execute on function public.admin_create_internal_user to authenticated;

-- =============================================================
-- 5) Função para o admin excluir um usuário (auth + profile)
-- =============================================================
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = extensions, public, auth
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado: apenas administradores podem excluir usuários';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Você não pode excluir a si mesmo';
  end if;

  -- Remove em cascata profile + auth (profiles.id tem FK p/ auth.users com ON DELETE CASCADE)
  delete from auth.users where id = p_user_id;

  if not found then
    raise exception 'Usuário não encontrado';
  end if;
end;
$$;

grant execute on function public.admin_delete_user to authenticated;
