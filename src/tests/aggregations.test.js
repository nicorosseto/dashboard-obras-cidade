// Testes das funções puras de src/lib/aggregations.js (Fase M3 da
// modernização — o coração de Fiscalização/Sistema Geo estava sem cobertura).
// Segue o padrão de src/tests/emergencias.test.js: fixtures pequenas por caso.
import { describe, it, expect } from 'vitest'
import {
  consolidarNorcrest,
  aplicarFiltros,
  contarSemData,
  listaPermissionarias,
  listaSubprefeituras,
  mapaSubprefeituras,
  listaAnos,
  calcularKPIsPBI,
  rankingLegislacaoVsNC,
  distribuicaoLegislacaoVsNC,
  distribuicaoSolucVsEmAnd,
  evolucaoAnual,
  evolucaoMensal,
  evolucaoTrimestral,
  contagemPorSubprefeitura,
  contagemPorRegiao,
  rankingTiposFalha,
  fmtNumero,
  fmtAreaDecimal,
  fmtData,
  fmtDataHora,
  fmtDataSP,
  aplicarFiltrosGeo,
  listaAnosGeo,
  evolucaoGeoAnual,
  evolucaoGeoMensal,
  contagemPorSubprefeituraGeo,
  topPermissionarias,
  topTiposProcesso,
  topStatus,
  tiposObraCount,
  mediaDiaria,
  maisProtocolos,
  pctPermissionaria,
  totaisAnuais,
  totaisMensais,
  totaisDiarios,
  comparativoAnualPorMes,
  processosPorRegiao,
} from '../lib/aggregations.js'

// ── Fixtures ────────────────────────────────────────────────────────────
// Fiscalização: SE é região Central; VM/IP/PA são Sul; PR é Norte (dados
// reais de src/data/subprefeituras-sp.js).
const FISC = [
  { permissionaria: 'NORCREST - NCR', subprefeitura: 'SE', data_inicio: '2024-01-10', data_conclusao: '2024-02-15', legislacao_atendida: true, tem_nao_conformidade: false, solucionado: false, em_andamento: false, area_m2: 10, falha_nivelamento: true },
  { permissionaria: 'NORCREST - NCJ', subprefeitura: 'VM', data_inicio: '2024-01-20', data_conclusao: null, legislacao_atendida: false, tem_nao_conformidade: true, solucionado: false, em_andamento: true, area_m2: 20, falha_trincas: true },
  { permissionaria: 'WINSLOW', subprefeitura: 'IP', data_inicio: '2024-04-05', data_conclusao: '2024-05-01', legislacao_atendida: false, tem_nao_conformidade: true, solucionado: true, em_andamento: false, area_m2: 30, falha_nivelamento: true },
  { permissionaria: 'HARGROVE', subprefeitura: null, data_inicio: null, data_conclusao: null, legislacao_atendida: true, tem_nao_conformidade: false, solucionado: false, em_andamento: false, area_m2: 0 },
]

// Sistema Geo
const GEO = [
  { permissionaria: 'NORCREST - NCR', subprefeitura: 'SE', data_cadastro: '2024-01-10', status_unificado: 'Obra Realizada', tipo_processo_nome: 'Emergência', tipo_obra_nome: 'Emergência' },
  { permissionaria: 'NORCREST - NCJ', subprefeitura: 'PA', data_cadastro: '2024-01-20', status_unificado: 'Em Andamento', tipo_processo_nome: 'Ligação Domiciliar', tipo_obra_nome: 'Ligação Domiciliar' },
  { permissionaria: 'WINSLOW', subprefeitura: 'PR', data_cadastro: '2024-06-15', status_unificado: 'Cancelamento', tipo_processo_nome: 'Expansão', tipo_obra_nome: 'Expansão' },
  { permissionaria: 'HARGROVE', subprefeitura: null, data_cadastro: null, status_unificado: 'Obra Realizada', tipo_processo_nome: null, tipo_obra_nome: null },
]

