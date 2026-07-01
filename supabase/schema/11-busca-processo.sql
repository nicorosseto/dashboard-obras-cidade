-- =============================================================
-- 11 — Busca por Processo (Frente 3)
--
-- Adiciona as permissões fisc.aba_processo e geo.aba_processo ao
-- catálogo. A lógica de busca é executada no front-end (filtro
-- local nas linhas já carregadas).
--
-- Idempotente: pode rodar mais de uma vez sem duplicar nada.
-- Rodar nos DOIS bancos (produção e obras-dev).
-- =============================================================

insert into public.permissoes_catalogo (codigo, modulo, nome, descricao, ordem) values
  ('fisc.aba_processo', 'fiscalizacao', 'Aba Busca por Processo',
   'Busca de laudos por número de processo (SEI ou protocolo)', 8),
  ('geo.aba_processo',  'sistemaGeo',    'Aba Busca por Processo',
   'Busca de registros Sistema Geo por número de processo',        7)
on conflict (codigo) do update
  set modulo    = excluded.modulo,
      nome      = excluded.nome,
      descricao = excluded.descricao,
      ordem     = excluded.ordem;

-- Concede a novos perfis: Visualização completa, Equipe Fiscalização e Equipe Sistema Geo.
insert into public.perfil_permissoes (perfil_id, permissao)
select p.id, c.codigo
from public.perfis_acesso p
join public.permissoes_catalogo c on (
    (p.nome = 'Visualização completa' and c.codigo in ('fisc.aba_processo','geo.aba_processo'))
 or (p.nome = 'Equipe Fiscalização'   and c.codigo = 'fisc.aba_processo')
 or (p.nome = 'Equipe Sistema Geo'       and c.codigo = 'geo.aba_processo')
)
on conflict do nothing;
