// Testes do tour guiado (registro puro em src/lib/tourRegistro.js).
//
// 🔒 TRAVA ANTI-ESQUECIMENTO: além de validar a estrutura dos tours, o bloco
// "cobertura" garante que as áreas do sistema listadas em COBERTURA_EXIGIDA
// têm tour registrado. Ao entregar os tours dos módulos (PRs 2–4 do plano),
// adicionar cada área aqui e, ao criar NOVA aba/módulo no sistema, este
// arquivo + o registro DEVEM ser atualizados juntos (regra em
// .claude/rules/dominio.md, seção "Tour guiado").
import { describe, it, expect } from 'vitest'
import { TOURS, passosDisponiveis } from '../lib/tourRegistro.js'
import { TODAS_PERMISSOES, PERMISSAO_POR_ABA } from '../lib/permissoes.js'
import { ABAS_CRUZAMENTO } from '../lib/abasCruzamento.js'

// Áreas que devem ter tour — plano completo (PRs 1–4).
const COBERTURA_EXIGIDA = [
  'home',
  'sistemaGeo',
  'fiscalizacao',
  'cruzamento',
  'emergencias',
  'relatorio',
  'configuracoes',
  'multas',
]

// Abas de PERMISSAO_POR_ABA que NÃO exigem mini-tour próprio, com o motivo.
const ABAS_SEM_TOUR_PROPRIO = {
  'fiscalizacao.1': 'aba inicial — coberta pelo tour de entrada do módulo',
  'sistemaGeo.1': 'aba inicial — coberta pelo tour de entrada do módulo',
  'sistemaGeo.4': 'Análise Integrada é módulo próprio (tour em cruzamento.*)',
}

// Abas do módulo Emergências (id espelha Header.jsx, bloco mostrarEmergencias
// — não há constante compartilhada lá, então mantém-se os dois em sincronia).
// 'geral' fica de fora: é a aba inicial, coberta pelo tour de entrada.
const ABAS_EMERGENCIAS = [
  'informadas',
  'prazo48h',
  'dashboard',
  'busca',
  'motivo_invalido',
  'historico',
]

// Abas do módulo Configurações (id espelha o array numérico do Header.jsx,
// bloco mostrarAbasAdmin). 0 (Usuários) é a aba inicial, sem mini-tour próprio.
const ABAS_CONFIGURACOES = [1, 2, 3]

// Abas do módulo Multas (id espelha o bloco mostrarMultas do Header.jsx).
// 'geral' fica de fora: é a aba inicial, coberta pelo tour de entrada.
const ABAS_MULTAS = ['busca']

describe('cobertura dos tours', () => {
  it.each(COBERTURA_EXIGIDA)('a área "%s" tem tour registrado', (id) => {
    expect(TOURS[id]).toBeDefined()
    expect(TOURS[id].passos.length).toBeGreaterThan(0)
  })

  // 🔒 Trava: toda aba do catálogo de permissões precisa de mini-tour
  // (ou de uma exceção justificada acima). Aba nova sem tour = vermelho.
  for (const [secao, abas] of Object.entries(PERMISSAO_POR_ABA)) {
    for (const abaId of Object.keys(abas)) {
      const tourId = `${secao}.${abaId}`
      if (ABAS_SEM_TOUR_PROPRIO[tourId]) continue
      it(`a aba ${tourId} tem mini-tour registrado`, () => {
        expect(TOURS[tourId], `falta tour para a aba ${tourId}`).toBeDefined()
        expect(TOURS[tourId].passos.length).toBeGreaterThan(0)
      })
    }
  }

  // 🔒 Trava: toda aba da Análise Integrada (exceto a inicial) precisa de mini-tour.
  for (const aba of ABAS_CRUZAMENTO) {
    if (aba.id === 'visao-geral') continue
    const tourId = `cruzamento.${aba.id}`
    it(`a aba ${tourId} tem mini-tour registrado`, () => {
      expect(TOURS[tourId], `falta tour para a aba ${tourId}`).toBeDefined()
      expect(TOURS[tourId].passos.length).toBeGreaterThan(0)
    })
  }

  // 🔒 Trava: toda aba de Emergências (exceto a inicial) precisa de mini-tour.
  for (const abaId of ABAS_EMERGENCIAS) {
    const tourId = `emergencias.${abaId}`
    it(`a aba ${tourId} tem mini-tour registrado`, () => {
      expect(TOURS[tourId], `falta tour para a aba ${tourId}`).toBeDefined()
      expect(TOURS[tourId].passos.length).toBeGreaterThan(0)
    })
  }

  // 🔒 Trava: toda aba de Configurações (exceto a inicial) precisa de mini-tour.
  for (const abaId of ABAS_CONFIGURACOES) {
    const tourId = `configuracoes.${abaId}`
    it(`a aba ${tourId} tem mini-tour registrado`, () => {
      expect(TOURS[tourId], `falta tour para a aba ${tourId}`).toBeDefined()
      expect(TOURS[tourId].passos.length).toBeGreaterThan(0)
    })
  }

  // 🔒 Trava: toda aba de Multas (exceto a inicial) precisa de mini-tour.
  for (const abaId of ABAS_MULTAS) {
    const tourId = `multas.${abaId}`
    it(`a aba ${tourId} tem mini-tour registrado`, () => {
      expect(TOURS[tourId], `falta tour para a aba ${tourId}`).toBeDefined()
      expect(TOURS[tourId].passos.length).toBeGreaterThan(0)
    })
  }
})

