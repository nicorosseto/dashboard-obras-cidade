-- =============================================================
-- 10 — View enriquecida de Fiscalização + aba Executoras (D3-E)
--
-- Fonte da verdade: Sistema Geo (dados automáticos).
-- Regra: permissionaria e subprefeitura vêm do Sistema Geo quando o
-- processo existe lá (COALESCE); caso contrário usa o que está na
-- tabela de Fiscalização (fallback manual).
--
-- Colunas adicionadas pelo Sistema Geo:
--   executora, tipo_processo_nome, etapa_nome, tipo_obra_nome,
--   geo_status_nome, geo_status_unificado, data_cadastro, tem_sistemaGeo
--
-- Colunas de origem (para auditoria/D3):
--   permissionaria_origem  = permissionaria como veio da planilha de fisc
--   subprefeitura_origem   = subprefeitura como veio da planilha de fisc
--
-- Idempotente: pode rodar mais de uma vez. Rodar nos DOIS bancos.
-- =============================================================

-- 1) Permissão da nova aba -------------------------------------------------------
insert into public.permissoes_catalogo (codigo, modulo, nome, descricao, ordem) values
  ('fisc.aba_executoras', 'fiscalizacao', 'Aba Executoras',
   'Análise de conformidade por executora (cruzado com Sistema Geo)', 7)
on conflict (codigo) do update
  set modulo    = excluded.modulo,
      nome      = excluded.nome,
      descricao = excluded.descricao,
      ordem     = excluded.ordem;

-- 2) View -------------------------------------------------------------------------
create or replace view public.vw_fiscalizacao_enriquecida as
select
  f.id,
  f.id_origem,

  -- permissionaria e subprefeitura: Sistema Geo manda; cai pra fisc se não tiver
  coalesce(g.permissionaria, f.permissionaria)  as permissionaria,
  coalesce(g.subprefeitura,  f.subprefeitura)   as subprefeitura,
  sub.nome                                        as subprefeitura_nome,

  -- grupo_norcrest recalculado sobre a permissionaria resultante
  case
    when coalesce(g.permissionaria, f.permissionaria) like '%NORCREST%' then 'NORCREST'
    else 'Outras'
  end as grupo_norcrest,

  -- colunas de conformidade: sempre da Fiscalização (resultado do laudo)
  f.data_inicio,
  f.area_m2,
  f.classificacao_viaria,
  f.em_andamento,
  f.legislacao_atendida,
  f.solucionado,
  f.data_conclusao,
  f.falha_geometria,
  f.falha_recomposicao,
  f.falha_sinalizacao,
  f.falha_sarjeta,
  f.falha_guia,
  f.falha_reposicao,
  f.falha_trincas,
  f.falha_afundamento,
  f.falha_nivelamento,
  f.falha_outros,
  f.tem_nao_conformidade,
  f.status_simplificado,
  f.importado_em,

  -- colunas extras do Sistema Geo (null quando a obra não existe lá)
  g.executora,
  g.tipo_processo_nome,
  g.etapa_nome,
  g.status_nome       as geo_status_nome,
  g.status_unificado  as geo_status_unificado,
  g.tipo_obra_nome,
  g.data_cadastro,
  (g.processo is not null) as tem_sistemaGeo,

  -- valores originais da fisc (para auditoria e cruzamento D3)
  f.permissionaria  as permissionaria_origem,
  f.subprefeitura   as subprefeitura_origem,

  -- lote/OBRAS (col C) e executante (col E) da planilha de fisc — adicionados
  -- no fim para permitir CREATE OR REPLACE (novas colunas só entram após as
  -- existentes). executante serve de fallback para a executora do Sistema Geo.
  f.lote,
  f.executante

from public.fiscalizacoes     f
left join public.sistemaGeo      g   on f.id_origem = g.processo
left join public.subprefeituras sub on coalesce(g.subprefeitura, f.subprefeitura) = sub.sigla;

-- 3) Acesso: apenas usuários autenticados (mesma restrição do Sistema Geo) ----------
grant select on public.vw_fiscalizacao_enriquecida to authenticated;
