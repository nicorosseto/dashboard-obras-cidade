import { describe, it, expect } from 'vitest'
import {
  fmtMesAno,
  statusUnificado,
  normalizeStatusEmerg,
  detectarColunas,
  mapearLinhas,
  dedupPorProcesso,
  mapearObras,
  dedupPorAio,
  normProc,
  buildObrasMap,
  parseDataPrazo,
  buildPrazoRows,
  faixaAtrasoDe,
  sortPrazo,
  normSubpref,
  statusVistoriaDe,
  buildVistoriaMap,
  aplicarFiltrosEmerg,
  agregaPorStatus,
  agregaPorPermissionaria,
  agregaStatusComOutros,
  nomeCurtoPermissionaria,
  siglaSubpref,
  termoNatureza,
  agruparMotivosNatureza,
  classificarNatureza,
  agruparPorMotivo,
  resolverDefs,
  classificarMotivo,
  agruparMotivos,
  contarEmgVencidas48h,
  evolucaoMotivosPorMes,
  normNatureza,
  slugTermo,
  STATUS_FIXOS_EMERG,
  FILTROS_VAZIOS_EMERG,
  FAIXAS_ATRASO,
} from '../lib/emergencias.js'

// ── agregaStatusComOutros ───────────────────────────────────────────────
describe('agregaStatusComOutros', () => {
  const rows = [
    { status: 'Encerrada' }, { status: 'Encerrada' }, { status: 'Encerrada' },
    { status: 'Informada' }, { status: 'Informada' },
    { status: 'Cancelada' },
    { status: 'Revisão' },
    { status: 'Não Autorizada' }, { status: 'Não Autorizada' },
    { status: 'Processando' },
    { status: null },
  ]
  it('devolve os 4 status fixos na ordem definida', () => {
    const { fixos } = agregaStatusComOutros(rows)
    expect(fixos.map((f) => f.status)).toEqual(STATUS_FIXOS_EMERG)
    expect(fixos.find((f) => f.status === 'Encerrada').qtd).toBe(3)
    expect(fixos.find((f) => f.status === 'Informada').qtd).toBe(2)
    expect(fixos.find((f) => f.status === 'Cancelada').qtd).toBe(1)
    expect(fixos.find((f) => f.status === 'Revisão').qtd).toBe(1)
  })
  it('agrupa os não-fixos em "Outros" com detalhe ordenado por qtd desc', () => {
    const { outros } = agregaStatusComOutros(rows)
    expect(outros.status).toBe('Outros')
    // Não Autorizada (2) + Processando (1) + Sem status (1) = 4
    expect(outros.qtd).toBe(4)
    expect(outros.detalhe[0]).toEqual({ status: 'Não Autorizada', qtd: 2 })
    expect(outros.detalhe.map((d) => d.qtd)).toEqual([2, 1, 1])
  })
  it('fixo ausente fica com qtd 0 e Outros vazio quando só há fixos', () => {
    const { fixos, outros } = agregaStatusComOutros([{ status: 'Encerrada' }])
    expect(fixos.find((f) => f.status === 'Informada').qtd).toBe(0)
    expect(outros.qtd).toBe(0)
    expect(outros.detalhe).toEqual([])
  })
})

// ── fmtMesAno ───────────────────────────────────────────────────────────
describe('fmtMesAno', () => {
  it('formata AAAA-MM corretamente', () => {
    expect(fmtMesAno('2024-01')).toBe('jan/2024')
    expect(fmtMesAno('2024-12')).toBe('dez/2024')
    expect(fmtMesAno('2023-06')).toBe('jun/2023')
  })
  it('retorna vazio para null/undefined', () => {
    expect(fmtMesAno(null)).toBe('')
    expect(fmtMesAno(undefined)).toBe('')
    expect(fmtMesAno('')).toBe('')
  })
  it('retorna o original para mês inválido', () => {
    expect(fmtMesAno('2024-13')).toBe('2024-13')
    expect(fmtMesAno('2024-00')).toBe('2024-00')
  })
})

// ── statusUnificado ─────────────────────────────────────────────────────
describe('statusUnificado', () => {
  it('agrupa cancelamentos', () => {
    expect(statusUnificado('Cancelada')).toBe('Cancelamento')
    expect(statusUnificado('Cancelado')).toBe('Cancelamento')
    expect(statusUnificado('Não Autorizada')).toBe('Cancelamento')
    expect(statusUnificado('Nao Autorizada')).toBe('Cancelamento')
  })
  it('mapeia Encerrada e Informada corretamente', () => {
    expect(statusUnificado('Encerrada')).toBe('Obra Realizada')
    expect(statusUnificado('Informada')).toBe('Obra com Aviso de Início')
    expect(statusUnificado('Informado')).toBe('Obra Autorizada')
  })
  it('agrupa estados de pré-obra', () => {
    expect(statusUnificado('Revisão')).toBe('Pré Obra')
    expect(statusUnificado('Revisao')).toBe('Pré Obra')
    expect(statusUnificado('Processando')).toBe('Pré Obra')
    expect(statusUnificado('Processando Interferência')).toBe('Pré Obra')
    expect(statusUnificado('Processando Interferencia')).toBe('Pré Obra')
  })
  it('retorna Outros para status desconhecido', () => {
    expect(statusUnificado('XYZ Desconhecido')).toBe('Outros')
  })
  it('retorna null para entrada vazia', () => {
    expect(statusUnificado(null)).toBe(null)
    expect(statusUnificado('')).toBe(null)
  })
})

