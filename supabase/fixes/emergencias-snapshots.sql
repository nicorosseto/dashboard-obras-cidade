-- =============================================================
-- Adiciona coluna por_permissionaria nos snapshots de emergencias
-- (necessária para o histórico expandido mostrar dados por permissionária)
-- =============================================================

alter table public.emergencias_snapshots
  add column if not exists por_permissionaria jsonb;
