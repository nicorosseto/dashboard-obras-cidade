-- =============================================================
-- CORRIGE STATUS_UNIFICADO E ETAPA/TIPO_PROCESSO/TIPO_OBRA NOMES
-- Cole no SQL Editor do Supabase e clique Run.
-- Os dados na coluna 'status' estao em Title Case ("Encerrada"),
-- mas o importer mapeava UPPERCASE -> ficou tudo NULL.
-- Este script corrige sem precisar reimportar os 170k registros.
-- =============================================================

-- 1. STATUS_NOME (ja deve estar igual ao status, mas garante consistencia)
update public.sistemaGeo
set status_nome = status
where status_nome is null and status is not null;

-- 2. STATUS_UNIFICADO (agrupador) — mapeia Title Case real -> categoria
update public.sistemaGeo set status_unificado = case status
  when 'Encerrada' then 'Obra Realizada'
  when 'Informada' then 'Obra com Aviso de Início'
  when 'Informado' then 'Obra Autorizada'
  when 'Cancelada' then 'Cancelamento'
  when 'Cancelado' then 'Cancelamento'
  when 'Não Autorizada' then 'Cancelamento'
  when 'Despacho de Cancelamento' then 'Cancelamento'
  when 'Solicitação de Cancelamento' then 'Cancelamento'
  when 'Processo Cancelado' then 'Cancelamento'
  when 'Processo Encerrado' then 'Processo Encerrado'
  when 'Revisão' then 'Pré Obra'
  when 'Pagamento' then 'Pré Obra'
  when 'Análise CET' then 'Pré Obra'
  when 'TPOV Manual' then 'Pré Obra'
  when 'TPOV com Anuência' then 'Pré Obra'
  when 'Junção de Documentos' then 'Pré Obra'
  when 'Processando' then 'Pré Obra'
  when 'Processando TPOV' then 'Pré Obra'
  when 'Processando AEO' then 'Pré Obra'
  when 'Processando Interferência' then 'Pré Obra'
  when 'Solicitando TPOV' then 'Pré Obra'
  when 'Gerando Boleto TPOV' then 'Pré Obra'
  when 'Pagamento Boleto TPOV' then 'Pré Obra'
  when 'Pendência de Pagamento - DAMSP Complementar' then 'Pré Obra'
  when 'Aguardando Pagamento DAMSP Complementar' then 'Pré Obra'
  when 'Aguardando Assinatura de TPU' then 'Pré Obra'
  when 'Aguardando Assinatura de Documentos - OBRAS' then 'Pré Obra'
  when 'Aguardando Emissão do AEO' then 'Pré Obra'
  when 'Aguardadando Emissão do AEO' then 'Pré Obra'
  when 'Erro de Integração com SEI' then 'Pré Obra'
  when 'Manifestação SUB' then 'Emissão de CCO'
  when 'Manifestação CET' then 'Emissão de CCO'
  when 'Indeferido' then 'Emissão de CCO'
  when 'Guia de CCO Gerada' then 'Emissão de CCO'
  when 'Pendência de Pagamento - CCO' then 'Emissão de CCO'
  when 'Análise Obras As Built' then 'As Built'
  when 'Revisão As Built' then 'As Built'
  when 'Pendência de Pagamento - As Built' then 'As Built'
  when 'Pagamento - As Built' then 'As Built'
  when 'Gerando Guias de Pagamento As Built' then 'As Built'
  when 'Gerando Guias de Pagamento As Built Aditamento' then 'As Built'
  when 'Correção AIO Prorrogação' then 'Prorrogação'
  when 'Aguardando Pagamento da Guia de Prorrogação' then 'Prorrogação'
  when 'Revião Regularização Permissionária' then 'Regularização'
  when 'Aguardando Pagamento de Guias de Regularização' then 'Regularização'
  else 'Outros'
end
where status is not null;

-- 3. TIPO_PROCESSO_NOME — mapeia codigo -> nome bonito
update public.sistemaGeo set tipo_processo_nome = case tipo_processo
  when 'EXPANSAO_IMPLANTACAO' then 'Expansão'
  when 'EXPANSAO' then 'Expansão'
  when 'LIGACAODOMICILIAR' then 'Ligação Domiciliar'
  when 'LIGACAO_DOMICILIAR_SEM_ALVARA' then 'Ligação Domiciliar'
  when 'EMERGENCIA' then 'Emergência'
  when 'MANUTENCAO_CORRETIVA' then 'Manutenção Corretiva'
  when 'MANUTENCAO_PREVENTIVA' then 'Manutenção Preventiva'
  when 'DEMAIS_SERVICOS' then 'Demais Serviços'
  when 'ERB' then 'ERB'
  when 'RADAR' then 'Radar'
  when 'CAMERA_DE_SEGURANCA' then 'Câmera de Segurança'
  else tipo_processo
end
where tipo_processo is not null;

-- 4. ETAPA_NOME
update public.sistemaGeo set etapa_nome = case etapa
  when 'PROJETO' then 'Projeto'
  when 'AS_BUILT' then 'As Built'
  when 'AS BUILT' then 'As Built'
  when 'PRORROGACAO' then 'Prorrogação'
  else etapa
end
where etapa is not null;

-- 5. TIPO_OBRA_NOME
update public.sistemaGeo set tipo_obra_nome = case tipo_obra
  when 'SUBTERRANEO' then 'Subterrâneo'
  when 'AEREO' then 'Aéreo'
  when 'POLO_GERADOR' then 'Polo Gerador'
  when 'POCO_MONITORAMENTO' then 'Poço de Monitoramento'
  when 'PORTARIA_OBRAS' then 'Portaria Obras'
  when 'PORTARIASMTGAB' then 'Portaria SMT/GAB'
  when 'OBRASPUBLICAS' then 'Obras Públicas'
  else tipo_obra
end
where tipo_obra is not null;

-- 6. Conferencia: agrupamento final por status_unificado
select status_unificado, count(*) as qtd
from public.sistemaGeo
group by status_unificado
order by qtd desc;
