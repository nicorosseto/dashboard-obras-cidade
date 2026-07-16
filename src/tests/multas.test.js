import { describe, it, expect } from 'vitest'
import { buildProcessoSet, situacaoVinculoDe, cruzarMultas, agruparPorVinculo, resumoVinculo } from '../lib/multas.js'

// ── buildProcessoSet ───────────────────────────────────────────────────
describe('buildProcessoSet', () => {
  it('normaliza (normProc) os valores do campo informado', () => {
    const s = buildProcessoSet([{ processo: '00123' }, { processo: 'abc' }], 'processo')
    expect(s.has('123')).toBe(true)
    expect(s.has('ABC')).toBe(true)
  })

  it('ignora linhas sem o campo', () => {
    const s = buildProcessoSet([{ processo: '' }, { processo: null }, {}], 'processo')
    expect(s.size).toBe(0)
  })

  it('aceita array vazio ou nulo', () => {
    expect(buildProcessoSet([], 'processo').size).toBe(0)
    expect(buildProcessoSet(null, 'processo').size).toBe(0)
  })

  it('funciona com outro nome de campo (id_origem)', () => {
    const s = buildProcessoSet([{ id_origem: '456' }], 'id_origem')
    expect(s.has('456')).toBe(true)
  })
})

// ── situacaoVinculoDe ────────────────────────────────────────────────────
describe('situacaoVinculoDe', () => {
  const geoSet = new Set(['123'])
  const fiscSet = new Set(['789'])

  it('sem_processo quando não há num_processo_normalizado', () => {
    expect(situacaoVinculoDe({ num_processo_normalizado: null }, geoSet, fiscSet)).toBe('sem_processo')
    expect(situacaoVinculoDe({}, geoSet, fiscSet)).toBe('sem_processo')
  })

  it('vinculado_sistemaGeo quando bate com o set de sistemaGeo', () => {
    expect(situacaoVinculoDe({ num_processo_normalizado: '123' }, geoSet, fiscSet)).toBe('vinculado_sistemaGeo')
  })

  it('vinculado_fiscalizacao quando bate só com o set de fiscalização', () => {
    expect(situacaoVinculoDe({ num_processo_normalizado: '789' }, geoSet, fiscSet)).toBe('vinculado_fiscalizacao')
  })

  it('processo_nao_encontrado quando tem chave mas não bate em nenhum set', () => {
    expect(situacaoVinculoDe({ num_processo_normalizado: '999' }, geoSet, fiscSet)).toBe('processo_nao_encontrado')
  })

  it('sistemaGeo tem prioridade sobre fiscalização quando bate nos dois', () => {
    const geo = new Set(['1'])
    const fisc = new Set(['1'])
    expect(situacaoVinculoDe({ num_processo_normalizado: '1' }, geo, fisc)).toBe('vinculado_sistemaGeo')
  })
})

// ── cruzarMultas ─────────────────────────────────────────────────────────
describe('cruzarMultas', () => {
  const multas = [
    { id: 1, num_processo_normalizado: '123' },
    { id: 2, num_processo_normalizado: '789' },
    { id: 3, num_processo_normalizado: '999' },
    { id: 4, num_processo_normalizado: null },
  ]
  const sistemaGeo = [{ processo: '123' }]
  const fiscalizacao = [{ id_origem: '789' }]

  it('marca _situacao_vinculo em cada linha, preservando os demais campos', () => {
    const rows = cruzarMultas(multas, sistemaGeo, fiscalizacao)
    expect(rows).toHaveLength(4)
    expect(rows[0]).toMatchObject({ id: 1, _situacao_vinculo: 'vinculado_sistemaGeo' })
    expect(rows[1]).toMatchObject({ id: 2, _situacao_vinculo: 'vinculado_fiscalizacao' })
    expect(rows[2]).toMatchObject({ id: 3, _situacao_vinculo: 'processo_nao_encontrado' })
    expect(rows[3]).toMatchObject({ id: 4, _situacao_vinculo: 'sem_processo' })
  })

  it('aceita listas vazias/nulas', () => {
    expect(cruzarMultas([], [], [])).toEqual([])
    expect(cruzarMultas(null, null, null)).toEqual([])
  })
})

// ── agruparPorVinculo / resumoVinculo ────────────────────────────────────
describe('agruparPorVinculo e resumoVinculo', () => {
  const multas = [
    { id: 1, num_processo_normalizado: '123' },
    { id: 2, num_processo_normalizado: '123' },
    { id: 3, num_processo_normalizado: '789' },
    { id: 4, num_processo_normalizado: '999' },
    { id: 5, num_processo_normalizado: null },
  ]
  const sistemaGeo = [{ processo: '123' }]
  const fiscalizacao = [{ id_origem: '789' }]
  const cruzadas = cruzarMultas(multas, sistemaGeo, fiscalizacao)

  it('agrupa em 4 baldes de situação de vínculo', () => {
    const grupos = agruparPorVinculo(cruzadas)
    expect(grupos.vinculado_sistemaGeo).toHaveLength(2)
    expect(grupos.vinculado_fiscalizacao).toHaveLength(1)
    expect(grupos.processo_nao_encontrado).toHaveLength(1)
    expect(grupos.sem_processo).toHaveLength(1)
  })

  it('resume os totais das 3 visões da tela (A4)', () => {
    const resumo = resumoVinculo(cruzadas)
    expect(resumo).toEqual({
      total: 5,
      vinculadas: 3,
      vinculadoSistemaGeo: 2,
      vinculadoFiscalizacao: 1,
      processoInexistente: 1,
      semProcesso: 1,
    })
  })

  it('lida com lista vazia', () => {
    expect(resumoVinculo([])).toEqual({
      total: 0,
      vinculadas: 0,
      vinculadoSistemaGeo: 0,
      vinculadoFiscalizacao: 0,
      processoInexistente: 0,
      semProcesso: 0,
    })
  })
})
