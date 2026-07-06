// src/lib/relatorio.js
// ============================================================================
// Módulo "Apresentação" (Relatório Mensal) — o "cérebro" do módulo.
//
//  1) CATEGORIA — relação do slide com os dados: 'dados' 🟢 (teal), 'texto' ⚪
//     (institucional, cinza), 'futuro' 🟡 (âmbar tracejado).
//  2) MODELO_INSTITUCIONAL — seed espelhando a apresentação-modelo (PDF rev.
//     2026.03). A numeração segue o PPT do usuário; slides removidos por
//     decisão (22, 35, 36) deixam LACUNA proposital na numeração; o 20.1 é um
//     desdobramento do 20 (gráfico de solucionados trimestral).
//  3) resolverDadosSlide(slide, bases, opcoes) — devolve o que o SlideRenderer
//     precisa. `opcoes`:
//       - permissionaria: nome consolidado selecionado → slides "gerais" são
//         FILTRADOS para ela; slides de ranking multi-permissionária mantêm
//         todas as barras e devolvem `destaqueNome` (barra destacada em teal;
//         o renderer desloca a janela até ela aparecer). Slides NORCREST-
//         -específicos (17, 23, 28, 31) ignoram o filtro.
//       - multaM2: R$/m² digitado pelo usuário (slide 23 — valor da multa).
//       - custoM2: R$/m² de recomposição asfáltica (slides 24/27/28).
//     As agregações reaproveitam src/lib/aggregations.js.
//
// Ao editar o seed, manter src/tests/relatorio.test.js alinhado (contagens e
// numeração única/ascendente).
// ============================================================================

import {
  consolidarNorcrest,
  comparativoAnualPorMes,
  processosPorRegiao,
  contagemPorSubprefeituraGeo,
  totaisAnuais,
  distribuicaoLegislacaoVsNC,
  distribuicaoSolucVsEmAnd,
  evolucaoTrimestral,
  rankingLegislacaoVsNC,
  rankingTiposFalha,
  calcularKPIsPBI,
  mediaDiaria,
  fmtNumero,
  fmtAreaDecimal,
} from './aggregations.js'
import { nomeCurtoPermissionaria } from './emergencias.js'

// ── Categorias de slide (contorno visual) ──────────────────────────────────
export const CATEGORIA = {
  dados: {
    id: 'dados',
    rotulo: 'Dado do sistema',
    borda: 'border-teal-500',
    faixa: 'bg-teal-500',
    icone: '🟢',
  },
  texto: {
    id: 'texto',
    rotulo: 'Conteúdo institucional (texto)',
    borda: 'border-slate-300',
    faixa: 'bg-slate-400',
    icone: '⚪',
  },
  futuro: {
    id: 'futuro',
    rotulo: 'Dado ainda não disponível no sistema',
    borda: 'border-amber-400 border-dashed',
    faixa: 'bg-amber-400',
    icone: '🟡',
  },
}

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0)
// Percentual com 1 casa decimal (listas laterais dos slides 12/29/30/31).
const pct1 = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0)

const fmtReais = (v) =>
  'R$ ' +
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)
const fmtMilhoes = (v) =>
  `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v / 1e6)} milhões`

// Termo de Cooperação — Recapeamento NORCREST (valores imutáveis, do PDF).
const TERMO_NORCREST = {
  area: '1.497.245,78 m²',
  vias: '308',
  economiaTexto: 'R$ 374,3 milhões',
  economiaValor: 374_300_000,
}

// A classificação "Emergência"/"Manutenção Corretiva" do Sistema Geo vive no
// TIPO DE PROCESSO (catálogo `08-tipos-processo-sistema-geo.sql`). `tipo_obra`
// é outro eixo (posicionamento) e fica só como fallback.
function rotuloTipoProcesso(r) {
  return String(
    r.tipo_processo_nome || r.tipo_processo || r.tipo_obra_nome || r.tipo_obra || ''
  ).toUpperCase()
}
function ehEmergencia(r) {
  return rotuloTipoProcesso(r).includes('EMERG')
}
function ehCorretiva(r) {
  return rotuloTipoProcesso(r).includes('CORRETIVA')
}
function ehNorcrest(r) {
  return String(r.permissionaria || '')
    .toUpperCase()
    .startsWith('NORCREST')
}

// Filtro global do seletor de permissionária (nome já consolidado).
function filtrarPerm(rows, permissionaria) {
  if (!permissionaria) return rows
  return rows.filter((r) => consolidarNorcrest(r.permissionaria) === permissionaria)
}

// Lista de permissionárias (consolidada, por volume) para o seletor da página.
export function listaPermissionariasRelatorio(geo) {
  const counts = new Map()
  for (const r of geo || []) {
    const k = consolidarNorcrest(r.permissionaria)
    if (!k) continue
    counts.set(k, (counts.get(k) || 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nome]) => nome)
}

// Unidades da NORCREST agrupadas (decisão do Departamento): NCRV/NCRS → NCR e
// NCJV/NCJL → NCJ — vale para TODA análise por base da NORCREST.
const UNIDADES_NORCREST_AGRUPADAS = { NCRV: 'NCR', NCRS: 'NCR', NCJV: 'NCJ', NCJL: 'NCJ' }
export function normUnidadeNorcrest(u) {
  const up = String(u || '').toUpperCase()
  return UNIDADES_NORCREST_AGRUPADAS[up] || up
}

// "X anos e Y meses" de um marco FIXO até a maior data presente nos dados.
function spanDesde(inicioFixo, rows, campo) {
  let max = null
  for (const r of rows) {
    const d = r[campo]
    if (d && (!max || d > max)) max = d
  }
  if (!max || max < inicioFixo) return null
  const meses =
    (+max.slice(0, 4) - +inicioFixo.slice(0, 4)) * 12 +
    (+max.slice(5, 7) - +inicioFixo.slice(5, 7))
  const anos = Math.floor(meses / 12)
  const resto = meses % 12
  const pAnos = anos > 0 ? `${anos} ano${anos > 1 ? 's' : ''}` : ''
  const pMeses = resto > 0 ? `${resto} ${resto > 1 ? 'meses' : 'mês'}` : ''
  return [pAnos, pMeses].filter(Boolean).join(' e ') || 'menos de 1 mês'
}

// Linhas mensais comparativas por ano + painel "TOTAIS POR ANO".
function mensalPorAno(rows) {
  const { anos, data } = comparativoAnualPorMes(rows)
  return {
    dados: data,
    series: anos,
    colunas: [
      { key: 'mes', label: 'Mês' },
      ...anos.map((a) => ({ key: a, label: a })),
    ],
    painelAnos: {
      titulo: 'TOTAIS POR ANO',
      itens: totaisAnuais(rows).map((t) => ({ ano: t.label, valor: t.value })),
    },
  }
}

// Unidade da NORCREST a partir do nome (fisc: "NORCREST - NCR" / "NORCREST/NCR").
function unidadeNorcrest(nome) {
  const m = String(nome || '').match(/NORCREST\s*[-–/]*\s*(.+)$/i)
  if (!m) return null
  const u = m[1].replace(/^[-–/\s]+/, '').trim().toUpperCase()
  return u ? normUnidadeNorcrest(u) : null
}

// ── Slide 9: categorias FIXAS por tipo de processo ─────────────────────────
// Tudo que não está na lista soma em "Expansão/Implantação" (com a composição
// exposta num popover, como o "Outros" da Visão Geral do Sistema Geo).
const CATEGORIAS_TIPO_PROCESSO = [
  'Emergência',
  'Ligação Domiciliar',
  'Manutenção Preventiva',
  'Manutenção Corretiva',
  'Demais Serviços',
]
const BUCKET_EXPANSAO = 'Expansão/Implantação'

function porTipoProcessoFixo(rows) {
  const counts = new Map(CATEGORIAS_TIPO_PROCESSO.map((c) => [c, 0]))
  const bucket = new Map() // tipo original → contagem (composição da Expansão)
  for (const r of rows) {
    const t = r.tipo_processo_nome || r.tipo_processo || '(sem tipo)'
    if (counts.has(t)) counts.set(t, counts.get(t) + 1)
    else bucket.set(t, (bucket.get(t) || 0) + 1)
  }
  const totalBucket = Array.from(bucket.values()).reduce((s, n) => s + n, 0)
  const total = rows.length
  const dados = [
    ...Array.from(counts.entries()).map(([nome, valor]) => ({
      nome,
      valor,
      pct: pct(valor, total),
    })),
    { nome: BUCKET_EXPANSAO, valor: totalBucket, pct: pct(totalBucket, total) },
  ].sort((a, b) => b.valor - a.valor)
  const composicao = Array.from(bucket.entries())
    .map(([nome, valor]) => ({ nome, valor, pct: pct(valor, totalBucket) }))
    .sort((a, b) => b.valor - a.valor)
  return { dados, composicao }
}

