// src/lib/relatorio.js
// ============================================================================
// Módulo "Apresentação" (Relatório Mensal) — o "cérebro" do módulo.
//
// Reúne três coisas:
//  1) CATEGORIAS   — como cada slide se relaciona com os dados do sistema:
//        'dados'  🟢  renderizado a partir dos dados reais (contorno teal)
//        'texto'  ⚪  institucional/sem dado no banco → replica o texto (cinza)
//        'futuro' 🟡  gráfico cujo dado ainda não existe no sistema; replica a
//                     arte agora, entra quando um módulo futuro trouxer o dado
//                     (contorno âmbar tracejado)
//  2) MODELO_INSTITUCIONAL — o seed com os 36 slides da apresentação-modelo do
//        Departamento, cada um numerado e nomeado (para o usuário localizar no
//        PowerPoint) e classificado nas categorias acima.
//  3) resolverDadosSlide() — dado um slide + as bases já carregadas
//        (geo / fisc / emerg), devolve o que o SlideRenderer precisa:
//        { categoria, tipo, titulo, dados, kpis, colunas, texto, aviso }.
//        As agregações reaproveitam src/lib/aggregations.js (nada é recalculado
//        de forma divergente do resto do dashboard).
//
// Fase A entrega o seed + a renderização. O download por slide (XLSX) e a
// imagem do slide (html-to-image) são a Fase B. O editor de modelos é a Fase C.
// ============================================================================

import {
  consolidarNorcrest,
  topPermissionarias,
  tiposObraCount,
  comparativoAnualPorMes,
  processosPorRegiao,
  contagemPorSubprefeituraGeo,
  totaisAnuais,
  distribuicaoLegislacaoVsNC,
  distribuicaoSolucVsEmAnd,
  rankingLegislacaoVsNC,
  rankingTiposFalha,
  calcularKPIsPBI,
} from './aggregations.js'

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

// Detecta uma emergência do Sistema Geo pelo rótulo do tipo de obra.
function ehEmergencia(r) {
  const t = String(r.tipo_obra_nome || r.tipo_obra || '').toUpperCase()
  return t.includes('EMERG')
}
function ehNorcrest(r) {
  return String(r.permissionaria || '')
    .toUpperCase()
    .startsWith('NORCREST')
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
      pct_emerg: o.total ? Math.round((o.emergencia / o.total) * 100) : 0,
    }))
}

// Série anual (um ponto por ano) para um subconjunto de linhas do Sistema Geo.
function serieAnual(rows) {
  return totaisAnuais(rows).map((d) => ({ ano: d.label, valor: d.value }))
}

// Distribuição por unidade da NORCREST (o texto após "NORCREST" / "NORCREST - XX").
function unidadeNorcrest(nome) {
  const m = String(nome || '').match(/NORCREST\s*[-–]?\s*(.+)$/i)
  return m ? m[1].trim().toUpperCase() : null
}

