// Testes das funções puras do módulo Apresentação (src/lib/relatorio.js).
// Segue o padrão de src/tests/emergencias.test.js: fixtures pequenas por caso.
import { describe, it, expect } from 'vitest'
import {
  CATEGORIA,
  MODELO_INSTITUCIONAL,
  listaPermissionariasRelatorio,
  normUnidadeNorcrest,
  resolverDadosSlide,
  enriquecerExport,
  mesFimTrimestre,
  completude,
} from '../lib/relatorio.js'

// ── Fixtures mínimas ──────────────────────────────────────────────────
// A classificação Emergência/Corretiva vem do TIPO DE PROCESSO (catálogo 08),
// como no banco real — tipo_obra é outro eixo e fica de fora de propósito.
const GEO = [
  { permissionaria: 'NORCREST - NCR', executora: 'Alfa Engenharia', subprefeitura: 'SE', data_cadastro: '2025-03-10', tipo_processo: 'EMERGENCIA', tipo_processo_nome: 'Emergência', id_origem: 'P1' },
  { permissionaria: 'NORCREST - NCJ', executora: 'alfa engenharia', subprefeitura: 'PI', data_cadastro: '2025-04-02', tipo_processo: 'EMERGENCIA', tipo_processo_nome: 'Emergência' },
  { permissionaria: 'WINSLOW', executora: 'Beta Obras', subprefeitura: 'SE', data_cadastro: '2024-05-20', tipo_processo: 'MANUTENCAO_CORRETIVA', tipo_processo_nome: 'Manutenção Corretiva' },
  { permissionaria: 'HARGROVE', executora: '', subprefeitura: 'PA', data_cadastro: '2024-06-01', tipo_processo: 'RADAR', tipo_processo_nome: 'Radar' },
]

const FISC = [
  { permissionaria: 'NORCREST - NCRV', id_origem: 'V1', area_m2: 100, legislacao_atendida: true, tem_nao_conformidade: false, solucionado: false, em_andamento: false, classificacao_viaria: 'LOCAL', data_inicio: '2025-01-15' },
  { permissionaria: 'NORCREST - NCRV', id_origem: 'V2', area_m2: 50, legislacao_atendida: false, tem_nao_conformidade: true, solucionado: true, em_andamento: false, classificacao_viaria: 'LOCAL', data_inicio: '2025-02-10', data_conclusao: '2025-03-01' },
  { permissionaria: 'WINSLOW', id_origem: 'V3', area_m2: 30, legislacao_atendida: false, tem_nao_conformidade: true, solucionado: false, em_andamento: true, classificacao_viaria: 'ARTERIAL', data_inicio: '2025-02-20' },
  { permissionaria: 'WINSLOW', id_origem: 'V3', area_m2: 20, legislacao_atendida: true, tem_nao_conformidade: false, solucionado: false, em_andamento: false, classificacao_viaria: 'Coletora', data_inicio: '2024-11-05' },
]

// Na base de Emergências a permissionária vem com o nome COMPLETO da
// companhia e a unidade num sufixo "/XXX" (como na planilha real).
const NORCREST_LONGO = 'COMPANHIA DE SANEAMENTO BASICO DO ESTADO DE SAO PAULO S/A'
const EMERG = [
  { permissionaria: `${NORCREST_LONGO} /NCRV`, status: 'Encerrada' },
  { permissionaria: `${NORCREST_LONGO} /NCRS`, status: 'Informada' },
  { permissionaria: `${NORCREST_LONGO} /NCJL`, status: 'Encerrada' },
  { permissionaria: 'WINSLOW LTDA', status: 'Encerrada' }, // não-NORCREST: fora do slide 17
]

