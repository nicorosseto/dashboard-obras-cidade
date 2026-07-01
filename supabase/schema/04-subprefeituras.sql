-- =============================================================
-- BIBLIOTECA DE SUBPREFEITURAS E DISTRITOS (fonte da verdade)
-- Rode nos DOIS bancos (produção e obras-dev):
-- SQL Editor → New query → cole tudo → Run
-- Idempotente: pode rodar várias vezes (usa ON CONFLICT).
-- =============================================================
--
-- Por que existe: padronizar os nomes/siglas das 32 subprefeituras de SP
-- (e seus 96 distritos) num único lugar que vale para TODAS as análises do
-- sistema. Os distritos ainda não são usados nas telas, mas ficam salvos
-- para análises futuras. Lista oficial fornecida pelo dono do produto.
--
-- ⚠️ Correção embutida: as siglas MP e SM estavam TROCADAS no front-end
-- (src/data/subprefeituras-sp.js): MP é São Miguel e SM é São Mateus
-- (padrão oficial da Prefeitura). Esta tabela já nasce correta.

-- 1) Subprefeituras (32) — sigla é a chave
create table if not exists public.subprefeituras (
  sigla  text primary key,
  nome   text not null,
  regiao text not null
);

-- 2) Distritos (96) — cada um pertence a uma subprefeitura
create table if not exists public.distritos (
  id                  bigserial primary key,
  nome                text not null unique,
  subprefeitura_sigla text not null references public.subprefeituras(sigla)
);
create index if not exists idx_distritos_sub on public.distritos(subprefeitura_sigla);

-- 3) RLS: leitura para usuários logados (mesma regra do resto do sistema).
--    Sem política de escrita: dados de referência são mantidos por SQL.
alter table public.subprefeituras enable row level security;
alter table public.distritos enable row level security;
drop policy if exists "Authenticated read subprefeituras" on public.subprefeituras;
create policy "Authenticated read subprefeituras" on public.subprefeituras
  for select using (auth.uid() is not null);
drop policy if exists "Authenticated read distritos" on public.distritos;
create policy "Authenticated read distritos" on public.distritos
  for select using (auth.uid() is not null);

-- 4) Seed das subprefeituras (sigla, nome oficial, região)
insert into public.subprefeituras (sigla, nome, regiao) values
  ('SE', 'Sé', 'Central'),
  ('IP', 'Ipiranga', 'Sul'),
  ('PI', 'Pinheiros', 'Oeste'),
  ('MO', 'Mooca', 'Leste'),
  ('VP', 'Vila Prudente', 'Leste'),
  ('AF', 'Aricanduva-Formosa-Carrão', 'Leste'),
  ('VM', 'Vila Mariana', 'Sul'),
  ('LA', 'Lapa', 'Oeste'),
  ('ST', 'Santana-Tucuruvi', 'Norte'),
  ('IQ', 'Itaquera', 'Leste'),
  ('SA', 'Santo Amaro', 'Sul'),
  ('PE', 'Penha', 'Leste'),
  ('MP', 'São Miguel', 'Leste'),
  ('SB', 'Sapopemba', 'Leste'),
  ('MG', 'Vila Maria-Vila Guilherme', 'Norte'),
  ('CS', 'Capela do Socorro', 'Sul'),
  ('IT', 'Itaim Paulista', 'Leste'),
  ('SM', 'São Mateus', 'Leste'),
  ('MB', 'M''Boi Mirim', 'Sul'),
  ('CL', 'Campo Limpo', 'Sul'),
  ('JA', 'Jabaquara', 'Sul'),
  ('PJ', 'Pirituba-Jaraguá', 'Norte'),
  ('AD', 'Cidade Ademar', 'Sul'),
  ('G',  'Guaianases', 'Leste'),
  ('BT', 'Butantã', 'Oeste'),
  ('CV', 'Casa Verde-Cachoeirinha', 'Norte'),
  ('CT', 'Cidade Tiradentes', 'Leste'),
  ('FB', 'Freguesia-Brasilândia', 'Norte'),
  ('JT', 'Jaçanã-Tremembé', 'Norte'),
  ('EM', 'Ermelino Matarazzo', 'Leste'),
  ('PR', 'Perus', 'Norte'),
  ('PA', 'Parelheiros', 'Sul')
on conflict (sigla) do update
  set nome = excluded.nome, regiao = excluded.regiao;

