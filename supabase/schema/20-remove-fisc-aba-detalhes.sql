-- =============================================================
-- 20 — Remove a permissão fisc.aba_detalhes (aba "Detalhes" eliminada)
--
-- A aba "Detalhes" da Fiscalização (Pagina4Detalhes.jsx / Tabela.jsx) foi
-- eliminada por redundância com a "Busca por Processo" (que passou a
-- mostrar também Executora, Classificação Viária e Área m² — as 3 colunas
-- que só existiam na Detalhes). Ver PR 3 do plano de melhorias de julho
-- (docs/plano-melhorias-2026-07.md) e docs/diario-de-bordo.md.
--
-- O DELETE em permissoes_catalogo já remove em cascata as linhas
-- correspondentes em perfil_permissoes (FK "on delete cascade" — ver
-- 06-permissoes.sql). Idempotente: pode rodar mais de uma vez sem erro.
-- Rodar nos DOIS bancos (produção e obras-dev).
-- =============================================================

delete from public.permissoes_catalogo where codigo = 'fisc.aba_detalhes';
