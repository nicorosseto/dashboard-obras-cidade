-- =============================================================
-- MÓDULO EMERGÊNCIAS — Permissão da aba "Prazo 48h" (regra das 48h / SLA)
-- Cole no Supabase → SQL Editor → New query e rode.
-- Idempotente: pode rodar várias vezes sem dano.
-- ⚠️ Rodar nos DOIS bancos (produção e obras-dev/homologação).
-- =============================================================
--
-- A aba "Prazo 48h" cruza as emergências (status "Informada") com a planilha
-- auxiliar de posicionamento de obras (`emergencias_obras`) para apontar quais
-- ultrapassaram o prazo de 48h. O prazo é contado a partir do aviso de início
-- da obra (`data_inicio_obra`) e, quando não há posicionamento, a partir da
-- `data_cadastro` da emergência (prazo ESTIMADO). Como não é exclusiva do admin,
-- precisa de permissão própria no catálogo.

-- 1) Cadastra a permissão da aba no catálogo
insert into public.permissoes_catalogo (codigo, modulo, nome, descricao, ordem) values
  ('emerg.aba_prazo48h', 'emergencias', 'Aba Prazo 48h',
   'Cruzamento das emergências com o posicionamento de obras para apontar atrasos da regra das 48h (SLA)', 4)
on conflict (codigo) do update
  set modulo    = excluded.modulo,
      nome      = excluded.nome,
      descricao = excluded.descricao,
      ordem     = excluded.ordem;

-- 2) Concede a nova permissão aos perfis que já enxergam Emergências
--    (mesmo critério usado para emerg.aba_processo no script 12).
insert into public.perfil_permissoes (perfil_id, permissao)
select p.id, 'emerg.aba_prazo48h'
from public.perfis_acesso p
where p.nome = 'Visualização completa'
on conflict do nothing;

-- Espelha para quem já tem a aba "Busca por Processo" de Emergências
-- (quem vê as demais abas de Emergências deve ver a de Prazo 48h também).
insert into public.perfil_permissoes (perfil_id, permissao)
select pp.perfil_id, 'emerg.aba_prazo48h'
from public.perfil_permissoes pp
where pp.permissao = 'emerg.aba_processo'
on conflict do nothing;
