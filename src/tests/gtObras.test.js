import { describe, it, expect } from 'vitest'
import {
  cruzarGtObras,
  STATUS_GRUPO_LABEL,
  STATUS_GRUPO_COR,
  STATUS_GT,
  STATUS_GT_COR,
  STATUS_PENDENCIA_ESPERA,
  agruparGtPorProcesso,
  kpisGt,
  agregaGtPorStatusGrupo,
  agregaGtPorStatus,
  agregaGtPorStatusEAno,
  pendenciasAcionaveisGt,
  agregaGtMetragemPorStatus,
  matrizGtRecapeStatus,
  recapeConcluidoParalisadoGt,
  agregaGtPorPermissionaria,
  todasGtNorcrest,
  agregaGtPorUnidadeNorcrest,
  agregaGtPorSubprefeitura,
  agregaGtPorAno,
  agregaGtStatusGrupoPorAno,
  agregaGtPorTecnica,
  agregaGtPorSituacaoRecape,
  FILTROS_VAZIOS_GT,
  contarFiltrosAtivosGt,
  aplicarFiltrosGt,
  conferirDashVsBase,
  inconsistenciasGt,
  textoTrechoGt,
  textoViaGt,
} from '../lib/gtObras.js'

// ── cruzarGtObras ──────────────────────────────────────────────────────
describe('cruzarGtObras', () => {
  const gtLinhas = [
    { id: 1, num_processo_normalizado: '123', permissionaria: 'NORCREST PLANILHA' },
    { id: 2, num_processo_normalizado: '789', permissionaria: 'HARGROVE' },
    { id: 3, num_processo_normalizado: '999', permissionaria: 'WINSLOW' },
    { id: 4, num_processo_normalizado: null, permissionaria: 'DORVAL' },
  ]
  const sistemaGeo = [
    {
      processo: '123',
      permissionaria: 'NORCREST',
      status_unificado: 'Em andamento',
      status_nome: 'Obra em execução',
    },
  ]
  const fiscalizacao = [
    { id_origem: '789', status_simplificado: 'Solucionado', data_inicio: '2024-01-01' },
  ]

  it('marca _situacao_vinculo em cada linha', () => {
    const rows = cruzarGtObras(gtLinhas, sistemaGeo, fiscalizacao)
    expect(rows).toHaveLength(4)
    expect(rows[0]._situacao_vinculo).toBe('vinculado_sistemaGeo')
    expect(rows[1]._situacao_vinculo).toBe('vinculado_fiscalizacao')
    expect(rows[2]._situacao_vinculo).toBe('processo_nao_encontrado')
    expect(rows[3]._situacao_vinculo).toBe('sem_processo')
  })

  it('vinculada ao Sistema Geo: usa a permissionária/status do Sistema Geo', () => {
    const rows = cruzarGtObras(gtLinhas, sistemaGeo, fiscalizacao)
    expect(rows[0]).toMatchObject({
      _permissionaria_exibir: 'NORCREST',
      _status_geo: 'Em andamento',
      _status_geo_nome: 'Obra em execução',
    })
  })

  it('sem vínculo: _permissionaria_exibir cai no valor cru', () => {
    const rows = cruzarGtObras(gtLinhas, sistemaGeo, fiscalizacao)
    expect(rows[2]._permissionaria_exibir).toBe('WINSLOW')
    expect(rows[3]._permissionaria_exibir).toBe('DORVAL')
  })

  it('aceita listas vazias/nulas', () => {
    expect(cruzarGtObras([], [], [])).toEqual([])
    expect(cruzarGtObras(null, null, null)).toEqual([])
  })
})

// ── textoTrechoGt / textoViaGt ──────────────────────────────────────────
// Fonte única para a Lista (AbaGtLista.jsx) e a seção de Inconsistências
// (AbaGtInconsistencias.jsx) montarem a coluna "Vias" no mesmo padrão.
describe('textoTrechoGt', () => {
  it('monta o trecho De → Até quando os dois existem', () => {
    expect(textoTrechoGt({ trecho_de: 'Rua A', trecho_ate: 'Rua B' })).toBe(
      'Rua A → Rua B'
    )
  })

  it('usa "?" no lado que faltar', () => {
    expect(textoTrechoGt({ trecho_de: 'Rua A', trecho_ate: null })).toBe(
      'Rua A → ?'
    )
    expect(textoTrechoGt({ trecho_de: null, trecho_ate: 'Rua B' })).toBe(
      '? → Rua B'
    )
  })

  it('string vazia quando não há trecho_de nem trecho_ate', () => {
    expect(textoTrechoGt({})).toBe('')
  })
})

