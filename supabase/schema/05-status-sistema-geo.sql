-- =============================================================
-- BIBLIOTECA DE STATUS DO SISTEMA GEO (catálogo / fonte da verdade)
-- Rode nos DOIS bancos (produção e obras-dev):
-- SQL Editor → New query → cole tudo → Run
-- Idempotente: pode rodar várias vezes (usa ON CONFLICT).
-- =============================================================
--
-- Por que existe: tira os dicionários de status de dentro do notebook
-- (STATUS_NOME / STATUS_UNIFICADO) e coloca num catálogo no banco, que
-- vira a fonte da verdade editável. Cada status bruto da planilha tem um
-- nome legível (status_nome) e um grupo unificado (status_unificado).
-- Pré-requisito do upload pela tela (D1): status desconhecido no upload
-- será classificado na hora e inserido aqui.
--
-- Gerado a partir de scripts/importar_sistemaGeo_colab.ipynb (formato atual).

-- 1) Grupos unificados (categorias) — referência para os gráficos/filtros
create table if not exists public.status_grupos (
  nome  text primary key,
  ordem int  not null default 999
);

-- 2) Catálogo de status do Sistema Geo
create table if not exists public.status_sistemaGeo (
  status_origem    text primary key,   -- valor exato vindo da planilha
  status_nome      text not null,      -- nome legível para exibição
  status_unificado text not null references public.status_grupos(nome)
);
create index if not exists idx_status_sistemaGeo_grupo on public.status_sistemaGeo(status_unificado);

-- 3) RLS: leitura para usuários logados; escrita só por SQL (por ora)
alter table public.status_grupos   enable row level security;
alter table public.status_sistemaGeo enable row level security;
drop policy if exists "Authenticated read status_grupos" on public.status_grupos;
create policy "Authenticated read status_grupos" on public.status_grupos
  for select using (auth.uid() is not null);
drop policy if exists "Authenticated read status_sistemaGeo" on public.status_sistemaGeo;
create policy "Authenticated read status_sistemaGeo" on public.status_sistemaGeo
  for select using (auth.uid() is not null);

-- 4) Seed dos grupos (na ordem de exibição)
insert into public.status_grupos (nome, ordem) values
  ('Pré Obra', 1),
  ('Emissão de CCO', 2),
  ('As Built', 3),
  ('Prorrogação', 4),
  ('Obra Autorizada', 5),
  ('Obra com Aviso de Início', 6),
  ('Obra Realizada', 7),
  ('Regularização', 8),
  ('Cancelamento', 9),
  ('Processo Encerrado', 10),
  ('Erros Sistema', 11),
  ('Verificar Novo Status', 12)
on conflict (nome) do update set ordem = excluded.ordem;

