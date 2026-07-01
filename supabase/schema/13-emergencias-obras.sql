-- =============================================================
-- MÓDULO EMERGÊNCIAS — Planilha auxiliar de posicionamento de obras
-- Cole no Supabase → SQL Editor → New query e rode.
-- Idempotente: pode rodar várias vezes sem dano.
-- ⚠️ Rodar nos DOIS bancos (produção e obras-dev/homologação).
-- =============================================================
--
-- Esta tabela guarda os dados de POSICIONAMENTO das obras de emergência
-- (datas de início/fim de obra, executora, logradouro etc.), vindos de uma
-- planilha auxiliar separada (opcional, porém importante). A chave de ligação
-- é `codigo_aio` ↔ `emergencias.num_processo` (os processos numéricos; as
-- emergências antigas em formato SEI 6012... não têm posicionamento).
--
-- O objetivo principal é a REGRA DAS 48H: uma emergência em status
-- "Informada" há mais de 48h desde a `data_inicio_obra` é irregular (deveria
-- ter sido encerrada no prazo). O cruzamento é feito em memória no front-end.

create table if not exists public.emergencias_obras (
  id                bigserial primary key,
  codigo_aio        text not null,
  data_inicio_obra  date,
  data_fim_obra     date,
  tipo_obra         text,
  logradouro        text,
  numero_obra       text,
  natureza_obra     text,
  permissionaria    text,
  executora         text,
  created_at        timestamptz default now()
);

create index if not exists idx_emerg_obras_codigo_aio
  on public.emergencias_obras(codigo_aio);

alter table public.emergencias_obras enable row level security;

drop policy if exists "Authenticated read emergencias_obras"   on public.emergencias_obras;
drop policy if exists "Authenticated insert emergencias_obras" on public.emergencias_obras;
drop policy if exists "Authenticated delete emergencias_obras" on public.emergencias_obras;

create policy "Authenticated read emergencias_obras"
  on public.emergencias_obras for select
  using (auth.uid() is not null);

create policy "Authenticated insert emergencias_obras"
  on public.emergencias_obras for insert
  with check (auth.uid() is not null);

create policy "Authenticated delete emergencias_obras"
  on public.emergencias_obras for delete
  using (auth.uid() is not null);
