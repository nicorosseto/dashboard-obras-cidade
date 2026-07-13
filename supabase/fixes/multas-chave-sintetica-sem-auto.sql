-- ============================================================
-- FIX — chave sintética para linhas de `multas` sem AUTO DA MULTA (A2, 13/07/2026)
-- ============================================================
-- ⚠️ Rodar nos DOIS bancos (obras-dev e produção). Idempotente.
--
-- Contexto: as linhas sem `auto_multa` (~168 na planilha, achado do A0) não
-- tinham chave estável para upsert — a Edge Function `sync-multas` apagava
-- e regravava TODO o subconjunto sem auto_multa a cada sincronização
-- (comentário deixado no código do A1: "A2 decide a estratégia
-- definitiva"). Isso ia contra a regra de ouro do tratamento (dado cru
-- nunca é descartado): se o DELETE rodasse e o INSERT seguinte falhasse
-- (erro de rede, timeout, etc.) no meio da execução, essas linhas ficariam
-- perdidas até a próxima sincronização bem-sucedida.
--
-- Correção: coluna `chave_sintetica` = hash SHA-256 de
-- (num_processo | data_infracao | valor | linha_planilha), calculado na
-- Edge Function e gravado só nas linhas SEM auto_multa (nas linhas COM
-- auto_multa fica NULL, pois essas usam auto_multa como chave de upsert).
-- Índice único TOTAL (mesmo motivo do fix anterior de auto_multa: o
-- upsert do PostgREST não consegue mirar índice parcial) — NULLs não
-- conflitam entre si (NULLS DISTINCT, padrão do Postgres).

alter table public.multas
  add column if not exists chave_sintetica text;

create unique index if not exists multas_chave_sintetica_key
  on public.multas (chave_sintetica);

comment on column public.multas.chave_sintetica is
  'Hash SHA-256 de num_processo+data_infracao+valor+linha_planilha — chave de upsert só para linhas sem auto_multa (regra de ouro: nunca mais apaga/regrava tudo por falta de chave; ver A2 do plano de melhorias de julho/2026).';

-- Limpa as linhas sem auto_multa gravadas pela estratégia antiga (delete +
-- regrava tudo, sem chave_sintetica) — elas ficariam órfãs (chave_sintetica
-- NULL) e duplicariam na próxima sincronização, que passa a fazer upsert
-- por chave_sintetica em vez de apagar tudo. Seguro: essas linhas já eram
-- inteiramente substituídas a cada sync antes desta correção, então não
-- representam edição manual perdida — a próxima execução da Edge Function
-- as regrava com a chave nova.
delete from public.multas
  where auto_multa is null
    and chave_sintetica is null;