// Multas já cruzadas (padrão de cruzarMultas em multas.js): `_situacao_vinculo`
// determina se entram no cálculo (excluirSemProcesso) e `_permissionaria_exibir`
// determina a checagem de NORCREST.
const MULTAS = [
  { valor: 1000, area_m2: 10, _situacao_vinculo: 'vinculado_sistemaGeo', _permissionaria_exibir: 'NORCREST - NCR' },
  { valor: 2000, area_m2: 20, _situacao_vinculo: 'vinculado_sistemaGeo', _permissionaria_exibir: 'NORCREST - NCJ' },
  { valor: 3000, area_m2: 30, _situacao_vinculo: 'vinculado_sistemaGeo', _permissionaria_exibir: 'WINSLOW' },
  { valor: 4000, area_m2: 40, _situacao_vinculo: 'sem_processo', permissionaria: 'HARGROVE' }, // fora dos KPIs
]

const bases = { geo: GEO, fisc: FISC, emerg: EMERG, multas: MULTAS }

function slidePorAgregacao(agregacao) {
  return MODELO_INSTITUCIONAL.slides.find((s) => s.agregacao === agregacao)
}

// ── Seed ──────────────────────────────────────────────────────────────
describe('MODELO_INSTITUCIONAL (seed)', () => {
  it('numeração única e ascendente (segue o PPT; 22/33/35/36/37/45–51 removidos, 20.1 extra, 52 encerra logo após o 44)', () => {
    const ns = MODELO_INSTITUCIONAL.slides.map((s) => s.n)
    expect(new Set(ns).size).toBe(ns.length)
    for (let i = 1; i < ns.length; i++) expect(ns[i]).toBeGreaterThan(ns[i - 1])
    for (const removido of [22, 33, 35, 36, 37, 45, 46, 47, 48, 49, 50, 51])
      expect(ns).not.toContain(removido)
    expect(ns).toContain(16.1)
    expect(ns).toContain(20.1)
    // Slides finais presentes: 38–44 (laudos/multas/compatibilização) + 52
    // (encerramento, movido para logo após o 44 — decisão de 02/08/2026)
    for (let n = 38; n <= 44; n++) expect(ns).toContain(n)
    expect(ns).toContain(52)
    expect(ns[ns.length - 1]).toBe(52) // último slide da apresentação
  })

  it('todo slide tem categoria válida e título', () => {
    for (const s of MODELO_INSTITUCIONAL.slides) {
      expect(CATEGORIA[s.categoria], `slide ${s.n}`).toBeDefined()
      expect(s.titulo, `slide ${s.n}`).toBeTruthy()
    }
  })

  it('distribuição das categorias: 29 dados · 12 texto · 1 futuro (42 slides)', () => {
    const conta = { dados: 0, texto: 0, futuro: 0 }
    for (const s of MODELO_INSTITUCIONAL.slides) conta[s.categoria]++
    expect(conta).toEqual({ dados: 29, texto: 12, futuro: 1 })
    expect(MODELO_INSTITUCIONAL.slides).toHaveLength(42)
  })

  it('fisc_por_regiao e fisc_andamento_por_regiao agregam por região (slides 38/39)', () => {
    const r38 = resolverDadosSlide(slidePorAgregacao('fisc_por_regiao'), bases)
    // FISC tem 4 laudos com subprefeitura (SE×2 na LOCAL/? — Centro etc.)
    expect(r38.contexto[0].valor).toBe('4')
    expect(r38.detalhe.length).toBeGreaterThan(0)
    const r39 = resolverDadosSlide(slidePorAgregacao('fisc_andamento_por_regiao'), bases)
    expect(r39.contexto[0].valor).toBe('1') // só a visita WINSLOW em andamento
  })

  it('slides de dados têm fonte e agregação; os demais têm texto', () => {
    for (const s of MODELO_INSTITUCIONAL.slides) {
      if (s.categoria === 'dados') {
        expect(['geo', 'fisc', 'emerg', 'multas'], `slide ${s.n}`).toContain(
          s.fonte
        )
        expect(s.agregacao, `slide ${s.n}`).toBeTruthy()
      } else {
        expect(s.texto, `slide ${s.n}`).toBeTruthy()
      }
    }
  })
})

