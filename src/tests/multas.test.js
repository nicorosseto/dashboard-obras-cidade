import { describe, it, expect } from 'vitest'
import {
  buildProcessoSet,
  buildProcessoMap,
  situacaoVinculoDe,
  cruzarMultas,
  agruparPorVinculo,
  resumoVinculo,
  agregaSituacaoVinculo,
  fmtValorBRL,
  valorTotalMultas,
  agregaMultasPorPermissionaria,
  agregaMultasPorStatus,
  agregaMultasPorMes,
  todasNorcrest,
  agregaMultasPorUnidadeNorcrest,
  FILTROS_VAZIOS_MULTAS,
  aplicarFiltrosMultas,
  contarFiltrosAtivosMultas,
} from '../lib/multas.js'

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

// ── buildProcessoMap ────────────────────────────────────────────────────
describe('buildProcessoMap', () => {
  it('mapeia normProc(campo) → linha', () => {
    const m = buildProcessoMap([{ processo: '00123', permissionaria: 'NORCREST' }], 'processo')
    expect(m.get('123')).toMatchObject({ permissionaria: 'NORCREST' })
  })

  it('sem dataCampo, mantém a última linha encontrada para a mesma chave', () => {
    const m = buildProcessoMap([{ processo: '1', permissionaria: 'A' }, { processo: '1', permissionaria: 'B' }], 'processo')
    expect(m.get('1')).toMatchObject({ permissionaria: 'B' })
  })

  it('com dataCampo, mantém a linha de data mais recente (padrão buildVistoriaMap)', () => {
    const linhas = [
      { id_origem: '789', status_simplificado: 'Em andamento', data_inicio: '2024-01-01' },
      { id_origem: '789', status_simplificado: 'Solucionado', data_inicio: '2024-06-01' },
    ]
    const m = buildProcessoMap(linhas, 'id_origem', 'data_inicio')
    expect(m.get('789')).toMatchObject({ status_simplificado: 'Solucionado' })
  })

  it('funciona com `.has()` (compatível com o uso em situacaoVinculoDe)', () => {
    const m = buildProcessoMap([{ processo: '5' }], 'processo')
    expect(m.has('5')).toBe(true)
    expect(m.has('6')).toBe(false)
  })
})

