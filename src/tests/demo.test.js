import { describe, it, expect } from 'vitest'
import { ehModoDemo } from '../lib/demo.js'
import { permissoesDemo, TODAS_PERMISSOES } from '../lib/permissoes.js'

describe('modo demo', () => {
  it('ehModoDemo() é false por padrão (fora do build com VITE_DEMO_MODE=true)', () => {
    expect(ehModoDemo()).toBe(false)
  })

  it('permissoesDemo() traz todas as permissões de visualização do catálogo', () => {
    const demo = permissoesDemo()
    // Todo o catálogo, exceto as de escrita/admin.
    const excluidas = new Set(['emerg.upload', 'multas.atualizar'])
    for (const p of TODAS_PERMISSOES) {
      if (excluidas.has(p)) {
        expect(demo.has(p)).toBe(false)
      } else {
        expect(demo.has(p)).toBe(true)
      }
    }
  })

  it('permissoesDemo() nunca inclui as permissões de escrita/upload', () => {
    const demo = permissoesDemo()
    expect(demo.has('emerg.upload')).toBe(false)
    expect(demo.has('multas.atualizar')).toBe(false)
  })

  it('permissoesDemo() devolve um Set (não array) do tamanho esperado', () => {
    const demo = permissoesDemo()
    expect(demo).toBeInstanceOf(Set)
    expect(demo.size).toBe(TODAS_PERMISSOES.length - 2)
  })
})
