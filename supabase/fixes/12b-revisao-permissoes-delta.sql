-- =============================================================
-- 12b — Delta da revisão de permissões (19/06/2026)
--
-- Rodar apenas se você já rodou o 12-revisao-permissoes.sql
-- na versão ANTERIOR (que atualizava descrições de fisc.upload/geo.upload
-- e criava fisc.aba_executoras / emerg.aba_processo).
--
-- Este script adiciona o que ficou de fora:
--   1. Corrige geo.aba_cruzamento (nome e ordem novamente)
--   2. Adiciona as 8 abas individuais ai.* da Análise Integrada
--   3. Remove fisc.upload e geo.upload do catálogo
--   4. Concede ai.* a quem já tem geo.aba_cruzamento
--
-- Idempotente. Rodar nos DOIS bancos (produção e obras-dev).
-- =============================================================

-- 1) Corrige geo.aba_cruzamento para o novo label e ordem
update public.permissoes_catalogo
set nome      = 'Acesso ao módulo (todas as abas)',
    descricao = 'Concede acesso completo ao módulo Análise Integrada (todas as abas). Use as permissões individuais ai.* para controle fino.',
    ordem     = 0
where codigo = 'geo.aba_cruzamento';

-- 2) Adiciona as 8 abas individuais da Análise Integrada
insert into public.permissoes_catalogo (codigo, modulo, nome, descricao, ordem) values
  ('ai.aba_geral',         'analise_integrada', 'Aba Visão Geral',       'KPIs, distribuições e gráficos gerais do cruzamento',         1),
  ('ai.aba_cobertura',     'analise_integrada', 'Aba Cobertura',         'Tabelas de cobertura por permissionária e subprefeitura',      2),
  ('ai.aba_status',        'analise_integrada', 'Aba Status Cruzado',    'Matriz de status entre Fiscalização e Sistema Geo',               3),
  ('ai.aba_linha_tempo',   'analise_integrada', 'Aba Linha do Tempo',    'Evolução mensal e bins de prazo',                              4),
  ('ai.aba_divergencias',  'analise_integrada', 'Aba Divergências',      'Registros que existem só numa base ou com campos divergentes', 5),
  ('ai.aba_executoras',    'analise_integrada', 'Aba Executoras',        'Processos em comum, laudos e NC por executora',                6),
  ('ai.aba_mapa',          'analise_integrada', 'Aba Mapa',              'Choropleth de cobertura por subprefeitura',                    7),
  ('ai.aba_busca',         'analise_integrada', 'Aba Busca por Processo','Busca simultânea nas duas bases por número de processo',       8)
on conflict (codigo) do update
  set modulo    = excluded.modulo,
      nome      = excluded.nome,
      descricao = excluded.descricao,
      ordem     = excluded.ordem;

-- 3) Remove fisc.upload e geo.upload do catálogo
--    (só admin acessa o upload; admin ignora perfis → permissão sem efeito)
delete from public.perfil_permissoes where permissao in ('fisc.upload', 'geo.upload');
delete from public.permissoes_catalogo where codigo in ('fisc.upload', 'geo.upload');

-- 4) Concede as 8 abas ai.* a quem já tem geo.aba_cruzamento
insert into public.perfil_permissoes (perfil_id, permissao)
select pp.perfil_id, abas.codigo
from public.perfil_permissoes pp
cross join (
  select codigo from public.permissoes_catalogo
  where codigo like 'ai.%'
) abas
where pp.permissao = 'geo.aba_cruzamento'
on conflict do nothing;
