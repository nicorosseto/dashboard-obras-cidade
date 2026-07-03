// Testes das funções puras do módulo Apresentação (src/lib/relatorio.js).
// Segue o padrão de src/tests/emergencias.test.js: fixtures pequenas por caso.
import { describe, it, expect } from 'vitest'
import {
  CATEGORIA,
  MODELO_INSTITUCIONAL,
  resolverDadosSlide,
} from '../lib/relatorio.js'

// ── Fixtures mínimas ──────────────────────────────────────────────────
const GEO = [
  { permissionaria: 'NORCREST - NCR', subprefeitura: 'SE', data_cadastro: '2025-03-10', tipo_obra_nome: 'Emergência' },
  { permissionaria: 'NORCREST - NCJ', subprefeitura: 'PI', data_cadastro: '2025-04-02', tipo_obra_nome: 'Emergência' },
  { permissionaria: 'WINSLOW', subprefeitura: 'SE', data_cadastro: '2024-05-20', tipo_obra_nome: 'Manutenção Corretiva' },
  { permissionaria: 'HARGROVE', subprefeitura: 'PA', data_cadastro: '2024-06-01', tipo_obra_nome: 'Ligação Domiciliar' },
]

const FISC = [
  { permissionaria: 'NORCREST - NCR', legislacao_atendida: true, tem_nao_conformidade: false, solucionado: false, em_andamento: false, classificacao_viaria: 'LOCAL', data_inicio: '2025-01-15' },
  { permissionaria: 'NORCREST - NCR', legislacao_atendida: false, tem_nao_conformidade: true, solucionado: true, em_andamento: false, classificacao_viaria: 'LOCAL', data_inicio: '2025-02-10' },
  { permissionaria: 'WINSLOW', legislacao_atendida: false, tem_nao_conformidade: true, solucionado: false, em_andamento: true, classificacao_viaria: 'ARTERIAL', data_inicio: '2025-02-20' },
  { permissionaria: 'WINSLOW', legislacao_atendida: true, tem_nao_conformidade: false, solucionado: false, em_andamento: false, classificacao_viaria: 'Coletora', data_inicio: '2024-11-05' },
]

const EMERG = [
  { permissionaria: 'NORCREST - NCR', status: 'Encerrada' },
  { permissionaria: 'NORCREST - NCR', status: 'Informada' },
  { permissionaria: 'NORCREST - NCJ', status: 'Encerrada' },
  { permissionaria: 'WINSLOW', status: 'Encerrada' }, // não-NORCREST: fora do slide 17
]

const bases = { geo: GEO, fisc: FISC, emerg: EMERG }

function slidePorAgregacao(agregacao) {
  return MODELO_INSTITUCIONAL.slides.find((s) => s.agregacao === agregacao)
}

