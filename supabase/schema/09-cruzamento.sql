-- =============================================================
-- 09 — Cruzamento Fiscalização × Sistema Geo (D3)
--
-- Adiciona a permissão geo.aba_cruzamento ao catálogo de permissões.
-- A lógica de cruzamento é executada no front-end (dados já carregados
-- em memória) — este script só registra a permissão para o sistema
-- de controle de acesso por perfil (A3).
--
-- Idempotente: pode rodar mais de uma vez sem duplicar nada.
-- Rodar nos DOIS bancos (produção e obras-dev).
-- =============================================================

insert into public.permissoes_catalogo (codigo, modulo, nome, descricao, ordem) values
  ('geo.aba_cruzamento', 'sistemaGeo', 'Aba Cruzamento Fisc × Geo',
   'Cruzamento entre base de Fiscalização e Sistema Geo: cobertura e divergências', 6)
on conflict (codigo) do update
  set modulo    = excluded.modulo,
      nome      = excluded.nome,
      descricao = excluded.descricao,
      ordem     = excluded.ordem;
