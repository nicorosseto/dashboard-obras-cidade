// Registro central dos tours guiados (onboarding) — módulo PURO, sem
// dependência do Supabase, para os testes rodarem em ambiente node.
// O motor (iniciar/persistir) fica em ./tour.js.
//
// ⚠️ REGRA DE MANUTENÇÃO (dominio.md — "Tour guiado"): toda nova tela,
// aba ou botão relevante do sistema DEVE ganhar um passo aqui (e o
// atributo data-tour no elemento). O teste src/tests/tour.test.js trava
// o esquecimento — aba nova sem tour = teste vermelho.

import { TOUR_HOME } from './toursConteudo/tourHome.js'
import {
  TOUR_SISTEMA_GEO,
  TOUR_SISTEMA_GEO_ABA2,
  TOUR_SISTEMA_GEO_ABA3,
  TOUR_SISTEMA_GEO_ABA6,
} from './toursConteudo/tourSistemaGeo.js'
import {
  TOUR_FISCALIZACAO,
  TOUR_FISCALIZACAO_ABA2,
  TOUR_FISCALIZACAO_ABA3,
  TOUR_FISCALIZACAO_ABA6,
  TOUR_FISCALIZACAO_ABA7,
} from './toursConteudo/tourFiscalizacao.js'
import {
  TOUR_CRUZAMENTO,
  TOUR_CRUZAMENTO_COBERTURA,
  TOUR_CRUZAMENTO_STATUS,
  TOUR_CRUZAMENTO_LINHATEMPO,
  TOUR_CRUZAMENTO_DIVERGENCIAS,
  TOUR_CRUZAMENTO_EXECUTORAS,
  TOUR_CRUZAMENTO_MAPA,
  TOUR_CRUZAMENTO_BUSCA,
} from './toursConteudo/tourCruzamento.js'
import {
  TOUR_EMERGENCIAS,
  TOUR_EMERGENCIAS_INFORMADAS,
  TOUR_EMERGENCIAS_PRAZO48H,
  TOUR_EMERGENCIAS_DASHBOARD,
  TOUR_EMERGENCIAS_BUSCA,
  TOUR_EMERGENCIAS_MOTIVO_INVALIDO,
  TOUR_EMERGENCIAS_HISTORICO,
} from './toursConteudo/tourEmergencias.js'
import { TOUR_RELATORIO } from './toursConteudo/tourRelatorio.js'
import {
  TOUR_CONFIGURACOES,
  TOUR_CONFIGURACOES_PERFIS,
  TOUR_CONFIGURACOES_ATUALIZAR,
  TOUR_CONFIGURACOES_LOGS,
} from './toursConteudo/tourConfiguracoes.js'

export const TOURS = {
  home: TOUR_HOME,
  sistemaGeo: TOUR_SISTEMA_GEO,
  'sistemaGeo.2': TOUR_SISTEMA_GEO_ABA2,
  'sistemaGeo.3': TOUR_SISTEMA_GEO_ABA3,
  'sistemaGeo.6': TOUR_SISTEMA_GEO_ABA6,
  fiscalizacao: TOUR_FISCALIZACAO,
  'fiscalizacao.2': TOUR_FISCALIZACAO_ABA2,
  'fiscalizacao.3': TOUR_FISCALIZACAO_ABA3,
  'fiscalizacao.6': TOUR_FISCALIZACAO_ABA6,
  'fiscalizacao.7': TOUR_FISCALIZACAO_ABA7,
  cruzamento: TOUR_CRUZAMENTO,
  'cruzamento.cobertura': TOUR_CRUZAMENTO_COBERTURA,
  'cruzamento.status-cruzado': TOUR_CRUZAMENTO_STATUS,
  'cruzamento.linha-tempo': TOUR_CRUZAMENTO_LINHATEMPO,
  'cruzamento.divergencias': TOUR_CRUZAMENTO_DIVERGENCIAS,
  'cruzamento.executoras': TOUR_CRUZAMENTO_EXECUTORAS,
  'cruzamento.mapa': TOUR_CRUZAMENTO_MAPA,
  'cruzamento.busca': TOUR_CRUZAMENTO_BUSCA,
  emergencias: TOUR_EMERGENCIAS,
  'emergencias.informadas': TOUR_EMERGENCIAS_INFORMADAS,
  'emergencias.prazo48h': TOUR_EMERGENCIAS_PRAZO48H,
  'emergencias.dashboard': TOUR_EMERGENCIAS_DASHBOARD,
  'emergencias.busca': TOUR_EMERGENCIAS_BUSCA,
  'emergencias.motivo_invalido': TOUR_EMERGENCIAS_MOTIVO_INVALIDO,
  'emergencias.historico': TOUR_EMERGENCIAS_HISTORICO,
  relatorio: TOUR_RELATORIO,
  configuracoes: TOUR_CONFIGURACOES,
  'configuracoes.1': TOUR_CONFIGURACOES_PERFIS,
  'configuracoes.2': TOUR_CONFIGURACOES_ATUALIZAR,
  'configuracoes.3': TOUR_CONFIGURACOES_LOGS,
}

// Filtra os passos de um tour para o usuário atual:
//   1. permissão — passo com `permissao` que o usuário não tem: fora;
//   2. presença no DOM — alvo que não existe agora (sem permissão, dado
//      não carregado, tela estreita, lazy-loading): fora, sem quebrar.
// A checagem de DOM é ignorada fora do navegador (testes em node).
export function passosDisponiveis(tour, permissoes) {
  return (tour?.passos ?? []).filter((p) => {
    if (p.permissao && !permissoes?.has(p.permissao)) return false
    if (p.alvo && typeof document !== 'undefined' && !document.querySelector(p.alvo))
      return false
    return true
  })
}