// ── normalizeStatusEmerg ────────────────────────────────────────────────
describe('normalizeStatusEmerg', () => {
  it('canoniza status conhecidos', () => {
    expect(normalizeStatusEmerg('informada')).toBe('Informada')
    expect(normalizeStatusEmerg('INFORMADA')).toBe('Informada')
    expect(normalizeStatusEmerg('  Informada  ')).toBe('Informada')
  })
  it('distingue Informada de Informado (diferem por letra)', () => {
    expect(normalizeStatusEmerg('Informada')).toBe('Informada')
    expect(normalizeStatusEmerg('Informado')).toBe('Informado')
  })
  it('normaliza variantes com e sem acento', () => {
    expect(normalizeStatusEmerg('revisao')).toBe('Revisão')
    expect(normalizeStatusEmerg('revisão')).toBe('Revisão')
    expect(normalizeStatusEmerg('nao autorizada')).toBe('Não Autorizada')
    expect(normalizeStatusEmerg('não autorizada')).toBe('Não Autorizada')
  })
  it('preserva status desconhecido como veio (com trim)', () => {
    expect(normalizeStatusEmerg('Status Novo XYZ')).toBe('Status Novo XYZ')
  })
  it('retorna null para null/undefined/vazio', () => {
    expect(normalizeStatusEmerg(null)).toBe(null)
    expect(normalizeStatusEmerg(undefined)).toBe(null)
    expect(normalizeStatusEmerg('')).toBe(null)
    expect(normalizeStatusEmerg('   ')).toBe(null)
  })
})

// ── detectarColunas ─────────────────────────────────────────────────────
describe('detectarColunas', () => {
  it('detecta colunas pelo alias exato', () => {
    const { mapeamento, faltando } = detectarColunas(['Processo', 'Status', 'Data de Cadastro'])
    expect(mapeamento.num_processo).toBe('Processo')
    expect(mapeamento.status).toBe('Status')
    expect(mapeamento.data_cadastro).toBe('Data de Cadastro')
    expect(faltando).toHaveLength(0)
  })
  it('é case-insensitive e remove espaços extras', () => {
    const { mapeamento, faltando } = detectarColunas(['PROCESSO', '  status  '])
    expect(mapeamento.num_processo).toBe('PROCESSO')
    expect(mapeamento.status).toBe('  status  ')
    expect(faltando).toHaveLength(0)
  })
  it('reporta coluna obrigatória faltando', () => {
    const { faltando } = detectarColunas(['Status', 'Etapa'])
    expect(faltando).toContain('num_processo')
  })
  it('aceita alias "Código AIO"', () => {
    const { mapeamento } = detectarColunas(['Código AIO'])
    expect(mapeamento.num_processo).toBe('Código AIO')
  })
})

// ── mapearLinhas ────────────────────────────────────────────────────────
describe('mapearLinhas', () => {
  const mapeamento = { num_processo: 'proc', status: 'status', data_cadastro: 'dt', etapa: null, permissionaria: 'perm', subprefeitura: 'sub' }

  it('mapeia linhas corretamente', () => {
    const rows = [{ proc: '123', status: 'Informada', dt: '2024-01-15', perm: 'NORCREST', sub: 'AD' }]
    const result = mapearLinhas(rows, mapeamento)
    expect(result).toHaveLength(1)
    expect(result[0].num_processo).toBe('123')
    expect(result[0].status).toBe('Informada')
    expect(result[0].status_unificado).toBe('Obra com Aviso de Início')
    expect(result[0].permissionaria).toBe('NORCREST')
  })
  it('filtra linhas sem num_processo', () => {
    const rows = [
      { proc: '', status: 'Informada' },
      { proc: null, status: 'Informada' },
      { proc: '999', status: 'Encerrada' },
    ]
    const result = mapearLinhas(rows, mapeamento)
    expect(result).toHaveLength(1)
    expect(result[0].num_processo).toBe('999')
  })
})

// ── dedupPorProcesso ────────────────────────────────────────────────────
describe('dedupPorProcesso', () => {
  it('mantém a linha com data_cadastro mais recente', () => {
    const linhas = [
      { num_processo: 'A', data_cadastro: '2024-01-10', status: 'Informada' },
      { num_processo: 'A', data_cadastro: '2024-06-01', status: 'Encerrada' },
    ]
    const result = dedupPorProcesso(linhas)
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('Encerrada')
  })
  it('mantém linhas sem data (não descarta)', () => {
    const linhas = [
      { num_processo: 'B', data_cadastro: null, status: 'Informada' },
      { num_processo: 'C', data_cadastro: '2024-01-01', status: 'Encerrada' },
    ]
    const result = dedupPorProcesso(linhas)
    expect(result).toHaveLength(2)
  })
  it('preserva unicidade de processos distintos', () => {
    const linhas = [
      { num_processo: 'X', data_cadastro: '2024-01-01' },
      { num_processo: 'Y', data_cadastro: '2024-01-01' },
    ]
    expect(dedupPorProcesso(linhas)).toHaveLength(2)
  })
})