// ── Helpers exportados ────────────────────────────────────────────────
describe('helpers', () => {
  it('normUnidadeNorcrest agrupa NCRV/NCRS→NCR e NCJV/NCJL→NCJ', () => {
    expect(normUnidadeNorcrest('NCRV')).toBe('NCR')
    expect(normUnidadeNorcrest('NCRS')).toBe('NCR')
    expect(normUnidadeNorcrest('NCJV')).toBe('NCJ')
    expect(normUnidadeNorcrest('NCJL')).toBe('NCJ')
    expect(normUnidadeNorcrest('MLG')).toBe('MLG')
  })

  it('listaPermissionariasRelatorio consolida NORCREST e ordena por volume', () => {
    expect(listaPermissionariasRelatorio(GEO)).toEqual(['NORCREST', 'WINSLOW', 'HARGROVE'])
  })

  // Rótulo do slide 20.1 (30/07/2026): mês em que o trimestre se encerra.
  it('mesFimTrimestre mapeia T1→mar, T2→jun, T3→set, T4→dez', () => {
    expect(mesFimTrimestre('2026-T1')).toBe('mar/2026')
    expect(mesFimTrimestre('2026-T2')).toBe('jun/2026')
    expect(mesFimTrimestre('2026-T3')).toBe('set/2026')
    expect(mesFimTrimestre('2026-T4')).toBe('dez/2026')
  })

  it('mesFimTrimestre devolve null em chave fora do formato (chamador usa o rótulo original)', () => {
    expect(mesFimTrimestre('T2 2026')).toBeNull() // formato de exibição, não o _sort
    expect(mesFimTrimestre('2026-T5')).toBeNull()
    expect(mesFimTrimestre('')).toBeNull()
    expect(mesFimTrimestre(null)).toBeNull()
    expect(mesFimTrimestre(undefined)).toBeNull()
  })
})

// ── Resolver: casos gerais ────────────────────────────────────────────
describe('resolverDadosSlide — geral', () => {
  it('slide de texto devolve só o texto (sem dados)', () => {
    const s = MODELO_INSTITUCIONAL.slides[0] // capa
    const r = resolverDadosSlide(s, bases)
    expect(r.texto).toBeTruthy()
    expect(r.dados).toBeUndefined()
    expect(r.catInfo).toBe(CATEGORIA.texto)
  })

  it('bases ausentes não quebram (arrays vazios por padrão)', () => {
    for (const s of MODELO_INSTITUCIONAL.slides) {
      expect(() => resolverDadosSlide(s, {})).not.toThrow()
    }
  })

  it('todo slide de dados resolvido traz dados/kpis/blocos', () => {
    for (const s of MODELO_INSTITUCIONAL.slides) {
      if (s.categoria !== 'dados') continue
      const r = resolverDadosSlide(s, bases)
      expect(r.dados || r.kpis || r.blocos, `slide ${s.n} (${s.agregacao})`).toBeTruthy()
      if (r.dados) expect(r.colunas, `slide ${s.n}`).toBeTruthy()
    }
  })

  it('permissionária selecionada aparece em permSelecionada dos slides de dados', () => {
    const s = slidePorAgregacao('geo_controle_mensal')
    const r = resolverDadosSlide(s, bases, { permissionaria: 'WINSLOW' })
    expect(r.permSelecionada).toBe('WINSLOW')
  })
})

