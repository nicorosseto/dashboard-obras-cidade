-- 15-emergencias-motivo-invalido.sql
-- Tabela de emergências com motivo inválido (manutenção/expansão registrada como emergência).
-- Decisões: snapshot da planilha (não enriquece com base viva); upload preservado ao trocar
-- a planilha principal; banner exibe período (data_aio min/max) e data do upload (created_at).
-- Idempotente — seguro rodar múltiplas vezes nos dois bancos (obras-dev e produção).

-- ── Tabela principal ─────────────────────────────────────────────────
create table if not exists public.emergencias_motivo_invalido (
  id             bigserial primary key,
  codigo_aio     text not null,
  permissionaria text,
  subprefeitura  text,
  data_aio       date,
  status         text,
  logradouro     text,
  natureza_obra  text,
  motivo_natureza text,
  created_at     timestamptz default now()
);

create index if not exists idx_emerg_motivo_invalido_aio
  on public.emergencias_motivo_invalido(codigo_aio);

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.emergencias_motivo_invalido enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'emergencias_motivo_invalido' and policyname = 'leitura autenticado'
  ) then
    create policy "leitura autenticado"
      on public.emergencias_motivo_invalido for select
      using (auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'emergencias_motivo_invalido' and policyname = 'escrita service role'
  ) then
    create policy "escrita service role"
      on public.emergencias_motivo_invalido for all
      using (true) with check (true);
  end if;
end $$;

-- ── Permissão no catálogo ────────────────────────────────────────────
insert into public.permissoes_catalogo (codigo, modulo, nome, descricao, ordem)
values (
  'emerg.aba_motivo_invalido',
  'emergencias',
  'Aba Motivo Inválido',
  'Aba "Motivo Inválido" no módulo Emergências (emergências que são manutenção/expansão)',
  6
)
on conflict (codigo) do nothing;

-- ── Conceder aos perfis que já têm emerg.ver ─────────────────────────
-- Regra de 26/06/2026: ao adicionar nova aba, conceder a todos os perfis
-- com a permissão-pai (emerg.ver), não por nome de perfil.
insert into public.perfil_permissoes (perfil_id, permissao)
select pp.perfil_id, 'emerg.aba_motivo_invalido'
from public.perfil_permissoes pp
where pp.permissao = 'emerg.ver'
on conflict do nothing;