// ── dedupPorAio ─────────────────────────────────────────────────────────
describe('dedupPorAio', () => {
  it('prefere linha com data_inicio_obra', () => {
    const linhas = [
      { codigo_aio: '100', data_inicio_obra: null },
      { codigo_aio: '100', data_inicio_obra: '2024-03-01' },
    ]
    const result = dedupPorAio(linhas)
    expect(result).toHaveLength(1)
    expect(result[0].data_inicio_obra).toBe('2024-03-01')
  })
  it('mantém linhas de AIOs distintos', () => {
    const linhas = [
      { codigo_aio: '100', data_inicio_obra: '2024-01-01' },
      { codigo_aio: '200', data_inicio_obra: '2024-01-01' },
    ]
    expect(dedupPorAio(linhas)).toHaveLength(2)
  })
})

// ── normProc ────────────────────────────────────────────────────────────
describe('normProc', () => {
  it('remove zeros à esquerda e faz uppercase', () => {
    expect(normProc('00123')).toBe('123')
    expect(normProc('abc')).toBe('ABC')
    expect(normProc('0001abc')).toBe('1ABC')
  })
  it('trata null/undefined como string vazia', () => {
    expect(normProc(null)).toBe('')
    expect(normProc(undefined)).toBe('')
  })
  it('não altera processo SEI com zeros no meio', () => {
    expect(normProc('6012.2020/0001234-5')).toBe('6012.2020/0001234-5')
  })
  it('remove zeros à esquerda de número puro', () => {
    expect(normProc('007')).toBe('7')
    expect(normProc('148923756')).toBe('148923756')
  })
})

// ── buildObrasMap ───────────────────────────────────────────────────────
describe('buildObrasMap', () => {
  it('indexa por normProc(codigo_aio)', () => {
    const obras = [{ codigo_aio: '00123', data_inicio_obra: '2024-01-01' }]
    const m = buildObrasMap(obras)
    expect(m.has('123')).toBe(true)
    expect(m.get('123').data_inicio_obra).toBe('2024-01-01')
  })
  it('prefere registro com data_inicio_obra', () => {
    const obras = [
      { codigo_aio: '100', data_inicio_obra: null },
      { codigo_aio: '100', data_inicio_obra: '2024-06-01' },
    ]
    const m = buildObrasMap(obras)
    expect(m.get('100').data_inicio_obra).toBe('2024-06-01')
  })
  it('aceita array vazio e null', () => {
    expect(buildObrasMap([])).toBeInstanceOf(Map)
    expect(buildObrasMap(null)).toBeInstanceOf(Map)
  })
})

// ── parseDataPrazo ──────────────────────────────────────────────────────
describe('parseDataPrazo', () => {
  it('retorna Date UTC ao meio-dia para data ISO', () => {
    const d = parseDataPrazo('2024-06-15')
    expect(d).toBeInstanceOf(Date)
    expect(d.getUTCFullYear()).toBe(2024)
    expect(d.getUTCMonth()).toBe(5) // junho = 5
    expect(d.getUTCDate()).toBe(15)
    expect(d.getUTCHours()).toBe(12)
  })
  it('retorna null para entrada inválida', () => {
    expect(parseDataPrazo(null)).toBe(null)
    expect(parseDataPrazo('')).toBe(null)
    expect(parseDataPrazo('invalido')).toBe(null)
  })
})

// ── buildPrazoRows ──────────────────────────────────────────────────────
describe('buildPrazoRows', () => {
  const obrasMap = new Map([
    ['123', { data_inicio_obra: '2024-06-01', data_fim_obra: '2024-07-01' }],
  ])
  const agoraVencido = new Date('2024-06-10T12:00:00Z').getTime() // 9 dias após início
  const agoraDentroPrazo = new Date('2024-06-02T00:00:00Z').getTime() // 1 dia após início

  it('marca vencido quando Informada e ultrapassou 48h', () => {
    const linhas = [{ num_processo: '123', status: 'Informada', data_cadastro: '2024-01-01' }]
    const rows = buildPrazoRows(linhas, obrasMap, null, agoraVencido)
    expect(rows[0]._vencido).toBe(true)
    expect(rows[0]._estimado).toBe(false)
    expect(rows[0]._tipo_atraso).toBe('real')
    expect(rows[0]._dias_atraso).toBeGreaterThan(0)
  })
  it('não marca vencido quando dentro do prazo', () => {
    const linhas = [{ num_processo: '123', status: 'Informada', data_cadastro: '2024-01-01' }]
    const rows = buildPrazoRows(linhas, obrasMap, null, agoraDentroPrazo)
    expect(rows[0]._vencido).toBe(false)
    expect(rows[0]._situacao).toBe('Dentro do prazo')
  })
  it('usa data_cadastro como fallback quando sem obra (estimado)', () => {
    const semObras = new Map()
    const linhas = [{ num_processo: '999', status: 'Informada', data_cadastro: '2024-06-01' }]
    const rows = buildPrazoRows(linhas, semObras, null, agoraVencido)
    expect(rows[0]._estimado).toBe(true)
    expect(rows[0]._tipo_atraso).toBe('estimado')
    expect(rows[0]._vencido).toBe(true)
  })
  it('não vence se status não é Informada', () => {
    const linhas = [{ num_processo: '123', status: 'Encerrada', data_cadastro: '2024-01-01' }]
    const rows = buildPrazoRows(linhas, obrasMap, null, agoraVencido)
    expect(rows[0]._vencido).toBe(false)
  })
  it('_situacao é Dentro do prazo se não avaliável (sem data)', () => {
    const semObras = new Map()
    const linhas = [{ num_processo: '999', status: 'Informada', data_cadastro: null }]
    const rows = buildPrazoRows(linhas, semObras, null, agoraVencido)
    expect(rows[0]._prazo_ms).toBe(null)
    expect(rows[0]._vencido).toBe(false)
  })
})