// ── Resolver: agregações específicas ─────────────────────────────────
describe('resolverDadosSlide — agregações', () => {
  it('geo_por_permissionaria: ranking completo + destaque + janela', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_por_permissionaria'), bases, { permissionaria: 'HARGROVE' })
    expect(r.dados.map((d) => d.nome)).toEqual(['NORCREST', 'WINSLOW', 'HARGROVE'])
    expect(r.destaqueNome).toBe('HARGROVE')
    expect(r.janela).toBe(10)
    expect(r.contexto[0].valor).toBe('4')
    expect(r.destaques[0].valor).toBe('50%') // 2 de 4 são NORCREST
  })

  it('geo_visao_geral conta executoras distintas (case-insensitive), sem KPI manual (removido em 02/08/2026)', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_visao_geral'), bases)
    const exec = r.kpis.find((k) => k.rotulo.includes('executantes'))
    expect(exec.valor).toBe(2) // Alfa Engenharia (2 grafias) + Beta Obras
    expect(r.kpis.filter((k) => k.manual)).toHaveLength(0)
    expect(r.kpis.some((k) => k.duplo)).toBe(true)
  })

  it('geo_por_tipo_processo: categorias fixas + composição da Expansão/Implantação', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_por_tipo_processo'), bases)
    const nomes = r.dados.map((d) => d.nome)
    for (const c of ['Emergência', 'Ligação Domiciliar', 'Manutenção Preventiva', 'Manutenção Corretiva', 'Demais Serviços', 'Expansão/Implantação']) {
      expect(nomes).toContain(c)
    }
    const expansao = r.dados.find((d) => d.nome === 'Expansão/Implantação')
    expect(expansao.valor).toBe(1) // o Radar caiu no bucket
    expect(r.composicao).toEqual([{ nome: 'Radar', valor: 1, pct: 100 }])
  })

  it('geo_emerg_mensal cobre TODAS as permissionárias (mensal por ano + contexto)', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_emerg_mensal'), bases)
    expect(r.series).toEqual(['2025'])
    expect(r.painelAnos.itens).toEqual([{ ano: '2025', valor: 2 }])
    expect(r.contexto.map((c) => c.valor)).toEqual(['4', '2'])
  })

  it('geo_emerg_mensal filtra pela permissionária selecionada', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_emerg_mensal'), bases, { permissionaria: 'WINSLOW' })
    expect(r.contexto.map((c) => c.valor)).toEqual(['1', '0']) // WINSLOW: 1 processo, 0 emergências
  })

  it('geo_total_vs_emerg: pct 1 casa decimal + lista lateral + destaque no topo', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_total_vs_emerg'), bases)
    const norcrest = r.dados.find((d) => d.nome === 'NORCREST')
    expect(norcrest).toMatchObject({ total: 2, emergencia: 2, pct_emerg: 100 })
    expect(r.listaLateral.pctKey).toBe('pct_emerg')
    expect(r.destaquePos).toBe('topo')
  })

  it('fisc_metragem_norcrest soma áreas e calcula multa com o valor digitado', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_metragem_norcrest'), bases, { multaM2: 10 })
    // NORCREST: NC=50 m² (V2); em andamento=0
    expect(r.dados[0]).toMatchObject({ area_m2: 50, multa_estimada: 500 })
    const semValor = resolverDadosSlide(slidePorAgregacao('fisc_metragem_norcrest'), bases)
    expect(semValor.dados[0].multa_estimada).toBeNull()
  })

  it('fisc_recomposicao: área leg. atendida + vias distintas + economia', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_recomposicao'), bases, { custoM2: 2 })
    // leg atendida: V1 (100) + V3 (20) → área 120, vias distintas {V1, V3} = 2
    expect(r.dados[0]).toMatchObject({ area_m2: 120, vias: 2, economia: 240 })
  })

  it('fisc_recomposicao_norcrest considera só NORCREST + soma com o Termo', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_recomposicao_norcrest'), bases, { custoM2: 2 })
    expect(r.dados[0]).toMatchObject({ area_m2: 100, vias: 1, economia: 200 })
    expect(r.dados[1].economia).toBe(374_300_000)
    const amarelo = r.blocos.find((b) => b.estilo === 'amarelo')
    expect(amarelo.texto).toContain('374,3') // 200 + 374,3 mi ≈ 374,3 mi
  })

  it('fisc_soluc_trimestral rotula pelo mês de encerramento do trimestre (slide 20.1)', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_soluc_trimestral'), bases)
    // V2 concluída em mar/2025 → T1 2025, exibido como o mês de fecho
    expect(r.dados).toEqual([{ nome: 'mar/2025', valor: 1 }])
    expect(r.colunas[0].label).toBe('Trimestre (mês de encerramento)')
  })

  it('fisc_nc_vs_andamento_norcrest agrupa unidades (NCRV→NCR) e traz % 1 casa', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_nc_vs_andamento_norcrest'), bases)
    expect(r.dados).toEqual([
      { nome: 'NCR', nao_conformidades: 1, em_andamento: 0, pct_andamento: 0 },
    ])
    expect(r.listaLateral.pctKey).toBe('pct_andamento')
  })

  it('geo_norcrest_por_unidade: só NORCREST, agrupado por unidade, ignora o filtro de permissionária (slide 16.1)', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_norcrest_por_unidade'), bases, { permissionaria: 'WINSLOW' })
    // GEO: 'NORCREST - NCR' e 'NORCREST - NCJ', 1 cada; WINSLOW e HARGROVE ficam fora.
    expect(r.dados).toHaveLength(2)
    expect(r.dados.every((d) => d.valor === 1)).toBe(true)
    expect(r.dados.map((d) => d.nome).sort()).toEqual(['NCJ', 'NCR'])
    expect(r.contexto).toEqual([
      { rotulo: 'Total de protocolos no Sistema Geo', valor: '4' },
      { rotulo: 'Total de protocolos da NORCREST no Sistema Geo', valor: '2' },
    ])
  })

  it('emerg_norcrest_por_unidade agrupa NCRV/NCRS→NCR e NCJL→NCJ', () => {
    const r = resolverDadosSlide(slidePorAgregacao('emerg_norcrest_por_unidade'), bases)
    const mcr = r.dados.find((d) => d.nome === 'NCR')
    expect(mcr).toMatchObject({ encerradas: 1, informadas: 1 }) // NCRV + NCRS fundidas
    const mcj = r.dados.find((d) => d.nome === 'NCJ')
    expect(mcj).toMatchObject({ encerradas: 1 })
    expect(r.dados.some((d) => d.nome.includes('WINSLOW'))).toBe(false)
    expect(r.aviso).toBeNull()
  })

})

