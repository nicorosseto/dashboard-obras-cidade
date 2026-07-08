-- =============================================================
-- Corrige exclusão de usuário bloqueada pela FK de access_logs
-- =============================================================
-- Erro real (achado pelo usuário em produção/homologação, 08/07/2026):
--   "update or delete on table users violates foreign key constraint
--    access_logs_user_id_fkey on table access_logs"
--
-- Causa: access_logs.user_id referencia auth.users(id) SEM "on delete"
-- (criada em auth/01-auth-setup.sql) — o padrão do Postgres é bloquear
-- (NO ACTION). admin_delete_user() apaga direto de auth.users e confia
-- em cascata; profiles tem "on delete cascade" (funciona), mas
-- access_logs não tinha nenhuma ação — qualquer usuário que já fez
-- login (ou seja, quase todos) ficava impossível de excluir.
--
-- Fix: troca para "on delete set null" — mantém a linha do log (o
-- histórico de acessos não se perde) e só solta a referência ao
-- usuário excluído. A tabela já guarda o `email` de forma redundante
-- (denormalizado), então o log continua legível mesmo com user_id nulo.
-- Idempotente.

alter table public.access_logs
  drop constraint if exists access_logs_user_id_fkey;

alter table public.access_logs
  add constraint access_logs_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null;
