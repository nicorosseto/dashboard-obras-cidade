// Tour do módulo GT Obras (compatibilização de obras × recape). Padrão de
// Multas: tour de entrada + mini-tour por aba (exceto a inicial "Visão
// Geral", coberta pelo tour de entrada).

export const TOUR_GT = {
  id: 'gt',
  versao: 1,
  titulo: 'Módulo GT Obras',
  passos: [
    {
      alvo: '[data-tour="header-modulo"]',
      titulo: 'Módulo GT Obras 🔗',
      texto:
        'Acompanha a compatibilização entre obras de permissionárias e a ' +
        'programação de recape das vias — o trabalho do Grupo de Trabalho ' +
        '(GT) da OBRAS. Sincronizado da planilha [GT - Obras]; este ' +
        'dashboard é somente leitura, a edição continua na planilha.',
    },
    {
      alvo: '[data-tour="header-abas"]',
      titulo: '3 abas',
      texto:
        'Visão Geral (KPIs e gráficos), Análise de Status (aprofundamento ' +
        'por status, pendências e recape) e Lista (busca por nº de processo).',
    },
    {
      alvo: '[data-tour="gt-atualizar"]',
      titulo: 'Atualizar agora',
      texto:
        'Força uma nova sincronização com a planilha na hora — só aparece ' +
        'para quem tem essa permissão.',
      permissao: 'gt.atualizar',
    },
    {
      alvo: '[data-tour="sidebar-filtros"]',
      titulo: 'Filtros',
      texto:
        'Barra lateral de filtros (clique para abrir, quando estiver ' +
        'recolhida): permissionária (NORCREST consolidada), situação ' +
        '(compatibilizada/paralisada), subprefeitura e ano do processo.',
    },
    {
      alvo: '[data-tour="gt-kpis"]',
      titulo: 'KPIs e gráficos',
      texto:
        'Quantidade total de obras, compatibilizadas, paralisadas, ' +
        'metragem e % compatibilizada — além da série histórica por ano e ' +
        'do ranking de permissionárias.',
    },
    {
      alvo: '[data-tour="header-modulos"]',
      titulo: 'Trocar de módulo',
      texto:
        'Este menu leva aos outros módulos do sistema sem precisar voltar à tela inicial.',
    },
    {
      alvo: '[data-tour="header-btn-tour"]',
      titulo: 'Rever este tour',
      texto: 'Pronto! Para rever este módulo, é só clicar neste botão "?".',
    },
  ],
}

export const TOUR_GT_BUSCA = {
  id: 'gt.busca',
  versao: 1,
  titulo: 'GT Obras — Lista',
  passos: [
    {
      alvo: '[data-tour="gt-busca-campo"]',
      titulo: 'Buscar uma obra',
      texto: 'Digite parte do número de processo para localizar rapidamente.',
    },
    {
      alvo: '[data-tour="gt-busca-filtrar"]',
      titulo: 'Listar tudo',
      texto: 'Sem digitar nada, clique aqui para listar todas as obras carregadas.',
    },
    {
      alvo: '[data-tour="gt-toggle-inconsistencias"]',
      titulo: 'Verificar inconsistências',
      texto:
        'O raio-x dos erros de preenchimento da planilha [GT - Obras]: ' +
        'divergência do painel DASH, processos não encontrados, duplicados ' +
        'e grafias ambíguas. A correção é sempre feita na planilha.',
    },
  ],
}

// Dispara no 1º clique em "Verificar inconsistências" (App.jsx trata o
// toggle como um sub-estado da aba "busca", `gt.busca.inconsistencias`,
// mesmo padrão do mini-tour por aba — só que aqui é um sub-toggle, não uma
// aba própria do Header).
export const TOUR_GT_INCONSISTENCIAS = {
  id: 'gt.busca.inconsistencias',
  versao: 1,
  titulo: 'GT Obras — Verificar inconsistências',
  passos: [
    {
      alvo: '[data-tour="gt-inconsistencias-dash"]',
      titulo: 'Divergência DASH × Base Recalculada',
      texto:
        'Compara a soma dos 3 blocos anuais do painel DASH da planilha ' +
        'contra o bloco "Total Geral" da mesma planilha — quando divergem, ' +
        'é erro de fórmula da própria planilha, não do dashboard.',
    },
    {
      alvo: '[data-tour="gt-inconsistencias-kpis"]',
      titulo: 'Contadores de inconsistência',
      texto:
        'Sem número de processo, processo que não bate com Sistema Geo/' +
        'Fiscalização, processo e via duplicados, e grafias ambíguas na ' +
        'situação do recape.',
    },
    {
      alvo: '[data-tour="gt-inconsistencias-tabela"]',
      titulo: 'As linhas, uma a uma',
      texto:
        'Cada grupo lista as linhas correspondentes, com o número da linha ' +
        'na planilha — use-o para achar e corrigir na planilha [GT - Obras].',
    },
  ],
}

export const TOUR_GT_ANALISE = {
  id: 'gt.analise',
  versao: 1,
  titulo: 'GT Obras — Análise de Status',
  passos: [
    {
      alvo: '[data-tour="gt-analise-status"]',
      titulo: 'Funil de status',
      texto:
        'Distribuição por compatibilizada/paralisada — filtrando por uma ' +
        'única situação na sidebar, o gráfico detalha os status individuais.',
    },
    {
      alvo: '[data-tour="gt-analise-pendencias"]',
      titulo: 'Pendências acionáveis',
      texto:
        'O que está parado esperando alguém agir (deliberação interna, ' +
        'resposta da permissionária, assinatura…), com a metragem em risco.',
    },
    {
      alvo: '[data-tour="gt-analise-status-ano"]',
      titulo: 'Status × ano',
      texto:
        'Separa passivo antigo de fluxo corrente — um status concentrado ' +
        'no ano mais recente é fila de trabalho, não acúmulo histórico.',
    },
    {
      alvo: '[data-tour="gt-analise-tecnica"]',
      titulo: 'Carga por técnica',
      texto:
        'Quantas análises cada técnica fez e a taxa de compatibilização ' +
        'de cada uma — medida de produtividade individual, use com cuidado.',
    },
    {
      alvo: '[data-tour="gt-analise-recape"]',
      titulo: 'Recape × status da obra',
      texto:
        'O cruzamento que é a razão de ser do GT: obra ainda paralisada ' +
        'numa via cujo recape já foi concluído é o pior caso.',
    },
  ],
}