// ── enriquecerExport (achado de 30/07/2026: exportação só trazia a tabela
// resumo, nunca o detalhamento por trás do gráfico — ex.: slide 18 exportava
// só a tabela por região, sem a barra por subprefeitura) ──────────────────
describe('enriquecerExport', () => {
  it('sem detalhe/composição, devolve o slide inalterado (sem dadosExport)', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_soluc_trimestral'), bases)
    const e = enriquecerExport(r)
    expect(e).toBe(r)
    expect(e.dadosExport).toBeUndefined()
  })

  it('slide sem dados/colunas (categoria texto) passa direto', () => {
    const s = MODELO_INSTITUCIONAL.slides.find((s) => s.categoria === 'texto')
    const r = resolverDadosSlide(s, bases)
    expect(enriquecerExport(r)).toBe(r)
  })

  it('geo_por_regiao (slide 18): junta a tabela por região com o detalhe por subprefeitura', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_por_regiao'), bases)
    const e = enriquecerExport(r)
    expect(e.colunasExport.map((c) => c.key)).toEqual(['_nivel', 'nome', 'valor', 'pct'])
    // linhas de "Total" (por região) seguidas das de "Detalhamento" (por subprefeitura)
    expect(e.dadosExport.filter((d) => d._nivel === 'Total')).toHaveLength(r.dados.length)
    expect(e.dadosExport.filter((d) => d._nivel === 'Detalhamento')).toHaveLength(r.detalhe.length)
    // dados/colunas originais (usados na tela) continuam intactos
    expect(e.dados).toBe(r.dados)
    expect(e.colunas).toBe(r.colunas)
  })

  it('geo_por_tipo_processo: junta a tabela por tipo com a composição da Expansão/Implantação', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_por_tipo_processo'), bases)
    const e = enriquecerExport(r)
    expect(e.dadosExport.some((d) => d._nivel === 'Composição' && d.nome === 'Radar')).toBe(true)
    expect(e.dadosExport.filter((d) => d._nivel === 'Total')).toHaveLength(r.dados.length)
  })

  it('fisc_leg_vs_nc: junta a distribuição Leg./NC com o detalhe Solucionados × Em andamento', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_leg_vs_nc'), bases)
    const e = enriquecerExport(r)
    const nomes = e.dadosExport.map((d) => d.nome)
    expect(nomes).toContain('Solucionados')
    expect(nomes).toContain('Em andamento')
  })
})

