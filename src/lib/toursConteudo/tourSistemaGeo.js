// Tours do módulo Sistema Geo: tour de entrada (1º acesso ao módulo) +
// mini-tours por aba (1º clique). Formato dos passos: ver tourHome.js.
// A aba 4 (Análise Integrada) é um módulo próprio — tour na PR 3.

export const TOUR_SISTEMA_GEO = {
  id: 'sistemaGeo',
  versao: 1,
  titulo: 'Módulo Sistema Geo',
  passos: [
    {
      alvo: '[data-tour="header-modulo"]',
      titulo: 'Módulo Sistema Geo 🗺️',
      texto:
        'Aqui você acompanha as obras registradas no sistema Sistema Geo: quantas ' +
        'existem, de qual permissionária, em que situação estão e em qual ' +
        'subprefeitura. O quadrado colorido e a barrinha no rodapé do cabeçalho ' +
        'identificam o módulo em que você está.',
    },
    {
      alvo: '[data-tour="header-abas"]',
      titulo: 'Abas do módulo',
      texto:
        'Cada aba é uma visão diferente dos mesmos dados: Visão Geral, Linha do ' +
        'Tempo, Subprefeitura e Busca por Processo. Na primeira vez que você ' +
        'abrir uma aba, um mini-tour explica o que ela mostra.',
    },
    {
      alvo: '[data-tour="header-modulos"]',
      titulo: 'Trocar de módulo',
      texto:
        'Este menu leva aos outros módulos do sistema sem precisar voltar à ' +
        'tela inicial.',
    },
    {
      alvo: '[data-tour="header-senha"]',
      titulo: 'Alterar sua senha',
      texto: 'O cadeado abre a troca da sua senha de acesso, quando quiser.',
    },
    {
      alvo: '[data-tour="sidebar-filtros"]',
      titulo: 'Filtros — o coração da análise',
      texto:
        'Esta barra lateral guarda os filtros (clique nela para abrir, quando ' +
        'estiver recolhida). Tudo que você marcar — período, status, ' +
        'permissionária, subprefeitura — filtra TODOS os gráficos e ' +
        'indicadores da tela ao mesmo tempo. No filtro de Status, marcar um ' +
        'grupo marca os sub-status dele. "Limpar filtros" desfaz tudo.',
    },
    {
      alvo: '[data-tour="kpis-modulo"]',
      titulo: 'Indicadores (KPIs)',
      texto:
        'Números-resumo do que está filtrado: total de processos, principais ' +
        'contagens e destaques. Mudou o filtro, os números mudam junto.',
    },
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Gráficos',
      texto:
        'Passe o mouse sobre qualquer gráfico para ver os detalhes (balão com ' +
        'os valores). Alguns têm "drill-down": o gráfico de Status, por ' +
        'exemplo, abre os sub-status quando um único grupo está filtrado, e o ' +
        'de permissionárias detalha as unidades da NORCREST.',
    },
    {
      alvo: '[data-tour="exportar-grafico"]',
      titulo: 'Baixar os dados de um gráfico',
      texto:
        'O botão ⬇ no canto de cada gráfico ou tabela baixa exatamente aqueles ' +
        'dados em Excel — um clique, sem configurar nada.',
    },
    {
      alvo: '[data-tour="exportar-flutuante"]',
      titulo: 'Exportar registros completos',
      permissao: 'geo.exportar',
      texto:
        'Este botão flutuante exporta os registros completos (com os filtros ' +
        'aplicados), deixando você escolher as colunas que vão para o Excel.',
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

export const TOUR_SISTEMA_GEO_ABA2 = {
  id: 'sistemaGeo.2',
  versao: 1,
  titulo: 'Sistema Geo — Linha do Tempo',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Linha do Tempo ⏳',
      texto:
        'Evolução dos processos ao longo do tempo: cadastros por mês/ano e ' +
        'comparativos anuais. Útil para enxergar tendência — os filtros da ' +
        'barra lateral continuam valendo aqui.',
    },
  ],
}

export const TOUR_SISTEMA_GEO_ABA3 = {
  id: 'sistemaGeo.3',
  versao: 1,
  titulo: 'Sistema Geo — Subprefeitura',
  passos: [
    {
      alvo: '[data-tour="mapa-sp"]',
      titulo: 'Mapa de São Paulo 📍',
      texto:
        'Cada área é uma subprefeitura — quanto mais escura, mais processos. ' +
        'CLIQUE numa subprefeitura para filtrar a tela inteira só com ela ' +
        '(clique de novo, ou "Limpar filtros", para desfazer).',
    },
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Distribuição por região',
      texto:
        'Ao lado do mapa, os gráficos mostram a distribuição por região e por ' +
        'subprefeitura — sempre respeitando os filtros ativos.',
    },
  ],
}

export const TOUR_SISTEMA_GEO_ABA6 = {
  id: 'sistemaGeo.6',
  versao: 1,
  titulo: 'Sistema Geo — Busca por Processo',
  passos: [
    {
      alvo: '[data-tour="busca-campo"]',
      titulo: 'Buscar um processo 🔍',
      texto:
        'Digite o número (ou parte do número) do processo para localizá-lo na ' +
        'base do Sistema Geo.',
    },
    {
      alvo: '[data-tour="busca-filtrar"]',
      titulo: 'Listar pelos filtros',
      texto:
        'Sem digitar nada, o botão "Filtrar" monta a lista com o que estiver ' +
        'marcado na barra lateral. A lista só aparece quando você pede — ' +
        'mudar um filtro exige clicar em "Filtrar" de novo.',
    },
  ],
}
