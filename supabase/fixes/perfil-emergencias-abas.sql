-- =============================================================
-- Concede as abas novas de Emergências ao perfil "Emergências" (23/06/2026)
--
-- O perfil seed "Emergências" nasceu (script 06) só com `emerg.ver` e nunca
-- recebeu as abas adicionadas depois:
--   - emerg.aba_processo  (Busca por Processo, script 12)
--   - emerg.aba_prazo48h  (Prazo 48h / SLA, script 14)
-- Sem elas, quem usa o perfil "Emergências" entra no módulo mas não enxerga
-- as abas Prazo 48h e Busca por Processo.
--
-- Idempotente (ON CONFLICT DO NOTHING).
-- Rodar nos DOIS bancos: produção e obras-dev/homologação.
-- =============================================================

insert into public.perfil_permissoes (perfil_id, permissao)
select p.id, c.codigo
from public.perfis_acesso p
join public.permissoes_catalogo c on c.codigo in ('emerg.aba_processo', 'emerg.aba_prazo48h')
where p.nome = 'Emergências'
on conflict do nothing;

-- Verificação (rodar à parte para conferir):
-- select p.nome, array_agg(pp.permissao order by pp.permissao) as permissoes
-- from public.perfis_acesso p
-- join public.perfil_permissoes pp on pp.perfil_id = p.id
-- where p.nome = 'Emergências'
-- group by p.nome;
