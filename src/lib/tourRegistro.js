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
  TOUR_FISCALIZACAO_ABA4,
  TOUR_FISCALIZACAO_ABA6,
  TOUR_FISCALIZACAO_ABA7,
} from './toursConteudo/tourFiscalizacao.js'

export const TOURS = {
  home: TOUR_HOME,
  sistemaGeo: TOUR_SISTEMA_GEO,
  'sistemaGeo.2': TOUR_SISTEMA_GEO_ABA2,
  'sistemaGeo.3': TOUR_SISTEMA_GEO_ABA3,
  'sistemaGeo.6': TOUR_SISTEMA_GEO_ABA6,
  fiscalizacao: TOUR_FISCALIZACAO,
  'fiscalizacao.2': TOUR_FISCALIZACAO_ABA2,
  'fiscalizacao.3': TOUR_FISCALIZACAO_ABA3,
  'fiscalizacao.4': TOUR_FISCALIZACAO_ABA4,
  'fiscalizacao.6': TOUR_FISCALIZACAO_ABA6,
  'fiscalizacao.7': TOUR_FISCALIZACAO_ABA7,
  // PRs futuras: cruzamento, emergencias, relatorio, configuracoes.
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