// ── Rankings por permissionária (barras multi-permissionária) ───────────────
// Devolvem a POPULAÇÃO COMPLETA ordenada; o renderer mostra uma janela de
// `janela` barras e, com permissionária selecionada, desloca a janela até ela.
function rankingTotalVsEmerg(rows) {
  const map = new Map()
  for (const r of rows) {
    const k = consolidarNorcrest(r.permissionaria)
    if (!k) continue
    if (!map.has(k)) map.set(k, { nome: k, total: 0, emergencia: 0 })
    const o = map.get(k)
    o.total++
    if (ehEmergencia(r)) o.emergencia++
  }
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .map((o) => ({ ...o, pct_emerg: pct1(o.emergencia, o.total) }))
}

// ── O seed ───────────────────────────────────────────────────────────────
export const MODELO_INSTITUCIONAL = {
  nome: 'Apresentação Geral OBRAS',
  descricao:
    'Modelo espelhando a apresentação institucional do Departamento (rev. 2026.03).',
  slides: [
    // — Abertura / institucional —
    { n: 1, titulo: 'Capa — OBRAS', categoria: 'texto', tipo: 'capa',
      texto: 'OBRAS', sub: 'Departamento de Controle de Uso de Vias Públicas' },
    { n: 2, titulo: 'Atribuições do Departamento', categoria: 'texto', tipo: 'timeline',
      tituloInterno: 'OBRAS',
      subtitulo: 'Departamento de Controle de Uso de Vias Públicas',
      texto: '01 SISTEMA GEO · 02 Compatibilizações de Obras e Serviços · 03 Monitoramento · 04 Fiscalização de obras e serviços com interferência · 05 Indicadores.',
      blocos: [
        { num: '01', titulo: 'SISTEMA GEO', texto: 'Inserção de projetos; análise das informações inseridas no projeto; análise de possíveis interferências.' },
        { num: '02', titulo: 'Compatibilizações de Obras e Serviços', texto: 'Recapeamento, requalificação de calçadas, ciclovias, ciclofaixas, faixa exclusiva e corredor de ônibus.' },
        { num: '03', titulo: 'Monitoramento', texto: 'Monitoramento das informações e visualização das obras em andamento.' },
        { num: '04', titulo: 'Fiscalização de obras e serviços com interferência', texto: 'Visitas e relatórios técnicos e ensaios tecnológicos; comunicação constante com as permissionárias; acompanhamento de cronogramas; pós-obra.' },
        { num: '05', titulo: 'Indicadores', texto: 'Visão ampla dos processos e das obras e serviços realizados; clareza das estratégias implementadas; assertividade na tomada de decisão.' },
      ] },
    { n: 3, titulo: 'Marco legal — Decretos', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'MARCO LEGAL',
      texto: 'Decreto nº 59.108 (26/11/2019) — institui o SISTEMA GEO · Decreto nº 58.756 (16/05/2019) — reparação de pavimentos · Decreto nº 59.671 (07/08/2020) — padronização de calçadas.',
      blocos: [
        { estilo: 'navy', titulo: 'DECRETO Nº 59.108', sub: 'De 26 de Novembro de 2019', texto: 'Regulamenta o procedimento eletrônico de emissão de autorizações para execução de obras e serviços de infraestrutura urbana, consoante a Lei nº 13.614/2003, e institui o Sistema de Gestão de Infraestrutura Urbana — SISTEMA GEO.' },
        { estilo: 'navy', titulo: 'DECRETO Nº 58.756', sub: 'De 16 de Maio de 2019', texto: 'Estabelece critérios adicionais para a execução de reparação de pavimentos flexíveis, de concreto e articulados danificados por obras de infraestrutura urbana executadas em todas as vias públicas.' },
        { estilo: 'navy', titulo: 'DECRETO Nº 59.671', sub: 'De 07 de Agosto de 2020', texto: 'Consolida os critérios para a padronização das calçadas e regulamenta o disposto nos incisos VII e VIII do art. 240 do Plano Diretor Estratégico, o Capítulo III da Lei nº 15.442/2011 e a Lei nº 13.293/2002.' },
      ] },
    { n: 4, titulo: 'Conservação de Pavimento — fluxo de análise', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'CONSERVAÇÃO DE PAVIMENTO',
      texto: 'Análise de interferências dos projetos das concessionárias/permissionárias com os programas da Prefeitura: solicitação de adequação → análise minuciosa → consulta ao Consemavi → autorização com fiscalização.',
      blocos: [
        { estilo: 'claro', full: true, titulo: 'Análise de interferências dos projetos das Concessionárias/Permissionárias com os programas da Prefeitura', texto: 'Programa de Recapeamento Asfáltico · Requalificação de Calçadas · Requalificação de Ciclovias/Ciclofaixas · Requalificação das Faixas Exclusivas de Ônibus · Requalificação dos Corredores de Ônibus' },
        { estilo: 'claro', titulo: 'Solicitação de adequação do projeto', texto: 'de maneira a minimizar os impactos no pavimento' },
        { estilo: 'claro', titulo: 'Consultar CONSEMAVI', texto: '(Conservação da Malha Viária) quando necessário' },
        { estilo: 'claro', titulo: 'Analisar minuciosamente os projetos', texto: 'revisados e/ou justificativas enviadas pela não possibilidade de adequação' },
        { estilo: 'claro', titulo: 'Autorizar o processo', texto: 'com a devida FISCALIZAÇÃO' },
      ] },
    { n: 5, titulo: 'Conservação de Pavimento — fluxo de fiscalização', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'CONSERVAÇÃO DE PAVIMENTO',
      subtitulo: 'FISCALIZAÇÃO',
      texto: 'Com o cronograma, monta-se o plano de acompanhamento da obra; análise técnica em campo e contato constante com a permissionária até a readequação conforme normas; ao fim, os relatórios técnicos ficam registrados no Departamento.',
      blocos: [
        { estilo: 'claro', texto: 'Com o posterior recebimento do CRONOGRAMA, é montado um plano de ACOMPANHAMENTO DA OBRA (contemplando dia e horário das visitas em campo).' },
        { estilo: 'claro', texto: 'Ao longo dessa etapa, o CONTATO COM A PERMISSIONÁRIA/CONCESSIONÁRIA É CONSTANTE, requisitando as devidas providências até a conclusão dos serviços, readequando-os DE ACORDO COM AS NORMAS VIGENTES.' },
        { estilo: 'claro', texto: 'Direcionado à equipe de campo, é realizada a ANÁLISE TÉCNICA DO LOCAL e repassadas à OBRAS INFORMAÇÕES PERIÓDICAS, para que medidas de readequação sejam tomadas ao longo da execução dos serviços.' },
        { estilo: 'claro', texto: 'Após o término dos acompanhamentos e readequação de todos os reparos, OS RELATÓRIOS TÉCNICOS DA OBRA FICAM REGISTRADOS NO CONTROLE DO DEPARTAMENTO para futuras consultas.' },
      ] },
    { n: 6, titulo: 'Divisória — SISTEMA GEO', categoria: 'texto', tipo: 'capa',
      texto: 'SISTEMA GEO', sub: 'SMSUB' },

    // — Sistema Geo (dados) —
    { n: 7, titulo: 'Sistema Geo — Visão Geral', categoria: 'dados', tipo: 'kpis',
      tituloInterno: 'VISÃO GERAL',
      fonte: 'geo', agregacao: 'geo_visao_geral',
      manuais: ['Usuários cadastrados no Sistema Geo'] },
    { n: 8, titulo: 'Processos por Permissionária', categoria: 'dados', tipo: 'barra',
      tituloInterno: 'PROCESSOS | POR PERMISSIONÁRIA',
      fonte: 'geo', agregacao: 'geo_por_permissionaria', config: { topN: 10 } },
    { n: 9, titulo: 'Processos por Tipo de Processo', categoria: 'dados', tipo: 'pizza',
      tituloInterno: 'PROCESSOS | POR TIPO DE PROCESSO',
      fonte: 'geo', agregacao: 'geo_por_tipo_processo' },
    { n: 10, titulo: 'Processos — Controle Mensal', categoria: 'dados', tipo: 'linha_mensal',
      tituloInterno: 'PROCESSOS | CONTROLE MENSAL',
      fonte: 'geo', agregacao: 'geo_controle_mensal' },
    { n: 11, titulo: 'Protocolos de Emergência', categoria: 'dados', tipo: 'linha_mensal',
      tituloInterno: 'PROTOCOLOS DE EMERGÊNCIA',
      fonte: 'geo', agregacao: 'geo_emerg_mensal' },
    { n: 12, titulo: 'Obras/Serviços de Emergência (Total × Emergência)', categoria: 'dados', tipo: 'barra_dupla',
      tituloInterno: 'OBRAS/SERVIÇOS DE EMERGÊNCIA',
      fonte: 'geo', agregacao: 'geo_total_vs_emerg', config: { topN: 10 } },
    { n: 13, titulo: 'Emergências × Manutenção Corretiva', categoria: 'dados', tipo: 'barra_dupla',
      tituloInterno: 'EMERGÊNCIAS/MANUTENÇÃO CORRETIVA',
      fonte: 'geo', agregacao: 'geo_emerg_vs_corretiva', config: { topN: 10 } },
    { n: 14, titulo: 'Comparativo de Autorizações', categoria: 'dados', tipo: 'linha_mensal',
      tituloInterno: 'COMPARATIVO DE AUTORIZAÇÕES', painelPos: 'topo',
      fonte: 'geo', agregacao: 'geo_autorizacoes_anual' },
    { n: 15, titulo: 'Comparativo de Emergências', categoria: 'dados', tipo: 'linha_mensal',
      tituloInterno: 'COMPARATIVO DE EMERGÊNCIAS', painelPos: 'topo',
      fonte: 'geo', agregacao: 'geo_emerg_anual' },
    { n: 16, titulo: 'Obras/Serviços de Emergência — comparativo anual', categoria: 'dados', tipo: 'barra',
      tituloInterno: 'OBRAS/SERVIÇOS DE EMERGÊNCIA',
      subtitulo: 'COMPARATIVO ANUAL DE EMERGÊNCIAS',
      fonte: 'geo', agregacao: 'geo_emerg_barra_anual' },
    { n: 17, titulo: 'Protocolos Emergência NORCREST por unidade', categoria: 'dados', tipo: 'barra_dupla',
      tituloInterno: 'PROTOCOLOS DE EMERGÊNCIA – NORCREST',
      fonte: 'emerg', agregacao: 'emerg_norcrest_por_unidade' },
    { n: 18, titulo: 'Total de Processos por Região', categoria: 'dados', tipo: 'regioes',
      tituloInterno: 'TOTAL DE PROCESSOS POR REGIÃO',
      fonte: 'geo', agregacao: 'geo_por_regiao' },

    // — Fiscalização (dados) —
    { n: 19, titulo: 'Divisória — FISCALIZAÇÃO', categoria: 'texto', tipo: 'capa',
      texto: 'FISCALIZAÇÃO', sub: 'SMSUB' },
    { n: 20, titulo: 'Fiscalização — visão geral', categoria: 'dados', tipo: 'pizza',
      tituloInterno: 'FISCALIZAÇÃO',
      fonte: 'fisc', agregacao: 'fisc_leg_vs_nc' },
    { n: 20.1, titulo: 'Fiscalização — Solucionados por trimestre', categoria: 'dados', tipo: 'barra',
      tituloInterno: 'FISCALIZAÇÃO', subtitulo: 'SOLUCIONADOS | ACUMULADO TRIMESTRAL',
      fonte: 'fisc', agregacao: 'fisc_soluc_trimestral' },
    { n: 21, titulo: 'Avanço do Controle Tecnológico', categoria: 'dados', tipo: 'linha_trimestral',
      tituloInterno: 'FISCALIZAÇÃO', subtitulo: 'AVANÇO DO CONTROLE TECNOLÓGICO',
      fonte: 'fisc', agregacao: 'fisc_avanco' },
    // (slide 22 — Avanço NORCREST — removido: o seletor de permissionária cobre)
    { n: 23, titulo: 'NORCREST — Análise por Metragem', categoria: 'dados', tipo: 'quadros',
      tituloInterno: 'FISCALIZAÇÃO | NORCREST', subtitulo: 'ANÁLISE POR METRAGEM',
      fonte: 'fisc', agregacao: 'fisc_metragem_norcrest',
      input: { campo: 'multaM2', rotulo: 'Valor da multa por m² (R$)' } },

    // — Pavimentação asfáltica / economia —
    { n: 24, titulo: 'Pavimentação Asfáltica — Concessionárias', categoria: 'dados', tipo: 'quadros',
      tituloInterno: 'PAVIMENTAÇÃO ASFÁLTICA – CONCESSIONÁRIAS',
      fonte: 'fisc', agregacao: 'fisc_recomposicao',
      input: { campo: 'custoM2', rotulo: 'Custo da recomposição asfáltica por m² (R$)' } },
    { n: 25, titulo: 'Pavimentação Asfáltica — NORCREST (CERP)', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'PAVIMENTAÇÃO ASFÁLTICA – NORCREST',
      texto: 'Termo de Cooperação — recapeamento NORCREST: área aproximada 1,5 milhão m² · 308 mil vias · economia R$ 374,3 milhões. CERP — Centro Ecológico de Reciclagem do Pavimento (Vila Leopoldina): RCC/RAP espumado para camadas de sub-base.',
      blocos: [
        { estilo: 'navy', titulo: 'TERMO DE COOPERAÇÃO – RECAPEAMENTO NORCREST', linhas: [
          { rotulo: 'Área aproximada', valor: '1,5 milhões m²' },
          { rotulo: 'Total aproximado de vias', valor: '308 mil' },
        ] },
        { estilo: 'navy', titulo: 'CERP – CENTRO ECOLÓGICO DE RECICLAGEM DO PAVIMENTO', texto: 'Local da instalação: Vila Leopoldina. Material produzido: RCC espumado (resíduo da construção civil) e RAP espumado (material das obras e serviços de pavimentação) — materiais sustentáveis para as camadas de sub-base.' },
        { estilo: 'amarelo', full: true, texto: 'Estimativa de Economia: R$ 374,3 MILHÕES' },
      ] },
    { n: 26, titulo: 'Termo de Cooperação — NORCREST', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'TERMO DE COOPERAÇÃO – NORCREST',
      texto: 'Termo 2020: 133 vias · 74.950,00 m de extensão · 702.432,30 m² · economia R$ 175.608.075,00. Termo 2022: 175 vias · 95.386,09 m · 794.813,48 m² · economia R$ 198.703.370,00. Total: R$ 374,3 milhões.',
      blocos: [
        { estilo: 'navy', titulo: 'TERMO 2020', linhas: [
          { rotulo: 'Quantidade de vias', valor: '133' },
          { rotulo: 'Extensão Total (m)', valor: '74.950,00' },
          { rotulo: 'Área Total (m²)', valor: '702.432,30' },
          { rotulo: 'Estimativa de Economia', valor: 'R$ 175.608.075,00' },
        ] },
        { estilo: 'navy', titulo: 'TERMO 2022', linhas: [
          { rotulo: 'Quantidade de vias', valor: '175' },
          { rotulo: 'Extensão Total (m)', valor: '95.386,09' },
          { rotulo: 'Área Total (m²)', valor: '794.813,48' },
          { rotulo: 'Estimativa de Economia', valor: 'R$ 198.703.370,00' },
        ] },
        { estilo: 'amarelo', full: true, texto: 'ESTIMATIVA TOTAL DE ECONOMIA: R$ 374,3 MILHÕES' },
      ] },
    { n: 27, titulo: 'Pavimentação Asfáltica 2019–2026 (concessionárias + Termo)', categoria: 'dados', tipo: 'quadros',
      tituloInterno: 'PAVIMENTAÇÃO ASFÁLTICA – CONCESSIONÁRIAS', subtitulo: '2019 – 2026',
      fonte: 'fisc', agregacao: 'fisc_recomposicao_total',
      input: { campo: 'custoM2', rotulo: 'Custo da recomposição asfáltica por m² (R$)' } },
    { n: 28, titulo: 'Pavimentação Asfáltica 2019–2026 (NORCREST + Termo)', categoria: 'dados', tipo: 'quadros',
      tituloInterno: 'PAVIMENTAÇÃO ASFÁLTICA – NORCREST', subtitulo: '2019 – 2026',
      fonte: 'fisc', agregacao: 'fisc_recomposicao_norcrest',
      input: { campo: 'custoM2', rotulo: 'Custo da recomposição asfáltica por m² (R$)' } },

    // — Fiscalização detalhada —
    { n: 29, titulo: 'Fiscalização — Laudos × NC por permissionária', categoria: 'dados', tipo: 'barra_dupla',
      tituloInterno: 'FISCALIZAÇÃO',
      fonte: 'fisc', agregacao: 'fisc_laudos_vs_nc', config: { topN: 10 },
      manuais: ['Tempo médio de resposta da NORCREST (dias)'] },
    { n: 30, titulo: 'Fiscalização — NC × Em andamento por permissionária', categoria: 'dados', tipo: 'barra_dupla',
      tituloInterno: 'FISCALIZAÇÃO',
      fonte: 'fisc', agregacao: 'fisc_nc_vs_andamento', config: { topN: 10 } },
    { n: 31, titulo: 'Fiscalização NORCREST — NC × Em andamento por unidade', categoria: 'dados', tipo: 'barra_dupla',
      tituloInterno: 'FISCALIZAÇÃO | NORCREST',
      fonte: 'fisc', agregacao: 'fisc_nc_vs_andamento_norcrest' },
    { n: 32, titulo: 'Fiscalização — Tipo de Falhas', categoria: 'dados', tipo: 'barra_horizontal',
      tituloInterno: 'FISCALIZAÇÃO – TIPO DE FALHAS',
      fonte: 'fisc', agregacao: 'fisc_tipos_falha' },
    { n: 33, titulo: 'Fiscalização — Tipo de Falhas (destaques)', categoria: 'dados', tipo: 'cards_falha',
      tituloInterno: 'FISCALIZAÇÃO – TIPO DE FALHAS',
      fonte: 'fisc', agregacao: 'fisc_tipos_falha_kpis' },
    { n: 34, titulo: 'Fiscalização — Classificação Viária', categoria: 'dados', tipo: 'pizzas_viaria',
      tituloInterno: 'FISCALIZAÇÃO', subtitulo: 'ANÁLISE POR CLASSIFICAÇÃO VIÁRIA',
      fonte: 'fisc', agregacao: 'fisc_classificacao_viaria' },
    // (slides 35, 36 e 37 removidos por decisão de 03/07 — variações de
    //  classificação viária redundantes com o 34 + seletor de permissionária)

    // — Laudos por região / multas (PDF completo, páginas 38–52) —
    { n: 38, titulo: 'Laudos Técnicos por Região', categoria: 'dados', tipo: 'regioes',
      tituloInterno: 'LAUDOS TÉCNICOS POR REGIÃO',
      fonte: 'fisc', agregacao: 'fisc_por_regiao' },
    { n: 39, titulo: 'Laudos em andamento por Região', categoria: 'dados', tipo: 'regioes',
      tituloInterno: 'LAUDOS TÉCNICOS POR REGIÃO',
      fonte: 'fisc', agregacao: 'fisc_andamento_por_regiao' },
    { n: 40, titulo: 'Multas Aplicadas', categoria: 'futuro', tipo: 'quadros',
      tituloInterno: 'MULTAS APLICADAS',
      texto: 'Total de multas lavradas pelo controle tecnológico (CORBETT): 7.911 · Área total 168 mil m² · Valor aplicado: R$ 511,7 milhões. Dado ainda não existe no sistema.',
      blocos: [
        { estilo: 'navy', full: true, titulo: 'TOTAL DE MULTAS LAVRADAS DE ACORDO COM AS INFRAÇÕES IDENTIFICADAS PELO CONTROLE TECNOLÓGICO', linhas: [
          { rotulo: 'CORBETT', valor: '7.911' },
          { rotulo: 'Área Total (m²)', valor: '168 mil' },
        ] },
        { estilo: 'navy', full: true, titulo: 'VALOR APLICADO COM AS RESPECTIVAS MULTAS', texto: 'R$ 511,7 MILHÕES' },
      ] },
    { n: 41, titulo: 'Multas Aplicadas — NORCREST', categoria: 'futuro', tipo: 'quadros',
      tituloInterno: 'MULTAS APLICADAS | NORCREST',
      texto: 'Total de multas da NORCREST lavradas pelo controle tecnológico (CORBETT): 7.718 · Área total 165,3 mil m² · Valor aplicado: R$ 499 milhões. Dado ainda não existe no sistema.',
      blocos: [
        { estilo: 'navy', full: true, titulo: 'TOTAL DE MULTAS DA NORCREST LAVRADAS DE ACORDO COM AS INFRAÇÕES IDENTIFICADAS PELO CONTROLE TECNOLÓGICO', linhas: [
          { rotulo: 'CORBETT', valor: '7.718' },
          { rotulo: 'Área Total (m²)', valor: '165,3 mil' },
        ] },
        { estilo: 'navy', full: true, titulo: 'VALOR APLICADO COM AS RESPECTIVAS MULTAS', texto: 'R$ 499 MILHÕES' },
      ] },

    // — Compatibilização de obras —
    { n: 42, titulo: 'Divisória — Compatibilização de Obras', categoria: 'texto', tipo: 'capa',
      texto: 'COMPATIBILIZAÇÃO DE OBRAS', sub: 'SMSUB' },
    { n: 43, titulo: 'Compatibilização de Obras de Recape', categoria: 'futuro', tipo: 'quadros',
      tituloInterno: 'COMPATIBILIZAÇÃO DE OBRAS DE RECAPE',
      texto: 'Total de análises de compatibilização: 4.298 — aprovados 3.456 (80%) e paralisados 842 (20%). Principais permissionárias com processos paralisados: WINSLOW 364, NORCREST 331, HARGROVE 37, KELLARD 37, ASTRIX 16. Dado ainda não existe no sistema.',
      blocos: [
        { estilo: 'navy', full: true, titulo: 'TOTAL DE ANÁLISE DE COMPATIBILIZAÇÃO DE OBRAS', texto: '4.298' },
        { estilo: 'navy', titulo: 'APROVADOS', texto: '3.456 (80%)' },
        { estilo: 'vermelho', titulo: 'PARALISADOS', texto: '842 (20%)' },
        { estilo: 'claro', full: true, titulo: 'Processos paralisados por permissionária (10+)', texto: 'WINSLOW 364 · NORCREST 331 · HARGROVE 37 · KELLARD 37 · ASTRIX 16 · DORVAL 9 · MERRICK NET 5 · SOLVANE TELECOM 5 · TARRANT 5 · QUILLNET 4' },
      ] },
    { n: 44, titulo: 'GT de Planejamento — NORCREST/WINSLOW', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'COMPATIBILIZAÇÃO DE OBRAS', subtitulo: 'GT DE PLANEJAMENTO | NORCREST – WINSLOW',
      texto: 'Grupo de Trabalho de planejamento com NORCREST e WINSLOW: primeira vez realizado no município; em cerca de 4 anos, mais de 2.284 obras compatibilizadas; 81% das vias compatibilizadas com o programa de recapeamento; danos ao pavimento evitados equivalentes a R$ 3,6 milhões.',
      blocos: [
        { estilo: 'claro', titulo: '1ª vez', texto: 'realizado no município' },
        { estilo: 'claro', titulo: 'Cerca de 4 anos', texto: 'de atividade do Grupo de Trabalho' },
        { estilo: 'navy', titulo: 'MAIS DE 2.284', texto: 'obras compatibilizadas' },
        { estilo: 'navy', titulo: '81%', texto: 'das vias compatibilizadas com programa de recapeamento' },
        { estilo: 'amarelo', full: true, texto: 'Município, junto às concessionárias, evitou danos ao pavimento equivalentes a R$ 3,6 MILHÕES' },
      ] },

    // — Integrações (GeoSampa / GAIA) —
    { n: 45, titulo: 'Divisória — Integração GeoSampa', categoria: 'texto', tipo: 'capa',
      texto: 'INTEGRAÇÃO GEOSAMPA', sub: 'SMSUB' },
    { n: 46, titulo: 'Integração Sistema Geo com GeoSampa', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'INTEGRAÇÃO SISTEMA GEO COM GEOSAMPA',
      texto: 'As obras e autorizações do Sistema Geo passam a ser visualizadas no GeoSampa (Mapa Digital da Cidade de São Paulo), junto às demais camadas oficiais do município. No PPT, este slide usa uma captura de tela do GeoSampa.',
      blocos: [
        { estilo: 'claro', full: true, titulo: 'GeoSampa — Mapa Digital da Cidade de São Paulo', texto: 'As camadas do Sistema Geo (obras e autorizações em via pública) integram o mapa oficial do município, ao lado de limites administrativos, sistema viário, infraestrutura urbana e demais camadas. ✍️ Usar a captura de tela do GeoSampa do PPT original.' },
      ] },
    { n: 47, titulo: 'Divisória — Integração Sistema Geo–GAIA', categoria: 'texto', tipo: 'capa',
      texto: 'INTEGRAÇÃO SISTEMA GEO – GAIA', sub: 'SMSUB' },
    { n: 48, titulo: 'Sistema Geo (imagem institucional)', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'SISTEMA GEO',
      texto: 'Slide de imagem institucional do Sistema Geo (foto da cidade). Usar a arte do PPT original.',
      blocos: [
        { estilo: 'claro', full: true, titulo: 'SISTEMA GEO', texto: '✍️ Slide de imagem institucional (foto da cidade + logo do Sistema Geo) — usar a arte do PPT original.' },
      ] },
    { n: 49, titulo: 'GAIA — vídeo demonstrativo', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'GAIA',
      texto: 'Vídeo demonstrativo das detecções dos elementos (imagens de satélite). Acesso: https://gaia.prefeitura.sp.gov.br/',
      blocos: [
        { estilo: 'navy', full: true, titulo: 'VÍDEO DEMONSTRATIVO DAS DETECÇÕES DOS ELEMENTOS', texto: '✍️ No PPT, este slide traz o vídeo/imagem de satélite do GAIA. Acesso: https://gaia.prefeitura.sp.gov.br/' },
      ] },
    { n: 50, titulo: 'Compatibilização de Obras — GAIA (integração)', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'COMPATIBILIZAÇÃO DE OBRAS',
      texto: 'O GAIA conecta SMSUB, SMT, SIURB, SPObras, SPUrbanismo, SME e o Sistema Geo (permissionárias/concessionárias) para análise em tempo real e compatibilização das obras. Antes do Sistema Geo não havia essa compatibilização.',
      blocos: [
        { estilo: 'navy', full: true, titulo: 'ANÁLISE EM TEMPO REAL → OBRAS COMPATIBILIZADAS', texto: 'O GAIA integra SMSUB · SMT · SIURB · SPOBRAS · SPURBANISMO · SME · SISTEMA GEO (permissionárias e concessionárias).' },
        { estilo: 'claro', full: true, texto: 'Anteriormente ao Sistema Geo NÃO havia essa compatibilização.' },
      ] },
    { n: 51, titulo: 'Compatibilização de Obras — fluxo SMSUB → Concessionárias', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'COMPATIBILIZAÇÃO DE OBRAS',
      texto: 'SMSUB (manutenção de conservação de malha viária; requalificação de calçada; sugestão de prazo: 40 dias) → OBRAS → concessionárias (NORCREST, WINSLOW, HARGROVE, VELMONT e demais) → obras compatibilizadas.',
      blocos: [
        { estilo: 'navy', titulo: 'SMSUB', texto: '1. Manutenção de Conservação de Malha Viária · 2. Requalificação de Calçada. Sugestão de prazo: 40 dias.' },
        { estilo: 'navy', titulo: 'CONCESSIONÁRIAS', texto: 'NORCREST · WINSLOW · HARGROVE · VELMONT · … demais empresas' },
        { estilo: 'claro', full: true, texto: 'SMSUB → OBRAS → Concessionárias → OBRAS COMPATIBILIZADAS' },
      ] },
    { n: 52, titulo: 'Encerramento — OBRAS', categoria: 'texto', tipo: 'capa',
      texto: 'OBRAS', sub: 'Departamento de Controle de Uso de Vias Públicas — OBRIGADO!' },
  ],
}

