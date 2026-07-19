// Motor do tour guiado (onboarding interativo).
//
// - Biblioteca: driver.js (~5 kB gzip, sem dependências), carregada LAZY —
//   só quando um tour dispara; custo zero no bundle de boot.
// - Conteúdo dos tours: src/lib/toursConteudo/ (registro em tourRegistro.js).
// - Persistência: tabela `tour_visto` (supabase/schema/19-tour-guiado.sql),
//   RLS por usuário — o tour é oferecido uma única vez por usuário,
//   em qualquer navegador/máquina.
// - Permissões: cada passo pode declarar `permissao`; o filtro roda em
//   tempo de execução (passosDisponiveis) — nunca mostramos ao usuário
//   um recurso que ele não tem.

import { supabase } from './supabase.js'
import { TOURS, passosDisponiveis } from './tourRegistro.js'
import { ehModoDemo } from './demo.js'

export { TOURS }

let _driver = null
async function getDriver() {
  if (!_driver) {
    const [mod] = await Promise.all([
      import('driver.js'),
      import('driver.js/dist/driver.css'),
    ])
    _driver = mod.driver
  }
  return _driver
}

// Espera algum dos seletores aparecer no DOM (conteúdo das abas é lazy —
// o chunk pode ainda estar baixando quando o mini-tour dispara).
async function esperarAlgumAlvo(seletores, timeoutMs = 3000) {
  const fim = Date.now() + timeoutMs
  while (Date.now() < fim) {
    if (seletores.some((s) => document.querySelector(s))) return true
    await new Promise((r) => setTimeout(r, 150))
  }
  return false
}

// Inicia um tour. Devolve false se o tour não existe ou nenhum passo está
// disponível (sem permissão/alvo). `aoTerminar(concluiu)` é chamado uma vez
// quando o tour fecha — concluiu=true se chegou ao último passo.
export async function iniciarTour(tourId, permissoes, { aoTerminar } = {}) {
  const tour = TOURS[tourId]
  if (!tour) return false
  // Espera o conteúdo lazy montar antes do filtro final por presença no DOM.
  const alvosDeclarados = (tour.passos ?? [])
    .filter((p) => p.alvo && (!p.permissao || permissoes?.has(p.permissao)))
    .map((p) => p.alvo)
  if (alvosDeclarados.length > 0) await esperarAlgumAlvo(alvosDeclarados)
  const passos = passosDisponiveis(tour, permissoes)
  if (passos.length === 0) return false

  const driver = await getDriver()
  let avisado = false
  const instancia = driver({
    showProgress: passos.length > 1,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Próximo →',
    prevBtnText: '← Anterior',
    doneBtnText: 'Concluir',
    overlayOpacity: 0.6,
    stagePadding: 6,
    popoverClass: 'obras-tour',
    steps: passos.map((p) => ({
      element: p.alvo,
      popover: { title: p.titulo, description: p.texto },
    })),
    onDestroyStarted: () => {
      if (!avisado) {
        avisado = true
        const concluiu = instancia.isLastStep()
        if (aoTerminar) aoTerminar(concluiu)
      }
      instancia.destroy()
    },
  })
  instancia.drive()
  return true
}

// ── Persistência (tabela tour_visto) ────────────────────────────────
// Em caso de erro (ex.: SQL 19 ainda não rodado no banco), as funções
// falham FECHADAS: carregarToursVistos lança (o App trata não oferecendo
// nenhum convite) e marcarTourVisto engole o erro (não trava a UI).

// Modo demo: não há usuário real para persistir no banco — o convite fica
// só em memória (some ao recarregar a página, e é isso mesmo: reforça que
// é uma demonstração, não penaliza ninguém).
const toursVistosDemo = new Map()

// Devolve um Map tour_id -> status ('concluido' | 'dispensado'). O status
// importa: um tour de entrada DISPENSADO não deve disparar automaticamente
// os mini-tours das abas do módulo (só um tour CONCLUÍDO libera o próximo).
export async function carregarToursVistos() {
  if (ehModoDemo()) return new Map(toursVistosDemo)
  const { data, error } = await supabase
    .from('tour_visto')
    .select('tour_id, status')
  if (error) throw error
  return new Map((data ?? []).map((r) => [r.tour_id, r.status]))
}

export async function marcarTourVisto(userId, tourId, status = 'concluido') {
  if (ehModoDemo()) {
    toursVistosDemo.set(tourId, status)
    return
  }
  if (!userId) return
  try {
    await supabase.from('tour_visto').upsert(
      {
        user_id: userId,
        tour_id: tourId,
        status,
        versao: TOURS[tourId]?.versao ?? 1,
        visto_em: new Date().toISOString(),
      },
      { onConflict: 'user_id,tour_id' }
    )
  } catch {
    // não-crítico: no pior caso o convite reaparece no próximo login
  }
}