// ── Seed ──────────────────────────────────────────────────────────────
describe('MODELO_INSTITUCIONAL (seed)', () => {
  it('tem exatamente 36 slides, numerados de 1 a 36 sem buracos', () => {
    expect(MODELO_INSTITUCIONAL.slides).toHaveLength(36)
    const ns = MODELO_INSTITUCIONAL.slides.map((s) => s.n)
    expect(ns).toEqual(Array.from({ length: 36 }, (_, i) => i + 1))
  })

  it('todo slide tem categoria válida e título', () => {
    for (const s of MODELO_INSTITUCIONAL.slides) {
      expect(CATEGORIA[s.categoria], `slide ${s.n}`).toBeDefined()
      expect(s.titulo, `slide ${s.n}`).toBeTruthy()
    }
  })

  it('distribuição das categorias: 23 dados · 12 texto · 1 futuro', () => {
    const conta = { dados: 0, texto: 0, futuro: 0 }
    for (const s of MODELO_INSTITUCIONAL.slides) conta[s.categoria]++
    expect(conta).toEqual({ dados: 23, texto: 12, futuro: 1 })
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

// ── Resolver: casos gerais ────────────────────────────────────────────
describe('resolverDadosSlide — geral', () => {
  it('slide de texto devolve só o texto (sem dados)', () => {
    const s = MODELO_INSTITUCIONAL.slides[0] // capa
    const r = resolverDadosSlide(s, bases)
    expect(r.texto).toBeTruthy()
    expect(r.dados).toBeUndefined()
    expect(r.catInfo).toBe(CATEGORIA.texto)
  })

  it('slide futuro não tenta agregar', () => {
    const s = MODELO_INSTITUCIONAL.slides.find((x) => x.categoria === 'futuro')
    const r = resolverDadosSlide(s, bases)
    expect(r.dados).toBeUndefined()
    expect(r.catInfo).toBe(CATEGORIA.futuro)
  })

  it('bases ausentes não quebram (arrays vazios por padrão)', () => {
    for (const s of MODELO_INSTITUCIONAL.slides) {
      expect(() => resolverDadosSlide(s, {})).not.toThrow()
    }
  })

  it('todo slide de dados resolvido com bases traz dados/kpis + colunas quando tabular', () => {
    for (const s of MODELO_INSTITUCIONAL.slides) {
      if (s.categoria !== 'dados') continue
      const r = resolverDadosSlide(s, bases)
      expect(r.dados || r.kpis, `slide ${s.n} (${s.agregacao})`).toBeTruthy()
      if (r.dados) expect(r.colunas, `slide ${s.n}`).toBeTruthy()
    }
  })
})

// ── Resolver: agregações específicas ─────────────────────────────────
describe('resolverDadosSlide — agregações', () => {
  it('geo_por_permissionaria consolida NORCREST', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_por_permissionaria'), bases)
    const norcrest = r.dados.find((d) => d.nome === 'NORCREST')
    expect(norcrest.valor).toBe(2) // NCR + NCJ consolidadas
  })

  it('geo_total_vs_emerg calcula total, emergência e % por permissionária', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_total_vs_emerg'), bases)
    const norcrest = r.dados.find((d) => d.nome === 'NORCREST')
    expect(norcrest).toMatchObject({ total: 2, emergencia: 2, pct_emerg: 100 })
    const winslow = r.dados.find((d) => d.nome === 'WINSLOW')
    expect(winslow).toMatchObject({ total: 1, emergencia: 0, pct_emerg: 0 })
  })

  it('geo_emerg_vs_corretiva separa Emergência de Manutenção Corretiva', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_emerg_vs_corretiva'), bases)
    const winslow = r.dados.find((d) => d.nome === 'WINSLOW')
    expect(winslow).toMatchObject({ emergencia: 0, corretiva: 1 })
  })

  it('geo_autorizacoes_anual exclui emergências (mensal por ano + painel)', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_autorizacoes_anual'), bases)
    // GEO tem 2 não-emergências, ambas de 2024 (maio e junho)
    expect(r.series).toEqual(['2024'])
    const maio = r.dados.find((d) => d.mes === 'Maio')
    expect(maio['2024']).toBe(1)
    expect(r.painelAnos.itens).toEqual([{ ano: '2024', valor: 2 }])
  })

  it('geo_emerg_norcrest_anual filtra NORCREST + emergência (mensal por ano + contexto)', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_emerg_norcrest_anual'), bases)
    expect(r.series).toEqual(['2025'])
    expect(r.painelAnos.itens).toEqual([{ ano: '2025', valor: 2 }])
    // contexto: total NORCREST (2) e total NORCREST emergência (2)
    expect(r.contexto.map((c) => c.valor)).toEqual(['2', '2'])
  })

  it('geo_por_permissionaria traz contexto (total) e destaque (% NORCREST)', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_por_permissionaria'), bases)
    expect(r.contexto[0].valor).toBe('4')
    expect(r.destaques[0].valor).toBe('50%') // 2 de 4 são NORCREST
  })

  it('fisc_tipos_falha_kpis agrupa o excedente em "Demais patologias"', () => {
    // fixture com 6 tipos de falha distintos para forçar o agrupamento
    const fisc6 = [
      { falha_nivelamento: true }, { falha_nivelamento: true },
      { falha_afundamento: true }, { falha_trincas: true },
      { falha_geometria: true }, { falha_sarjeta: true }, { falha_guia: true },
    ]
    const r = resolverDadosSlide(slidePorAgregacao('fisc_tipos_falha_kpis'), { fisc: fisc6 })
    const resto = r.kpis.find((k) => k.resto)
    expect(r.kpis.filter((k) => !k.resto)).toHaveLength(4)
    expect(resto.rotulo).toBe('Demais patologias')
    expect(resto.valor).toBe(2) // os 2 tipos fora do top-4
  })

  it('fisc_leg_vs_nc traz o donut principal e o detalhe soluc×andamento', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_leg_vs_nc'), bases)
    expect(r.dados.map((d) => d.valor)).toEqual([2, 2]) // 2 leg, 2 NC
    expect(r.detalhe.map((d) => d.valor)).toEqual([1, 1]) // 1 soluc, 1 andamento
  })

  it('fisc_avanco agrega % por trimestre', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_avanco'), bases)
    const t1_25 = r.dados.find((d) => d.periodo === '2025-T1')
    // T1/2025 tem 3 laudos: 1 leg (33%) e 2 NC (67%)
    expect(t1_25.pct_leg).toBe(33)
    expect(t1_25.pct_nc).toBe(67)
  })

  it('fisc_nc_vs_andamento_norcrest agrupa por UNIDADE da NORCREST', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_nc_vs_andamento_norcrest'), bases)
    expect(r.dados).toEqual([
      { nome: 'NCR', nao_conformidades: 1, em_andamento: 0 },
    ])
  })

  it('fisc_classificacao_viaria normaliza caixa e calcula por grupo', () => {
    const r = resolverDadosSlide(slidePorAgregacao('fisc_classificacao_viaria'), bases)
    expect(r.dados.map((d) => d.nome)).toEqual(['Local', 'Coletora', 'Arterial'])
    const local = r.dados[0]
    expect(local).toMatchObject({ total: 2, leg_atendida: 1, nao_atendida: 1 })
    const coletora = r.dados[1] // veio como 'Coletora' minúscula na fixture
    expect(coletora.total).toBe(1)
  })

  it('emerg_norcrest_por_unidade conta Encerradas × Informadas só da NORCREST', () => {
    const r = resolverDadosSlide(slidePorAgregacao('emerg_norcrest_por_unidade'), bases)
    const mcr = r.dados.find((d) => d.nome === 'NCR')
    expect(mcr).toMatchObject({ encerradas: 1, informadas: 1 })
    expect(r.dados.some((d) => d.nome.includes('WINSLOW'))).toBe(false)
    expect(r.aviso).toBeNull()
  })

  it('emerg_norcrest_por_unidade avisa quando o módulo Emergências não carregou', () => {
    const r = resolverDadosSlide(slidePorAgregacao('emerg_norcrest_por_unidade'), {
      ...bases,
      emerg: [],
    })
    expect(r.aviso).toBeTruthy()
  })

  it('geo_visao_geral expõe KPIs do banco + manuais marcados', () => {
    const r = resolverDadosSlide(slidePorAgregacao('geo_visao_geral'), bases)
    const obras = r.kpis.find((k) => k.rotulo.includes('obras registradas'))
    expect(obras.valor).toBe(4)
    expect(r.kpis.filter((k) => k.manual)).toHaveLength(2)
    // card duplo de médias (mensal/diária) presente
    expect(r.kpis.some((k) => k.duplo)).toBe(true)
  })
})
