-- =============================================================
-- CORREÇÃO DOS DADOS JÁ CARREGADOS DO SISTEMA GEO (sem reimportar)
-- Rode no banco que estiver com dados quebrados (ex.: produção).
-- SQL Editor → New query → cole tudo → Run.
-- Idempotente: pode rodar várias vezes sem dano.
-- =============================================================
--
-- Contexto: a importação antiga (antes da correção dos dicionários, PR #34)
-- gravou o dado BRUTO certo, mas deixou as colunas DERIVADAS erradas:
--   - status_unificado / status_nome ficaram NULL (bug do mapeamento);
--   - tipo_obra (e outras colunas de texto) ficaram com o placeholder "---".
-- Como o dado bruto está correto, não é preciso reimportar: dá para recalcular
-- as colunas derivadas a partir do catálogo do B2 (status_sistemaGeo) e limpar os
-- "---". Diagnóstico (10/06): produção tinha 175.312 status NULL e 21.104 "---";
-- obras-dev estava limpo (0/0).

-- 1) Limpa o placeholder "---" (uma ou mais traços) das colunas de texto.
--    Vira NULL, como um import novo faria. Cobre tipo_obra e as demais.
update public.sistemaGeo set tipo_processo  = null where tipo_processo  ~ '^-+$';
update public.sistemaGeo set permissionaria = null where permissionaria ~ '^-+$';
update public.sistemaGeo set executora      = null where executora      ~ '^-+$';
update public.sistemaGeo set etapa          = null where etapa          ~ '^-+$';
update public.sistemaGeo set subprefeitura  = null where subprefeitura  ~ '^-+$';
update public.sistemaGeo set status         = null where status         ~ '^-+$';
update public.sistemaGeo
  set tipo_obra = null, tipo_obra_nome = null
  where tipo_obra ~ '^-+$';

-- 2) Recalcula status_nome / status_unificado a partir do catálogo (B2).
update public.sistemaGeo g
set status_unificado = s.status_unificado,
    status_nome      = s.status_nome
from public.status_sistemaGeo s
where g.status = s.status_origem
  and (g.status_unificado is distinct from s.status_unificado
       or g.status_nome      is distinct from s.status_nome);

-- 3) Status que existem mas NÃO estão no catálogo: marca para revisão
--    (não deixa NULL). status_nome cai para o valor bruto, se vazio.
update public.sistemaGeo
set status_unificado = 'Verificar Novo Status',
    status_nome      = coalesce(status_nome, status)
where status is not null
  and status_unificado is null;

-- 4) Conferência: não deve sobrar status NULL nem "---"; "a_revisar" idealmente 0
select
  count(*)                                                            as total,
  count(*) filter (where status_unificado is null)                   as status_nulos,
  count(*) filter (where status_unificado = 'Verificar Novo Status') as a_revisar,
  count(*) filter (where tipo_obra = '---')                          as tipo_obra_traco
from public.sistemaGeo;
