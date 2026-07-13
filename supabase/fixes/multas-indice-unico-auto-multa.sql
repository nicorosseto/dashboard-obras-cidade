-- ============================================================
-- FIX — índice único de multas.auto_multa (13/07/2026)
-- ============================================================
-- ⚠️ Rodar nos DOIS bancos (obras-dev e produção). Idempotente.
--
-- O schema 21 criou o índice único de `auto_multa` como índice PARCIAL
-- (WHERE auto_multa IS NOT NULL AND <> ''). O upsert do Supabase
-- (PostgREST, `onConflict: 'auto_multa'`) infere o alvo do ON CONFLICT
-- só pelas colunas — sem como declarar o predicado do índice parcial —
-- e o Postgres então não encontra constraint compatível:
--   "there is no unique or exclusion constraint matching the ON
--    CONFLICT specification"
-- (1º teste real da Edge Function sync-multas, 13/07/2026).
--
-- Correção: índice único TOTAL. NULLs não conflitam entre si no
-- Postgres (NULLS DISTINCT, padrão), então as linhas sem AUTO DA MULTA
-- (168 na planilha) continuam podendo coexistir — a Edge Function grava
-- essas com auto_multa = NULL (nunca string vazia).

drop index if exists public.multas_auto_multa_key;

create unique index if not exists multas_auto_multa_key
  on public.multas (auto_multa);
