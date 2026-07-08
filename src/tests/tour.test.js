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
import { TODAS_PERMISSOES } from '../lib/permissoes.js'

// Áreas que JÁ devem ter tour. Cresce a cada PR do plano:
//   PR 2: 'sistemaGeo', 'fiscalizacao' · PR 3: 'cruzamento', 'emergencias'
//   PR 4: 'relatorio', 'configuracoes'
const COBERTURA_EXIGIDA = ['home']

describe('cobertura dos tours', () => {
  it.each(COBERTURA_EXIGIDA)('a área "%s" tem tour registrado', (id) => {
    expect(TOURS[id]).toBeDefined()
    expect(TOURS[id].passos.length).toBeGreaterThan(0)
  })
})

describe('estrutura dos tours registrados', () => {
  const entradas = Object.entries(TOURS)

  it.each(entradas)('tour "%s": id bate com a chave e tem versão', (chave, tour) => {
    expect(tour.id).toBe(chave)
    expect(tour.versao).toBeGreaterThanOrEqual(1)
  })

  it.each(entradas)('tour "%s": todo passo tem título e texto', (_chave, tour) => {
    for (const p of tour.passos) {
      expect(p.titulo, `passo sem título: ${JSON.stringify(p)}`).toBeTruthy()
      expect(p.texto, `passo "${p.titulo}" sem texto`).toBeTruthy()
    }
  })

  it.each(entradas)('tour "%s": alvos usam [data-tour="…"], não classes CSS', (_chave, tour) => {
    for (const p of tour.passos) {
      if (!p.alvo) continue
      expect(p.alvo, `alvo frágil no passo "${p.titulo}"`).toMatch(
        /^\[data-tour="[a-z0-9-]+"\]$/
      )
    }
  })

  it.each(entradas)('tour "%s": permissões declaradas existem no catálogo', (_chave, tour) => {
    for (const p of tour.passos) {
      if (!p.permissao) continue
      expect(
        TODAS_PERMISSOES,
        `permissão desconhecida "${p.permissao}" no passo "${p.titulo}"`
      ).toContain(p.permissao)
    }
  })
})

describe('passosDisponiveis (filtro por permissão)', () => {
  const tour = {
    passos: [
      { alvo: '[data-tour="a"]', titulo: 'A', texto: 'a' },
      { alvo: '[data-tour="b"]', titulo: 'B', texto: 'b', permissao: 'emerg.ver' },
      { alvo: '[data-tour="c"]', titulo: 'C', texto: 'c', permissao: 'geo.aba_geral' },
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