-- 5) Seed do catálogo de status (status_origem, status_nome, grupo)
--    47 status do formato atual da planilha.
insert into public.status_sistemaGeo (status_origem, status_nome, status_unificado) values
  -- Pré Obra
  ('Revisão', 'Revisão', 'Pré Obra'),
  ('Pagamento', 'Pagamento', 'Pré Obra'),
  ('Aguardando Pagamento Boleto TPOV', 'Aguardando Pagamento Boleto TPOV', 'Pré Obra'),
  ('Aguardando Emissão AEO', 'Aguardando Emissão AEO', 'Pré Obra'),
  ('Aguardando assinatura de TPU', 'Aguardando Assinatura de TPU', 'Pré Obra'),
  ('Junção de Documentos', 'Junção de Documentos', 'Pré Obra'),
  ('Análise CET com anuência', 'Análise CET com Anuência', 'Pré Obra'),
  ('Pendente pagamento da DAMSP Complementar', 'Pendente Pagamento da DAMSP Complementar', 'Pré Obra'),
  ('Análise CET com aprovação manual', 'Análise CET com Aprovação Manual', 'Pré Obra'),
  ('AGUARDANDO ASSINATURA DE DOCUMENTOS - OBRAS', 'Aguardando Assinatura de Documentos - Obras', 'Pré Obra'),
  ('EM ANÁLISE CET', 'Em Análise CET', 'Pré Obra'),
  ('Processando', 'Processando', 'Pré Obra'),
  ('Em Pagamento da DAMSP Complementar', 'Em Pagamento da DAMSP Complementar', 'Pré Obra'),
  ('Solicitando TPOV', 'Solicitando TPOV', 'Pré Obra'),
  ('Processando TPOV', 'Processando TPOV', 'Pré Obra'),
  ('Processando Interferência', 'Processando Interferência', 'Pré Obra'),
  ('Gerando Boleto TPOV', 'Gerando Boleto TPOV', 'Pré Obra'),
  ('Processando AEO', 'Processando AEO', 'Pré Obra'),
  ('Aprovado CET Automático', 'Aprovado CET Automático', 'Pré Obra'),
  -- Emissão de CCO
  ('Manifestação SUB', 'Manifestação SUB', 'Emissão de CCO'),
  ('Manifestação CET', 'Manifestação CET', 'Emissão de CCO'),
  ('Guia CCO Gerada', 'Guia CCO Gerada', 'Emissão de CCO'),
  ('Pendência pagamento CCO', 'Pendência Pagamento CCO', 'Emissão de CCO'),
  ('Gerando Guia CCO', 'Gerando Guia CCO', 'Emissão de CCO'),
  ('Não Deferido', 'Não Deferido', 'Emissão de CCO'),
  -- As Built
  ('Análise Obras As Built', 'Análise Obras As Built', 'As Built'),
  ('Revisão As Built', 'Revisão As Built', 'As Built'),
  ('Pendente pagamento do As Built', 'Pendente Pagamento do As Built', 'As Built'),
  ('Pagamento As Built', 'Pagamento As Built', 'As Built'),
  ('Gerando guias de pagamento do As Built', 'Gerando Guias de Pagamento do As Built', 'As Built'),
  ('Gerando guias de pagamento do As Built com Aditamento de TPU', 'Gerando Guias de Pagamento do As Built com Aditamento de TPU', 'As Built'),
  -- Prorrogação
  ('Correção AIO Prorrogação', 'Correção AIO Prorrogação', 'Prorrogação'),
  ('AGUARDANDO PAGAMENTO GUIA DE PRORROGAÇÃO', 'Aguardando Pagamento Guia de Prorrogação', 'Prorrogação'),
  -- Obra Autorizada
  ('Informado', 'Informado', 'Obra Autorizada'),
  -- Obra com Aviso de Início
  ('Informada', 'Informada', 'Obra com Aviso de Início'),
  -- Obra Realizada
  ('Encerrada', 'Encerrada', 'Obra Realizada'),
  -- Regularização
  ('AGUARDANDO PAGAMENTO DE GUIAS DA REGULARIZAÇÃO', 'Aguardando Pagamento de Guias da Regularização', 'Regularização'),
  ('REVISÃO REGULARIZAÇÃO PERMISSIONÁRIA', 'Revisão Regularização Permissionária', 'Regularização'),
  ('ENVIADO PARA SUBPREFEITURA', 'Enviado para Subprefeitura', 'Regularização'),
  -- Cancelamento
  ('Cancelada', 'Cancelada', 'Cancelamento'),
  ('Cancelado', 'Cancelado', 'Cancelamento'),
  ('Solicitação de cancelamento', 'Solicitação de Cancelamento', 'Cancelamento'),
  ('Não Autorizada', 'Não Autorizada', 'Cancelamento'),
  ('Processo cancelado', 'Processo Cancelado', 'Cancelamento'),
  ('Aguardando assinatura do Despacho de Cancelamento', 'Aguardando Assinatura do Despacho de Cancelamento', 'Cancelamento'),
  -- Processo Encerrado
  ('Processo Encerrado', 'Processo Encerrado', 'Processo Encerrado'),
  -- Erros Sistema
  ('ERRO DE INTEGRAÇÂO COM SISTEMA SEI', 'Erro de Integração com Sistema SEI', 'Erros Sistema')
on conflict (status_origem) do update
  set status_nome = excluded.status_nome,
      status_unificado = excluded.status_unificado;

-- 6) Conferência: contagem de status por grupo (deve somar 47 status, 11 grupos)
select sg.ordem, s.status_unificado, count(*) as qtd_status
from public.status_sistemaGeo s
join public.status_grupos sg on sg.nome = s.status_unificado
group by sg.ordem, s.status_unificado
order by sg.ordem;