describe('textoViaGt', () => {
  it('combina nome da via e trecho', () => {
    expect(
      textoViaGt({ nome_via: 'Rua X', trecho_de: 'Rua A', trecho_ate: 'Rua B' })
    ).toBe('Rua X — Rua A → Rua B')
  })

  it('só o nome quando não há trecho', () => {
    expect(textoViaGt({ nome_via: 'Rua X' })).toBe('Rua X')
  })

  it('só o trecho quando não há nome da via', () => {
    expect(textoViaGt({ trecho_de: 'Rua A', trecho_ate: 'Rua B' })).toBe(
      'Rua A → Rua B'
    )
  })

  it('fallback quando não há nome nem trecho', () => {
    expect(textoViaGt({})).toBe('(via não informada)')
  })
})

// ── agruparGtPorProcesso ────────────────────────────────────────────────
// Achado do usuário (27/07/2026): um processo pode ter várias vias/trechos
// (célula mesclada no Excel — a Edge Function já preenche os campos de
// processo para baixo). Este agrupamento funde as linhas de um mesmo
// processo em uma só, somando a área de todas as vias.
describe('agruparGtPorProcesso', () => {
  const tresVias = [
    {
      id: 1,
      num_processo: '9999.2024/0030566-7',
      num_processo_normalizado: '9999.2024/30566-7',
      permissionaria: 'NORCREST/QY',
      status_grupo: 'compatibilizada',
      nome_via: null,
      trecho_de: 'Rua Pde Leão Peruche',
      trecho_ate: 'Rua Aragão',
      area_m2: 5091.12,
      situacao_recape_norm: 'GAP GRADED',
    },
    {
      id: 2,
      num_processo: '9999.2024/0030566-7',
      num_processo_normalizado: '9999.2024/30566-7',
      permissionaria: 'NORCREST/QY',
      status_grupo: 'compatibilizada',
      nome_via: null,
      trecho_de: 'Rua Purus',
      trecho_ate: 'Rua Aragão',
      area_m2: 4425.24,
      situacao_recape_norm: 'GAP GRADED',
    },
    {
      id: 3,
      num_processo: '9999.2024/0030566-7',
      num_processo_normalizado: '9999.2024/30566-7',
      permissionaria: 'NORCREST/QY',
      status_grupo: 'compatibilizada',
      nome_via: null,
      trecho_de: 'Rua Pde Leão Peruche',
      trecho_ate: 'Rua Purus',
      area_m2: 8741.74,
      situacao_recape_norm: 'GAP GRADED',
    },
  ]

  it('funde as 3 vias de um mesmo processo em 1 registro', () => {
    const r = agruparGtPorProcesso(tresVias)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({
      num_processo: '9999.2024/0030566-7',
      permissionaria: 'NORCREST/QY',
      status_grupo: 'compatibilizada',
      _qtd_vias: 3,
    })
  })

  it('soma a área de todas as vias do processo', () => {
    const r = agruparGtPorProcesso(tresVias)
    expect(r[0].area_m2).toBeCloseTo(5091.12 + 4425.24 + 8741.74, 2)
  })

  it('lista as vias em _vias, preservando trecho e situação de recape individuais', () => {
    const r = agruparGtPorProcesso(tresVias)
    expect(r[0]._vias).toHaveLength(3)
    expect(r[0]._vias[1]).toMatchObject({
      trecho_de: 'Rua Purus',
      trecho_ate: 'Rua Aragão',
      area_m2: 4425.24,
      situacao_recape: 'GAP GRADED',
    })
  })

  it('processos diferentes viram registros separados', () => {
    const linhas = [
      { num_processo_normalizado: 'A', area_m2: 100 },
      { num_processo_normalizado: 'B', area_m2: 200 },
    ]
    const r = agruparGtPorProcesso(linhas)
    expect(r).toHaveLength(2)
  })

  it('linhas sem processo viram cada uma seu próprio grupo (não há como agrupar)', () => {
    const linhas = [
      { num_processo_normalizado: null, area_m2: 50 },
      { num_processo_normalizado: null, area_m2: 70 },
    ]
    const r = agruparGtPorProcesso(linhas)
    expect(r).toHaveLength(2)
    expect(r.map((x) => x.area_m2).sort()).toEqual([50, 70])
  })

  it('aceita lista vazia/nula', () => {
    expect(agruparGtPorProcesso([])).toEqual([])
    expect(agruparGtPorProcesso(null)).toEqual([])
  })
})