// ── Slides 40/41 — Multas Aplicadas (30/07/2026: deixaram de ser
// placeholders com números estáticos do CORBETT — agora leem o módulo Multas
// real) ─────────────────────────────────────────────────────────────────
describe('multas_geral / multas_norcrest (slides 40/41)', () => {
  it('multas_geral: KPIs excluem "sem processo" (3 das 4 multas)', () => {
    const r = resolverDadosSlide(slidePorAgregacao('multas_geral'), bases)
    expect(r.kpis.find((k) => k.rotulo === 'Total de Multas Lavradas').valor).toBe(3)
    const kValor = r.kpis.find((k) => k.rotulo === 'Valor Total Aplicado (R$)')
    expect(kValor.valor).toBe(6000) // 1000+2000+3000
    expect(kValor.formatador(kValor.valor)).toBe('R$ 6.000,00') // com centavos
    const kArea = r.kpis.find((k) => k.rotulo === 'Área Total (m²)')
    expect(kArea.valor).toBe(60)
    expect(kArea.formatador(kArea.valor)).toBe('60,00') // 2 casas decimais
    expect(r.aviso).toBeNull()
  })

  it('multas_norcrest: só as 2 multas NORCREST (com processo)', () => {
    const r = resolverDadosSlide(slidePorAgregacao('multas_norcrest'), bases)
    expect(r.kpis.find((k) => k.rotulo.includes('NORCREST')).valor).toBe(2)
    expect(r.kpis.find((k) => k.rotulo === 'Valor Total Aplicado (R$)').valor).toBe(3000) // 1000+2000
  })

  it('sem multas carregadas, mostra aviso e zera os KPIs', () => {
    const r = resolverDadosSlide(slidePorAgregacao('multas_geral'), {
      ...bases,
      multas: [],
    })
    expect(r.aviso).toBeTruthy()
    expect(r.kpis.find((k) => k.rotulo === 'Total de Multas Lavradas').valor).toBe(0)
  })
})

// ── Indicador de "dado parcial" (Frente 2 do plano de agosto/2026,
// 02/08/2026): completude() é a função pura; cada slide de prioridade alta
// devolve `completude` na mesma base que o gráfico de fato analisa. ──────
describe('completude', () => {
  it('conta preenchidos com o padrão (não nulo/indefinido/vazio)', () => {
    const rows = [{ x: 1 }, { x: null }, { x: '' }, { x: 2 }]
    expect(completude(rows, 'x', 'campo x')).toEqual({
      preenchidos: 2,
      total: 4,
      pct: 50,
      rotulo: 'campo x',
    })
  })

  it('base vazia não divide por zero (pct: 0)', () => {
    expect(completude([], 'x', 'campo x')).toEqual({
      preenchidos: 0,
      total: 0,
      pct: 0,
      rotulo: 'campo x',
    })
  })

  it('aceita `preenchido` customizado (só valores específicos contam)', () => {
    const rows = [{ v: 'LOCAL' }, { v: 'outro' }, { v: '' }]
    const r = completude(rows, 'v', 'classificação', (row) => row.v === 'LOCAL')
    expect(r).toEqual({ preenchidos: 1, total: 3, pct: 33.3, rotulo: 'classificação' })
  })
})

