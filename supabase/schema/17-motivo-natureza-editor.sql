-- 17-motivo-natureza-editor.sql
-- Editor v3 do "Motivo Inválido": grupos editáveis (nome, válido/inválido,
-- palavras-chave, fundir/excluir) + override por texto individual.
--
-- Modelo:
--  - motivo_natureza_classificacao (do script 16) ganha colunas:
--      palavras   text[]   — palavras-chave do grupo (modelo "vocabulário editável").
--                            Um texto cai no grupo se contém qualquer uma delas.
--      arquivado  boolean  — grupo "excluído" (não captura nada; some do editor).
--      alias_de   text     — grupo "fundido" em outro (redireciona para o termo alvo).
--  - motivo_natureza_override (NOVA) — mapeia um TEXTO de natureza específico
--      (normalizado) para um termo de grupo, sobrepondo a classificação automática.
--
-- Idempotente — seguro rodar nos dois bancos (obras-dev e produção).

-- ── Estende a tabela de classificação ────────────────────────────────
alter table public.motivo_natureza_classificacao
  add column if not exists palavras  text[]  not null default '{}',
  add column if not exists arquivado boolean not null default false,
  add column if not exists alias_de  text;

-- ── Override por texto individual ────────────────────────────────────
create table if not exists public.motivo_natureza_override (
  chave         text primary key,          -- natureza normalizada (sem acento, maiúscula, espaços colapsados)
  termo         text not null,             -- termo de grupo para onde o texto vai
  atualizado_em timestamptz not null default now()
);

alter table public.motivo_natureza_override enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'motivo_natureza_override' and policyname = 'leitura autenticado'
  ) then
    create policy "leitura autenticado"
      on public.motivo_natureza_override for select
      using (auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'motivo_natureza_override' and policyname = 'escrita autenticado'
  ) then
    create policy "escrita autenticado"
      on public.motivo_natureza_override for all
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;
end $$;