// ── faixaAtrasoDe ───────────────────────────────────────────────────────
describe('faixaAtrasoDe', () => {
  it('retorna null para dias null', () => {
    expect(faixaAtrasoDe(null)).toBe(null)
  })
  it('cobre todas as faixas do FAIXAS_ATRASO', () => {
    expect(faixaAtrasoDe(0)).toBe('0-2')
    expect(faixaAtrasoDe(2)).toBe('0-2')
    expect(faixaAtrasoDe(3)).toBe('3-7')
    expect(faixaAtrasoDe(7)).toBe('3-7')
    expect(faixaAtrasoDe(8)).toBe('8-30')
    expect(faixaAtrasoDe(30)).toBe('8-30')
    expect(faixaAtrasoDe(31)).toBe('31+')
    expect(faixaAtrasoDe(999)).toBe('31+')
  })
})

// ── sortPrazo ───────────────────────────────────────────────────────────
describe('sortPrazo', () => {
  const rows = [
    { nome: 'Carlos', dias: 10 },
    { nome: 'Ana', dias: null },
    { nome: 'Beatriz', dias: 5 },
  ]
  it('ordena strings asc', () => {
    const sorted = sortPrazo(rows, 'nome', 'asc', 'str')
    expect(sorted[0].nome).toBe('Ana')
    expect(sorted[2].nome).toBe('Carlos')
  })
  it('ordena strings desc', () => {
    const sorted = sortPrazo(rows, 'nome', 'desc', 'str')
    expect(sorted[0].nome).toBe('Carlos')
  })
  it('ordena números tratando null como -Infinity (asc)', () => {
    const sorted = sortPrazo(rows, 'dias', 'asc', 'num')
    expect(sorted[0].dias).toBe(null)
    expect(sorted[1].dias).toBe(5)
    expect(sorted[2].dias).toBe(10)
  })
  it('não muta o array original', () => {
    const original = [...rows]
    sortPrazo(rows, 'nome', 'desc', 'str')
    expect(rows[0].nome).toBe(original[0].nome)
  })
})

// ── normSubpref ──────────────────────────────────────────────────────────
describe('normSubpref', () => {
  it('converte GU para G', () => {
    expect(normSubpref('GU')).toBe('G')
  })
  it('passa siglas sem alias como estão', () => {
    expect(normSubpref('AD')).toBe('AD')
    expect(normSubpref('MP')).toBe('MP')
  })
})

// ── statusVistoriaDe ─────────────────────────────────────────────────────
describe('statusVistoriaDe', () => {
  it('retorna Legislação Atendida quando flag ativa', () => {
    expect(statusVistoriaDe({ legislacao_atendida: true })).toBe('Legislação Atendida')
  })
  it('distingue NC por estado', () => {
    expect(statusVistoriaDe({ tem_nao_conformidade: true, solucionado: true })).toBe('Solucionado')
    expect(statusVistoriaDe({ tem_nao_conformidade: true, em_andamento: true })).toBe('Em Andamento')
    expect(statusVistoriaDe({ tem_nao_conformidade: true })).toBe('Não Conformidade')
  })
  it('usa status_simplificado como fallback', () => {
    expect(statusVistoriaDe({ status_simplificado: 'Em andamento' })).toBe('Em andamento')
  })
  it('retorna — se nenhum flag ativo', () => {
    expect(statusVistoriaDe({})).toBe('—')
  })
})

// ── buildVistoriaMap ─────────────────────────────────────────────────────
describe('buildVistoriaMap', () => {
  it('indexa por normProc(id_origem)', () => {
    const fisc = [{ id_origem: '00123', data_inicio: '2024-01-01', tem_nao_conformidade: true }]
    const m = buildVistoriaMap(fisc)
    expect(m.has('123')).toBe(true)
  })
  it('mantém laudo mais recente quando há duplicata', () => {
    const fisc = [
      { id_origem: '123', data_inicio: '2024-01-01', status_simplificado: 'Antigo' },
      { id_origem: '123', data_inicio: '2024-06-01', status_simplificado: 'Novo' },
    ]
    const m = buildVistoriaMap(fisc)
    expect(m.get('123').status_simplificado).toBe('Novo')
  })
  it('retorna Map vazio para array vazio ou não-array', () => {
    expect(buildVistoriaMap([])).toBeInstanceOf(Map)
    expect(buildVistoriaMap(null)).toBeInstanceOf(Map)
  })
})

