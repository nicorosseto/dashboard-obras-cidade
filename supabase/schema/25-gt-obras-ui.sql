-- 25-gt-obras-ui.sql
-- =============================================================
-- MÓDULO "GT OBRAS" — UI — permissões do catálogo
-- Cole no Supabase → SQL Editor → New query e rode.
-- Idempotente: pode rodar várias vezes sem dano.
-- ⚠️ Rodar nos DOIS bancos (produção e obras-dev/homologação).
-- =============================================================
--
-- Novo módulo de topo (padrão Emergências/Apresentação/Multas): mostra a
-- compatibilização de obras × recape sincronizada da planilha
-- "[GT - Obras]" (Edge Function sync-gt-obras) já cruzada com
-- Sistema Geo/Fiscalização em memória. Dashboard é READ-ONLY.
--
-- `gt.ver` libera o módulo + a aba "Visão Geral" (padrão dos demais
-- módulos: a aba inicial vem junto do acesso ao módulo, sem permissão
-- própria).
-- `gt.atualizar` (botão "Atualizar agora") NÃO entra em nenhum perfil
-- seed — mesmo padrão de `emerg.upload`/`multas.atualizar`: só o admin
-- concede a quem precisar.

insert into public.permissoes_catalogo (codigo, modulo, nome, descricao, ordem) values
  ('gt.ver', 'gt', 'Módulo GT Obras',
   'Acessa o módulo "GT Obras" (Visão Geral: KPIs e gráficos da compatibilização de obras × recape)', 1),
  ('gt.aba_analise', 'gt', 'Aba Análise de Status',
   'Aba "Análise de Status" no módulo GT Obras (aprofundamento por status, pendências acionáveis, carga por técnica)', 2),
  ('gt.aba_lista', 'gt', 'Aba Lista',
   'Aba "Lista" no módulo GT Obras (busca por nº de processo + seção "Verificar inconsistências")', 3),
  ('gt.atualizar', 'gt', 'Atualizar agora',
   'Botão "Atualizar agora" no módulo GT Obras (força a sincronização com a planilha)', 4)
on conflict (codigo) do update
  set modulo    = excluded.modulo,
      nome      = excluded.nome,
      descricao = excluded.descricao,
      ordem     = excluded.ordem;

-- ── Concede as de visualização ao perfil de visão ampla ─────────────
-- (admin ignora perfis e já enxerga tudo; `gt.atualizar` fica de fora,
-- como `emerg.upload`/`multas.atualizar` — só o admin concede a quem
-- precisar do botão).
insert into public.perfil_permissoes (perfil_id, permissao)
select p.id, perm.codigo
from public.perfis_acesso p
cross join (values ('gt.ver'), ('gt.aba_analise'), ('gt.aba_lista')) as perm(codigo)
where p.nome = 'Visualização completa'
on conflict do nothing;
