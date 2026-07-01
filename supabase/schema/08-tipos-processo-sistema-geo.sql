-- =============================================================
-- 08 — Catálogo de TIPO DE PROCESSO do Sistema Geo
--
-- Espelha o modelo do catálogo de status (05-status-sistema-geo.sql): tira o
-- dicionário fixo do front-end e vira fonte da verdade no banco, para a tela
-- de "Atualizar Dados" poder CLASSIFICAR tipos de processo novos na hora do
-- upload (gravando aqui), do mesmo jeito que já faz com status.
--
-- Idempotente. Rodar nos DOIS bancos (produção e obras-dev).
-- Requer: 07-atualizar-dados.sql (função tem_permissao) e is_admin().
-- =============================================================

create table if not exists public.tipos_processo_sistemaGeo (
  tipo_origem text primary key,          -- valor bruto exato da planilha
  tipo_nome   text not null              -- nome legível para exibição
);
alter table public.tipos_processo_sistemaGeo enable row level security;

drop policy if exists "Authenticated read tipos_processo" on public.tipos_processo_sistemaGeo;
create policy "Authenticated read tipos_processo" on public.tipos_processo_sistemaGeo
  for select using (auth.uid() is not null);

drop policy if exists "Upload classifica tipos_processo" on public.tipos_processo_sistemaGeo;
create policy "Upload classifica tipos_processo" on public.tipos_processo_sistemaGeo
  for insert with check (public.tem_permissao('geo.upload'));

drop policy if exists "Upload atualiza tipos_processo" on public.tipos_processo_sistemaGeo;
create policy "Upload atualiza tipos_processo" on public.tipos_processo_sistemaGeo
  for update using (public.tem_permissao('geo.upload'))
  with check (public.tem_permissao('geo.upload'));

-- Seed: os mesmos pares do dicionário que estava fixo no front-end / notebook
insert into public.tipos_processo_sistemaGeo (tipo_origem, tipo_nome) values
  ('EXPANSAO_IMPLANTACAO',          'Expansão'),
  ('EXPANSAO',                      'Expansão'),
  ('LIGACAODOMICILIAR',             'Ligação Domiciliar'),
  ('LIGACAO_DOMICILIAR_SEM_ALVARA', 'Ligação Domiciliar'),
  ('EMERGENCIA',                    'Emergência'),
  ('MANUTENCAO_CORRETIVA',          'Manutenção Corretiva'),
  ('MANUTENCAO_PREVENTIVA',         'Manutenção Preventiva'),
  ('DEMAIS_SERVICOS',               'Demais Serviços'),
  ('ERB',                           'ERB'),
  ('RADAR',                         'Radar'),
  ('CAMERA_DE_SEGURANCA',           'Câmera de Segurança')
on conflict (tipo_origem) do update set tipo_nome = excluded.tipo_nome;

-- =============================================================
-- Verificação:
-- select count(*) from public.tipos_processo_sistemaGeo;  -- 11
-- =============================================================