// ── aplicarFiltrosEmerg ──────────────────────────────────────────────────
describe('aplicarFiltrosEmerg', () => {
  const rows = [
    { num_processo: '1', status: 'Informada', data_cadastro: '2024-01-15', permissionaria: 'NORCREST BS' },
    { num_processo: '2', status: 'Encerrada', data_cadastro: '2024-03-10', permissionaria: 'HARGROVE' },
    { num_processo: '3', status: 'Informada', data_cadastro: '2024-05-20', permissionaria: 'NORCREST CS' },
  ]

  it('sem filtros retorna tudo', () => {
    expect(aplicarFiltrosEmerg(rows, FILTROS_VAZIOS_EMERG)).toHaveLength(3)
  })
  it('filtra por data de início', () => {
    const f = { ...FILTROS_VAZIOS_EMERG, dataIni: '2024-03-01' }
    const res = aplicarFiltrosEmerg(rows, f)
    expect(res.map((r) => r.num_processo)).toEqual(['2', '3'])
  })
  it('filtra por data de fim', () => {
    const f = { ...FILTROS_VAZIOS_EMERG, dataFim: '2024-01-31' }
    const res = aplicarFiltrosEmerg(rows, f)
    expect(res).toHaveLength(1)
    expect(res[0].num_processo).toBe('1')
  })
  it('filtra por permissionária exata', () => {
    const f = { ...FILTROS_VAZIOS_EMERG, permissionarias: new Set(['HARGROVE']) }
    const res = aplicarFiltrosEmerg(rows, f)
    expect(res).toHaveLength(1)
    expect(res[0].permissionaria).toBe('HARGROVE')
  })
  it('filtra NORCREST (consolidado) — inclui todas as unidades NORCREST', () => {
    const f = { ...FILTROS_VAZIOS_EMERG, permissionarias: new Set(['NORCREST']) }
    const res = aplicarFiltrosEmerg(rows, f)
    expect(res).toHaveLength(2)
    expect(res.every((r) => r.permissionaria.startsWith('NORCREST'))).toBe(true)
  })
})

// ── agregaPorStatus ──────────────────────────────────────────────────────
describe('agregaPorStatus', () => {
  it('conta por status', () => {
    const rows = [
      { status: 'Informada' },
      { status: 'Informada' },
      { status: 'Encerrada' },
      { status: null },
    ]
    const res = agregaPorStatus(rows)
    const inf = res.find((r) => r.status === 'Informada')
    const enc = res.find((r) => r.status === 'Encerrada')
    expect(inf?.qtd).toBe(2)
    expect(enc?.qtd).toBe(1)
  })
})

// ── agregaPorPermissionaria ──────────────────────────────────────────────
describe('agregaPorPermissionaria', () => {
  it('consolida NORCREST por padrão', () => {
    const rows = [
      { permissionaria: 'NORCREST BS', status: 'Informada' },
      { permissionaria: 'NORCREST CS', status: 'Informada' },
      { permissionaria: 'HARGROVE', status: 'Informada' },
    ]
    const res = agregaPorPermissionaria(rows, { consolidar: true })
    const sab = res.find((r) => r.nome === 'NORCREST')
    expect(sab?.total).toBe(2)
  })
  it('não consolida quando consolidar=false', () => {
    const rows = [
      { permissionaria: 'NORCREST BS', status: 'Informada' },
      { permissionaria: 'NORCREST CS', status: 'Informada' },
    ]
    const res = agregaPorPermissionaria(rows, { consolidar: false })
    const sab = res.find((r) => r.nome === 'NORCREST')
    expect(sab).toBeUndefined()
    expect(res).toHaveLength(2)
  })
})

// ── nomeCurtoPermissionaria ─────────────────────────────────────────────
describe('nomeCurtoPermissionaria', () => {
  it('reconhece NORCREST e preserva a unidade regional', () => {
    expect(nomeCurtoPermissionaria('Companhia de Saneamento Básico do Estado de São Paulo/MLG'))
      .toBe('NORCREST/MLG')
  })
  it('reconhece WINSLOW sem unidade', () => {
    expect(nomeCurtoPermissionaria('Companhia de Gás de São Paulo')).toBe('WINSLOW')
  })
  it('remove ruído corporativo (Ltda, S/A, Comunicações)', () => {
    expect(nomeCurtoPermissionaria('Claro Telecomunicações Ltda')).toBe('Claro')
    expect(nomeCurtoPermissionaria('Velmont Comunicações S.A.')).toBe('Velmont')
    expect(nomeCurtoPermissionaria('Astrix Celular S/A')).toBe('Astrix Celular')
  })
  it('não captura o "A" de S/A como unidade regional', () => {
    expect(nomeCurtoPermissionaria('Foo Bar S/A')).toBe('Foo Bar')
  })
  it('é idempotente para nomes já tratados', () => {
    expect(nomeCurtoPermissionaria('NORCREST/MN')).toBe('NORCREST/MN')
    expect(nomeCurtoPermissionaria('WINSLOW')).toBe('WINSLOW')
  })
  it('mantém valores vazios/nulos', () => {
    expect(nomeCurtoPermissionaria('')).toBe('')
    expect(nomeCurtoPermissionaria(null)).toBe(null)
  })
})

