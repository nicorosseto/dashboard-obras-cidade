// Tours do módulo Fiscalização: tour de entrada (1º acesso ao módulo) +
// mini-tours por aba (1º clique). Formato dos passos: ver tourHome.js.

export const TOUR_FISCALIZACAO = {
  id: 'fiscalizacao',
  versao: 1,
  titulo: 'Módulo Fiscalização',
  passos: [
    {
      alvo: '[data-tour="header-modulo"]',
      titulo: 'Módulo Fiscalização 📋',
      texto:
        'Aqui você acompanha as vistorias e laudos feitos pelos fiscais da ' +
        'OBRAS nas obras em via pública — com destaque para as NÃO ' +
        'CONFORMIDADES (falhas encontradas na obra).',
    },
    {
      alvo: '[data-tour="header-abas"]',
      titulo: 'Abas do módulo',
      texto:
        'Visão Geral, Evolução Temporal, Distribuição Espacial, Executoras e ' +
        'Busca por Processo. Na primeira vez que você abrir uma aba, um ' +
        'mini-tour explica o que ela mostra.',
    },
    {
      alvo: '[data-tour="header-modulos"]',
      titulo: 'Trocar de módulo',
      texto:
        'Este menu leva aos outros módulos do sistema sem precisar voltar à ' +
        'tela inicial.',
    },
    {
      alvo: '[data-tour="sidebar-filtros"]',
      titulo: 'Filtros',
      texto:
        'Esta barra lateral guarda os filtros (clique nela para abrir, quando ' +
        'estiver recolhida): período, permissionárias (com busca), ' +
        'subprefeituras e conformidade — "Só NC" mostra apenas vistorias com ' +
        'não conformidade (obra com falha). Tudo que marcar filtra todos os ' +
        'gráficos e indicadores da tela; "Limpar filtros" desfaz de uma vez.',
    },
    {
      alvo: '[data-tour="filtro-nc"]',
      titulo: 'Filtro de conformidade',
      texto:
        '"Só NC" mostra apenas vistorias com não conformidade (obra com ' +
        'falha); "Sem NC" mostra as que estavam em ordem; "Todas" desliga o ' +
        'recorte.',
    },
    {
      alvo: '[data-tour="kpis-modulo"]',
      titulo: 'Indicadores (KPIs)',
      texto:
        'Números-resumo do que está filtrado: total de vistorias, não ' +
        'conformidades e principais taxas. Mudou o filtro, mudam junto.',
    },
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Gráficos',
      texto:
        'Passe o mouse para ver os valores em detalhe. Alguns gráficos têm ' +
        'drill-down: o de permissionárias, por exemplo, abre as unidades da ' +
        'NORCREST quando ela está em destaque.',
    },
    {
      alvo: '[data-tour="exportar-grafico"]',
      titulo: 'Baixar os dados de um gráfico',
      texto:
        'O botão ⬇ no canto de cada gráfico ou tabela baixa exatamente aqueles ' +
        'dados em Excel.',
    },
    {
      alvo: '[data-tour="exportar-flutuante"]',
      titulo: 'Exportar registros completos',
      permissao: 'fisc.exportar',
      texto:
        'Este botão flutuante exporta os registros completos (com os filtros ' +
        'aplicados), deixando você escolher as colunas do Excel.',
    },
    {
      alvo: '[data-tour="header-btn-tour"]',
      titulo: 'Rever este tour',
      texto:
        'Pronto! Para rever a apresentação da tela em que estiver, é só clicar ' +
        'neste botão "?".',
    },
  ],
}

export const TOUR_FISCALIZACAO_ABA2 = {
  id: 'fiscalizacao.2',
  versao: 1,
  titulo: 'Fiscalização — Evolução Temporal',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Evolução Temporal 📈',
      texto:
        'Evolução dos laudos ao longo do tempo: por status a cada mês e ' +
        'laudos solucionados por trimestre. Bom para ver tendência e o ritmo ' +
        'de resolução — os filtros da barra lateral valem aqui também.',
    },
  ],
}

export const TOUR_FISCALIZACAO_ABA3 = {
  id: 'fiscalizacao.3',
  versao: 1,
  titulo: 'Fiscalização — Distribuição Espacial',
  passos: [
    {
      alvo: '[data-tour="mapa-sp"]',
      titulo: 'Mapa de São Paulo 🗺️',
      texto:
        'Cada área é uma subprefeitura — quanto mais escura, mais vistorias. ' +
        'CLIQUE numa subprefeitura para filtrar a tela inteira só com ela ' +
        '(clique de novo para desfazer).',
    },
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Obras por região e tipos de falha',
      texto:
        'Ao lado do mapa: a distribuição das obras por região da cidade e os ' +
        'tipos de falha encontrados nas vistorias.',
    },
  ],
}

export const TOUR_FISCALIZACAO_ABA6 = {
  id: 'fiscalizacao.6',
  versao: 1,
  titulo: 'Fiscalização — Executoras',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Executoras 🏢',
      texto:
        'Ranking das permissionárias/executoras com mais não conformidades. ' +
        'CLIQUE numa barra do gráfico para abrir o detalhamento daquela ' +
        'empresa (drill-down).',
    },
  ],
}

export const TOUR_FISCALIZACAO_ABA7 = {
  id: 'fiscalizacao.7',
  versao: 1,
  titulo: 'Fiscalização — Busca por Processo',
  passos: [
    {
      alvo: '[data-tour="busca-campo"]',
      titulo: 'Buscar um processo 🔍',
      texto:
        'Digite o número (ou parte do número) do processo para localizá-lo na ' +
        'base da Fiscalização.',
    },
    {
      alvo: '[data-tour="busca-filtrar"]',
      titulo: 'Listar pelos filtros',
      texto:
        'Sem digitar nada, o botão "Filtrar" monta a lista com o que estiver ' +
        'marcado na barra lateral. A lista só aparece quando você pede.',
    },
  ],
}
