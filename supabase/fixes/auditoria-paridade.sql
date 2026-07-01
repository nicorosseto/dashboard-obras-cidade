-- =============================================================
-- AUDITORIA DE PARIDADE entre os bancos (produção × obras-dev)
-- 100% LEITURA — nenhum UPDATE/INSERT/DELETE. Seguro rodar em produção.
-- =============================================================
--
-- Como usar:
--   1. Rode este script INTEIRO em CADA banco (produção e obras-dev).
--   2. Ele devolve 4 linhas: COLUNAS, FUNCOES, RLS e TABELAS — cada uma
--      com a quantidade de itens e uma "impressão digital" (md5).
--   3. Compare as 4 impressões entre os dois bancos:
--        - todas iguais  → estrutura IDÊNTICA (paridade OK);
--        - alguma difere → aquela seção tem divergência. Rode então a
--          query de DETALHE correspondente (no fim do arquivo) nos dois
--          bancos para ver exatamente o que está diferente.
--
-- Observação: a contagem de DADOS já foi conferida à parte (sistemaGeo com
-- 175.312 linhas nos dois). Aqui o foco é a ESTRUTURA do banco.

with inventario as (
  -- 1) Colunas de todas as tabelas do schema public (nome.coluna :: tipo)
  select '1-COLUNAS' as secao,
         table_name || '.' || column_name || ' :: ' || data_type as item
  from information_schema.columns
  where table_schema = 'public'

  union all
  -- 2) Funções (nome + assinatura dos argumentos)
  select '2-FUNCOES' as secao,
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as item
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'

  union all
  -- 3) Políticas RLS (tabela | política | comando | USING / WITH CHECK)
  select '3-RLS' as secao,
         tablename || ' | ' || policyname || ' | ' || cmd || ' | ' ||
         coalesce(qual, '-') || ' / ' || coalesce(with_check, '-') as item
  from pg_policies
  where schemaname = 'public'

  union all
  -- 4) Lista de tabelas do schema public
  select '4-TABELAS' as secao,
         table_name as item
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
)
select secao,
       count(*)                                  as qtd_itens,
       md5(string_agg(item, '|' order by item))  as impressao_digital
from inventario
group by secao
order by secao;

-- =============================================================
-- DETALHE (rode só a seção que divergiu, nos dois bancos, e compare).
-- Cada uma devolve a lista ordenada de itens daquela seção.
-- =============================================================

-- -- COLUNAS:
-- select table_name || '.' || column_name || ' :: ' || data_type as item
-- from information_schema.columns
-- where table_schema = 'public'
-- order by item;

-- -- FUNCOES:
-- select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as item
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
-- order by item;

-- -- RLS:
-- select tablename || ' | ' || policyname || ' | ' || cmd || ' | ' ||
--        coalesce(qual,'-') || ' / ' || coalesce(with_check,'-') as item
-- from pg_policies where schemaname = 'public'
-- order by item;

-- -- TABELAS:
-- select table_name from information_schema.tables
-- where table_schema = 'public' and table_type = 'BASE TABLE'
-- order by table_name;
