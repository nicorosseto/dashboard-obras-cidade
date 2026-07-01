-- =============================================================
-- 12 — Revisão do catálogo de permissões (19/06/2026)
--
-- Corrige e completa o catálogo após a Frente 5 (Análise Integrada),
-- Frente 3 (Busca por Processo) e D3+ (Aba Executoras).
--
-- Mudanças:
--   1. geo.aba_cruzamento → label "Análise Integrada (acesso ao módulo)",
--      módulo analise_integrada (slug mantido por compat.)
--   2. Adiciona 8 abas individuais ai.* para a Análise Integrada
--   3. fisc.aba_executoras → adicionado (faltava no catálogo)
--   4. emerg.aba_processo  → adicionado (faltava no catálogo)
--   5. fisc.aba_processo e geo.aba_processo → ordens ajustadas
--   6. Remove "(em breve — D1/D2)" das descrições de fisc.upload e geo.upload
--      (funcionalidade já implementada em Configurações)
--
-- Idempotente: pode rodar mais de uma vez sem duplicar nada.
-- Rodar nos DOIS bancos (produção e obras-dev).
-- =============================================================

-- 1) Atualiza geo.aba_cruzamento → controle de acesso ao módulo inteiro
update public.permissoes_catalogo
set modulo    = 'analise_integrada',
    nome      = 'Acesso ao módulo (todas as abas)',
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

-- 3) Adiciona permissões que estavam faltando no catálogo
insert into public.permissoes_catalogo (codigo, modulo, nome, descricao, ordem) values
  ('fisc.aba_executoras', 'fiscalizacao', 'Aba Executoras',
   'Gráficos e ranking de executoras e permissionárias com análise de NC', 7),
  ('emerg.aba_processo',  'emergencias',  'Aba Busca por Processo',
   'Busca de registros de emergência por número de processo',              3)
on conflict (codigo) do update
  set modulo    = excluded.modulo,
      nome      = excluded.nome,
      descricao = excluded.descricao,
      ordem     = excluded.ordem;

-- 4) Corrige ordens de fisc e geo busca por processo
update public.permissoes_catalogo set ordem = 8 where codigo = 'fisc.aba_processo';
update public.permissoes_catalogo set ordem = 8 where codigo = 'geo.aba_processo';

-- 5) Remove fisc.upload e geo.upload do catálogo:
--    o upload de Sistema Geo e Fiscalização está em Configurações → Atualizar Dados,
--    que só é acessível por admins. Admins ignoram perfis de acesso, então essas
--    permissões nunca são verificadas no front e só poluem a tela de Perfis.
--    A permissão emerg.upload permanece porque é verificada para usuários não-admin.
delete from public.perfil_permissoes where permissao in ('fisc.upload', 'geo.upload');
delete from public.permissoes_catalogo where codigo in ('fisc.upload', 'geo.upload');

-- 6) Concede fisc.aba_executoras aos perfis que já têm acesso completo à Fiscalização
insert into public.perfil_permissoes (perfil_id, permissao)
select p.id, 'fisc.aba_executoras'
from public.perfis_acesso p
where p.nome in ('Visualização completa', 'Equipe Fiscalização')
on conflict do nothing;

-- 7) Concede emerg.aba_processo aos perfis que já enxergam Emergências
insert into public.perfil_permissoes (perfil_id, permissao)
select p.id, 'emerg.aba_processo'
from public.perfis_acesso p
where p.nome = 'Visualização completa'
on conflict do nothing;

-- 8) Concede as 8 abas ai.* a quem já tem geo.aba_cruzamento
insert into public.perfil_permissoes (perfil_id, permissao)
select pp.perfil_id, abas.codigo
from public.perfil_permissoes pp
cross join (
  select codigo from public.permissoes_catalogo
  where codigo like 'ai.%'
) abas
where pp.permissao = 'geo.aba_cruzamento'
on conflict do nothing;