// ── siglaSubpref ────────────────────────────────────────────────────────
describe('siglaSubpref', () => {
  it('converte nome (GeoJSON e oficial) em sigla', () => {
    expect(siglaSubpref('São Mateus')).toBe('SM')
    expect(siglaSubpref('São Miguel')).toBe('MP')
    expect(siglaSubpref('Pirituba-Jaraguá')).toBe('PJ')
    expect(siglaSubpref('Pirituba/Jaraguá')).toBe('PJ')
    expect(siglaSubpref('Aricanduva-Formosa-Carrão')).toBe('AF')
  })
  it('aceita grafias divergentes (Guaianases/Guaianazes) e alias GU→G', () => {
    expect(siglaSubpref('Guaianases')).toBe('G')
    expect(siglaSubpref('Guaianazes')).toBe('G')
    expect(siglaSubpref('GU')).toBe('G')
  })
  it('mantém a sigla quando já é sigla', () => {
    expect(siglaSubpref('SE')).toBe('SE')
  })
  it('mantém o valor original quando não reconhece', () => {
    expect(siglaSubpref('Foo Inexistente')).toBe('Foo Inexistente')
  })
})

// ── termoNatureza ───────────────────────────────────────────────────────
describe('termoNatureza', () => {
  it('extrai a palavra-cabeça ignorando endereço e número', () => {
    expect(termoNatureza('MANUTENÇÃO EM REDE DE ÁGUA - OS 2623889270 - AVENIDA VITAL BRASIL, 991')).toBe('manutencao')
    expect(termoNatureza('TRATA-SE DE MANUTENÇÃO EMERGENCIAL NA REDE DE ESGOTO NA AVENIDA ATLANTIVA 0')).toBe('manutencao')
    expect(termoNatureza('REPOR CAPA ASFALTICA /AVENIDA ELLIS MAAS NÚMERO 355')).toBe('repor')
    expect(termoNatureza('NIVELAR PV')).toBe('nivelar')
  })
  it('retorna null para vazio/sem termo', () => {
    expect(termoNatureza('')).toBe(null)
    expect(termoNatureza(null)).toBe(null)
    expect(termoNatureza('- 123 / 456')).toBe(null)
  })
})

// ── agruparMotivosNatureza ──────────────────────────────────────────────
describe('agruparMotivosNatureza', () => {
  const itens = [
    { codigo_aio: '1', natureza: 'NIVELAR PV', origem: 'Planilha' },
    { codigo_aio: '2', natureza: 'MANUTENÇÃO EM REDE DE ÁGUA - OS 123 - AVENIDA X', origem: 'Planilha' },
    { codigo_aio: '3', natureza: 'TRATA-SE DE MANUTENÇÃO EMERGENCIAL NA REDE DE ESGOTO NA AVENIDA Y', origem: 'Obras' },
    { codigo_aio: '4', natureza: 'REPOR CAPA ASFALTICA /AVENIDA ELLIS MAAS 355', origem: 'Planilha' },
    { codigo_aio: '5', natureza: 'REPOR CAPA ASFALTICA', origem: 'Obras' },
  ]
  it('agrupa por palavra-cabeça e ordena por quantidade', () => {
    const g = agruparMotivosNatureza(itens)
    const manut = g.find((x) => x.key === 'manutencao')
    const repor = g.find((x) => x.key === 'repor')
    const niv = g.find((x) => x.key === 'nivelar')
    expect(manut.qtd).toBe(2)
    expect(repor.qtd).toBe(2)
    expect(niv.qtd).toBe(1)
    // os dois primeiros (empate em 2) vêm antes do nivelar (1)
    expect(g[g.length - 1].key).toBe('nivelar')
  })
  it('usa o maior trecho inicial comum como rótulo', () => {
    const g = agruparMotivosNatureza(itens)
    expect(g.find((x) => x.key === 'repor').label).toBe('Repor capa asfaltica')
    expect(g.find((x) => x.key === 'manutencao').label).toBe('Manutenção')
  })
  it('respeita o limite de grupos', () => {
    // 20 termos-cabeça distintos (sem dígitos, que o extrator descarta)
    const muitos = Array.from({ length: 20 }, (_, i) => ({ codigo_aio: String(i), natureza: `TERMO${String.fromCharCode(65 + i)} ALGO`, origem: 'Planilha' }))
    expect(agruparMotivosNatureza(muitos, 5)).toHaveLength(5)
  })
  it('guarda os itens de cada grupo (para o modal)', () => {
    const g = agruparMotivosNatureza(itens)
    expect(g.find((x) => x.key === 'manutencao').itens.map((i) => i.codigo_aio).sort()).toEqual(['2', '3'])
  })
})