describe('resolverDadosSlide — completude por slide (prioridade alta)', () => {
  it('geo_por_permissionaria (slide 8): completude por permissionária, base geoAll', () => {
    const geo = [
      { permissionaria: 'NORCREST' },
      { permissionaria: '' },
      { permissionaria: 'WINSLOW' },
      { permissionaria: null },
    ]
    const r = resolverDadosSlide(slidePorAgregacao('geo_por_permissionaria'), { geo })
    expect(r.completude).toMatchObject({ preenchidos: 2, total: 4, pct: 50, rotulo: 'permissionária' })
  })

  it('geo_total_vs_emerg (slide 12): mesma base/campo do slide 8', () => {
    const geo = [
      { permissionaria: 'NORCREST', tipo_processo_nome: 'Emergência' },
      { permissionaria: '', tipo_processo_nome: 'Emergência' },
      { permissionaria: 'WINSLOW', tipo_processo_nome: 'Manutenção Corretiva' },
      { permissionaria: null, tipo_processo_nome: 'Manutenção Corretiva' },
    ]
    const r = resolverDadosSlide(slidePorAgregacao('geo_total_vs_emerg'), { geo })
    expect(r.completude).toMatchObject({ preenchidos: 2, total: 4, pct: 50 })
  })

  it('geo_emerg_vs_corretiva (slide 13): mesma base/campo do slide 8', () => {
    const geo = [
      { permissionaria: 'NORCREST', tipo_processo_nome: 'Emergência' },
      { permissionaria: '', tipo_processo_nome: 'Emergência' },
      { permissionaria: 'WINSLOW', tipo_processo_nome: 'Manutenção Corretiva' },
      { permissionaria: null, tipo_processo_nome: 'Manutenção Corretiva' },
    ]
    const r = resolverDadosSlide(slidePorAgregacao('geo_emerg_vs_corretiva'), { geo })
    expect(r.completude).toMatchObject({ preenchidos: 2, total: 4, pct: 50 })
  })

  const GEO_DATA_CADASTRO = [
    { tipo_processo_nome: 'Emergência', data_cadastro: '2025-01-10' },
    { tipo_processo_nome: 'Emergência', data_cadastro: null },
    { tipo_processo_nome: 'Emergência', data_cadastro: '2025-02-01' },
    { tipo_processo_nome: 'Manutenção Preventiva', data_cadastro: null },
  ]

  it('geo_controle_mensal (slide 10): completude de data_cadastro na base toda', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_controle_mensal'), { geo: GEO_DATA_CADASTRO })
    expect(r.completude).toMatchObject({ preenchidos: 2, total: 4, pct: 50, rotulo: 'data de cadastro' })
  })

  it('geo_emerg_mensal (slide 11): completude só entre as linhas de Emergência', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_emerg_mensal'), { geo: GEO_DATA_CADASTRO })
    expect(r.completude).toMatchObject({ preenchidos: 2, total: 3, pct: 66.7 })
  })

  it('geo_autorizacoes_anual (slide 14): completude só entre as NÃO-emergência', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_autorizacoes_anual'), { geo: GEO_DATA_CADASTRO })
    expect(r.completude).toMatchObject({ preenchidos: 0, total: 1, pct: 0 })
  })

  it('geo_emerg_anual (slide 15): completude só entre as linhas de Emergência', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_emerg_anual'), { geo: GEO_DATA_CADASTRO })
    expect(r.completude).toMatchObject({ preenchidos: 2, total: 3, pct: 66.7 })
  })

  it('geo_emerg_barra_anual (slide 16): completude só entre as linhas de Emergência', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_emerg_barra_anual'), { geo: GEO_DATA_CADASTRO })
    expect(r.completude).toMatchObject({ preenchidos: 2, total: 3, pct: 66.7 })
  })

  it('fisc_soluc_trimestral (slide 20.1): completude de data_conclusao só entre os solucionados', () => {
    const fisc = [
      { solucionado: true, data_conclusao: '2025-03-15' },
      { solucionado: true, data_conclusao: null },
      { solucionado: false, data_conclusao: null },
    ]
    const r = resolverDadosSlide(slidePorAgregacao('fisc_soluc_trimestral'), { fisc })
    expect(r.completude).toMatchObject({ preenchidos: 1, total: 2, pct: 50, rotulo: 'data de conclusão' })
  })

  it('fisc_avanco (slide 21): completude de data_inicio na base toda', () => {
    const fisc = [
      { data_inicio: '2025-01-01', legislacao_atendida: true, tem_nao_conformidade: false },
      { data_inicio: null, legislacao_atendida: false, tem_nao_conformidade: true },
      { data_inicio: '2025-02-01', legislacao_atendida: false, tem_nao_conformidade: false },
    ]
    const r = resolverDadosSlide(slidePorAgregacao('fisc_avanco'), { fisc })
    expect(r.completude).toMatchObject({ preenchidos: 2, total: 3, pct: 66.7 })
  })

  it('fisc_metragem_norcrest (slide 23): completude de area_m2 só entre a NORCREST', () => {
    const fisc = [
      { permissionaria: 'NORCREST - NCR', area_m2: 100, tem_nao_conformidade: true, em_andamento: false },
      { permissionaria: 'NORCREST - NCJ', area_m2: null, tem_nao_conformidade: false, em_andamento: true },
      { permissionaria: 'WINSLOW', area_m2: 50, tem_nao_conformidade: true, em_andamento: false },
    ]
    const r = resolverDadosSlide(slidePorAgregacao('fisc_metragem_norcrest'), { fisc })
    expect(r.completude).toMatchObject({ preenchidos: 1, total: 2, pct: 50, rotulo: 'área (m²)' })
  })

  it('fisc_recomposicao (slide 24): completude de area_m2 só entre legislação atendida', () => {
    const fisc = [
      { legislacao_atendida: true, area_m2: 100, id_origem: 'A' },
      { legislacao_atendida: true, area_m2: null, id_origem: 'B' },
      { legislacao_atendida: false, area_m2: 30, id_origem: 'C' },
    ]
    const r = resolverDadosSlide(slidePorAgregacao('fisc_recomposicao'), { fisc })
    expect(r.completude).toMatchObject({ preenchidos: 1, total: 2, pct: 50 })
  })

  it('fisc_recomposicao_total (slide 27): mesma lógica do 24, sem filtro de NORCREST', () => {
    const fisc = [
      { legislacao_atendida: true, area_m2: 100, id_origem: 'A' },
      { legislacao_atendida: true, area_m2: null, id_origem: 'B' },
      { legislacao_atendida: false, area_m2: 30, id_origem: 'C' },
    ]
    const r = resolverDadosSlide(slidePorAgregacao('fisc_recomposicao_total'), { fisc })
    expect(r.completude).toMatchObject({ preenchidos: 1, total: 2, pct: 50 })
  })

  it('fisc_recomposicao_norcrest (slide 28): completude só entre legislação atendida da NORCREST', () => {
    const fisc = [
      { permissionaria: 'NORCREST - NCR', legislacao_atendida: true, area_m2: 100 },
      { permissionaria: 'NORCREST - NCJ', legislacao_atendida: true, area_m2: null },
      { permissionaria: 'WINSLOW', legislacao_atendida: true, area_m2: 40 },
    ]
    const r = resolverDadosSlide(slidePorAgregacao('fisc_recomposicao_norcrest'), { fisc })
    expect(r.completude).toMatchObject({ preenchidos: 1, total: 2, pct: 50 })
  })

  it('fisc_classificacao_viaria (slide 34): só LOCAL/COLETORA/ARTERIAL contam como preenchido', () => {
    const fisc = [
      { classificacao_viaria: 'LOCAL' },
      { classificacao_viaria: 'ARTERIAL' },
      { classificacao_viaria: 'DESCONHECIDO' },
      { classificacao_viaria: '' },
    ]
    const r = resolverDadosSlide(slidePorAgregacao('fisc_classificacao_viaria'), { fisc })
    expect(r.completude).toMatchObject({ preenchidos: 2, total: 4, pct: 50, rotulo: 'classificação viária' })
  })

  it('base completa (100%) não aparece em nenhum slide já coberto pelos testes gerais', () => {
    // fisc_leg_vs_nc (slide 20) NÃO está na lista de prioridade alta —
    // não deve ganhar `completude`.
    const r = resolverDadosSlide(slidePorAgregacao('fisc_leg_vs_nc'), bases)
    expect(r.completude).toBeUndefined()
  })
})
