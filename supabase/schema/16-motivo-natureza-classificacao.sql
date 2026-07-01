-- 16-motivo-natureza-classificacao.sql
-- Classificação dos motivos de natureza (válido x inválido) por TERMO canônico.
-- A aba "Motivo Inválido" deixou de depender de um upload separado: ela deriva
-- da planilha de posicionamento (emergencias_obras.natureza_obra), agrupa por
-- termo (lógica em src/lib/emergencias.js) e mostra só os processos cujos termos
-- foram marcados como INVÁLIDOS aqui. A classificação persiste entre re-uploads:
-- termos já classificados são mantidos; termos novos viram pendência.
-- Idempotente — seguro rodar nos dois bancos (obras-dev e produção).

create table if not exists public.motivo_natureza_classificacao (
  termo          text primary key,          -- chave canônica do grupo (ex.: 'manutencao')
  rotulo         text,                       -- rótulo amigável exibido (ex.: 'Manutenção')
  invalido       boolean not null default false,
  atualizado_em  timestamptz not null default now()
);

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.motivo_natureza_classificacao enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'motivo_natureza_classificacao' and policyname = 'leitura autenticado'
  ) then
    create policy "leitura autenticado"
      on public.motivo_natureza_classificacao for select
      using (auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'motivo_natureza_classificacao' and policyname = 'escrita autenticado'
  ) then
    create policy "escrita autenticado"
      on public.motivo_natureza_classificacao for all
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;
end $$;