-- 5) Seed dos distritos (nome, sigla da subprefeitura)
insert into public.distritos (nome, subprefeitura_sigla) values
  ('Bela Vista', 'SE'), ('Bom Retiro', 'SE'), ('Cambuci', 'SE'),
  ('Consolação', 'SE'), ('Liberdade', 'SE'), ('República', 'SE'),
  ('Santa Cecília', 'SE'), ('Sé', 'SE'),
  ('Cursino', 'IP'), ('Ipiranga', 'IP'), ('Sacomã', 'IP'),
  ('Alto de Pinheiros', 'PI'), ('Itaim Bibi', 'PI'),
  ('Jardim Paulista', 'PI'), ('Pinheiros', 'PI'),
  ('Água Rasa', 'MO'), ('Belém', 'MO'), ('Brás', 'MO'),
  ('Mooca', 'MO'), ('Pari', 'MO'), ('Tatuapé', 'MO'),
  ('São Lucas', 'VP'), ('Vila Prudente', 'VP'),
  ('Aricanduva', 'AF'), ('Carrão', 'AF'), ('Vila Formosa', 'AF'),
  ('Moema', 'VM'), ('Saúde', 'VM'), ('Vila Mariana', 'VM'),
  ('Barra Funda', 'LA'), ('Jaguara', 'LA'), ('Jaguaré', 'LA'),
  ('Lapa', 'LA'), ('Perdizes', 'LA'), ('Vila Leopoldina', 'LA'),
  ('Mandaqui', 'ST'), ('Santana', 'ST'), ('Tucuruvi', 'ST'),
  ('Cidade Líder', 'IQ'), ('Itaquera', 'IQ'),
  ('José Bonifácio', 'IQ'), ('Parque do Carmo', 'IQ'),
  ('Campo Belo', 'SA'), ('Campo Grande', 'SA'), ('Santo Amaro', 'SA'),
  ('Artur Alvim', 'PE'), ('Cangaíba', 'PE'), ('Penha', 'PE'),
  ('Vila Matilde', 'PE'),
  ('Jardim Helena', 'MP'), ('São Miguel', 'MP'), ('Vila Jacuí', 'MP'),
  ('Sapopemba', 'SB'),
  ('Vila Guilherme', 'MG'), ('Vila Maria', 'MG'), ('Vila Medeiros', 'MG'),
  ('Cidade Dutra', 'CS'), ('Grajaú', 'CS'), ('Socorro', 'CS'),
  ('Itaim Paulista', 'IT'), ('Vila Curuçá', 'IT'),
  ('Iguatemi', 'SM'), ('São Mateus', 'SM'), ('São Rafael', 'SM'),
  ('Jardim Ângela', 'MB'), ('Jardim São Luís', 'MB'),
  ('Campo Limpo', 'CL'), ('Capão Redondo', 'CL'), ('Vila Andrade', 'CL'),
  ('Jabaquara', 'JA'),
  ('Jaraguá', 'PJ'), ('Pirituba', 'PJ'), ('São Domingos', 'PJ'),
  ('Cidade Ademar', 'AD'), ('Pedreira', 'AD'),
  ('Guaianases', 'G'), ('Lajeado', 'G'),
  ('Butantã', 'BT'), ('Morumbi', 'BT'), ('Raposo Tavares', 'BT'),
  ('Rio Pequeno', 'BT'), ('Vila Sônia', 'BT'),
  ('Cachoeirinha', 'CV'), ('Casa Verde', 'CV'), ('Limão', 'CV'),
  ('Cidade Tiradentes', 'CT'),
  ('Brasilândia', 'FB'), ('Freguesia do Ó', 'FB'),
  ('Jaçanã', 'JT'), ('Tremembé', 'JT'),
  ('Ermelino Matarazzo', 'EM'), ('Ponte Rasa', 'EM'),
  ('Anhanguera', 'PR'), ('Perus', 'PR'),
  ('Marsilac', 'PA'), ('Parelheiros', 'PA')
on conflict (nome) do update
  set subprefeitura_sigla = excluded.subprefeitura_sigla;

-- 6) Conferência: deve mostrar 32 subprefeituras e 96 distritos
select
  (select count(*) from public.subprefeituras) as total_subprefeituras,
  (select count(*) from public.distritos)      as total_distritos;