// ── Helpers ────────────────────────────────────────────────────────────
describe('consolidarNorcrest', () => {
  it('consolida qualquer variação de NORCREST', () => {
    expect(consolidarNorcrest('NORCREST - NCR')).toBe('NORCREST')
    expect(consolidarNorcrest('norcrest mcj')).toBe('NORCREST')
  })
  it('mantém outras permissionárias intactas', () => {
    expect(consolidarNorcrest('WINSLOW')).toBe('WINSLOW')
  })
  it('repassa valores vazios sem quebrar', () => {
    expect(consolidarNorcrest(null)).toBeNull()
    expect(consolidarNorcrest('')).toBe('')
  })
})

// ── Filtros (Fiscalização) ───────────────────────────────────────────
describe('aplicarFiltros', () => {
  it('sem filtros devolve tudo', () => {
    expect(aplicarFiltros(FISC, {}).length).toBe(4)
  })
  it('filtra por período (data_inicio)', () => {
    const r = aplicarFiltros(FISC, { dataIni: '2024-01-01', dataFim: '2024-01-31' })
    expect(r.map((x) => x.permissionaria)).toEqual(['NORCREST - NCR', 'NORCREST - NCJ'])
  })
  it('permissionária "NORCREST" no filtro pega todas as unidades', () => {
    const r = aplicarFiltros(FISC, { permissionarias: new Set(['NORCREST']) })
    expect(r).toHaveLength(2)
  })
  it('filtro de NC true/false', () => {
    expect(aplicarFiltros(FISC, { temNc: true })).toHaveLength(2)
    expect(aplicarFiltros(FISC, { temNc: false })).toHaveLength(2)
  })
  it('filtro de subprefeitura', () => {
    const r = aplicarFiltros(FISC, { subprefeituras: new Set(['SE']) })
    expect(r).toHaveLength(1)
  })
})

describe('contarSemData', () => {
  it('conta registros sem o campo informado', () => {
    expect(contarSemData(FISC, 'data_inicio')).toBe(1)
  })
})

describe('listaPermissionarias / listaSubprefeituras / listaAnos', () => {
  it('lista permissionárias distintas e ordenadas', () => {
    expect(listaPermissionarias(FISC)).toEqual(['HARGROVE', 'NORCREST - NCJ', 'NORCREST - NCR', 'WINSLOW'])
  })
  it('lista subprefeituras distintas (ignora nulas)', () => {
    expect(listaSubprefeituras(FISC).sort()).toEqual(['IP', 'SE', 'VM'])
  })
  it('lista anos distintos a partir de data_inicio', () => {
    expect(listaAnos(FISC)).toEqual([2024])
  })
})

describe('mapaSubprefeituras', () => {
  it('mapeia sigla -> nome quando subprefeitura_nome está presente', () => {
    const rows = [{ subprefeitura: 'SE', subprefeitura_nome: 'Sé' }]
    expect(mapaSubprefeituras(rows).get('SE')).toBe('Sé')
  })
  it('ignora linhas sem subprefeitura_nome', () => {
    expect(mapaSubprefeituras(FISC).size).toBe(0)
  })
})

// ── KPIs / rankings / distribuições ───────────────────────────────────
describe('calcularKPIsPBI', () => {
  it('calcula os percentuais corretos', () => {
    const k = calcularKPIsPBI(FISC)
    expect(k).toMatchObject({
      total: 4,
      legAtendida: 2,
      naoConform: 2,
      solucionados: 1,
      emAndamento: 1,
      pctLegAtendida: 50,
      pctNaoConform: 50,
      pctSolucNC: 50,
      pctEmAndNC: 50,
      areaTotal: 60,
    })
  })
  it('lida com array vazio sem dividir por zero', () => {
    const k = calcularKPIsPBI([])
    expect(k.pctLegAtendida).toBe(0)
    expect(k.pctSolucNC).toBe(0)
  })
})

describe('rankingLegislacaoVsNC', () => {
  it('consolida NORCREST e ordena por total', () => {
    const r = rankingLegislacaoVsNC(FISC, 10, true)
    const norcrest = r.find((x) => x.nome === 'NORCREST')
    expect(norcrest).toMatchObject({ total: 2, leg_atendida: 1, nao_atendida: 1 })
  })
  it('sem consolidar mantém unidades separadas', () => {
    const r = rankingLegislacaoVsNC(FISC, 10, false)
    expect(r.some((x) => x.nome === 'NORCREST - NCR')).toBe(true)
  })
  it('respeita o limite', () => {
    expect(rankingLegislacaoVsNC(FISC, 1, true)).toHaveLength(1)
  })
})

