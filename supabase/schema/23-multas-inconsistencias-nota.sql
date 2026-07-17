-- 23-multas-inconsistencias-nota.sql
-- =============================================================
-- MÓDULO "MULTAS" — ajuste de texto da permissão (2ª rodada de feedback)
-- Cole no Supabase → SQL Editor → New query e rode.
-- Idempotente: pode rodar várias vezes sem dano.
-- ⚠️ Rodar nos DOIS bancos (produção e obras-dev/homologação).
-- =============================================================
--
-- A aba "Inconsistências" deixou de existir no Header — virou uma seção
-- auxiliar/alternável ("Verificar inconsistências") dentro da aba "Lista"
-- (16/07/2026, 2ª rodada de feedback da validação do A4). A permissão
-- `multas.aba_inconsistencias` continua a mesma (não é preciso reatribuir
-- perfis) — só o nome/descrição no catálogo mudam para refletir o novo
-- lugar na interface. A aba "Busca/Lista" também foi renomeada para "Lista".

update public.permissoes_catalogo
set nome = 'Verificar Inconsistências',
    descricao = 'Seção "Verificar inconsistências" dentro da aba Lista do módulo Multas (multas sem processo ou com processo não encontrado — só conferência)'
where codigo = 'multas.aba_inconsistencias';

update public.permissoes_catalogo
set nome = 'Aba Lista',
    descricao = 'Aba "Lista" no módulo Multas (busca por nº de processo ou auto da multa)'
where codigo = 'multas.aba_busca';
