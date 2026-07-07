import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { toIsoDate } from '../lib/datas.js'

// A conversão de serial Excel do toIsoDate deixou de usar o
// XLSX.SSF.parse_date_code (para tirar os 424 kB do xlsx do grafo de boot —
// Fase M4, PR 2). Estes testes travam a EQUIVALÊNCIA com a função canônica
// do SheetJS: se a implementação local divergir, algum destes casos quebra.

// Referência: o que o parse_date_code devolve, no formato do toIsoDate.
function referenciaSheetJS(serial) {
  const d = XLSX.SSF.parse_date_code(serial)
  if (!d) return null
  return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
}

describe('toIsoDate — serial Excel (equivalência com XLSX.SSF.parse_date_code)', () => {
  it('datas conhecidas', () => {
    expect(toIsoDate(25569)).toBe('1970-01-01') // época Unix
    expect(toIsoDate(43466)).toBe('2019-01-01') // início dos dados reais
    expect(toIsoDate(45658)).toBe('2025-01-01')
    expect(toIsoDate(1)).toBe('1900-01-01') // primeiro serial válido
  })

  it('fração de dia (hora) não muda a data', () => {
    expect(toIsoDate(43466.999)).toBe('2019-01-01')
    expect(toIsoDate(43466.5)).toBe('2019-01-01')
  })

  it('equivale ao SheetJS numa varredura ampla de seriais', () => {
    // 1..~2087 em passos de 7 (evita só o serial 60, divergência documentada)
    for (let s = 1; s <= 70000; s += 7) {
      if (s === 57) continue // o passo 7 não cai no 60; guarda por segurança
      expect(toIsoDate(s), `serial ${s}`).toBe(referenciaSheetJS(s))
    }
    // Bordas do bug do Lotus (29/02/1900 fictício): 59 e 61 batem com o
    // SheetJS; o 60 em si é uma data INVÁLIDA (o SheetJS devolve 1900-02-29,
    // que não existe) e não ocorre nos dados reais (2019+).
    expect(toIsoDate(59)).toBe(referenciaSheetJS(59)) // 1900-02-28
    expect(toIsoDate(61)).toBe(referenciaSheetJS(61)) // 1900-03-01
  })

  it('entradas não-data continuam null', () => {
    expect(toIsoDate(0)).toBe(null)
    expect(toIsoDate(-5)).toBe(null)
    expect(toIsoDate(NaN)).toBe(null)
    expect(toIsoDate(Infinity)).toBe(null)
  })
})

describe('toIsoDate — demais formatos (regressão)', () => {
  it('Date em UTC', () => {
    expect(toIsoDate(new Date(Date.UTC(2024, 0, 1)))).toBe('2024-01-01')
    expect(toIsoDate(new Date('inválida'))).toBe(null)
  })

  it('ISO e brasileiro (barra ou traço, sempre dia→mês→ano)', () => {
    expect(toIsoDate('2024-3-7')).toBe('2024-03-07')
    expect(toIsoDate('11/12/2019')).toBe('2019-12-11')
    expect(toIsoDate('11-12-2019')).toBe('2019-12-11')
    expect(toIsoDate('5/6/24')).toBe('2024-06-05')
  })

  it('vazios', () => {
    expect(toIsoDate(null)).toBe(null)
    expect(toIsoDate('')).toBe(null)
    expect(toIsoDate('   ')).toBe(null)
  })
})