// ── classificarNatureza (v2) ────────────────────────────────────────────
describe('classificarNatureza', () => {
  it('acha a ação mesmo quando o texto começa pelo endereço (resolve "Rua")', () => {
    const c = classificarNatureza('RUA ENGENEIRO SILVA BRAGA 226 Vila Brasilina VAZAMENTO DE ÁGUA')
    expect(c.termo).toBe('vazamento')
    expect(c.invalidoPadrao).toBe(false)
    expect(c.descoberto).toBe(false)
  })
  it('marca obra programada como inválida por padrão (heurística)', () => {
    expect(classificarNatureza('MANUTENÇÃO EM REDE DE ÁGUA - OS 123 - AV X').invalidoPadrao).toBe(true)
    expect(classificarNatureza('REPOR CAPA ASFALTICA /AV Y').termo).toBe('recape')
    expect(classificarNatureza('REPOR CAPA ASFALTICA /AV Y').invalidoPadrao).toBe(true)
    expect(classificarNatureza('NIVELAR PV').termo).toBe('nivelamento')
    expect(classificarNatureza('AMPLIAÇÃO DE REDE DE ÁGUA').invalidoPadrao).toBe(true)
  })
  it('classifica reparo/conserto/troca como válidos por padrão', () => {
    expect(classificarNatureza('RUA X REPARO DE RAMAL DE ESGOTO').termo).toBe('reparo')
    expect(classificarNatureza('RUA X CONSERTAR RAMAL DE ESGOTO').termo).toBe('conserto')
    expect(classificarNatureza('RUA X TROCA DE RAMAL DE ESGOTO').termo).toBe('troca')
    expect(classificarNatureza('RUA X REPARO DE RAMAL').invalidoPadrao).toBe(false)
  })
  it('retorna null para vazio', () => {
    expect(classificarNatureza('')).toBe(null)
    expect(classificarNatureza(null)).toBe(null)
  })
})

// ── agruparPorMotivo (v2) ───────────────────────────────────────────────
describe('agruparPorMotivo', () => {
  const itens = [
    { codigo_aio: '1', natureza: 'RUA A VAZAMENTO DE ÁGUA' },
    { codigo_aio: '2', natureza: 'RUA B VAZAMENTO DE ÁGUA LEITO PAVIMENTADO' },
    { codigo_aio: '3', natureza: 'MANUTENÇÃO EM REDE - OS 9 - AV C' },
    { codigo_aio: '4', natureza: 'REPOR CAPA ASFALTICA /AV D' },
  ]
  it('agrupa por termo e aplica palpite de invalidez', () => {
    const g = agruparPorMotivo(itens)
    const vaz = g.find((x) => x.termo === 'vazamento')
    const man = g.find((x) => x.termo === 'manutencao')
    expect(vaz.qtd).toBe(2)
    expect(vaz.invalido).toBe(false)
    expect(man.invalido).toBe(true)        // heurística
    expect(g.every((x) => x.classificado === false)).toBe(true)
  })
  it('a classificação salva sobrepõe o palpite', () => {
    const classifMap = new Map([['vazamento', { invalido: true }], ['manutencao', { invalido: false }]])
    const g = agruparPorMotivo(itens, classifMap)
    expect(g.find((x) => x.termo === 'vazamento').invalido).toBe(true)
    expect(g.find((x) => x.termo === 'vazamento').classificado).toBe(true)
    expect(g.find((x) => x.termo === 'manutencao').invalido).toBe(false)
    expect(g.find((x) => x.termo === 'recape').classificado).toBe(false) // não salvo
  })
})