// ── STATUS_GRUPO_LABEL / STATUS_GRUPO_COR / STATUS_GT ─────────────────
describe('constantes de status', () => {
  it('tem os 3 grupos com rótulo e cor', () => {
    for (const grupo of ['compatibilizada', 'paralisada', 'nao_classificado']) {
      expect(STATUS_GRUPO_LABEL[grupo]).toBeTruthy()
      expect(STATUS_GRUPO_COR[grupo]).toBeTruthy()
    }
  })

  it('STATUS_GT tem os 10 valores da coluna K', () => {
    expect(STATUS_GT).toHaveLength(10)
    expect(STATUS_GT).toContain('AEO EMITIDO')
    expect(STATUS_GT).toContain('LIBERAR')
  })
})

// ── kpisGt ──────────────────────────────────────────────────────────────
describe('kpisGt', () => {
  it('calcula os 5 indicadores (D1: AEO EMITIDO/LIBERAR = compatibilizada)', () => {
    const linhas = [
      { status_grupo: 'compatibilizada', area_m2: 100 },
      { status_grupo: 'compatibilizada', area_m2: 50 },
      { status_grupo: 'paralisada', area_m2: 30 },
      { status_grupo: 'nao_classificado', area_m2: 10 },
    ]
    expect(kpisGt(linhas)).toEqual({
      total: 4,
      compatibilizadas: 2,
      paralisadas: 1,
      metragem: 150,
      pct: 50,
    })
  })

  it('metragem só soma área das compatibilizadas', () => {
    const linhas = [
      { status_grupo: 'paralisada', area_m2: 999 },
    ]
    expect(kpisGt(linhas).metragem).toBe(0)
  })

  it('lida com lista vazia', () => {
    expect(kpisGt([])).toEqual({
      total: 0,
      compatibilizadas: 0,
      paralisadas: 0,
      metragem: 0,
      pct: 0,
    })
  })

  it('processo com várias vias conta como 1 obra, não 1 por via (achado do usuário, 27/07/2026)', () => {
    const linhas = [
      { num_processo_normalizado: 'P1', status_grupo: 'compatibilizada', area_m2: 100 },
      { num_processo_normalizado: 'P1', status_grupo: 'compatibilizada', area_m2: 50 },
      { num_processo_normalizado: 'P1', status_grupo: 'compatibilizada', area_m2: 30 },
      { num_processo_normalizado: 'P2', status_grupo: 'paralisada', area_m2: 10 },
    ]
    expect(kpisGt(linhas)).toEqual({
      total: 2, // P1 (3 vias) + P2 — não 4
      compatibilizadas: 1,
      paralisadas: 1,
      metragem: 180, // soma das 3 vias de P1
      pct: 50,
    })
  })
})

// ── agregaGtPorStatusGrupo / agregaGtPorStatus ────────────────────────
describe('agregaGtPorStatusGrupo', () => {
  it('agrupa e omite baldes vazios', () => {
    const linhas = [
      { status_grupo: 'compatibilizada' },
      { status_grupo: 'compatibilizada' },
      { status_grupo: 'paralisada' },
    ]
    const r = agregaGtPorStatusGrupo(linhas)
    expect(r).toEqual([
      { grupo: 'compatibilizada', nome: 'Compatibilizada', cor: expect.any(String), qtd: 2 },
      { grupo: 'paralisada', nome: 'Paralisada', cor: expect.any(String), qtd: 1 },
    ])
  })
})

describe('agregaGtPorStatus', () => {
  it('agrupa por status individual, decrescente', () => {
    const linhas = [
      { status: 'AEO EMITIDO' },
      { status: 'AEO EMITIDO' },
      { status: 'LIBERAR' },
    ]
    expect(agregaGtPorStatus(linhas)).toEqual([
      { status: 'AEO EMITIDO', qtd: 2 },
      { status: 'LIBERAR', qtd: 1 },
    ])
  })

  it('linhas sem status caem em "Sem status"', () => {
    expect(agregaGtPorStatus([{ status: null }])).toEqual([
      { status: 'Sem status', qtd: 1 },
    ])
  })
})

