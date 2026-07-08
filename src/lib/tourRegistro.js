// Registro central dos tours guiados (onboarding) — módulo PURO, sem
// dependência do Supabase, para os testes rodarem em ambiente node.
// O motor (iniciar/persistir) fica em ./tour.js.
//
// ⚠️ REGRA DE MANUTENÇÃO (dominio.md — "Tour guiado"): toda nova tela,
// aba ou botão relevante do sistema DEVE ganhar um passo aqui (e o
// atributo data-tour no elemento). O teste src/tests/tour.test.js trava
// o esquecimento — aba nova sem tour = teste vermelho.

import { TOUR_HOME } from './toursConteudo/tourHome.js'

export const TOURS = {
  home: TOUR_HOME,
  // PRs futuras: sistemaGeo, fiscalizacao, cruzamento, emergencias,
  // relatorio, configuracoes — e mini-tours por aba (ex.: 'sistemaGeo.2').
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