// ── cruzarMultas ─────────────────────────────────────────────────────────
describe('cruzarMultas', () => {
  const multas = [
    { id: 1, num_processo_normalizado: '123', permissionaria: 'NORCREST PLANILHA' },
    { id: 2, num_processo_normalizado: '789', permissionaria: 'HARGROVE' },
    { id: 3, num_processo_normalizado: '999', permissionaria: 'WINSLOW' },
    { id: 4, num_processo_normalizado: null, permissionaria: 'NATURGY' },
  ]
  const sistemaGeo = [{ processo: '123', permissionaria: 'NORCREST', status_unificado: 'Em andamento', status_nome: 'Obra em execução' }]
  const fiscalizacao = [{ id_origem: '789', status_simplificado: 'Solucionado', data_inicio: '2024-01-01' }]

  it('marca _situacao_vinculo em cada linha, preservando os demais campos', () => {
    const rows = cruzarMultas(multas, sistemaGeo, fiscalizacao)
    expect(rows).toHaveLength(4)
    expect(rows[0]).toMatchObject({ id: 1, _situacao_vinculo: 'vinculado_sistemaGeo' })
    expect(rows[1]).toMatchObject({ id: 2, _situacao_vinculo: 'vinculado_fiscalizacao' })
    expect(rows[2]).toMatchObject({ id: 3, _situacao_vinculo: 'processo_nao_encontrado' })
    expect(rows[3]).toMatchObject({ id: 4, _situacao_vinculo: 'sem_processo' })
  })

  it('vinculada ao Sistema Geo: usa a permissionária/status do Sistema Geo', () => {
    const rows = cruzarMultas(multas, sistemaGeo, fiscalizacao)
    expect(rows[0]).toMatchObject({
      _permissionaria_exibir: 'NORCREST',
      _status_geo: 'Em andamento',
      _status_geo_nome: 'Obra em execução',
      _status_fisc: null,
    })
  })

  it('vinculada só à Fiscalização: usa a permissionária da planilha (fallback) e o status_simplificado', () => {
    const rows = cruzarMultas(multas, sistemaGeo, fiscalizacao)
    expect(rows[1]).toMatchObject({
      _permissionaria_exibir: 'HARGROVE',
      _status_geo: null,
      _status_fisc: 'Solucionado',
    })
  })

  it('sem vínculo: _permissionaria_exibir cai no valor cru da planilha', () => {
    const rows = cruzarMultas(multas, sistemaGeo, fiscalizacao)
    expect(rows[2]._permissionaria_exibir).toBe('WINSLOW')
    expect(rows[3]._permissionaria_exibir).toBe('NATURGY')
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

  it('agregaSituacaoVinculo devolve só os baldes com multas, com label/cor', () => {
    const r = agregaSituacaoVinculo(cruzadas)
    expect(r).toHaveLength(4)
    const geo = r.find((g) => g.situacao === 'vinculado_sistemaGeo')
    expect(geo).toMatchObject({ nome: 'Vinculada (Sistema Geo)', qtd: 2 })
    expect(geo.cor).toBeTruthy()
  })

  it('agregaSituacaoVinculo omite baldes vazios', () => {
    const r = agregaSituacaoVinculo(cruzarMultas([{ id: 1, num_processo_normalizado: '123' }], [{ processo: '123' }], []))
    expect(r).toEqual([{ situacao: 'vinculado_sistemaGeo', nome: 'Vinculada (Sistema Geo)', cor: expect.any(String), qtd: 1 }])
  })
})

// ── fmtValorBRL / valorTotalMultas ────────────────────────────────────────
describe('fmtValorBRL', () => {
  it('formata número como moeda BRL', () => {
    expect(fmtValorBRL(1234.56)).toBe('R$\xa01.234,56')
  })

  it('trata null/undefined como zero', () => {
    expect(fmtValorBRL(null)).toBe('R$\xa00,00')
    expect(fmtValorBRL(undefined)).toBe('R$\xa00,00')
  })
})

describe('valorTotalMultas', () => {
  it('soma o campo valor das linhas', () => {
    expect(valorTotalMultas([{ valor: 100 }, { valor: 50.5 }, { valor: null }])).toBe(150.5)
  })

  it('lida com lista vazia/nula', () => {
    expect(valorTotalMultas([])).toBe(0)
    expect(valorTotalMultas(null)).toBe(0)
  })
})

// ── agregaMultasPorPermissionaria ──────────────────────────────────────────
describe('agregaMultasPorPermissionaria', () => {
  it('consolida unidades NORCREST por padrão e ordena decrescente', () => {
    const linhas = [
      { permissionaria: 'NORCREST/NCRS' },
      { permissionaria: 'NORCREST/NCJL' },
      { permissionaria: 'HARGROVE' },
    ]
    const r = agregaMultasPorPermissionaria(linhas)
    expect(r[0]).toMatchObject({ nome: 'NORCREST', total: 2 })
    expect(r[1]).toMatchObject({ nome: 'HARGROVE', total: 1 })
  })

  it('sem consolidar, mantém as unidades separadas', () => {
    const linhas = [{ permissionaria: 'NORCREST/NCRS' }, { permissionaria: 'NORCREST/NCJL' }]
    const r = agregaMultasPorPermissionaria(linhas, { consolidar: false })
    expect(r).toHaveLength(2)
  })

  it('ignora linhas sem permissionária', () => {
    expect(agregaMultasPorPermissionaria([{ permissionaria: '' }, { permissionaria: null }])).toEqual([])
  })

  it('usa _permissionaria_exibir (nome do Sistema Geo) quando presente, não o valor cru da planilha', () => {
    const linhas = [
      { permissionaria: 'norcrest planilha', _permissionaria_exibir: 'NORCREST' },
      { permissionaria: 'hargrove sp', _permissionaria_exibir: 'HARGROVE SP' },
    ]
    const r = agregaMultasPorPermissionaria(linhas, { consolidar: false })
    expect(r.map((x) => x.nome).sort()).toEqual(['HARGROVE SP', 'NORCREST'])
  })
})

// ── todasNorcrest / agregaMultasPorUnidadeNorcrest (drill-down) ──────────────
describe('todasNorcrest', () => {
  it('verdadeiro só quando toda a lista é NORCREST (via _permissionaria_exibir)', () => {
    expect(todasNorcrest([{ _permissionaria_exibir: 'NORCREST/NCR' }, { _permissionaria_exibir: 'NORCREST/NCJ' }])).toBe(true)
    expect(todasNorcrest([{ _permissionaria_exibir: 'NORCREST/NCR' }, { _permissionaria_exibir: 'HARGROVE' }])).toBe(false)
  })

  it('cai no campo cru (permissionaria) quando não há _permissionaria_exibir', () => {
    expect(todasNorcrest([{ permissionaria: 'NORCREST' }])).toBe(true)
  })

  it('falso para lista vazia', () => {
    expect(todasNorcrest([])).toBe(false)
  })
})

describe('agregaMultasPorUnidadeNorcrest', () => {
  it('agrupa por unidade, consolidando NCRV/NCRS → NCR e NCJV/NCJL → NCJ', () => {
    const linhas = [
      { _permissionaria_exibir: 'NORCREST/NCRS' },
      { _permissionaria_exibir: 'NORCREST/NCRV' },
      { _permissionaria_exibir: 'NORCREST/NCJL' },
      { _permissionaria_exibir: 'NORCREST - MLG' },
    ]
    const r = agregaMultasPorUnidadeNorcrest(linhas)
    expect(r).toEqual(expect.arrayContaining([
      { nome: 'NCR', total: 2 },
      { nome: 'NCJ', total: 1 },
      { nome: 'MLG', total: 1 },
    ]))
  })

  it('"NORCREST" sem sufixo cai no balde "NORCREST"', () => {
    const r = agregaMultasPorUnidadeNorcrest([{ _permissionaria_exibir: 'NORCREST' }])
    expect(r).toEqual([{ nome: 'NORCREST', total: 1 }])
  })
})

// ── agregaMultasPorStatus ──────────────────────────────────────────────────
describe('agregaMultasPorStatus', () => {
  it('agrupa e ordena por quantidade decrescente', () => {
    const linhas = [{ status: 'LAVRADO' }, { status: 'LAVRADO' }, { status: 'PENDENTE' }]
    expect(agregaMultasPorStatus(linhas)).toEqual([
      { status: 'LAVRADO', qtd: 2 },
      { status: 'PENDENTE', qtd: 1 },
    ])
  })

  it('linhas sem status caem em "Sem status"', () => {
    expect(agregaMultasPorStatus([{ status: null }])).toEqual([{ status: 'Sem status', qtd: 1 }])
  })
})

// ── agregaMultasPorMes ──────────────────────────────────────────────────────
describe('agregaMultasPorMes', () => {
  it('agrupa por YYYY-MM e ordena cronologicamente', () => {
    const linhas = [
      { data_infracao: '2024-03-15' },
      { data_infracao: '2024-01-02' },
      { data_infracao: '2024-01-20' },
    ]
    expect(agregaMultasPorMes(linhas)).toEqual([
      { mes: '2024-01', qtd: 2 },
      { mes: '2024-03', qtd: 1 },
    ])
  })

  it('ignora linhas sem data', () => {
    expect(agregaMultasPorMes([{ data_infracao: null }, {}])).toEqual([])
  })
})

// ── FILTROS_VAZIOS_MULTAS / aplicarFiltrosMultas / contarFiltrosAtivosMultas ──
describe('aplicarFiltrosMultas', () => {
  const linhas = [
    { id: 1, permissionaria: 'NORCREST/NCR', _permissionaria_exibir: 'NORCREST/NCR', status: 'LAVRADO', _situacao_vinculo: 'vinculado_sistemaGeo', subprefeitura: 'AD', data_infracao: '2024-01-10' },
    { id: 2, permissionaria: 'HARGROVE', _permissionaria_exibir: 'HARGROVE', status: 'PENDENTE', _situacao_vinculo: 'sem_processo', subprefeitura: 'MP', data_infracao: '2024-03-05' },
    { id: 3, permissionaria: 'NORCREST/MLG', _permissionaria_exibir: 'NORCREST/MLG', status: 'NÃO LAVRADO', _situacao_vinculo: 'processo_nao_encontrado', subprefeitura: 'AD', data_infracao: '2024-06-20' },
  ]

  it('sem filtros, devolve tudo', () => {
    expect(aplicarFiltrosMultas(linhas, FILTROS_VAZIOS_MULTAS)).toHaveLength(3)
  })

  it('filtra por permissionária consolidada (NORCREST pega as duas unidades)', () => {
    const r = aplicarFiltrosMultas(linhas, { ...FILTROS_VAZIOS_MULTAS, permissionarias: new Set(['NORCREST']) })
    expect(r.map((x) => x.id)).toEqual([1, 3])
  })

  it('filtra por permissionária exata (sem consolidar)', () => {
    const r = aplicarFiltrosMultas(linhas, { ...FILTROS_VAZIOS_MULTAS, permissionarias: new Set(['HARGROVE']) })
    expect(r.map((x) => x.id)).toEqual([2])
  })

  it('filtra por status', () => {
    const r = aplicarFiltrosMultas(linhas, { ...FILTROS_VAZIOS_MULTAS, status: new Set(['LAVRADO']) })
    expect(r.map((x) => x.id)).toEqual([1])
  })

  it('filtra por situação de vínculo', () => {
    const r = aplicarFiltrosMultas(linhas, { ...FILTROS_VAZIOS_MULTAS, situacaoVinculo: new Set(['sem_processo']) })
    expect(r.map((x) => x.id)).toEqual([2])
  })

  it('filtra por subprefeitura', () => {
    const r = aplicarFiltrosMultas(linhas, { ...FILTROS_VAZIOS_MULTAS, subprefeituras: new Set(['MP']) })
    expect(r.map((x) => x.id)).toEqual([2])
  })

  it('filtra por período da infração (data_infracao)', () => {
    const r = aplicarFiltrosMultas(linhas, { ...FILTROS_VAZIOS_MULTAS, dataIni: '2024-02-01', dataFim: '2024-12-31' })
    expect(r.map((x) => x.id)).toEqual([2, 3])
  })

  it('combina filtros (E lógico)', () => {
    const r = aplicarFiltrosMultas(linhas, { ...FILTROS_VAZIOS_MULTAS, permissionarias: new Set(['NORCREST']), subprefeituras: new Set(['AD']) })
    expect(r.map((x) => x.id)).toEqual([1, 3])
  })

  it('aceita lista vazia/nula', () => {
    expect(aplicarFiltrosMultas([], FILTROS_VAZIOS_MULTAS)).toEqual([])
    expect(aplicarFiltrosMultas(null, FILTROS_VAZIOS_MULTAS)).toEqual([])
  })
})

describe('contarFiltrosAtivosMultas', () => {
  it('zero quando não há filtro ativo', () => {
    expect(contarFiltrosAtivosMultas(FILTROS_VAZIOS_MULTAS)).toBe(0)
  })

  it('soma datas + tamanho dos Sets', () => {
    const f = { ...FILTROS_VAZIOS_MULTAS, dataIni: '2024-01-01', permissionarias: new Set(['NORCREST', 'HARGROVE']) }
    expect(contarFiltrosAtivosMultas(f)).toBe(3)
  })
})