// ── agregaGtPorPermissionaria / todasGtNorcrest / agregaGtPorUnidadeNorcrest ──
describe('agregaGtPorPermissionaria', () => {
  it('consolida NORCREST por padrão', () => {
    const linhas = [
      { permissionaria: 'NORCREST/QX' },
      { permissionaria: 'NORCREST/QY' },
      { permissionaria: 'HARGROVE' },
    ]
    const r = agregaGtPorPermissionaria(linhas)
    expect(r[0]).toMatchObject({ nome: 'NORCREST', total: 2 })
    expect(r[1]).toMatchObject({ nome: 'HARGROVE', total: 1 })
  })

  it('usa _permissionaria_exibir quando presente', () => {
    const r = agregaGtPorPermissionaria(
      [{ permissionaria: 'cirion planilha', _permissionaria_exibir: 'DORVAL' }],
      { consolidar: false }
    )
    expect(r).toEqual([{ nome: 'DORVAL', total: 1 }])
  })

  it('processo com várias vias conta 1 vez, não 1 por via', () => {
    const linhas = [
      { num_processo_normalizado: 'P1', permissionaria: 'HARGROVE' },
      { num_processo_normalizado: 'P1', permissionaria: 'HARGROVE' },
      { num_processo_normalizado: 'P1', permissionaria: 'HARGROVE' },
    ]
    expect(agregaGtPorPermissionaria(linhas)).toEqual([{ nome: 'HARGROVE', total: 1 }])
  })
})

describe('todasGtNorcrest', () => {
  it('verdadeiro só quando toda a lista é NORCREST', () => {
    expect(
      todasGtNorcrest([
        { _permissionaria_exibir: 'NORCREST/QX' },
        { _permissionaria_exibir: 'NORCREST/QY' },
      ])
    ).toBe(true)
    expect(
      todasGtNorcrest([{ _permissionaria_exibir: 'NORCREST/QX' }, { _permissionaria_exibir: 'HARGROVE' }])
    ).toBe(false)
  })

  it('falso para lista vazia', () => {
    expect(todasGtNorcrest([])).toBe(false)
  })
})

describe('agregaGtPorUnidadeNorcrest', () => {
  it('usa unidade_norcrest já separado pela Edge Function, agrupando via normUnidadeNorcrest', () => {
    const linhas = [
      { unidade_norcrest: 'NCRS' },
      { unidade_norcrest: 'NCRV' },
      { unidade_norcrest: 'NCJL' },
    ]
    const r = agregaGtPorUnidadeNorcrest(linhas)
    expect(r).toEqual(
      expect.arrayContaining([
        { nome: 'NCR', total: 2 },
        { nome: 'NCJ', total: 1 },
      ])
    )
  })

  it('sem unidade_norcrest cai no balde "NORCREST"', () => {
    expect(agregaGtPorUnidadeNorcrest([{ unidade_norcrest: null }])).toEqual([
      { nome: 'NORCREST', total: 1 },
    ])
  })
})

// ── agregaGtPorSubprefeitura / agregaGtPorAno / agregaGtStatusGrupoPorAno ──
describe('agregaGtPorSubprefeitura', () => {
  it('agrupa por sigla, decrescente', () => {
    const linhas = [{ subprefeitura: 'AD' }, { subprefeitura: 'AD' }, { subprefeitura: 'MP' }]
    expect(agregaGtPorSubprefeitura(linhas)).toEqual([
      { nome: 'AD', total: 2 },
      { nome: 'MP', total: 1 },
    ])
  })

  it('ignora linhas sem subprefeitura', () => {
    expect(agregaGtPorSubprefeitura([{ subprefeitura: null }])).toEqual([])
  })
})

describe('agregaGtPorAno', () => {
  it('agrupa por ano_processo, ordenado cronologicamente', () => {
    const linhas = [{ ano_processo: 2025 }, { ano_processo: 2023 }, { ano_processo: 2025 }]
    expect(agregaGtPorAno(linhas)).toEqual([
      { ano: 2023, total: 1 },
      { ano: 2025, total: 2 },
    ])
  })
})