// Classificação viária: 3 grupos (Local/Coletora/Arterial) com Leg/NC/Solucionado.
function classificacaoViaria(rows) {
  const norm = (v) => String(v || '').trim().toUpperCase()
  const grupos = ['LOCAL', 'COLETORA', 'ARTERIAL']
  return grupos.map((g) => {
    const sub = rows.filter((r) => norm(r.classificacao_viaria) === g)
    const k = calcularKPIsPBI(sub)
    return {
      nome: g.charAt(0) + g.slice(1).toLowerCase(),
      total: sub.length,
      leg_atendida: k.legAtendida,
      nao_atendida: k.naoConform,
      solucionados: k.solucionados,
      em_andamento: k.emAndamento,
      pct_leg: k.pctLegAtendida,
      pct_nc: k.pctNaoConform,
    }
  })
}

// Recomposições (legislação atendida): área somada + vias distintas + economia.
// ⚠️ Não há coluna de NOME de via na fiscalização — `id_origem` é a chave
// "PROCESSOS/VIA" da planilha (1 processo ≈ 1 via), usada como contagem.
function recomposicaoLegAtendida(rows, custoM2) {
  const leg = rows.filter((r) => r.legislacao_atendida)
  let area = 0
  const vias = new Set()
  for (const r of leg) {
    area += Number(r.area_m2) || 0
    if (r.id_origem) vias.add(String(r.id_origem).trim())
  }
  const economia = custoM2 > 0 ? area * custoM2 : null
  return { area, nVias: vias.size, economia }
}