// ── O seed: os 36 slides da apresentação institucional ──────────────────────
// Cada slide traz `n` (número no PPT), `titulo` (nome no PPT), `categoria`,
// `tipo` (como renderizar) e a config da fonte/agregação.
export const MODELO_INSTITUCIONAL = {
  nome: 'Apresentação Geral OBRAS',
  descricao:
    'Modelo espelhando a apresentação institucional do Departamento (rev. 2026.03).',
  slides: [
    // — Abertura / institucional —
    { n: 1, titulo: 'Capa — OBRAS', categoria: 'texto', tipo: 'capa',
      texto: 'OBRAS — Departamento de Controle de Uso de Vias Públicas' },
    { n: 2, titulo: 'Atribuições do Departamento', categoria: 'texto', tipo: 'texto',
      texto: '01 SISTEMA GEO · 02 Compatibilizações de Obras e Serviços · 03 Monitoramento · 04 Fiscalização de obras e serviços com interferência · 05 Indicadores.' },
    { n: 3, titulo: 'Marco legal — Decretos', categoria: 'texto', tipo: 'texto',
      texto: 'Decreto nº 59.108 (26/11/2019) — institui o SISTEMA GEO · Decreto nº 58.756 (16/05/2019) — reparação de pavimentos · Decreto nº 59.671 (07/08/2020) — padronização de calçadas.' },
    { n: 4, titulo: 'Conservação de Pavimento — fluxo de análise', categoria: 'texto', tipo: 'texto',
      texto: 'Análise de interferências dos projetos das concessionárias/permissionárias com os programas da Prefeitura (recapeamento, calçadas, ciclovias, faixas e corredores de ônibus): solicitação de adequação → análise minuciosa → consulta ao Consemavi → autorização com fiscalização.' },
    { n: 5, titulo: 'Conservação de Pavimento — fluxo de fiscalização', categoria: 'texto', tipo: 'texto',
      texto: 'Com o cronograma, monta-se o plano de acompanhamento da obra; análise técnica em campo e contato constante com a permissionária até a readequação conforme normas; ao fim, os relatórios técnicos ficam registrados no Departamento.' },
    { n: 6, titulo: 'Divisória — SISTEMA GEO', categoria: 'texto', tipo: 'divisoria',
      texto: 'SISTEMA GEO — SMSUB' },

    // — Sistema Geo (dados) —
    { n: 7, titulo: 'Sistema Geo — Visão Geral', categoria: 'dados', tipo: 'kpis',
      fonte: 'geo', agregacao: 'geo_visao_geral',
      manuais: ['Usuários cadastrados no Sistema Geo', 'Executantes cadastrados no Sistema Geo'] },
    { n: 8, titulo: 'Processos por Permissionária', categoria: 'dados', tipo: 'barra',
      fonte: 'geo', agregacao: 'geo_por_permissionaria', config: { topN: 10 } },
    { n: 9, titulo: 'Processos por Obra/Serviço', categoria: 'dados', tipo: 'pizza',
      fonte: 'geo', agregacao: 'geo_por_tipo_obra' },
    { n: 10, titulo: 'Processos — Controle Mensal', categoria: 'dados', tipo: 'linha_mensal',
      fonte: 'geo', agregacao: 'geo_controle_mensal' },
    { n: 11, titulo: 'Protocolos de Emergência — NORCREST', categoria: 'dados', tipo: 'linha_anual',
      fonte: 'geo', agregacao: 'geo_emerg_norcrest_anual' },
    { n: 12, titulo: 'Obras/Serviços de Emergência (Total × Emergência)', categoria: 'dados', tipo: 'barra_dupla',
      fonte: 'geo', agregacao: 'geo_total_vs_emerg', config: { topN: 10 } },
    { n: 13, titulo: 'Emergências × Manutenção Corretiva', categoria: 'dados', tipo: 'barra',
      fonte: 'geo', agregacao: 'geo_emerg_vs_corretiva', config: { topN: 10 } },
    { n: 14, titulo: 'Comparativo de Autorizações', categoria: 'dados', tipo: 'linha_anual',
      fonte: 'geo', agregacao: 'geo_autorizacoes_anual' },
    { n: 15, titulo: 'Comparativo de Emergências', categoria: 'dados', tipo: 'linha_anual',
      fonte: 'geo', agregacao: 'geo_emerg_anual' },
    { n: 16, titulo: 'Obras/Serviços de Emergência — comparativo anual', categoria: 'dados', tipo: 'barra',
      fonte: 'geo', agregacao: 'geo_emerg_barra_anual' },
    { n: 17, titulo: 'Protocolos Emergência NORCREST por unidade', categoria: 'dados', tipo: 'barra_dupla',
      fonte: 'emerg', agregacao: 'emerg_norcrest_por_unidade' },
    { n: 18, titulo: 'Total de Processos por Região', categoria: 'dados', tipo: 'barra',
      fonte: 'geo', agregacao: 'geo_por_regiao' },

    // — Fiscalização (dados) —
    { n: 19, titulo: 'Divisória — FISCALIZAÇÃO', categoria: 'texto', tipo: 'divisoria',
      texto: 'FISCALIZAÇÃO — SMSUB' },
    { n: 20, titulo: 'Fiscalização — visão geral', categoria: 'dados', tipo: 'pizza',
      fonte: 'fisc', agregacao: 'fisc_leg_vs_nc' },
    { n: 21, titulo: 'Avanço do Controle Tecnológico', categoria: 'dados', tipo: 'linha_trimestral',
      fonte: 'fisc', agregacao: 'fisc_avanco' },
    { n: 22, titulo: 'Avanço do Controle Tecnológico — NORCREST', categoria: 'dados', tipo: 'linha_trimestral',
      fonte: 'fisc', agregacao: 'fisc_avanco_norcrest' },
    { n: 23, titulo: 'NORCREST — Análise por Metragem', categoria: 'futuro', tipo: 'texto',
      texto: 'Área que não atendeu à Legislação e valor estimado de multa. A área (m²) existe no sistema, mas o valor de multa depende de uma taxa externa ainda não cadastrada — entra num módulo futuro.' },

    // — Pavimentação asfáltica / economia (institucional) —
    { n: 24, titulo: 'Pavimentação Asfáltica — Concessionárias', categoria: 'texto', tipo: 'texto',
      texto: 'Recomposições executadas pelas concessionárias conforme legislação vigente: área aproximada 2,3 milhões m² · 21,7 mil vias · estimativa de economia R$ 560,1 milhões.' },
    { n: 25, titulo: 'Pavimentação Asfáltica — NORCREST (CERP)', categoria: 'texto', tipo: 'texto',
      texto: 'Termo de Cooperação — recapeamento NORCREST: área aproximada 1,5 milhão m² · 308 mil vias · economia R$ 374,3 milhões. CERP — Centro Ecológico de Reciclagem do Pavimento (Vila Leopoldina): RCC/RAP espumado para camadas de sub-base.' },
    { n: 26, titulo: 'Termo de Cooperação — NORCREST', categoria: 'texto', tipo: 'texto',
      texto: 'Termo 2020: 133 vias · 74.950,00 m de extensão · 702.432,30 m² · economia R$ 175.608.075,00. Termo 2022: 175 vias · 95.386,09 m · 794.813,48 m² · economia R$ 198.703.370,00. Total: R$ 374,3 milhões.' },
    { n: 27, titulo: 'Pavimentação Asfáltica 2019–2026 (total concessionárias)', categoria: 'texto', tipo: 'texto',
      texto: 'Concessionárias 2.240.333,96 m² / 21.801 vias / R$ 560,1 mi + Termo NORCREST 1.497.245,78 m² / 308 vias / R$ 374,3 mi = estimativa de economia da Prefeitura R$ 934,4 milhões.' },
    { n: 28, titulo: 'Pavimentação Asfáltica 2019–2026 (NORCREST)', categoria: 'texto', tipo: 'texto',
      texto: 'NORCREST 1.979.139,36 m² / 17.605 vias / R$ 494,8 mi + Termo NORCREST 1.497.245,78 m² / 308 vias / R$ 374,3 mi = estimativa de economia R$ 869,1 milhões.' },

    // — Fiscalização detalhada (dados) —
    { n: 29, titulo: 'Fiscalização — Laudos × NC por permissionária', categoria: 'dados', tipo: 'barra_dupla',
      fonte: 'fisc', agregacao: 'fisc_laudos_vs_nc', config: { topN: 10 },
      manuais: ['Tempo médio de resposta da NORCREST (dias)'] },
    { n: 30, titulo: 'Fiscalização — NC × Em andamento por permissionária', categoria: 'dados', tipo: 'barra_dupla',
      fonte: 'fisc', agregacao: 'fisc_nc_vs_andamento', config: { topN: 10 } },
    { n: 31, titulo: 'Fiscalização NORCREST — NC × Em andamento por unidade', categoria: 'dados', tipo: 'barra_dupla',
      fonte: 'fisc', agregacao: 'fisc_nc_vs_andamento_norcrest' },
    { n: 32, titulo: 'Fiscalização — Tipo de Falhas', categoria: 'dados', tipo: 'barra_horizontal',
      fonte: 'fisc', agregacao: 'fisc_tipos_falha' },
    { n: 33, titulo: 'Fiscalização — Tipo de Falhas (destaques)', categoria: 'dados', tipo: 'kpis',
      fonte: 'fisc', agregacao: 'fisc_tipos_falha_kpis' },
    { n: 34, titulo: 'Fiscalização — Classificação Viária', categoria: 'dados', tipo: 'pizzas_viaria',
      fonte: 'fisc', agregacao: 'fisc_classificacao_viaria' },
    { n: 35, titulo: 'Fiscalização — Classificação Viária (distribuições)', categoria: 'dados', tipo: 'pizzas_viaria',
      fonte: 'fisc', agregacao: 'fisc_classificacao_viaria' },
    { n: 36, titulo: 'Fiscalização NORCREST — Classificação Viária', categoria: 'dados', tipo: 'pizzas_viaria',
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
    manuais: slide.manuais || null,
  }

  // Slides institucionais / futuros: só texto (a arte é replicada).
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
      const kpis = [
        { rotulo: 'Permissionárias/concessionárias', valor: permissionarias },
        { rotulo: 'Obras registradas', valor: geo.length },
      ]
      // KPIs manuais (não temos no banco): expostos para preencher à mão.
      for (const m of slide.manuais || []) kpis.push({ rotulo: m, valor: null, manual: true })
      return { ...base, kpis }
    }
    case 'geo_por_permissionaria': {
      const dados = topPermissionarias(geo, cfg.topN || 10, true).map((d) => ({
        nome: d.nome,
        valor: d.count,
      }))
      return { ...base, dados, colunas: [{ key: 'nome', label: 'Permissionária' }, { key: 'valor', label: 'Processos' }] }
    }
    case 'geo_por_tipo_obra': {
      const total = geo.length
      const dados = tiposObraCount(geo).map((d) => ({
        nome: d.nome,
        valor: d.count,
        pct: total ? Math.round((d.count / total) * 100) : 0,
      }))
      return { ...base, dados, colunas: [{ key: 'nome', label: 'Tipo de obra/serviço' }, { key: 'valor', label: 'Processos' }, { key: 'pct', label: '%' }] }
    }
    case 'geo_controle_mensal': {
      const { anos, data } = comparativoAnualPorMes(geo)
      return { ...base, dados: data, series: anos, colunas: [{ key: 'mes', label: 'Mês' }, ...anos.map((a) => ({ key: a, label: a }))] }
    }
    case 'geo_emerg_norcrest_anual': {
      const rows = geo.filter((r) => ehNorcrest(r) && ehEmergencia(r))
      const dados = serieAnual(rows)
      return { ...base, dados, colunas: [{ key: 'ano', label: 'Ano' }, { key: 'valor', label: 'Emergências NORCREST' }] }
    }
    case 'geo_total_vs_emerg': {
      const dados = totalVsEmergencia(geo, cfg.topN || 10)
      return { ...base, dados, colunas: [{ key: 'nome', label: 'Permissionária' }, { key: 'total', label: 'Total' }, { key: 'emergencia', label: 'Emergência' }, { key: 'pct_emerg', label: '% Emerg.' }] }
    }
    case 'geo_emerg_vs_corretiva': {
      const map = new Map()
      for (const r of geo) {
        const k = consolidarNorcrest(r.permissionaria)
        if (!k) continue
        const t = String(r.tipo_obra_nome || r.tipo_obra || '').toUpperCase()
        if (!map.has(k)) map.set(k, { nome: k, emergencia: 0, corretiva: 0 })
        const o = map.get(k)
        if (t.includes('EMERG')) o.emergencia++
        else if (t.includes('CORRETIVA')) o.corretiva++
      }
      const dados = Array.from(map.values())
        .sort((a, b) => b.emergencia - a.emergencia)
        .slice(0, cfg.topN || 10)
      return { ...base, dados, colunas: [{ key: 'nome', label: 'Permissionária' }, { key: 'emergencia', label: 'Emergência' }, { key: 'corretiva', label: 'Manut. Corretiva' }] }
    }
    case 'geo_autorizacoes_anual': {
      // Autorizações = tudo que NÃO é emergência (Expansão, Ligação, Manutenção…).
      const dados = serieAnual(geo.filter((r) => !ehEmergencia(r)))
      return { ...base, dados, colunas: [{ key: 'ano', label: 'Ano' }, { key: 'valor', label: 'Autorizações' }] }
    }
    case 'geo_emerg_anual':
    case 'geo_emerg_barra_anual': {
      const dados = serieAnual(geo.filter((r) => ehEmergencia(r)))
      return { ...base, dados, colunas: [{ key: 'ano', label: 'Ano' }, { key: 'valor', label: 'Emergências' }] }
    }
    case 'geo_por_regiao': {
      const dados = processosPorRegiao(geo).map((d) => ({
        nome: d.regiao,
        valor: d.count,
        pct: d.pct,
      }))
      // Detalhe por subprefeitura (para o download completo do slide).
      const porSub = Array.from(contagemPorSubprefeituraGeo(geo).entries())
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
      return { ...base, dados, detalhe: porSub, colunas: [{ key: 'nome', label: 'Região' }, { key: 'valor', label: 'Processos' }, { key: 'pct', label: '%' }] }
    }

    // ── Fiscalização ────────────────────────────────────────────────────────
    case 'fisc_leg_vs_nc': {
      const dados = distribuicaoLegislacaoVsNC(fisc)
      const soluc = distribuicaoSolucVsEmAnd(fisc)
      return { ...base, dados, detalhe: soluc, colunas: [{ key: 'nome', label: 'Situação' }, { key: 'valor', label: 'Laudos' }, { key: 'pct', label: '%' }] }
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
          pct_leg: o.total ? Math.round((o.leg / o.total) * 100) : 0,
          pct_nc: o.total ? Math.round((o.nc / o.total) * 100) : 0,
        }))
      return { ...base, dados, colunas: [{ key: 'periodo', label: 'Trimestre' }, { key: 'pct_leg', label: '% Legislação Atendida' }, { key: 'pct_nc', label: '% Não Atenderam' }] }
    }
    case 'fisc_laudos_vs_nc': {
      const dados = rankingLegislacaoVsNC(fisc, cfg.topN || 10, true).map((d) => ({
        nome: d.nome,
        laudos: d.total,
        nao_conformidades: d.nao_atendida,
        pct_nc: d.total ? Math.round((d.nao_atendida / d.total) * 100) : 0,
      }))
      return { ...base, dados, colunas: [{ key: 'nome', label: 'Permissionária' }, { key: 'laudos', label: 'Laudos Técnicos' }, { key: 'nao_conformidades', label: 'Não Conformidades' }, { key: 'pct_nc', label: '% NC' }] }
    }
    case 'fisc_nc_vs_andamento':
    case 'fisc_nc_vs_andamento_norcrest': {
      const isNorcrest = slide.agregacao === 'fisc_nc_vs_andamento_norcrest'
      const map = new Map()
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
        if (r.em_andamento) o.em_andamento++
      }
      const dados = Array.from(map.values())
        .sort((a, b) => b.nao_conformidades - a.nao_conformidades)
        .slice(0, isNorcrest ? 15 : 10)
      return { ...base, dados, colunas: [{ key: 'nome', label: isNorcrest ? 'Unidade NORCREST' : 'Permissionária' }, { key: 'nao_conformidades', label: 'Não conformidades' }, { key: 'em_andamento', label: 'Em andamento' }] }
    }
    case 'fisc_tipos_falha': {
      const dados = rankingTiposFalha(fisc).map((d) => ({ nome: d.nome, valor: d.laudos }))
      return { ...base, dados, colunas: [{ key: 'nome', label: 'Tipo de falha' }, { key: 'valor', label: 'Ocorrências' }] }
    }
    case 'fisc_tipos_falha_kpis': {
      const kpis = rankingTiposFalha(fisc)
        .filter((d) => d.laudos > 0)
        .slice(0, 5)
        .map((d) => ({ rotulo: d.nome, valor: d.laudos }))
      return { ...base, kpis }
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
      const map = new Map()
      for (const r of emerg) {
        const perm = r.permissionaria || r.nome_permissionaria || ''
        if (!String(perm).toUpperCase().startsWith('NORCREST')) continue
        const u = unidadeNorcrest(perm) || 'NORCREST (s/ unidade)'
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
      return { ...base, dados, aviso, colunas: [{ key: 'nome', label: 'Unidade NORCREST' }, { key: 'encerradas', label: 'Encerradas' }, { key: 'informadas', label: 'Informadas' }] }
    }

    default:
      return { ...base, aviso: `Agregação "${slide.agregacao}" ainda não implementada.` }
  }
}
