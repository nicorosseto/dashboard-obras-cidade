-- Adiciona colunas lote e executante à tabela fiscalizacoes
-- (col C = LOTE/OBRAS, col E = EXECUTANTE da planilha — antes ignoradas).
-- Idempotente. Rodar nos DOIS bancos (produção e obras-dev).

ALTER TABLE fiscalizacoes ADD COLUMN IF NOT EXISTS lote text;
ALTER TABLE fiscalizacoes ADD COLUMN IF NOT EXISTS executante text;
