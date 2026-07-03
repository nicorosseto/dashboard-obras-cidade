// src/lib/relatorio.js
// ============================================================================
// Módulo "Apresentação" (Relatório Mensal) — o "cérebro" do módulo.
//
// Reúne três coisas:
//  1) CATEGORIA   — como cada slide se relaciona com os dados do sistema:
//        'dados'  🟢  renderizado a partir dos dados reais (contorno teal)
//        'texto'  ⚪  institucional/sem dado no banco → replica o conteúdo (cinza)
//        'futuro' 🟡  gráfico cujo dado ainda não existe no sistema; replica a
//                     arte agora, entra quando um módulo futuro trouxer o dado
//                     (contorno âmbar tracejado)
//  2) MODELO_INSTITUCIONAL — o seed com os 36 slides da apresentação-modelo do
//        Departamento (PDF rev. 2026.03), cada um numerado e nomeado (para o
//        usuário localizar no PowerPoint) e classificado nas categorias acima.
//        O layout espelha o PDF: `tituloInterno` (título no topo do slide),
//        `subtitulo` (caixa de sub-seção), `blocos` (quadros dos slides
//        institucionais) e, nos slides de dados, o resolver devolve `contexto`
//        (caixas "rótulo | valor"), `destaques` (caixas de % à direita) e
//        `painelAnos` ("TOTAIS POR ANO").
//  3) resolverDadosSlide() — dado um slide + as bases já carregadas
//        (geo / fisc / emerg), devolve o que o SlideRenderer precisa.
//        As agregações reaproveitam src/lib/aggregations.js (nada é recalculado
//        de forma divergente do resto do dashboard).
//
// Fase A entrega o seed + a renderização; export XLSX/PNG na Fase B (feito).
// O editor de modelos é a Fase C. Ao editar o seed, manter os testes de
// src/tests/relatorio.test.js (36 slides, contagem 23/12/1) alinhados.
// ============================================================================

import {
  consolidarNorcrest,
  topPermissionarias,
  topTiposProcesso,
  comparativoAnualPorMes,
  processosPorRegiao,
  contagemPorSubprefeituraGeo,
  totaisAnuais,
  distribuicaoLegislacaoVsNC,
  distribuicaoSolucVsEmAnd,
  rankingLegislacaoVsNC,
  rankingTiposFalha,
  calcularKPIsPBI,
  mediaDiaria,
  fmtNumero,
} from './aggregations.js'
import { nomeCurtoPermissionaria } from './emergencias.js'