// Monta o quadro navy de recomposições (slides 24/27/28).
function blocoRecomposicao(titulo, rec) {
  return {
    estilo: 'navy',
    titulo,
    linhas: [
      { rotulo: 'Área aproximada (legislação atendida)', valor: `${fmtAreaDecimal(rec.area)} m²` },
      { rotulo: 'Total aproximado de vias', valor: fmtNumero(rec.nVias) },
      { rotulo: 'Estimativa de economia', valor: rec.economia != null ? fmtReais(rec.economia) : '— informe o custo por m²' },
    ],
  }
}
const BLOCO_TERMO = {
  estilo: 'navy',
  titulo: 'TERMO DE COOPERAÇÃO – RECAPEAMENTO NORCREST',
  linhas: [
    { rotulo: 'Área recapeada', valor: TERMO_NORCREST.area },
    { rotulo: 'Total aproximado de vias', valor: TERMO_NORCREST.vias },
    { rotulo: 'Estimativa de economia', valor: TERMO_NORCREST.economiaTexto },
  ],
}

// ── O resolvedor ─────────────────────────────────────────────────────────
export function resolverDadosSlide(slide, bases = {}, opcoes = {}) {
  const cat = CATEGORIA[slide.categoria] || CATEGORIA.dados
  const permSel = opcoes.permissionaria || null
  const base = {
    n: slide.n,
    titulo: slide.titulo,
    categoria: slide.categoria,
    catInfo: cat,
    tipo: slide.tipo,
    texto: slide.texto || null,
    sub: slide.sub || null,
    tituloInterno: slide.tituloInterno || null,
    subtitulo: slide.subtitulo || null,
    blocos: slide.blocos || null,
    painelPos: slide.painelPos || 'lado',
    manuais: slide.manuais || null,
    input: slide.input || null,
    permSelecionada: permSel,
  }

  if (slide.categoria === 'texto' || slide.categoria === 'futuro') {
    return base
  }

  const geoAll = bases.geo || []
  const fiscAll = bases.fisc || []
  const emerg = bases.emerg || []
  // Bases filtradas pelo seletor (slides "gerais"); rankings usam a completa.
  const geo = filtrarPerm(geoAll, permSel)
  const fisc = filtrarPerm(fiscAll, permSel)
  const cfg = slide.config || {}

  switch (slide.agregacao) {
    // ── Sistema Geo ──────────────────────────────────────────────────────────
    case 'geo_visao_geral': {
      const permissionarias = new Set(
        geo.map((r) => r.permissionaria).filter(Boolean)
      ).size
      // Executantes/executoras distintas registradas nos processos.
      const executoras = new Set(
        geo.map((r) => String(r.executora || '').trim().toUpperCase()).filter(Boolean)
      ).size
      const spanMeses = (() => {
        let min = null
        let max = null
        for (const r of geo) {
          const d = r.data_cadastro
          if (!d) continue
          if (!min || d < min) min = d
          if (!max || d > max) max = d
        }
        if (!min) return 0
        return Math.max(
          1,
          (+max.slice(0, 4) - +min.slice(0, 4)) * 12 +
            (+max.slice(5, 7) - +min.slice(5, 7)) +
            1
        )
      })()
      const kpis = [
        { rotulo: 'Quantidade de permissionárias/concessionárias cadastradas no Sistema Geo', valor: permissionarias, icone: 'predio' },
        { rotulo: 'Quantidade de executantes cadastrados no Sistema Geo', valor: executoras, icone: 'executante' },
        { rotulo: 'Quantidade de obras registradas no Sistema Geo', valor: geo.length, icone: 'obra' },
        {
          rotulo: 'Quantidade média de obras registradas no Sistema Geo',
          icone: 'calendario',
          duplo: [
            { rotulo: 'Mensal', valor: spanMeses ? Math.round(geo.length / spanMeses) : 0 },
            { rotulo: 'Diária', valor: mediaDiaria(geo) },
          ],
        },
      ]
      for (const m of slide.manuais || [])
        kpis.push({ rotulo: m, valor: null, manual: true, icone: 'usuarios' })
      return { ...base, kpis }
    }
    case 'geo_por_permissionaria': {
      // Ranking COMPLETO (o renderer janela/destaca).
      const counts = new Map()
      for (const r of geoAll) {
        const k = consolidarNorcrest(r.permissionaria)
        if (!k) continue
        counts.set(k, (counts.get(k) || 0) + 1)
      }
      const dados = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([nome, valor]) => ({ nome, valor }))
      const nNorcrest = geoAll.filter(ehNorcrest).length
      return {
        ...base,
        dados,
        janela: cfg.topN || 10,
        destaqueNome: permSel,
        colunas: [{ key: 'nome', label: 'Permissionária' }, { key: 'valor', label: 'Processos' }],
        contexto: [{ rotulo: 'Total de protocolos no SistemaGeo', valor: fmtNumero(geoAll.length) }],
        // Marco fixo: o Sistema Geo entrou em operação em dezembro/2019.
        painelTexto: spanDesde('2019-12', geoAll, 'data_cadastro') ? `${spanDesde('2019-12', geoAll, 'data_cadastro')} de Sistema Geo` : null,
        destaques: [{ valor: `${pct(nNorcrest, geoAll.length)}%`, texto: 'das obras e serviços registradas no Sistema Geo são motivadas pela NORCREST' }],
      }
    }
    case 'geo_por_tipo_processo': {
      const { dados, composicao } = porTipoProcessoFixo(geo)
      const emergs = geo.filter(ehEmergencia)
      const emergNorcrest = emergs.filter(ehNorcrest).length
      return {
        ...base,
        dados,
        composicao,
        colunas: [{ key: 'nome', label: 'Tipo de processo' }, { key: 'valor', label: 'Processos' }, { key: 'pct', label: '%' }],
        contexto: [{ rotulo: 'Total de protocolos no SistemaGeo', valor: fmtNumero(geo.length) }],
        destaques: permSel
          ? null
          : [{ valor: `${pct(emergNorcrest, emergs.length)}%`, texto: 'das obras de EMERGÊNCIA são motivadas pela NORCREST' }],
      }
    }
    case 'geo_controle_mensal': {
      return {
        ...base,
        ...mensalPorAno(geo),
        contexto: [{ rotulo: 'Total de protocolos no SistemaGeo', valor: fmtNumero(geo.length) }],
      }
    }
    case 'geo_emerg_mensal': {
      // Emergências de TODAS as permissionárias (correção do modelo, 03/07).
      const rows = geo.filter(ehEmergencia)
      return {
        ...base,
        ...mensalPorAno(rows),
        contexto: [
          { rotulo: 'Total de protocolos no Sistema Geo', valor: fmtNumero(geo.length) },
          { rotulo: "Total de protocolos de 'Emergência' no Sistema Geo", valor: fmtNumero(rows.length) },
        ],
      }
    }
    case 'geo_total_vs_emerg': {
      const dados = rankingTotalVsEmerg(geoAll)
      const nEmerg = geoAll.filter(ehEmergencia).length
      const norcrest = geoAll.filter(ehNorcrest)
      const norcrestEmerg = norcrest.filter(ehEmergencia).length
      return {
        ...base,
        dados,
        janela: cfg.topN || 10,
        destaqueNome: permSel,
        listaLateral: { pctKey: 'pct_emerg', titulo: '% EMERGÊNCIA / TOTAL' },
        destaquePos: 'topo',
        colunas: [{ key: 'nome', label: 'Permissionária' }, { key: 'total', label: 'Total' }, { key: 'emergencia', label: 'Emergência' }, { key: 'pct_emerg', label: '% Emerg.' }],
        contexto: [
          { rotulo: 'Total de protocolos no Sistema Geo', valor: fmtNumero(geoAll.length) },
          { rotulo: "Total de protocolos de 'Emergência' no Sistema Geo", valor: fmtNumero(nEmerg) },
        ],
        destaques: [{ valor: `${pct(norcrestEmerg, norcrest.length)}%`, texto: 'das obras da NORCREST registradas no SistemaGeo são categorizadas como Emergência' }],
      }
    }
    case 'geo_emerg_vs_corretiva': {
      const map = new Map()
      let totEmerg = 0
      let totCorr = 0
      for (const r of geoAll) {
        const k = consolidarNorcrest(r.permissionaria)
        if (!k) continue
        if (!map.has(k)) map.set(k, { nome: k, emergencia: 0, corretiva: 0 })
        const o = map.get(k)
        if (ehEmergencia(r)) {
          o.emergencia++
          totEmerg++
        } else if (ehCorretiva(r)) {
          o.corretiva++
          totCorr++
        }
      }
      const dados = Array.from(map.values())
        .filter((o) => o.emergencia > 0 || o.corretiva > 0)
        .sort((a, b) => b.emergencia - a.emergencia)
      return {
        ...base,
        dados,
        janela: cfg.topN || 10,
        destaqueNome: permSel,
        colunas: [{ key: 'nome', label: 'Permissionária' }, { key: 'emergencia', label: 'Emergência' }, { key: 'corretiva', label: 'Manut. Corretiva' }],
        contexto: [
          { rotulo: "Total de protocolos de 'Emergência' no SistemaGeo", valor: fmtNumero(totEmerg) },
          { rotulo: "Total de protocolos de 'Manutenção Corretiva' no Sistema Geo", valor: fmtNumero(totCorr) },
        ],
      }
    }
    case 'geo_autorizacoes_anual': {
      const rows = geo.filter((r) => !ehEmergencia(r))
      return { ...base, ...mensalPorAno(rows) }
    }
    case 'geo_emerg_anual': {
      const rows = geo.filter(ehEmergencia)
      return { ...base, ...mensalPorAno(rows) }
    }
    case 'geo_emerg_barra_anual': {
      const dados = totaisAnuais(geo.filter(ehEmergencia)).map((d) => ({
        nome: d.label,
        valor: d.value,
      }))
      return { ...base, dados, colunas: [{ key: 'nome', label: 'Ano' }, { key: 'valor', label: 'Emergências' }] }
    }
    case 'geo_por_regiao': {
      const dados = processosPorRegiao(geo).map((d) => ({
        nome: d.regiao,
        valor: d.count,
        pct: d.pct,
      }))
      const porSub = Array.from(contagemPorSubprefeituraGeo(geo).entries())
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
      return {
        ...base,
        dados,
        detalhe: porSub,
        colunas: [{ key: 'nome', label: 'Região' }, { key: 'valor', label: 'Processos' }, { key: 'pct', label: '%' }],
        contexto: [{ rotulo: 'Total de protocolos no SistemaGeo', valor: fmtNumero(geo.length) }],
      }
    }

    // ── Fiscalização ────────────────────────────────────────────────────────
    case 'fisc_leg_vs_nc': {
      const k = calcularKPIsPBI(fisc)
      const dados = distribuicaoLegislacaoVsNC(fisc)
      const soluc = distribuicaoSolucVsEmAnd(fisc)
      return {
        ...base,
        dados,
        detalhe: soluc,
        colunas: [{ key: 'nome', label: 'Situação' }, { key: 'valor', label: 'Laudos' }, { key: 'pct', label: '%' }],
        contexto: [
          { rotulo: 'Total de Visitas Técnicas', valor: fmtNumero(k.total) },
          { rotulo: 'Total que apresentaram não-conformidade', valor: fmtNumero(k.naoConform) },
          { rotulo: 'Total de não-conformidades em andamento', valor: fmtNumero(k.emAndamento) },
        ],
        // Marco fixo: o Controle Tecnológico começou em junho/2020.
        painelTexto: spanDesde('2020-06', fiscAll, 'data_inicio') ? `${spanDesde('2020-06', fiscAll, 'data_inicio')} de Controle Tecnológico` : null,
        destaques: [
          { valor: `${k.pctNaoConform}%`, texto: 'das obras visitadas não atenderam à Legislação' },
          { valor: `${k.pctSolucNC}%`, texto: 'das obras e serviços que não atenderam à Legislação foram solucionados' },
        ],
      }
    }
    case 'fisc_soluc_trimestral': {
      const dados = evolucaoTrimestral(fisc, 'solucionado').map((d) => ({
        nome: d.periodo,
        valor: d.valor,
      }))
      return {
        ...base,
        dados,
        colunas: [{ key: 'nome', label: 'Trimestre' }, { key: 'valor', label: 'Solucionados' }],
      }
    }
    case 'fisc_avanco': {
      const map = new Map()
      for (const r of fisc) {
        if (!r.data_inicio) continue
        const ano = r.data_inicio.slice(0, 4)
        const mes = parseInt(r.data_inicio.slice(5, 7), 10)
        const key = `${ano}-T${Math.ceil(mes / 3)}`
        if (!map.has(key)) map.set(key, { periodo: key, leg: 0, nc: 0, total: 0 })
        const o = map.get(key)
        if (r.legislacao_atendida) o.leg++
        if (r.tem_nao_conformidade) o.nc++
        o.total++
      }
      const dados = Array.from(map.values())
        .sort((a, b) => a.periodo.localeCompare(b.periodo))
        .map((o) => ({
          periodo: o.periodo,
          pct_leg: pct(o.leg, o.total),
          pct_nc: pct(o.nc, o.total),
        }))
      return { ...base, dados, colunas: [{ key: 'periodo', label: 'Trimestre' }, { key: 'pct_leg', label: '% Legislação Atendida' }, { key: 'pct_nc', label: '% Não Atenderam' }] }
    }
    case 'fisc_metragem_norcrest': {
      // Sempre NORCREST (título do slide); soma área (m²) das visitas com NC e
      // das em andamento; multa = área × R$/m² informado pelo usuário.
      const rows = fiscAll.filter(ehNorcrest)
      let areaNC = 0
      let areaAnd = 0
      for (const r of rows) {
        const a = Number(r.area_m2) || 0
        if (r.tem_nao_conformidade) areaNC += a
        if (r.em_andamento) areaAnd += a
      }
      const multa = Number(opcoes.multaM2) > 0 ? Number(opcoes.multaM2) : null
      const semValor = '— informe o valor da multa por m²'
      const blocos = [
        { estilo: 'navy', linhas: [
          { rotulo: 'Área que não atendeu à Legislação', valor: `${fmtAreaDecimal(areaNC)} m²` },
          { rotulo: 'Valor estimado de multa', valor: multa ? fmtReais(areaNC * multa) : semValor },
        ] },
        { estilo: 'vermelho', linhas: [
          { rotulo: 'Área que ainda não foi solucionada (em andamento)', valor: `${fmtAreaDecimal(areaAnd)} m²` },
          { rotulo: 'Valor estimado de multa', valor: multa ? fmtReais(areaAnd * multa) : semValor },
        ] },
      ]
      return {
        ...base,
        blocos,
        dados: [
          { nome: 'Não atende à legislação', area_m2: areaNC, multa_estimada: multa ? areaNC * multa : null },
          { nome: 'Ainda não solucionado (em andamento)', area_m2: areaAnd, multa_estimada: multa ? areaAnd * multa : null },
        ],
        colunas: [{ key: 'nome', label: 'Situação' }, { key: 'area_m2', label: 'Área (m²)' }, { key: 'multa_estimada', label: 'Multa estimada (R$)' }],
      }
    }
    case 'fisc_recomposicao': {
      const custo = Number(opcoes.custoM2) > 0 ? Number(opcoes.custoM2) : null
      const rec = recomposicaoLegAtendida(fisc, custo)
      const blocos = [
        { ...blocoRecomposicao('RECOMPOSIÇÕES EXECUTADAS PELAS CONCESSIONÁRIAS, DE ACORDO COM AS LEGISLAÇÕES VIGENTES', rec), full: true },
        rec.economia != null
          ? { estilo: 'amarelo', full: true, texto: `Estimativa de Economia: ${fmtMilhoes(rec.economia)}` }
          : { estilo: 'claro', full: true, texto: 'Informe o custo da recomposição por m² para estimar a economia.' },
      ]
      return {
        ...base,
        blocos,
        dados: [{ nome: 'Legislação atendida', area_m2: rec.area, vias: rec.nVias, economia: rec.economia }],
        colunas: [{ key: 'nome', label: 'Base' }, { key: 'area_m2', label: 'Área (m²)' }, { key: 'vias', label: 'Vias (processos distintos)' }, { key: 'economia', label: 'Economia estimada (R$)' }],
      }
    }
    case 'fisc_recomposicao_total':
    case 'fisc_recomposicao_norcrest': {
      const soNorcrest = slide.agregacao === 'fisc_recomposicao_norcrest'
      const rows = soNorcrest ? fiscAll.filter(ehNorcrest) : fisc
      const custo = Number(opcoes.custoM2) > 0 ? Number(opcoes.custoM2) : null
      const rec = recomposicaoLegAtendida(rows, custo)
      const tituloEsq = soNorcrest
        ? 'RECOMPOSIÇÕES EXECUTADAS PELA NORCREST, DE ACORDO COM AS LEGISLAÇÕES VIGENTES'
        : 'RECOMPOSIÇÕES EXECUTADAS PELAS CONCESSIONÁRIAS, DE ACORDO COM AS LEGISLAÇÕES VIGENTES'
      const total = rec.economia != null ? rec.economia + TERMO_NORCREST.economiaValor : null
      const blocos = [
        blocoRecomposicao(tituloEsq, rec),
        BLOCO_TERMO,
        total != null
          ? { estilo: 'amarelo', full: true, texto: `ESTIMATIVA DE ECONOMIA DA PREFEITURA COM RECAPEAMENTO ASFÁLTICO: ${fmtMilhoes(total)}` }
          : { estilo: 'claro', full: true, texto: 'Informe o custo da recomposição por m² para somar as duas estimativas.' },
      ]
      return {
        ...base,
        blocos,
        dados: [
          { nome: soNorcrest ? 'Recomposições NORCREST (leg. atendida)' : 'Recomposições concessionárias (leg. atendida)', area_m2: rec.area, vias: rec.nVias, economia: rec.economia },
          { nome: 'Termo de Cooperação – Recapeamento NORCREST', area_m2: 1497245.78, vias: 308, economia: TERMO_NORCREST.economiaValor },
        ],
        colunas: [{ key: 'nome', label: 'Base' }, { key: 'area_m2', label: 'Área (m²)' }, { key: 'vias', label: 'Vias' }, { key: 'economia', label: 'Economia estimada (R$)' }],
      }
    }
    case 'fisc_laudos_vs_nc': {
      const dados = rankingLegislacaoVsNC(fiscAll, Infinity, true).map((d) => ({
        nome: d.nome,
        laudos: d.total,
        nao_conformidades: d.nao_atendida,
        pct_nc: pct1(d.nao_atendida, d.total),
      }))
      const k = calcularKPIsPBI(fiscAll)
      const nNorcrest = fiscAll.filter(ehNorcrest).length
      return {
        ...base,
        dados,
        janela: cfg.topN || 10,
        destaqueNome: permSel,
        listaLateral: { pctKey: 'pct_nc', titulo: '% NÃO CONFORMIDADES' },
        destaquePos: 'topo',
        colunas: [{ key: 'nome', label: 'Permissionária' }, { key: 'laudos', label: 'Laudos Técnicos' }, { key: 'nao_conformidades', label: 'Não Conformidades' }, { key: 'pct_nc', label: '% NC' }],
        contexto: [
          { rotulo: 'Total de Visitas Técnicas', valor: fmtNumero(k.total) },
          { rotulo: 'Total que Apresentaram Não-Conformidade', valor: fmtNumero(k.naoConform) },
        ],
        destaques: [{ valor: `${pct(nNorcrest, fiscAll.length)}%`, texto: 'das visitas técnicas realizadas por OBRAS pertencem à NORCREST' }],
      }
    }
    case 'fisc_nc_vs_andamento':
    case 'fisc_nc_vs_andamento_norcrest': {
      const isNorcrest = slide.agregacao === 'fisc_nc_vs_andamento_norcrest'
      const map = new Map()
      let totNC = 0
      let totAnd = 0
      for (const r of fiscAll) {
        if (!r.tem_nao_conformidade) continue
        if (isNorcrest && !ehNorcrest(r)) continue
        const k = isNorcrest
          ? unidadeNorcrest(r.permissionaria) || 'NORCREST (s/ unidade)'
          : consolidarNorcrest(r.permissionaria)
        if (!k) continue
        if (!map.has(k)) map.set(k, { nome: k, nao_conformidades: 0, em_andamento: 0 })
        const o = map.get(k)
        o.nao_conformidades++
        totNC++
        if (r.em_andamento) {
          o.em_andamento++
          totAnd++
        }
      }
      const dados = Array.from(map.values())
        .sort((a, b) => b.nao_conformidades - a.nao_conformidades)
        .map((o) => ({ ...o, pct_andamento: pct1(o.em_andamento, o.nao_conformidades) }))
      const destaques = isNorcrest
        ? [
            { valor: `${pct(totAnd, totNC)}%`, texto: 'estão em andamento' },
            { valor: `${100 - pct(totAnd, totNC)}%`, texto: 'já foram solucionadas' },
          ]
        : [{ valor: `${pct(totAnd, totNC)}%`, texto: "das visitas técnicas que possuem 'não conformidades' ainda não foram solucionadas" }]
      return {
        ...base,
        dados,
        janela: isNorcrest ? 15 : cfg.topN || 10,
        destaqueNome: isNorcrest ? null : permSel,
        listaLateral: { pctKey: 'pct_andamento', titulo: '% EM ANDAMENTO' },
        destaquePos: 'topo',
        colunas: [{ key: 'nome', label: isNorcrest ? 'Unidade NORCREST' : 'Permissionária' }, { key: 'nao_conformidades', label: 'Não conformidades' }, { key: 'em_andamento', label: 'Em andamento' }, { key: 'pct_andamento', label: '% em andamento' }],
        contexto: [
          { rotulo: isNorcrest ? 'Total que Apresentaram Não-Conformidade (NORCREST)' : 'Total que Apresentaram Não-Conformidade', valor: fmtNumero(totNC) },
          { rotulo: "Total de visitas 'não conformes' com análises em andamento", valor: fmtNumero(totAnd) },
        ],
        destaques,
      }
    }
    case 'fisc_tipos_falha': {
      const k = calcularKPIsPBI(fisc)
      const dados = rankingTiposFalha(fisc).map((d) => ({ nome: d.nome, valor: d.laudos }))
      return {
        ...base,
        dados,
        colunas: [{ key: 'nome', label: 'Tipo de falha' }, { key: 'valor', label: 'Ocorrências' }],
        contexto: [
          { rotulo: 'Total de Visitas Técnicas', valor: fmtNumero(k.total) },
          { rotulo: 'Total que Apresentaram Não-Conformidade', valor: fmtNumero(k.naoConform) },
        ],
      }
    }
    case 'fisc_tipos_falha_kpis': {
      // FIXA Nivelamento/Geometria/Afundamento/Trincas; o resto soma em
      // "Demais patologias" (decisão de 03/07).
      const k = calcularKPIsPBI(fisc)
      const FIXAS = ['Nivelamento', 'Geometria', 'Afundamento', 'Trincas']
      const ranking = rankingTiposFalha(fisc)
      const kpis = FIXAS.map((nome) => ({
        rotulo: nome,
        valor: ranking.find((d) => d.nome === nome)?.laudos || 0,
      }))
      const resto = ranking
        .filter((d) => !FIXAS.includes(d.nome))
        .reduce((s, d) => s + d.laudos, 0)
      kpis.push({ rotulo: 'Demais patologias', valor: resto, resto: true })
      return {
        ...base,
        kpis,
        contexto: [
          { rotulo: 'Total de Visitas Técnicas', valor: fmtNumero(k.total) },
          { rotulo: 'Total que Apresentaram Não-Conformidade', valor: fmtNumero(k.naoConform) },
        ],
      }
    }
    case 'fisc_classificacao_viaria': {
      const dados = classificacaoViaria(fisc)
      return { ...base, dados, colunas: [{ key: 'nome', label: 'Classificação viária' }, { key: 'total', label: 'Total' }, { key: 'leg_atendida', label: 'Leg. Atendida' }, { key: 'nao_atendida', label: 'Não Atenderam' }, { key: 'solucionados', label: 'Solucionados' }, { key: 'em_andamento', label: 'Em andamento' }] }
    }
    case 'fisc_por_regiao':
    case 'fisc_andamento_por_regiao': {
      // Slides 38/39: laudos por região/subprefeitura (39 = só os 'não
      // conformes' com análise em andamento).
      const soAndamento = slide.agregacao === 'fisc_andamento_por_regiao'
      const rows = soAndamento
        ? fisc.filter((r) => r.tem_nao_conformidade && r.em_andamento)
        : fisc
      const dados = processosPorRegiao(rows).map((d) => ({
        nome: d.regiao,
        valor: d.count,
        pct: d.pct,
      }))
      const porSub = Array.from(contagemPorSubprefeituraGeo(rows).entries())
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
      return {
        ...base,
        dados,
        detalhe: porSub,
        colunas: [{ key: 'nome', label: 'Região' }, { key: 'valor', label: 'Laudos' }, { key: 'pct', label: '%' }],
        contexto: [
          soAndamento
            ? { rotulo: "Total de visitas 'não conformes' com análise em andamento", valor: fmtNumero(rows.length) }
            : { rotulo: 'Total de Visitas Técnicas', valor: fmtNumero(rows.length) },
        ],
      }
    }

    // ── Emergências ──────────────────────────────────────────────────────────
    case 'emerg_norcrest_por_unidade': {
      // Base de Emergências: nome COMPLETO da companhia + unidade em "/XXX".
      // Unidades agrupadas (NCRV/NCRS→NCR, NCJV/NCJL→NCJ).
      const map = new Map()
      for (const r of emerg) {
        const curto = nomeCurtoPermissionaria(r.permissionaria || '')
        if (!String(curto || '').toUpperCase().startsWith('NORCREST')) continue
        const u = curto.includes('/')
          ? normUnidadeNorcrest(curto.split('/')[1])
          : 'NORCREST (s/ unidade)'
        const st = String(r.status || '').toUpperCase()
        if (!map.has(u)) map.set(u, { nome: u, encerradas: 0, informadas: 0 })
        const o = map.get(u)
        if (st.includes('ENCERR')) o.encerradas++
        else if (st.includes('INFORM')) o.informadas++
      }
      const dados = Array.from(map.values())
        .sort((a, b) => b.encerradas - a.encerradas)
        .slice(0, 15)
      const aviso = emerg.length === 0
        ? 'O módulo Emergências ainda não foi carregado nesta sessão — abra Emergências uma vez para popular este slide.'
        : null
      const geoEmerg = geoAll.filter(ehEmergencia)
      const contexto = geoAll.length
        ? [
            { rotulo: "Total de protocolos de 'Emergência' no Sistema Geo", valor: fmtNumero(geoEmerg.length) },
            { rotulo: "Total de protocolos de 'Emergência' da NORCREST no Sistema Geo", valor: fmtNumero(geoEmerg.filter(ehNorcrest).length) },
          ]
        : null
      return { ...base, dados, aviso, contexto, colunas: [{ key: 'nome', label: 'Unidade NORCREST' }, { key: 'encerradas', label: 'Encerradas' }, { key: 'informadas', label: 'Informadas' }] }
    }

    default:
      return { ...base, aviso: `Agregação "${slide.agregacao}" ainda não implementada.` }
  }
}