describe('estrutura dos tours registrados', () => {
  const entradas = Object.entries(TOURS)

  it.each(entradas)(
    'tour "%s": id bate com a chave e tem versão',
    (chave, tour) => {
      expect(tour.id).toBe(chave)
      expect(tour.versao).toBeGreaterThanOrEqual(1)
    }
  )

  it.each(entradas)(
    'tour "%s": todo passo tem título e texto',
    (_chave, tour) => {
      for (const p of tour.passos) {
        expect(p.titulo, `passo sem título: ${JSON.stringify(p)}`).toBeTruthy()
        expect(p.texto, `passo "${p.titulo}" sem texto`).toBeTruthy()
      }
    }
  )

  it.each(entradas)(
    'tour "%s": alvos usam [data-tour="…"], não classes CSS',
    (_chave, tour) => {
      for (const p of tour.passos) {
        if (!p.alvo) continue
        expect(p.alvo, `alvo frágil no passo "${p.titulo}"`).toMatch(
          /^\[data-tour="[a-z0-9-]+"\]$/
        )
      }
    }
  )

  it.each(entradas)(
    'tour "%s": permissões declaradas existem no catálogo',
    (_chave, tour) => {
      for (const p of tour.passos) {
        if (!p.permissao) continue
        expect(
          TODAS_PERMISSOES,
          `permissão desconhecida "${p.permissao}" no passo "${p.titulo}"`
        ).toContain(p.permissao)
      }
    }
  )
})

describe('passosDisponiveis (filtro por permissão)', () => {
  const tour = {
    passos: [
      { alvo: '[data-tour="a"]', titulo: 'A', texto: 'a' },
      {
        alvo: '[data-tour="b"]',
        titulo: 'B',
        texto: 'b',
        permissao: 'emerg.ver',
      },
      {
        alvo: '[data-tour="c"]',
        titulo: 'C',
        texto: 'c',
        permissao: 'geo.aba_geral',
      },
    ],
  }

  it('remove passos cuja permissão o usuário não tem', () => {
    const r = passosDisponiveis(tour, new Set(['emerg.ver']))
    expect(r.map((p) => p.titulo)).toEqual(['A', 'B'])
  })

  it('sem nenhuma permissão, sobram só os passos sem exigência', () => {
    const r = passosDisponiveis(tour, new Set())
    expect(r.map((p) => p.titulo)).toEqual(['A'])
  })

  it('permissões null (ainda não carregadas) não deixam passar passo restrito', () => {
    const r = passosDisponiveis(tour, null)
    expect(r.map((p) => p.titulo)).toEqual(['A'])
  })

  it('tour vazio/indefinido devolve lista vazia sem quebrar', () => {
    expect(passosDisponiveis(undefined, new Set())).toEqual([])
    expect(passosDisponiveis({}, new Set())).toEqual([])
  })
})
