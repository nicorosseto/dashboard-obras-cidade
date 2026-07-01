-- =============================================================
-- RPCs transacionais para o painel Admin (backlog auditoria 11/06/2026)
-- =============================================================
-- Item 1: salvar_perfil_acesso — unifica create/update + delete + insert
--         de permissões numa única transação, sem risco de perfil ficar
--         sem permissões se a operação for interrompida no meio.
-- Item 2: admin_create_internal_user — adiciona p_perfil_id opcional para
--         criar usuário e já atribuir o perfil de acesso num único call.
--
-- Rodar nos DOIS bancos: fiscalizacao-obras (produção) e obras-dev.
-- =============================================================

-- -------------------------------------------------------------
-- 1) salvar_perfil_acesso
--    p_id = NULL  → cria novo perfil e retorna o id gerado
--    p_id = <int> → edita perfil existente e retorna o mesmo id
-- -------------------------------------------------------------
create or replace function public.salvar_perfil_acesso(
  p_nome       text,
  p_descricao  text,
  p_permissoes text[],
  p_id         integer default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Acesso negado: apenas administradores podem editar perfis';
  end if;

  if trim(p_nome) is null or trim(p_nome) = '' then
    raise exception 'Nome do perfil é obrigatório';
  end if;

  if p_id is null then
    -- Criar novo
    insert into perfis_acesso (nome, descricao)
    values (trim(p_nome), nullif(trim(coalesce(p_descricao, '')), ''))
    returning id into v_id;
  else
    -- Editar existente
    update perfis_acesso
    set nome = trim(p_nome),
        descricao = nullif(trim(coalesce(p_descricao, '')), '')
    where id = p_id;
    v_id := p_id;
  end if;

  -- Substituição atômica das permissões
  delete from perfil_permissoes where perfil_id = v_id;

  if array_length(p_permissoes, 1) > 0 then
    insert into perfil_permissoes (perfil_id, permissao)
    select v_id, unnest(p_permissoes);
  end if;

  return v_id;
end;
$$;

grant execute on function public.salvar_perfil_acesso to authenticated;

-- -------------------------------------------------------------
-- 2) admin_create_internal_user — adiciona p_perfil_id opcional
--    A assinatura mudou de 3 para 4 parâmetros. Em PostgreSQL, funções
--    com assinaturas diferentes são overloads distintos — CREATE OR REPLACE
--    NÃO substitui a versão antiga. É necessário dropar a versão antiga
--    explicitamente antes de criar a nova.
-- -------------------------------------------------------------

-- Remove a versão antiga de 3 parâmetros para evitar overload duplicado
drop function if exists public.admin_create_internal_user(text, text, text);

create or replace function public.admin_create_internal_user(
  p_username  text,
  p_password  text,
  p_role      text    default 'user',
  p_perfil_id integer default null
)
returns uuid
language plpgsql
security definer
set search_path = extensions, public, auth
as $$
declare
  v_user_id  uuid := gen_random_uuid();
  v_username text := lower(trim(p_username));
  v_role     text := lower(coalesce(p_role, 'user'));
  v_email    text;
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
    set username     = excluded.username,
        primeiro_acesso = true,
        role         = excluded.role,
        ativo        = false;

  -- Atribui perfil de acesso se fornecido (apenas para role 'user')
  if p_perfil_id is not null and v_role = 'user' then
    update public.profiles
    set perfil_acesso_id = p_perfil_id
    where id = v_user_id;
  end if;

  return v_user_id;
end;
$$;

-- Especifica a assinatura completa para evitar ambiguidade de overload
grant execute on function public.admin_create_internal_user(text, text, text, integer) to authenticated;
