-- =============================================================
-- PASSO 1: Cole e rode este bloco inteiro no SQL Editor
-- (versao corrigida - remove politicas existentes antes de recriar)
-- =============================================================

-- Remove politicas existentes (se houver)
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
drop policy if exists "Admins manage email exceptions" on public.email_exceptions;
drop policy if exists "Users can insert own logs" on public.access_logs;
drop policy if exists "Admins can read all logs" on public.access_logs;

-- Cria tabelas (se nao existirem)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text,
  role text not null default 'user' check (role in ('admin', 'user')),
  ativo boolean not null default true,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

create table if not exists public.email_exceptions (
  id serial primary key,
  email text not null unique,
  nota text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.email_exceptions enable row level security;

create table if not exists public.access_logs (
  id serial primary key,
  user_id uuid references auth.users(id),
  email text not null,
  evento text not null,
  user_agent text,
  created_at timestamptz default now()
);
alter table public.access_logs enable row level security;

-- Recria politicas de seguranca
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Admins can read all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy "Admins can update profiles" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy "Admins manage email exceptions" on public.email_exceptions
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
create policy "Users can insert own logs" on public.access_logs
  for insert with check (auth.uid() = user_id);
create policy "Admins can read all logs" on public.access_logs
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Trigger para criar perfil automaticamente ao cadastrar usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, nome)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Adiciona seu email como excecao de dominio
insert into public.email_exceptions (email, nota)
values ('admin.mestre@exemplo.dev', 'Admin principal')
on conflict (email) do nothing;


-- =============================================================
-- PASSO 2: Depois de criar seu usuario no Supabase Auth,
-- rode APENAS este comando para virar admin
-- (apague os dois tracos -- do inicio da linha):
-- =============================================================

-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin.mestre@exemplo.dev';
