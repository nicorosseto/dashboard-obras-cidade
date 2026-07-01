-- =============================================================
-- Atualiza os perfis seed com as permissões adicionadas após o A3
-- (geo.aba_cruzamento e fisc.aba_executoras, adicionadas nos PRs #85 e #86).
--
-- Idempotente (ON CONFLICT DO NOTHING).
-- Rodar nos DOIS bancos: fiscalizacao-obras (produção) e obras-dev.
-- =============================================================

-- "Visualização completa": enxerga tudo exceto uploads → adiciona cruzamento e executoras
insert into public.perfil_permissoes (perfil_id, permissao)
select p.id, c.codigo
from public.perfis_acesso p
join public.permissoes_catalogo c on c.codigo in ('geo.aba_cruzamento', 'fisc.aba_executoras')
where p.nome = 'Visualização completa'
on conflict do nothing;

-- "Equipe Sistema Geo": acesso ao cruzamento (que vive no módulo Sistema Geo)
insert into public.perfil_permissoes (perfil_id, permissao)
select p.id, c.codigo
from public.perfis_acesso p
join public.permissoes_catalogo c on c.codigo = 'geo.aba_cruzamento'
where p.nome = 'Equipe Sistema Geo'
on conflict do nothing;

-- "Equipe Fiscalização": acesso à aba Executoras
insert into public.perfil_permissoes (perfil_id, permissao)
select p.id, c.codigo
from public.perfis_acesso p
join public.permissoes_catalogo c on c.codigo = 'fisc.aba_executoras'
where p.nome = 'Equipe Fiscalização'
on conflict do nothing;

-- Verificação (rodar à parte para confirmar):
-- select p.nome, array_agg(pp.permissao order by pp.permissao) as permissoes
-- from public.perfis_acesso p
-- join public.perfil_permissoes pp on pp.perfil_id = p.id
-- group by p.nome order by p.nome;