describe('agregaGtStatusGrupoPorAno', () => {
  it('separa compatibilizada/paralisada por ano', () => {
    const linhas = [
      { ano_processo: 2026, status_grupo: 'compatibilizada' },
      { ano_processo: 2026, status_grupo: 'paralisada' },
      { ano_processo: 2025, status_grupo: 'compatibilizada' },
    ]
    expect(agregaGtStatusGrupoPorAno(linhas)).toEqual([
      { ano: 2025, compatibilizada: 1, paralisada: 0, nao_classificado: 0 },
      { ano: 2026, compatibilizada: 1, paralisada: 1, nao_classificado: 0 },
    ])
  })
})

// ── agregaGtPorTecnica ──────────────────────────────────────────────────
describe('agregaGtPorTecnica', () => {
  it('normaliza caixa (Samara/SAMARA no mesmo balde) e calcula taxa de compatibilização', () => {
    const linhas = [
      { tecnica_analise: 'Samara', status_grupo: 'compatibilizada' },
      { tecnica_analise: 'SAMARA', status_grupo: 'paralisada' },
    ]
    const r = agregaGtPorTecnica(linhas)
    expect(r).toEqual([{ tecnica: 'SAMARA', total: 2, compatibilizadas: 1, pct: 50 }])
  })

  it('ignora linhas sem técnica', () => {
    expect(agregaGtPorTecnica([{ tecnica_analise: null }])).toEqual([])
  })
})

// ── agregaGtPorSituacaoRecape ───────────────────────────────────────────
describe('agregaGtPorSituacaoRecape', () => {
  it('agrupa por situacao_recape_norm', () => {
    const linhas = [
      { situacao_recape_norm: 'CONCLUIDO' },
      { situacao_recape_norm: 'CONCLUIDO' },
      { situacao_recape_norm: null },
    ]
    expect(agregaGtPorSituacaoRecape(linhas)).toEqual([
      { situacao: 'CONCLUIDO', total: 2 },
      { situacao: 'SEM INFORMAÇÃO', total: 1 },
    ])
  })
})

// ── STATUS_GT_COR / STATUS_PENDENCIA_ESPERA (Fase 4) ────────────────────
describe('STATUS_GT_COR', () => {
  it('tem uma cor para cada um dos 10 status de STATUS_GT', () => {
    for (const status of STATUS_GT) {
      expect(STATUS_GT_COR[status], `falta cor para "${status}"`).toBeTruthy()
    }
  })
})

describe('STATUS_PENDENCIA_ESPERA', () => {
  it('as 5 chaves existem em STATUS_GT', () => {
    for (const status of Object.keys(STATUS_PENDENCIA_ESPERA)) {
      expect(STATUS_GT).toContain(status)
    }
  })
})

// ── agregaGtPorStatusEAno (Fase 4 — seção 8.2.3 do plano) ──────────────
describe('agregaGtPorStatusEAno', () => {
  it('separa por status individual dentro do mesmo ano', () => {
    const linhas = [
      { ano_processo: 2026, status: 'AGUARDANDO DELIBERAÇÃO' },
      { ano_processo: 2026, status: 'LIBERAR' },
      { ano_processo: 2026, status: 'LIBERAR' },
      { ano_processo: 2025, status: 'AGUARDANDO DELIBERAÇÃO' },
    ]
    const r = agregaGtPorStatusEAno(linhas)
    expect(r).toHaveLength(2)
    const ano2026 = r.find((x) => x.ano === 2026)
    const ano2025 = r.find((x) => x.ano === 2025)
    expect(ano2026['AGUARDANDO DELIBERAÇÃO']).toBe(1)
    expect(ano2026['LIBERAR']).toBe(2)
    expect(ano2026['CANCELADO']).toBe(0)
    expect(ano2025['AGUARDANDO DELIBERAÇÃO']).toBe(1)
  })

  it('ignora linhas sem ano ou sem status', () => {
    expect(agregaGtPorStatusEAno([{ ano_processo: null, status: 'LIBERAR' }])).toEqual([])
    expect(agregaGtPorStatusEAno([{ ano_processo: 2025, status: null }])).toEqual([])
  })
})

