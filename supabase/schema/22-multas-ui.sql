-- 22-multas-ui.sql
-- =============================================================
-- MÓDULO "MULTAS" — UI (A4) — permissões do catálogo
-- Cole no Supabase → SQL Editor → New query e rode.
-- Idempotente: pode rodar várias vezes sem dano.
-- ⚠️ Rodar nos DOIS bancos (produção e obras-dev/homologação).
-- =============================================================
--
-- Novo módulo de topo (padrão Emergências/Apresentação): mostra as multas
-- sincronizadas da planilha "CONTROLE DE AÇÕES FISCAIS - OBRAS / CORBETT"
-- (Edge Function sync-multas, A1/A2) já cruzadas com Sistema Geo/Fiscalização
-- em memória (src/lib/multas.js, A3). Dashboard é READ-ONLY.
--
-- `multas.ver` libera o módulo + a aba "Visão Geral" (padrão dos demais
-- módulos: a aba inicial vem junto do acesso ao módulo, sem permissão própria).
-- `multas.atualizar` (botão "Atualizar agora") NÃO entra em nenhum perfil
-- seed — mesmo padrão de `emerg.upload`: só o admin concede a quem precisar.

insert into public.permissoes_catalogo (codigo, modulo, nome, descricao, ordem) values
  ('multas.ver', 'multas', 'Módulo Multas',
   'Acessa o módulo "Multas" (Visão Geral: KPIs e gráficos das multas sincronizadas da planilha)', 1),
  ('multas.aba_inconsistencias', 'multas', 'Aba Inconsistências',
   'Aba "Inconsistências" no módulo Multas (multas sem processo ou com processo não encontrado)', 2),
  ('multas.aba_busca', 'multas', 'Aba Busca/Lista',
   'Aba "Busca/Lista" no módulo Multas (busca por nº de processo ou auto da multa)', 3),
  ('multas.atualizar', 'multas', 'Atualizar agora',
   'Botão "Atualizar agora" no módulo Multas (força a sincronização com a planilha)', 4)
on conflict (codigo) do update
  set modulo    = excluded.modulo,
      nome      = excluded.nome,
      descricao = excluded.descricao,
      ordem     = excluded.ordem;

-- ── Concede as de visualização ao perfil de visão ampla ─────────────
-- (admin ignora perfis e já enxerga tudo; `multas.atualizar` fica de fora,
-- como `emerg.upload` — só o admin concede a quem precisar do botão).
insert into public.perfil_permissoes (perfil_id, permissao)
select p.id, perm.codigo
from public.perfis_acesso p
cross join (values ('multas.ver'), ('multas.aba_inconsistencias'), ('multas.aba_busca')) as perm(codigo)
where p.nome = 'Visualização completa'
on conflict do nothing;
