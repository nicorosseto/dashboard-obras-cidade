-- =============================================================
-- FIX: "Database error querying schema" no login de usuário interno
--
-- Causa: admin_create_internal_user insere direto em auth.users e
-- deixava as colunas internas de token (confirmation_token,
-- recovery_token, etc.) como NULL. O GoTrue (motor de login do
-- Supabase) não tolera NULL nesses campos texto — na hora do login
-- ele quebra com "Database error querying schema". Usuários criados
-- pelo fluxo normal recebem '' (string vazia) nesses campos.
--
-- Este script:
--   1) conserta os usuários internos já criados (NULL → '')
--   2) recria a função para futuros usuários já nascerem corretos
--
-- Idempotente. Rodar nos DOIS bancos (produção e obras-dev).
-- =============================================================

-- 1) Conserta os usuários já existentes
update auth.users
set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
where confirmation_token is null
   or recovery_token is null
   or email_change is null
   or email_change_token_new is null
   or email_change_token_current is null
   or phone_change is null
   or phone_change_token is null
   or reauthentication_token is null;

-- 2) Recria a função com os campos de token preenchidos com ''
--    (mesma definição de supabase/auth/02-usuarios-internos.sql)
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
  -- quebra no login ("Database error querying schema") se forem NULL.
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
-- Verificação (rodar à parte, se quiser conferir):
-- select email, confirmation_token is null as token_nulo
--   from auth.users where email like '%@obras.app';
-- (token_nulo deve ser false para todos)
-- =============================================================