// ── pendenciasAcionaveisGt (Fase 4 — seção 8.2.2 do plano) ─────────────
describe('pendenciasAcionaveisGt', () => {
  it('soma qtde e metragem dos 5 status de espera, mantém as 5 linhas mesmo zeradas', () => {
    const linhas = [
      { status: 'AGUARDANDO DELIBERAÇÃO', area_m2: 100 },
      { status: 'AGUARDANDO DELIBERAÇÃO', area_m2: 50 },
      { status: 'SEGURAR', area_m2: 20 },
      { status: 'AEO EMITIDO', area_m2: 999 }, // fora do painel — ignorado
    ]
    const r = pendenciasAcionaveisGt(linhas)
    expect(r.linhas).toHaveLength(5)
    const deliberacao = r.linhas.find((l) => l.status === 'AGUARDANDO DELIBERAÇÃO')
    expect(deliberacao).toMatchObject({ qtd: 2, metragem: 150 })
    const assinatura = r.linhas.find((l) => l.status === 'AGUARDANDO ASSINATURA')
    expect(assinatura).toMatchObject({ qtd: 0, metragem: 0 })
    expect(r.totalQtd).toBe(3)
    expect(r.totalMetragem).toBe(170)
  })
})

// ── agregaGtMetragemPorStatus (Fase 4 — seção 8.2.6 do plano) ──────────
describe('agregaGtMetragemPorStatus', () => {
  it('soma area_m2 por status, decrescente', () => {
    const linhas = [
      { status: 'LIBERAR', area_m2: 100 },
      { status: 'LIBERAR', area_m2: 50 },
      { status: 'CANCELADO', area_m2: 300 },
    ]
    expect(agregaGtMetragemPorStatus(linhas)).toEqual([
      { status: 'CANCELADO', metragem: 300 },
      { status: 'LIBERAR', metragem: 150 },
    ])
  })
})

// ── matrizGtRecapeStatus / recapeConcluidoParalisadoGt (seção 8.2.5) ───
describe('matrizGtRecapeStatus', () => {
  it('cruza situação do recape × status_grupo, no nível de via', () => {
    const linhas = [
      { situacao_recape_norm: 'CONCLUIDO', status_grupo: 'paralisada' },
      { situacao_recape_norm: 'CONCLUIDO', status_grupo: 'compatibilizada' },
      { situacao_recape_norm: 'EM ANDAMENTO', status_grupo: 'paralisada' },
    ]
    const r = matrizGtRecapeStatus(linhas)
    const concluido = r.find((x) => x.situacao === 'CONCLUIDO')
    expect(concluido).toMatchObject({
      compatibilizada: 1,
      paralisada: 1,
      nao_classificado: 0,
      total: 2,
    })
  })

  it('sem situação cai em "SEM INFORMAÇÃO"', () => {
    const r = matrizGtRecapeStatus([{ situacao_recape_norm: null, status_grupo: 'paralisada' }])
    expect(r).toEqual([
      { situacao: 'SEM INFORMAÇÃO', compatibilizada: 0, paralisada: 1, nao_classificado: 0, total: 1 },
    ])
  })
})

describe('recapeConcluidoParalisadoGt', () => {
  it('conta só recape CONCLUIDO com obra paralisada (o pior caso)', () => {
    const linhas = [
      { situacao_recape_norm: 'CONCLUIDO', status_grupo: 'paralisada' },
      { situacao_recape_norm: 'CONCLUIDO', status_grupo: 'compatibilizada' },
      { situacao_recape_norm: 'EM ANDAMENTO', status_grupo: 'paralisada' },
    ]
    expect(recapeConcluidoParalisadoGt(linhas)).toBe(1)
  })
})

