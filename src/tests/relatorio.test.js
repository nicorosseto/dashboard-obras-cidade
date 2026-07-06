// Testes das funções puras do módulo Apresentação (src/lib/relatorio.js).
// Segue o padrão de src/tests/emergencias.test.js: fixtures pequenas por caso.
import { describe, it, expect } from 'vitest'
import {
  CATEGORIA,
  MODELO_INSTITUCIONAL,
  listaPermissionariasRelatorio,
  normUnidadeNorcrest,
  resolverDadosSlide,
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

const bases = { geo: GEO, fisc: FISC, emerg: EMERG }

function slidePorAgregacao(agregacao) {
  return MODELO_INSTITUCIONAL.slides.find((s) => s.agregacao === agregacao)
}

// ── Seed ──────────────────────────────────────────────────────────────
describe('MODELO_INSTITUCIONAL (seed)', () => {
  it('numeração única e ascendente (segue o PPT; 22/35/36/37 removidos, 20.1 extra, vai até 52)', () => {
    const ns = MODELO_INSTITUCIONAL.slides.map((s) => s.n)
    expect(new Set(ns).size).toBe(ns.length)
    for (let i = 1; i < ns.length; i++) expect(ns[i]).toBeGreaterThan(ns[i - 1])
    for (const removido of [22, 35, 36, 37]) expect(ns).not.toContain(removido)
    expect(ns).toContain(20.1)
    // PDF completo (52 páginas): slides 38–52 presentes
    for (let n = 38; n <= 52; n++) expect(ns).toContain(n)
  })

  it('todo slide tem categoria válida e título', () => {
    for (const s of MODELO_INSTITUCIONAL.slides) {
      expect(CATEGORIA[s.categoria], `slide ${s.n}`).toBeDefined()
      expect(s.titulo, `slide ${s.n}`).toBeTruthy()
    }
  })

  it('distribuição das categorias: 27 dados · 19 texto · 3 futuro (49 slides)', () => {
    const conta = { dados: 0, texto: 0, futuro: 0 }
    for (const s of MODELO_INSTITUCIONAL.slides) conta[s.categoria]++
    expect(conta).toEqual({ dados: 27, texto: 19, futuro: 3 })
    expect(MODELO_INSTITUCIONAL.slides).toHaveLength(49)
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
        expect(['geo', 'fisc', 'emerg'], `slide ${s.n}`).toContain(s.fonte)
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

  it('geo_visao_geral conta executoras distintas (case-insensitive) + manual', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_visao_geral'), bases)
    const exec = r.kpis.find((k) => k.rotulo.includes('executantes'))
    expect(exec.valor).toBe(2) // Alfa Engenharia (2 grafias) + Beta Obras
    expect(r.kpis.filter((k) => k.manual)).toHaveLength(1) // só usuários
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

  it('fisc_soluc_trimestral agrega solucionados por trimestre (slide 20.1)', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_soluc_trimestral'), bases)
    expect(r.dados).toEqual([{ nome: 'T1 2025', valor: 1 }]) // V2 concluída em mar/2025
  })

  it('fisc_nc_vs_andamento_norcrest agrupa unidades (NCRV→NCR) e traz % 1 casa', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_nc_vs_andamento_norcrest'), bases)
    expect(r.dados).toEqual([
      { nome: 'NCR', nao_conformidades: 1, em_andamento: 0, pct_andamento: 0 },
    ])
    expect(r.listaLateral.pctKey).toBe('pct_andamento')
  })

  it('fisc_tipos_falha_kpis fixa as 4 patologias + Demais patologias', () => {
    const fisc6 = [
      { falha_nivelamento: true }, { falha_afundamento: true },
      { falha_sarjeta: true }, { falha_guia: true },
    ]
    const r = resolverDadosSlide(slidePorAgregacao('fisc_tipos_falha_kpis'), { fisc: fisc6 })
    expect(r.kpis.map((k) => k.rotulo)).toEqual([
      'Nivelamento', 'Geometria', 'Afundamento', 'Trincas', 'Demais patologias',
    ])
    expect(r.kpis.find((k) => k.rotulo === 'Geometria').valor).toBe(0) // fixa mesmo zerada
    expect(r.kpis.find((k) => k.resto).valor).toBe(2) // sarjeta + guia
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

  it('fisc_leg_vs_nc traz painel com marco fixo (junho/2020)', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_leg_vs_nc'), bases)
    // max data_inicio = 2025-02 → 4 anos e 8 meses desde 2020-06
    expect(r.painelTexto).toBe('4 anos e 8 meses de Controle Tecnológico')
  })

  it('geo_por_permissionaria traz painel com marco fixo (dezembro/2019)', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_por_permissionaria'), bases)
    // max data_cadastro = 2025-04 → 5 anos e 4 meses desde 2019-12
    expect(r.painelTexto).toBe('5 anos e 4 meses de Sistema Geo')
  })
})