describe('distribuicaoLegislacaoVsNC / distribuicaoSolucVsEmAnd', () => {
  it('devolve os 2 buckets com valor e pct', () => {
    expect(distribuicaoLegislacaoVsNC(FISC)).toEqual([
      { nome: 'Legislação Atendida', valor: 2, pct: 50 },
      { nome: 'Não Conformidades', valor: 2, pct: 50 },
    ])
  })
  it('soluc/andamento calculado sobre o total de NC', () => {
    expect(distribuicaoSolucVsEmAnd(FISC)).toEqual([
      { nome: 'Solucionados', valor: 1, pct: 50 },
      { nome: 'Em andamento', valor: 1, pct: 50 },
    ])
  })
})

// ── Evolução temporal (Fiscalização) ──────────────────────────────────
describe('evolucaoAnual / evolucaoMensal / evolucaoTrimestral', () => {
  it('agrega por ano (ignora sem data_inicio)', () => {
    const r = evolucaoAnual(FISC)
    // HARGROVE tem legislacao_atendida=true mas SEM data_inicio -> fica de fora;
    // das 3 linhas COM data_inicio, só a SE (NORCREST-NCR) tem leg_atendida.
    expect(r).toEqual([{ periodo: '2024', leg_atendida: 1, nao_atendida: 2 }])
  })
  it('agrega por mês', () => {
    const r = evolucaoMensal(FISC)
    expect(r.map((x) => x.periodo)).toEqual(['2024-01', '2024-04'])
  })
  it('trimestral por solucionados usa data_conclusao', () => {
    const r = evolucaoTrimestral(FISC, 'solucionado')
    // só WINSLOW está solucionado, concluído em maio/2024 -> T2 2024
    expect(r).toEqual([{ periodo: 'T2 2024', valor: 1, _sort: '2024-T2' }])
  })
  it('trimestral por outro status usa data_inicio e não filtra por solucionado', () => {
    const r = evolucaoTrimestral(FISC, 'iniciado')
    expect(r.reduce((s, x) => s + x.valor, 0)).toBe(3) // as 3 linhas com data_inicio
  })
})

// ── Geografia (Fiscalização) ──────────────────────────────────────────
describe('contagemPorSubprefeitura / contagemPorRegiao', () => {
  it('conta por subprefeitura, agrupando nulos em "(sem)"', () => {
    const m = contagemPorSubprefeitura(FISC)
    expect(m.get('SE')).toBe(1)
    expect(m.get('(sem)')).toBe(1)
  })
  it('conta por região com pct e ignora subprefeitura desconhecida', () => {
    const r = contagemPorRegiao(FISC)
    const central = r.find((x) => x.regiao === 'Central')
    const sul = r.find((x) => x.regiao === 'Sul')
    expect(central.laudos).toBe(1)
    expect(sul.laudos).toBe(2) // VM + IP
    expect(central.pct).toBe(33) // 1/3 das linhas COM subprefeitura mapeada
  })
})

describe('rankingTiposFalha', () => {
  it('conta ocorrências por tipo de falha e ordena decrescente', () => {
    const r = rankingTiposFalha(FISC)
    expect(r[0]).toMatchObject({ nome: 'Nivelamento', laudos: 2 })
    expect(r.find((x) => x.nome === 'Trincas')).toMatchObject({ laudos: 1 })
    expect(r.find((x) => x.nome === 'Geometria')).toMatchObject({ laudos: 0 })
  })
})