// ── FILTROS_VAZIOS_GT / aplicarFiltrosGt / contarFiltrosAtivosGt ───────
describe('aplicarFiltrosGt', () => {
  const linhas = [
    {
      id: 1,
      permissionaria: 'NORCREST/QX',
      _permissionaria_exibir: 'NORCREST/QX',
      status_grupo: 'compatibilizada',
      subprefeitura: 'AD',
      ano_processo: 2025,
    },
    {
      id: 2,
      permissionaria: 'HARGROVE',
      _permissionaria_exibir: 'HARGROVE',
      status_grupo: 'paralisada',
      subprefeitura: 'MP',
      ano_processo: 2026,
    },
    {
      id: 3,
      permissionaria: 'NORCREST/QY',
      _permissionaria_exibir: 'NORCREST/QY',
      status_grupo: 'compatibilizada',
      subprefeitura: 'AD',
      ano_processo: 2024,
    },
  ]

  it('sem filtros, devolve tudo', () => {
    expect(aplicarFiltrosGt(linhas, FILTROS_VAZIOS_GT)).toHaveLength(3)
  })

  it('filtra por permissionária consolidada (NORCREST pega as duas unidades)', () => {
    const r = aplicarFiltrosGt(linhas, {
      ...FILTROS_VAZIOS_GT,
      permissionarias: new Set(['NORCREST']),
    })
    expect(r.map((x) => x.id)).toEqual([1, 3])
  })

  it('filtra por grupo de status', () => {
    const r = aplicarFiltrosGt(linhas, {
      ...FILTROS_VAZIOS_GT,
      statusGrupo: new Set(['paralisada']),
    })
    expect(r.map((x) => x.id)).toEqual([2])
  })

  it('filtra por subprefeitura', () => {
    const r = aplicarFiltrosGt(linhas, {
      ...FILTROS_VAZIOS_GT,
      subprefeituras: new Set(['MP']),
    })
    expect(r.map((x) => x.id)).toEqual([2])
  })

  it('filtra por ano do processo', () => {
    const r = aplicarFiltrosGt(linhas, { ...FILTROS_VAZIOS_GT, anos: new Set([2024]) })
    expect(r.map((x) => x.id)).toEqual([3])
  })

  it('combina filtros (E lógico)', () => {
    const r = aplicarFiltrosGt(linhas, {
      ...FILTROS_VAZIOS_GT,
      permissionarias: new Set(['NORCREST']),
      subprefeituras: new Set(['AD']),
    })
    expect(r.map((x) => x.id)).toEqual([1, 3])
  })

  it('aceita lista vazia/nula', () => {
    expect(aplicarFiltrosGt([], FILTROS_VAZIOS_GT)).toEqual([])
    expect(aplicarFiltrosGt(null, FILTROS_VAZIOS_GT)).toEqual([])
  })
})

describe('contarFiltrosAtivosGt', () => {
  it('zero quando não há filtro ativo', () => {
    expect(contarFiltrosAtivosGt(FILTROS_VAZIOS_GT)).toBe(0)
  })

  it('soma o tamanho dos Sets', () => {
    const f = {
      ...FILTROS_VAZIOS_GT,
      permissionarias: new Set(['NORCREST', 'HARGROVE']),
      anos: new Set([2025]),
    }
    expect(contarFiltrosAtivosGt(f)).toBe(3)
  })
})

// ── conferirDashVsBase ──────────────────────────────────────────────────
describe('conferirDashVsBase', () => {
  it('detecta quando a soma dos 3 blocos anuais diverge do total_geral (achado real de 27/07/2026)', () => {
    const gtDash = [
      { bloco: '2023', permissionaria: 'Total Geral', tipo_linha: 'total', qtde_obras: 528, obras_compatibilizadas: 446, obras_paralisadas: 82 },
      { bloco: '2024', permissionaria: 'Total Geral', tipo_linha: 'total', qtde_obras: 754, obras_compatibilizadas: 655, obras_paralisadas: 99 },
      { bloco: '2025_2026', permissionaria: 'Total Geral', tipo_linha: 'total', qtde_obras: 1853, obras_compatibilizadas: 1408, obras_paralisadas: 445 },
      { bloco: 'total_geral', permissionaria: 'Total Geral', tipo_linha: 'total', qtde_obras: 3134, obras_compatibilizadas: 2508, obras_paralisadas: 626 },
    ]
    const divergencias = conferirDashVsBase(gtDash)
    expect(divergencias).toHaveLength(2)
    expect(divergencias).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          campo: 'Qtde de Obras',
          somaDosAnos: 3135,
          totalGeralDeclarado: 3134,
          diferenca: 1,
        }),
        expect.objectContaining({
          campo: 'Obras compatibilizadas',
          somaDosAnos: 2509,
          totalGeralDeclarado: 2508,
          diferenca: 1,
        }),
      ])
    )
  })

  it('sem divergência quando a soma bate exatamente', () => {
    const gtDash = [
      { bloco: '2023', permissionaria: 'Total Geral', tipo_linha: 'total', qtde_obras: 10, obras_compatibilizadas: 8, obras_paralisadas: 2 },
      { bloco: '2024', permissionaria: 'Total Geral', tipo_linha: 'total', qtde_obras: 10, obras_compatibilizadas: 8, obras_paralisadas: 2 },
      { bloco: '2025_2026', permissionaria: 'Total Geral', tipo_linha: 'total', qtde_obras: 10, obras_compatibilizadas: 8, obras_paralisadas: 2 },
      { bloco: 'total_geral', permissionaria: 'Total Geral', tipo_linha: 'total', qtde_obras: 30, obras_compatibilizadas: 24, obras_paralisadas: 6 },
    ]
    expect(conferirDashVsBase(gtDash)).toEqual([])
  })

  it('lida com gt_dash vazio/nulo', () => {
    expect(conferirDashVsBase([])).toEqual([])
    expect(conferirDashVsBase(null)).toEqual([])
  })

  it('acha a linha de totalização mesmo quando o texto da permissionária traz algo além de "Total Geral" (achado de 28/07/2026: match exato zerava a soma dos anos)', () => {
    const gtDash = [
      { bloco: '2023', permissionaria: 'Total Geral 2023', tipo_linha: 'total', qtde_obras: 528, obras_compatibilizadas: 446, obras_paralisadas: 82 },
      { bloco: '2024', permissionaria: 'TOTAL GERAL  ', tipo_linha: 'total', qtde_obras: 754, obras_compatibilizadas: 655, obras_paralisadas: 99 },
      { bloco: '2025_2026', permissionaria: 'Total Geral', tipo_linha: 'total', qtde_obras: 1853, obras_compatibilizadas: 1408, obras_paralisadas: 445 },
      { bloco: 'total_geral', permissionaria: 'Total Geral', tipo_linha: 'total', qtde_obras: 3135, obras_compatibilizadas: 2509, obras_paralisadas: 626 },
    ]
    expect(conferirDashVsBase(gtDash)).toEqual([])
  })
})

