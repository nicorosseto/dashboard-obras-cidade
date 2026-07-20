import { describe, it, expect } from 'vitest'
import { ehErroDeChunkDesatualizado } from '../components/ErrorBoundary.jsx'

describe('ehErroDeChunkDesatualizado', () => {
  it('reconhece a mensagem do Chrome/Edge (Vite)', () => {
    const erro = new Error(
      'Failed to fetch dynamically imported module: https://dashboard-obras-cidade.vercel.app/assets/PaginaMultas-CriCDYYd.js'
    )
    expect(ehErroDeChunkDesatualizado(erro)).toBe(true)
  })

  it('reconhece a variante do Firefox', () => {
    const erro = new Error(
      'error loading dynamically imported module: https://dashboard-obras-cidade.vercel.app/assets/PaginaEmergencias-C-l_vWSW.js'
    )
    expect(ehErroDeChunkDesatualizado(erro)).toBe(true)
  })

  it('reconhece a variante do Safari', () => {
    const erro = new Error('Importing a module script failed.')
    expect(ehErroDeChunkDesatualizado(erro)).toBe(true)
  })

  it('não confunde um erro comum de aplicação com erro de chunk', () => {
    const erro = new Error('Cannot read properties of undefined (reading "map")')
    expect(ehErroDeChunkDesatualizado(erro)).toBe(false)
  })

  it('lida com erro sem message (string crua, undefined)', () => {
    expect(ehErroDeChunkDesatualizado('algo qualquer')).toBe(false)
    expect(ehErroDeChunkDesatualizado(undefined)).toBe(false)
  })
})