// ── Editor v3: resolverDefs / classificarMotivo / agruparMotivos ─────────
describe('motivo v3 — override, palavras-chave, fundir, excluir', () => {
  const itens = [
    { codigo_aio: '1', natureza: 'RUA A VAZAMENTO DE ÁGUA' },
    { codigo_aio: '2', natureza: 'RUA B CONSERTAR RAMAL DE ESGOTO' },
    { codigo_aio: '3', natureza: 'MANUTENÇÃO EM REDE - OS 9' },
    { codigo_aio: '4', natureza: 'TAPA BURACO NA PISTA' },
  ]

  it('normNatureza e slugTermo normalizam corretamente', () => {
    expect(normNatureza('  Vazamento  de   Água ')).toBe('VAZAMENTO DE AGUA')
    expect(slugTermo('Tapa-buraco / Recape')).toBe('tapa_buraco_recape')
  })

  it('base: agrupa por vocabulário + descoberta', () => {
    const defs = resolverDefs([])
    const g = agruparMotivos(itens, { overrideMap: new Map(), defs, savedTermos: new Set() })
    expect(g.find((x) => x.termo === 'vazamento').qtd).toBe(1)
    expect(g.find((x) => x.termo === 'manutencao').invalido).toBe(true)
    expect(g.every((x) => x.classificado === false)).toBe(true)
  })

  it('override de texto move o processo para outro grupo', () => {
    const defs = resolverDefs([])
    const overrideMap = new Map([[normNatureza('RUA A VAZAMENTO DE ÁGUA'), 'manutencao']])
    const g = agruparMotivos(itens, { overrideMap, defs, savedTermos: new Set() })
    expect(g.find((x) => x.termo === 'manutencao').itens.map((i) => i.codigo_aio).sort()).toEqual(['1', '3'])
    expect(g.find((x) => x.termo === 'vazamento')).toBeUndefined()
  })

  it('palavra-chave de usuário captura o texto (novo grupo)', () => {
    const defs = resolverDefs([{ termo: 'tapa_buraco', rotulo: 'Tapa-buraco', invalido: true, palavras: ['tapa buraco'] }])
    const r = classificarMotivo('TAPA BURACO NA PISTA', { overrideMap: new Map(), defs })
    expect(r.termo).toBe('tapa_buraco')
  })

  it('fundir (alias) redireciona sem vazar para outro vocábulo', () => {
    const defs = resolverDefs([{ termo: 'conserto', rotulo: 'Conserto', alias_de: 'reparo' }])
    const r = classificarMotivo('RUA B CONSERTAR RAMAL DE ESGOTO', { overrideMap: new Map(), defs })
    expect(r.termo).toBe('reparo')   // não "ramal"
  })

  it('excluir (arquivar) suprime o grupo: vai pro próximo termo ou some', () => {
    const defs = resolverDefs([{ termo: 'vazamento', rotulo: 'Vazamento', arquivado: true }])
    // só "VAZAMENTO DE AGUA": sem outro termo, fica sem classificação
    expect(classificarMotivo('VAZAMENTO DE AGUA', { overrideMap: new Map(), defs })).toBe(null)
    // "VAZAMENTO ... REPARO": cai em reparo (vazamento arquivado)
    expect(classificarMotivo('VAZAMENTO E REPARO DE RAMAL', { overrideMap: new Map(), defs }).termo).toBe('reparo')
  })

  it('savedTermos marca o grupo como classificado (sem pendência)', () => {
    const defs = resolverDefs([{ termo: 'vazamento', rotulo: 'Vazamento', invalido: false }])
    const g = agruparMotivos(itens, { overrideMap: new Map(), defs, savedTermos: new Set(['vazamento']) })
    expect(g.find((x) => x.termo === 'vazamento').classificado).toBe(true)
    expect(g.find((x) => x.termo === 'manutencao').classificado).toBe(false)
  })
})

// ── evolucaoMotivosPorMes ───────────────────────────────────────────────
describe('evolucaoMotivosPorMes', () => {
  it('agrupa por mês do _data_base em ordem cronológica', () => {
    const proc = [
      { _data_base: '2020-03-10' }, { _data_base: '2020-03-25' },
      { _data_base: '2020-01-05' }, { _data_base: null },
      { _data_base: '2021-12-31' },
    ]
    const r = evolucaoMotivosPorMes(proc)
    expect(r).toEqual([
      { mes: '2020-01', qtd: 1 },
      { mes: '2020-03', qtd: 2 },
      { mes: '2021-12', qtd: 1 },
    ])
  })
  it('devolve vazio sem datas', () => {
    expect(evolucaoMotivosPorMes([{ _data_base: null }])).toEqual([])
    expect(evolucaoMotivosPorMes([])).toEqual([])
  })
})

// ── contarEmgVencidas48h ─────────────────────────────────────────────────
describe('contarEmgVencidas48h', () => {
  const AGORA = Date.UTC(2026, 0, 10, 12, 0, 0) // 10/01/2026 12h UTC

  it('conta só "Informada" com prazo (data_inicio_obra + 48h) já vencido', () => {
    const linhas = [
      { status: 'Informada', num_processo: '111', data_cadastro: '2026-01-01' },
      { status: 'Solucionado', num_processo: '222', data_cadastro: '2026-01-01' },
    ]
    const obras = [{ codigo_aio: '111', data_inicio_obra: '2026-01-07' }] // vence 09/01 12h
    expect(contarEmgVencidas48h(linhas, obras, AGORA)).toBe(1)
  })

  it('usa data_cadastro como fallback quando não há posicionamento', () => {
    const linhas = [{ status: 'Informada', num_processo: '333', data_cadastro: '2026-01-07' }]
    expect(contarEmgVencidas48h(linhas, [], AGORA)).toBe(1)
  })

  it('não conta quando ainda dentro do prazo', () => {
    const linhas = [{ status: 'Informada', num_processo: '444', data_cadastro: '2026-01-09' }]
    expect(contarEmgVencidas48h(linhas, [], AGORA)).toBe(0)
  })

  it('ignora linha sem nenhuma data-base', () => {
    const linhas = [{ status: 'Informada', num_processo: '555', data_cadastro: null }]
    expect(contarEmgVencidas48h(linhas, [], AGORA)).toBe(0)
  })

  it('retorna 0 para lista vazia', () => {
    expect(contarEmgVencidas48h([], [], AGORA)).toBe(0)
  })
})