// ── inconsistenciasGt ───────────────────────────────────────────────────
describe('inconsistenciasGt', () => {
  it('separa sem processo, processo não encontrado e duplicados', () => {
    const linhas = cruzarGtObras(
      [
        { id: 1, num_processo_normalizado: '123' },
        { id: 2, num_processo_normalizado: '123' },
        { id: 3, num_processo_normalizado: '999' },
        { id: 4, num_processo_normalizado: null },
      ],
      [{ processo: '123' }],
      []
    )
    const r = inconsistenciasGt(linhas)
    expect(r.semProcesso.map((l) => l.id)).toEqual([4])
    expect(r.processoNaoEncontrado.map((l) => l.id)).toEqual([3])
    expect(r.duplicados.map((l) => l.id).sort()).toEqual([1, 2])
  })

  it('processo com vias DIFERENTES não é duplicado (achado do usuário, 27/07/2026)', () => {
    const linhas = cruzarGtObras(
      [
        { id: 1, num_processo_normalizado: '123', trecho_de: 'Rua A', trecho_ate: 'Rua B' },
        { id: 2, num_processo_normalizado: '123', trecho_de: 'Rua B', trecho_ate: 'Rua C' },
      ],
      [{ processo: '123' }],
      []
    )
    expect(inconsistenciasGt(linhas).duplicados).toEqual([])
  })

  it('mesmo processo E mesma via repetida continua sendo duplicado', () => {
    const linhas = cruzarGtObras(
      [
        { id: 1, num_processo_normalizado: '123', trecho_de: 'Rua A', trecho_ate: 'Rua B' },
        { id: 2, num_processo_normalizado: '123', trecho_de: 'Rua A', trecho_ate: 'Rua B' },
      ],
      [{ processo: '123' }],
      []
    )
    expect(inconsistenciasGt(linhas).duplicados.map((l) => l.id).sort()).toEqual([1, 2])
  })

  it('marca situação de recape ambígua ("... OU ...", "PLANEJADO - ...")', () => {
    const linhas = [
      { situacao_recape_norm: 'CONCLUIDO OU EM EXEC' },
      { situacao_recape_norm: 'PLANEJADO - CONCLUIDO' },
      { situacao_recape_norm: 'CONCLUIDO' },
    ]
    const r = inconsistenciasGt(linhas)
    expect(r.situacaoRecapeAmbigua).toHaveLength(2)
  })

  it('lida com lista vazia', () => {
    const r = inconsistenciasGt([])
    expect(r.semProcesso).toEqual([])
    expect(r.duplicados).toEqual([])
  })
})