// ── Categorias de slide (contorno visual) ──────────────────────────────────
export const CATEGORIA = {
  dados: {
    id: 'dados',
    rotulo: 'Dado do sistema',
    // contorno teal (identidade do módulo)
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

// A classificação "Emergência"/"Manutenção Corretiva" do Sistema Geo vive no
// TIPO DE PROCESSO (catálogo `08-tipos-processo-sistema-geo.sql`: EMERGENCIA,
// MANUTENCAO_CORRETIVA…). `tipo_obra` é outro eixo (vem do posicionamento)
// e fica só como fallback — filtrar por ele zerava as emergências.
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

// "6 anos e 4 meses" entre a menor e a maior data do campo (YYYY-MM-DD).
function spanAnosMeses(rows, campo) {
  let min = null
  let max = null
  for (const r of rows) {
    const d = r[campo]
    if (!d) continue
    if (!min || d < min) min = d
    if (!max || d > max) max = d
  }
  if (!min) return null
  const meses =
    (+max.slice(0, 4) - +min.slice(0, 4)) * 12 +
    (+max.slice(5, 7) - +min.slice(5, 7))
  const anos = Math.floor(meses / 12)
  const resto = meses % 12
  const pAnos = anos > 0 ? `${anos} ano${anos > 1 ? 's' : ''}` : ''
  const pMeses = resto > 0 ? `${resto} ${resto > 1 ? 'meses' : 'mês'}` : ''
  return [pAnos, pMeses].filter(Boolean).join(' e ') || 'menos de 1 mês'
}

// Barra "Total × Emergência" por permissionária (consolidando NORCREST).
function totalVsEmergencia(rows, n = 10) {
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
    .slice(0, n)
    .map((o) => ({
      ...o,
      pct_emerg: pct(o.emergencia, o.total),
    }))
}

// Série anual (um ponto por ano) para um subconjunto de linhas do Sistema Geo.
function serieAnual(rows) {
  return totaisAnuais(rows).map((d) => ({ ano: d.label, valor: d.value }))
}

// Linhas mensais comparativas por ano (o formato dos slides 10/11/14/15 do PDF)
// + painel "TOTAIS POR ANO".
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

// Distribuição por unidade da NORCREST (o texto após "NORCREST", separado por
// hífen, barra ou espaço — ex.: "NORCREST - NCR", "NORCREST/NCR").
function unidadeNorcrest(nome) {
  const m = String(nome || '').match(/NORCREST\s*[-–/]*\s*(.+)$/i)
  return m ? m[1].replace(/^[-–/\s]+/, '').trim().toUpperCase() || null : null
}

// ── O seed: os 36 slides da apresentação institucional ──────────────────────
// Cada slide traz `n` (número no PPT), `titulo` (nome no PPT), `categoria`,
// `tipo` (como renderizar) e a config da fonte/agregação. `tituloInterno` e
// `subtitulo` reproduzem o cabeçalho do slide no PDF; `blocos` descrevem os
// quadros dos slides institucionais (estilos: navy/claro/amarelo/vermelho).
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
      manuais: ['Usuários cadastrados no Sistema Geo', 'Executantes cadastrados no Sistema Geo'] },
    { n: 8, titulo: 'Processos por Permissionária', categoria: 'dados', tipo: 'barra',
      tituloInterno: 'PROCESSOS | POR PERMISSIONÁRIA',
      fonte: 'geo', agregacao: 'geo_por_permissionaria', config: { topN: 10 } },
    { n: 9, titulo: 'Processos por Obra/Serviço', categoria: 'dados', tipo: 'pizza',
      tituloInterno: 'PROCESSOS | POR OBRA/SERVIÇO',
      fonte: 'geo', agregacao: 'geo_por_tipo_obra' },
    { n: 10, titulo: 'Processos — Controle Mensal', categoria: 'dados', tipo: 'linha_mensal',
      tituloInterno: 'PROCESSOS | CONTROLE MENSAL',
      fonte: 'geo', agregacao: 'geo_controle_mensal' },
    { n: 11, titulo: 'Protocolos de Emergência — NORCREST', categoria: 'dados', tipo: 'linha_mensal',
      tituloInterno: 'PROTOCOLOS DE EMERGÊNCIA – NORCREST',
      fonte: 'geo', agregacao: 'geo_emerg_norcrest_anual' },
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
    { n: 21, titulo: 'Avanço do Controle Tecnológico', categoria: 'dados', tipo: 'linha_trimestral',
      tituloInterno: 'FISCALIZAÇÃO', subtitulo: 'AVANÇO DO CONTROLE TECNOLÓGICO',
      fonte: 'fisc', agregacao: 'fisc_avanco' },
    { n: 22, titulo: 'Avanço do Controle Tecnológico — NORCREST', categoria: 'dados', tipo: 'linha_trimestral',
      tituloInterno: 'FISCALIZAÇÃO | NORCREST', subtitulo: 'AVANÇO DO CONTROLE TECNOLÓGICO',
      fonte: 'fisc', agregacao: 'fisc_avanco_norcrest' },
    { n: 23, titulo: 'NORCREST — Análise por Metragem', categoria: 'futuro', tipo: 'quadros',
      tituloInterno: 'FISCALIZAÇÃO | NORCREST', subtitulo: 'ANÁLISE POR METRAGEM',
      texto: 'Área que não atendeu à Legislação e valor estimado de multa. A área (m²) existe no sistema, mas o valor de multa depende de uma taxa externa ainda não cadastrada — entra num módulo futuro.',
      blocos: [
        { estilo: 'navy', linhas: [
          { rotulo: 'Área que não atendeu à Legislação', valor: '439.844,60 m²' },
          { rotulo: 'Valor estimado de multa', valor: 'R$ 1.730.713.716,40' },
        ] },
        { estilo: 'vermelho', linhas: [
          { rotulo: 'Área que ainda não foi solucionada (em andamento)', valor: '8.544,92 m²' },
          { rotulo: 'Valor estimado de multa', valor: 'R$ 33.622.793,79' },
        ] },
      ] },

    // — Pavimentação asfáltica / economia (institucional) —
    { n: 24, titulo: 'Pavimentação Asfáltica — Concessionárias', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'PAVIMENTAÇÃO ASFÁLTICA – CONCESSIONÁRIAS',
      texto: 'Recomposições executadas pelas concessionárias conforme legislação vigente: área aproximada 2,3 milhões m² · 21,7 mil vias · estimativa de economia R$ 560,1 milhões.',
      blocos: [
        { estilo: 'navy', full: true, titulo: 'RECOMPOSIÇÕES EXECUTADAS PELAS CONCESSIONÁRIAS, DE ACORDO COM AS LEGISLAÇÕES VIGENTES', linhas: [
          { rotulo: 'Área aproximada', valor: '2,3 milhões m²' },
          { rotulo: 'Total aproximado de vias', valor: '21,7 mil' },
        ] },
        { estilo: 'amarelo', full: true, texto: 'Estimativa de Economia: R$ 560,1 MILHÕES' },
      ] },
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
    { n: 27, titulo: 'Pavimentação Asfáltica 2019–2026 (total concessionárias)', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'PAVIMENTAÇÃO ASFÁLTICA – CONCESSIONÁRIAS', subtitulo: '2019 – 2026',
      texto: 'Concessionárias 2.240.333,96 m² / 21.801 vias / R$ 560,1 mi + Termo NORCREST 1.497.245,78 m² / 308 vias / R$ 374,3 mi = estimativa de economia da Prefeitura R$ 934,4 milhões.',
      blocos: [
        { estilo: 'navy', titulo: 'RECOMPOSIÇÕES EXECUTADAS PELAS CONCESSIONÁRIAS', linhas: [
          { rotulo: 'Área aproximada', valor: '2.240.333,96 m²' },
          { rotulo: 'Total aproximado de vias', valor: '21.801' },
          { rotulo: 'Estimativa de economia', valor: 'R$ 560,1 milhões' },
        ] },
        { estilo: 'navy', titulo: 'TERMO DE COOPERAÇÃO – RECAPEAMENTO NORCREST', linhas: [
          { rotulo: 'Área recapeada', valor: '1.497.245,78 m²' },
          { rotulo: 'Total aproximado de vias', valor: '308' },
          { rotulo: 'Estimativa de economia', valor: 'R$ 374,3 milhões' },
        ] },
        { estilo: 'amarelo', full: true, texto: 'ESTIMATIVA DE ECONOMIA DA PREFEITURA COM RECAPEAMENTO ASFÁLTICO: R$ 934,4 MILHÕES' },
      ] },
    { n: 28, titulo: 'Pavimentação Asfáltica 2019–2026 (NORCREST)', categoria: 'texto', tipo: 'quadros',
      tituloInterno: 'PAVIMENTAÇÃO ASFÁLTICA – CONCESSIONÁRIAS', subtitulo: '2019 – 2026',
      texto: 'NORCREST 1.979.139,36 m² / 17.605 vias / R$ 494,8 mi + Termo NORCREST 1.497.245,78 m² / 308 vias / R$ 374,3 mi = estimativa de economia R$ 869,1 milhões.',
      blocos: [
        { estilo: 'navy', titulo: 'RECOMPOSIÇÕES EXECUTADAS PELA NORCREST', linhas: [
          { rotulo: 'Área aproximada', valor: '1.979.139,36 m²' },
          { rotulo: 'Total aproximado de vias', valor: '17.605' },
          { rotulo: 'Estimativa de economia', valor: 'R$ 494,8 milhões' },
        ] },
        { estilo: 'navy', titulo: 'TERMO DE COOPERAÇÃO – RECAPEAMENTO NORCREST', linhas: [
          { rotulo: 'Área recapeada', valor: '1.497.245,78 m²' },
          { rotulo: 'Total aproximado de vias', valor: '308' },
          { rotulo: 'Estimativa de economia', valor: 'R$ 374,3 milhões' },
        ] },
        { estilo: 'amarelo', full: true, texto: 'ESTIMATIVA DE ECONOMIA DA PREFEITURA COM RECAPEAMENTO ASFÁLTICO: R$ 869,1 MILHÕES' },
      ] },

    // — Fiscalização detalhada (dados) —
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
    { n: 35, titulo: 'Fiscalização — Classificação Viária (distribuições)', categoria: 'dados', tipo: 'pizzas_viaria',
      tituloInterno: 'FISCALIZAÇÃO', subtitulo: 'ANÁLISE POR CLASSIFICAÇÃO VIÁRIA',
      fonte: 'fisc', agregacao: 'fisc_classificacao_viaria' },
    { n: 36, titulo: 'Fiscalização NORCREST — Classificação Viária', categoria: 'dados', tipo: 'pizzas_viaria',
      tituloInterno: 'FISCALIZAÇÃO | NORCREST', subtitulo: 'ANÁLISE POR CLASSIFICAÇÃO VIÁRIA',
      fonte: 'fisc', agregacao: 'fisc_classificacao_viaria_norcrest' },
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

// ── O resolvedor: config de slide → dados de render ─────────────────────────
export function resolverDadosSlide(slide, bases = {}) {
  const cat = CATEGORIA[slide.categoria] || CATEGORIA.dados
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
  }

  // Slides institucionais / futuros: conteúdo replicado (blocos/texto).
  if (slide.categoria === 'texto' || slide.categoria === 'futuro') {
    return base
  }

  const geo = bases.geo || []
  const fisc = bases.fisc || []
  const emerg = bases.emerg || []
  const cfg = slide.config || {}

  switch (slide.agregacao) {
    // ── Sistema Geo ──────────────────────────────────────────────────────────
    case 'geo_visao_geral': {
      const permissionarias = new Set(
        geo.map((r) => r.permissionaria).filter(Boolean)
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
      // KPIs manuais (não temos no banco): expostos para preencher à mão.
      for (const m of slide.manuais || [])
        kpis.push({ rotulo: m, valor: null, manual: true, icone: m.includes('Usuários') ? 'usuarios' : 'executante' })
      return { ...base, kpis }
    }
    case 'geo_por_permissionaria': {
      const dados = topPermissionarias(geo, cfg.topN || 10, true).map((d) => ({
        nome: d.nome,
        valor: d.count,
      }))
      const nNorcrest = geo.filter(ehNorcrest).length
      return {
        ...base,
        dados,
        colunas: [{ key: 'nome', label: 'Permissionária' }, { key: 'valor', label: 'Processos' }],
        contexto: [{ rotulo: 'Total de protocolos no SistemaGeo', valor: fmtNumero(geo.length) }],
        painelTexto: spanAnosMeses(geo, 'data_cadastro') ? `${spanAnosMeses(geo, 'data_cadastro')} de Sistema Geo` : null,
        destaques: [{ valor: `${pct(nNorcrest, geo.length)}%`, texto: 'das obras e serviços registradas no Sistema Geo são motivadas pela NORCREST' }],
      }
    }
    case 'geo_por_tipo_obra': {
      // As categorias do slide (Emergência, Ligação Domiciliar, Manutenção…)
      // são os TIPOS DE PROCESSO do Sistema Geo, como no PDF.
      const total = geo.length
      const dados = topTiposProcesso(geo, 12).map((d) => ({
        nome: d.nome,
        valor: d.count,
        pct: pct(d.count, total),
      }))
      const emergs = geo.filter(ehEmergencia)
      const emergNorcrest = emergs.filter(ehNorcrest).length
      return {
        ...base,
        dados,
        colunas: [{ key: 'nome', label: 'Tipo de obra/serviço' }, { key: 'valor', label: 'Processos' }, { key: 'pct', label: '%' }],
        contexto: [{ rotulo: 'Total de protocolos no SistemaGeo', valor: fmtNumero(total) }],
        destaques: [{ valor: `${pct(emergNorcrest, emergs.length)}%`, texto: 'das obras de EMERGÊNCIA são motivadas pela NORCREST' }],
      }
    }
    case 'geo_controle_mensal': {
      return {
        ...base,
        ...mensalPorAno(geo),
        contexto: [{ rotulo: 'Total de protocolos no SistemaGeo', valor: fmtNumero(geo.length) }],
      }
    }
    case 'geo_emerg_norcrest_anual': {
      const norcrest = geo.filter(ehNorcrest)
      const rows = norcrest.filter(ehEmergencia)
      return {
        ...base,
        ...mensalPorAno(rows),
        contexto: [
          { rotulo: 'Total de protocolos da NORCREST no Sistema Geo', valor: fmtNumero(norcrest.length) },
          { rotulo: "Total de protocolos da NORCREST de 'Emergência' no Sistema Geo", valor: fmtNumero(rows.length) },
        ],
      }
    }
    case 'geo_total_vs_emerg': {
      const dados = totalVsEmergencia(geo, cfg.topN || 10)
      const nEmerg = geo.filter(ehEmergencia).length
      const norcrest = geo.filter(ehNorcrest)
      const norcrestEmerg = norcrest.filter(ehEmergencia).length
      return {
        ...base,
        dados,
        colunas: [{ key: 'nome', label: 'Permissionária' }, { key: 'total', label: 'Total' }, { key: 'emergencia', label: 'Emergência' }, { key: 'pct_emerg', label: '% Emerg.' }],
        contexto: [
          { rotulo: 'Total de protocolos no Sistema Geo', valor: fmtNumero(geo.length) },
          { rotulo: "Total de protocolos de 'Emergência' no Sistema Geo", valor: fmtNumero(nEmerg) },
        ],
        destaques: [{ valor: `${pct(norcrestEmerg, norcrest.length)}%`, texto: 'das obras da NORCREST registradas no SistemaGeo são categorizadas como Emergência' }],
      }
    }
    case 'geo_emerg_vs_corretiva': {
      const map = new Map()
      let totEmerg = 0
      let totCorr = 0
      for (const r of geo) {
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
        .slice(0, cfg.topN || 10)
      return {
        ...base,
        dados,
        colunas: [{ key: 'nome', label: 'Permissionária' }, { key: 'emergencia', label: 'Emergência' }, { key: 'corretiva', label: 'Manut. Corretiva' }],
        contexto: [
          { rotulo: "Total de protocolos de 'Emergência' no SistemaGeo", valor: fmtNumero(totEmerg) },
          { rotulo: "Total de protocolos de 'Manutenção Corretiva' no Sistema Geo", valor: fmtNumero(totCorr) },
        ],
      }
    }
    case 'geo_autorizacoes_anual': {
      // Autorizações = tudo que NÃO é emergência (Expansão, Ligação, Manutenção…).
      const rows = geo.filter((r) => !ehEmergencia(r))
      return { ...base, ...mensalPorAno(rows) }
    }
    case 'geo_emerg_anual': {
      const rows = geo.filter(ehEmergencia)
      return { ...base, ...mensalPorAno(rows) }
    }
    case 'geo_emerg_barra_anual': {
      const dados = serieAnual(geo.filter(ehEmergencia))
      return { ...base, dados, colunas: [{ key: 'ano', label: 'Ano' }, { key: 'valor', label: 'Emergências' }] }
    }
    case 'geo_por_regiao': {
      const dados = processosPorRegiao(geo).map((d) => ({
        nome: d.regiao,
        valor: d.count,
        pct: d.pct,
      }))
      // Detalhe por subprefeitura (barras do slide + download completo).
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
        painelTexto: spanAnosMeses(fisc, 'data_inicio') ? `${spanAnosMeses(fisc, 'data_inicio')} de Controle Tecnológico` : null,
        destaques: [
          { valor: `${k.pctNaoConform}%`, texto: 'das obras visitadas não atenderam à Legislação' },
          { valor: `${k.pctSolucNC}%`, texto: 'das obras e serviços que não atenderam à Legislação foram solucionados' },
        ],
      }
    }
    case 'fisc_avanco':
    case 'fisc_avanco_norcrest': {
      const rows = slide.agregacao === 'fisc_avanco_norcrest' ? fisc.filter(ehNorcrest) : fisc
      // % Não atendeu × % Legislação atendida por trimestre (pela data_inicio).
      const map = new Map()
      for (const r of rows) {
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
    case 'fisc_laudos_vs_nc': {
      const dados = rankingLegislacaoVsNC(fisc, cfg.topN || 10, true).map((d) => ({
        nome: d.nome,
        laudos: d.total,
        nao_conformidades: d.nao_atendida,
        pct_nc: pct(d.nao_atendida, d.total),
      }))
      const k = calcularKPIsPBI(fisc)
      const nNorcrest = fisc.filter(ehNorcrest).length
      return {
        ...base,
        dados,
        colunas: [{ key: 'nome', label: 'Permissionária' }, { key: 'laudos', label: 'Laudos Técnicos' }, { key: 'nao_conformidades', label: 'Não Conformidades' }, { key: 'pct_nc', label: '% NC' }],
        contexto: [
          { rotulo: 'Total de Visitas Técnicas', valor: fmtNumero(k.total) },
          { rotulo: 'Total que Apresentaram Não-Conformidade', valor: fmtNumero(k.naoConform) },
        ],
        destaques: [{ valor: `${pct(nNorcrest, fisc.length)}%`, texto: 'das visitas técnicas realizadas por OBRAS pertencem à NORCREST' }],
      }
    }
    case 'fisc_nc_vs_andamento':
    case 'fisc_nc_vs_andamento_norcrest': {
      const isNorcrest = slide.agregacao === 'fisc_nc_vs_andamento_norcrest'
      const map = new Map()
      let totNC = 0
      let totAnd = 0
      for (const r of fisc) {
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
        .slice(0, isNorcrest ? 15 : 10)
      const destaques = isNorcrest
        ? [
            { valor: `${pct(totAnd, totNC)}%`, texto: 'estão em andamento' },
            { valor: `${100 - pct(totAnd, totNC)}%`, texto: 'já foram solucionadas' },
          ]
        : [{ valor: `${pct(totAnd, totNC)}%`, texto: "das visitas técnicas que possuem 'não conformidades' ainda não foram solucionadas" }]
      return {
        ...base,
        dados,
        colunas: [{ key: 'nome', label: isNorcrest ? 'Unidade NORCREST' : 'Permissionária' }, { key: 'nao_conformidades', label: 'Não conformidades' }, { key: 'em_andamento', label: 'Em andamento' }],
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
      const k = calcularKPIsPBI(fisc)
      const ranking = rankingTiposFalha(fisc).filter((d) => d.laudos > 0)
      const top = ranking.slice(0, 4)
      const resto = ranking.slice(4).reduce((s, d) => s + d.laudos, 0)
      const kpis = top.map((d) => ({ rotulo: d.nome, valor: d.laudos }))
      if (resto > 0) kpis.push({ rotulo: 'Demais patologias', valor: resto, resto: true })
      return {
        ...base,
        kpis,
        contexto: [
          { rotulo: 'Total de Visitas Técnicas', valor: fmtNumero(k.total) },
          { rotulo: 'Total que Apresentaram Não-Conformidade', valor: fmtNumero(k.naoConform) },
        ],
      }
    }
    case 'fisc_classificacao_viaria':
    case 'fisc_classificacao_viaria_norcrest': {
      const rows = slide.agregacao === 'fisc_classificacao_viaria_norcrest' ? fisc.filter(ehNorcrest) : fisc
      const dados = classificacaoViaria(rows)
      return { ...base, dados, colunas: [{ key: 'nome', label: 'Classificação viária' }, { key: 'total', label: 'Total' }, { key: 'leg_atendida', label: 'Leg. Atendida' }, { key: 'nao_atendida', label: 'Não Atenderam' }, { key: 'solucionados', label: 'Solucionados' }, { key: 'em_andamento', label: 'Em andamento' }] }
    }

    // ── Emergências ──────────────────────────────────────────────────────────
    case 'emerg_norcrest_por_unidade': {
      // Encerradas × Informadas por unidade da NORCREST (módulo Emergências).
      // Na base de Emergências a permissionária vem com o nome COMPLETO da
      // companhia e a unidade num sufixo "/XXX" — o nome curto ("NORCREST/NCR")
      // vem do mesmo normalizador usado pelo módulo Emergências.
      const map = new Map()
      for (const r of emerg) {
        const curto = nomeCurtoPermissionaria(r.permissionaria || '')
        if (!String(curto || '').toUpperCase().startsWith('NORCREST')) continue
        const u = curto.includes('/')
          ? curto.split('/')[1]
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
      const geoEmerg = geo.filter(ehEmergencia)
      const contexto = geo.length
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