// ── Formatação ─────────────────────────────────────────────────────────
describe('formatadores', () => {
  it('fmtNumero formata no padrão pt-BR e arredonda', () => {
    expect(fmtNumero(1234.6)).toBe('1.235')
    expect(fmtNumero(null)).toBe('0')
  })
  it('fmtAreaDecimal sempre com 2 casas, "-" para vazio', () => {
    expect(fmtAreaDecimal(1234.5)).toBe('1.234,50')
    expect(fmtAreaDecimal(null)).toBe('-')
    expect(fmtAreaDecimal('')).toBe('-')
  })
  it('fmtData converte ISO para DD/MM/AAAA', () => {
    expect(fmtData('2024-03-05')).toBe('05/03/2024')
    expect(fmtData(null)).toBe('-')
    expect(fmtData('não-é-data')).toBe('não-é-data')
  })
  it('fmtDataHora e fmtDataSP tratam nulo com travessão', () => {
    expect(fmtDataHora(null)).toBe('—')
    expect(fmtDataSP(null)).toBe('—')
  })
  it('fmtDataSP formata um timestamp real no fuso de SP', () => {
    // meio-dia UTC vira 09:00 em SP (UTC-3) -> mesmo dia
    expect(fmtDataSP('2024-03-05T12:00:00Z')).toBe('05/03/2024')
  })
})

// ── Sistema Geo: filtros ──────────────────────────────────────────────────
describe('aplicarFiltrosGeo', () => {
  it('sem filtros devolve tudo', () => {
    expect(aplicarFiltrosGeo(GEO, {}).length).toBe(4)
  })
  it('filtra por permissionária NORCREST (pega todas as unidades)', () => {
    const r = aplicarFiltrosGeo(GEO, { permissionarias: new Set(['NORCREST']) })
    expect(r).toHaveLength(2)
  })
  it('filtra por tipo de processo', () => {
    const r = aplicarFiltrosGeo(GEO, { tiposProcesso: new Set(['Emergência']) })
    expect(r).toHaveLength(1)
  })
  it('filtra por status individual (não pelo grupo)', () => {
    const r = aplicarFiltrosGeo(GEO, { statusUnificados: new Set(['Obra Realizada']) })
    expect(r).toHaveLength(2) // NORCREST-NCR com status + HARGROVE "(sem status real, mas cai em status_unificado)"
  })
  it('filtra por período (data_cadastro)', () => {
    const r = aplicarFiltrosGeo(GEO, { dataIni: '2024-01-01', dataFim: '2024-01-31' })
    expect(r).toHaveLength(2)
  })
})

describe('listaAnosGeo', () => {
  it('lista anos distintos em ordem decrescente', () => {
    expect(listaAnosGeo(GEO)).toEqual(['2024'])
  })
})

// ── Sistema Geo: evolução temporal ────────────────────────────────────────
describe('evolucaoGeoAnual / evolucaoGeoMensal', () => {
  it('classifica encerrados x em andamento x cancelados', () => {
    const r = evolucaoGeoAnual(GEO)
    expect(r).toEqual([{ ano: '2024', encerrados: 1, emAndamento: 1, total: 3 }])
    // 3 linhas com data_cadastro: 1 Obra Realizada (encerrado), 1 Em Andamento
    // (emAndamento), 1 Cancelamento (nem encerrado nem emAndamento)
  })
  it('mensal mantém só os últimos 36 meses e ordena', () => {
    const r = evolucaoGeoMensal(GEO)
    expect(r.map((x) => x.mes)).toEqual(['2024-01', '2024-06'])
  })
})

describe('contagemPorSubprefeituraGeo', () => {
  it('conta por subprefeitura', () => {
    const m = contagemPorSubprefeituraGeo(GEO)
    expect(m.get('SE')).toBe(1)
    expect(m.get('(sem)')).toBe(1)
  })
})

// ── Sistema Geo: rankings / top N ──────────────────────────────────────
describe('topPermissionarias / topTiposProcesso / topStatus / tiposObraCount', () => {
  it('topPermissionarias consolida NORCREST e respeita n', () => {
    const r = topPermissionarias(GEO, 10, true)
    expect(r.find((x) => x.nome === 'NORCREST')).toMatchObject({ count: 2 })
  })
  it('topPermissionarias sem consolidar', () => {
    const r = topPermissionarias(GEO, 10, false)
    expect(r.some((x) => x.nome === 'NORCREST - NCR')).toBe(true)
  })
  it('topTiposProcesso agrupa "(sem)" para nulo', () => {
    const r = topTiposProcesso(GEO, 6)
    expect(r.find((x) => x.nome === '(sem)')).toMatchObject({ count: 1 })
  })
  it('topStatus agrupa o excedente em "Outros"', () => {
    const r = topStatus(GEO, 1)
    expect(r[0].count).toBeGreaterThanOrEqual(1)
    expect(r.find((x) => x.nome === 'Outros')).toBeTruthy()
  })
  it('tiposObraCount ordena por contagem decrescente', () => {
    const r = tiposObraCount(GEO)
    expect(r[0].count).toBeGreaterThanOrEqual(r[r.length - 1].count)
  })
})

describe('mediaDiaria / maisProtocolos / pctPermissionaria', () => {
  it('mediaDiaria usa o intervalo informado', () => {
    // 4 linhas / 2 dias (01 a 02/jan) = 2/dia
    expect(mediaDiaria(GEO, '2024-01-01', '2024-01-02')).toBe(2)
  })
  it('mediaDiaria sem intervalo usa o range das próprias datas', () => {
    // GEO tem 4 linhas mas as datas vão de jan a jun/2024 (158 dias) -> média
    // arredonda para 0; um range apertado mostra o cálculo funcionando de fato.
    const rowsApertadas = [
      { data_cadastro: '2024-01-01' },
      { data_cadastro: '2024-01-01' },
      { data_cadastro: '2024-01-02' },
    ]
    expect(mediaDiaria(rowsApertadas)).toBeGreaterThan(0)
    expect(mediaDiaria(GEO)).toBe(0)
  })
  it('mediaDiaria de array vazio é 0', () => {
    expect(mediaDiaria([])).toBe(0)
  })
  it('maisProtocolos devolve a permissionária consolidada líder', () => {
    expect(maisProtocolos(GEO)).toBe('NORCREST')
  })
  it('maisProtocolos de array vazio devolve travessão', () => {
    expect(maisProtocolos([])).toBe('—')
  })
  it('pctPermissionaria é 100% sem filtro ativo', () => {
    expect(pctPermissionaria(GEO, GEO, new Set())).toBe(100)
    expect(pctPermissionaria(GEO, GEO, new Set(['TODAS']))).toBe(100)
  })
  it('pctPermissionaria calcula a proporção com filtro ativo', () => {
    expect(pctPermissionaria(GEO.slice(0, 1), GEO, new Set(['NORCREST']))).toBe(25)
  })
})

// ── Sistema Geo: linha do tempo ───────────────────────────────────────────
describe('totaisAnuais / totaisMensais / totaisDiarios', () => {
  it('totaisAnuais agrupa por ano', () => {
    expect(totaisAnuais(GEO)).toEqual([{ label: '2024', value: 3 }])
  })
  it('totaisMensais agrupa por mês, ordenado', () => {
    expect(totaisMensais(GEO).map((x) => x.label)).toEqual(['2024-01', '2024-06'])
  })
  it('totaisDiarios agrupa por dia', () => {
    const r = totaisDiarios(GEO)
    expect(r.find((x) => x.label === '2024-01-10')).toMatchObject({ value: 1 })
  })
})

describe('comparativoAnualPorMes', () => {
  it('monta a matriz mês x ano com os 12 meses sempre presentes', () => {
    const { anos, data } = comparativoAnualPorMes(GEO)
    expect(anos).toEqual(['2024'])
    expect(data).toHaveLength(12)
    const janeiro = data.find((d) => d.mes === 'Janeiro')
    expect(janeiro['2024']).toBe(2)
    const marco = data.find((d) => d.mes === 'Março')
    expect(marco['2024']).toBe(0)
  })
})

describe('processosPorRegiao', () => {
  it('agrupa por região com pct de 2 casas decimais', () => {
    const r = processosPorRegiao(GEO)
    const norte = r.find((x) => x.regiao === 'Norte')
    expect(norte).toMatchObject({ count: 1 })
    expect(norte.pct).toBeCloseTo(25, 5)
  })
  it('linhas sem subprefeitura mapeável caem em "Não classificado"', () => {
    const r = processosPorRegiao(GEO)
    expect(r.find((x) => x.regiao === 'Não classificado')).toMatchObject({ count: 1 })
  })
})
