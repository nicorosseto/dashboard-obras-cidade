// Tours do módulo Análise Integrada (aba 4 do Sistema Geo — cruzamento
// Fiscalização × Sistema Geo): tour de entrada + mini-tours por aba.
// IDs das abas são strings (ver src/lib/abasCruzamento.js), não números
// como em Sistema Geo/Fiscalização.

export const TOUR_CRUZAMENTO = {
  id: 'cruzamento',
  versao: 1,
  titulo: 'Módulo Análise Integrada',
  passos: [
    {
      alvo: '[data-tour="header-modulo"]',
      titulo: 'Análise Integrada ⚖️',
      texto:
        'Este módulo reconcilia as bases de Fiscalização e Sistema Geo: mostra o ' +
        'que está presente nas duas (em comum), o que só está numa delas, e ' +
        'onde há divergência de dados entre elas (permissionária ou ' +
        'subprefeitura digitada diferente nas duas bases, por exemplo).',
    },
    {
      alvo: '[data-tour="header-abas"]',
      titulo: 'As 8 abas da análise',
      texto:
        'Visão Geral, Cobertura, Status Cruzado, Linha do Tempo, ' +
        'Divergências, Executoras, Mapa e Busca por Processo. Na 1ª vez que ' +
        'abrir cada uma, um mini-tour explica o que ela mostra.',
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
      titulo: 'Filtros — inclui Visibilidade',
      texto:
        'Além dos filtros comuns (permissionária, subprefeitura, status, ' +
        'etapa, tipo de processo), este módulo tem o filtro "Visibilidade": ' +
        'Todos, Só em comum, Só na Fiscalização ou Só no Sistema Geo — restringe ' +
        'a análise a um desses recortes.',
    },
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Os gráficos e tabelas',
      texto:
        'Cada aba cruza os dados de um jeito diferente. Passe o mouse nos ' +
        'gráficos para ver os detalhes — os filtros da barra lateral valem em ' +
        'todas as abas.',
    },
    {
      alvo: '[data-tour="header-btn-tour"]',
      titulo: 'Rever este tour',
      texto:
        'Pronto! Para rever a apresentação da aba em que estiver, é só clicar ' +
        'neste botão "?".',
    },
  ],
}

export const TOUR_CRUZAMENTO_COBERTURA = {
  id: 'cruzamento.cobertura',
  versao: 1,
  titulo: 'Análise Integrada — Cobertura',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Cobertura 🎯',
      texto:
        'Cruza Permissionária × Subprefeitura mostrando o quanto cada ' +
        'combinação já foi fiscalizada — bom para achar áreas ou empresas com ' +
        'pouca fiscalização.',
    },
  ],
}

export const TOUR_CRUZAMENTO_STATUS = {
  id: 'cruzamento.status-cruzado',
  versao: 1,
  titulo: 'Análise Integrada — Status Cruzado',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Status Cruzado ⚖️',
      texto:
        'Compara o status no Sistema Geo com o status na Fiscalização para os ' +
        'processos em comum, e destaca inconsistências — por exemplo, obra ' +
        'encerrada/cancelada no Sistema Geo mas ainda "em andamento" na ' +
        'Fiscalização.',
    },
  ],
}

export const TOUR_CRUZAMENTO_LINHATEMPO = {
  id: 'cruzamento.linha-tempo',
  versao: 1,
  titulo: 'Análise Integrada — Linha do Tempo',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Linha do Tempo ⏳',
      texto:
        'Mostra o prazo entre o cadastro no Sistema Geo e o primeiro laudo de ' +
        'fiscalização, e a evolução mensal comparando as duas bases nos ' +
        'últimos 24 meses.',
    },
  ],
}

export const TOUR_CRUZAMENTO_DIVERGENCIAS = {
  id: 'cruzamento.divergencias',
  versao: 1,
  titulo: 'Análise Integrada — Divergências',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Divergências ⚠️',
      texto:
        'Processos com a mesma chave nas duas bases, mas com permissionária ' +
        'ou subprefeitura registradas de forma diferente — geralmente erro de ' +
        'digitação numa das entradas manuais.',
    },
  ],
}

export const TOUR_CRUZAMENTO_EXECUTORAS = {
  id: 'cruzamento.executoras',
  versao: 1,
  titulo: 'Análise Integrada — Executoras',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Executoras 🏗️',
      texto:
        'Ranking das executoras com processos presentes nas duas bases ao ' +
        'mesmo tempo (Fiscalização × Sistema Geo).',
    },
  ],
}

export const TOUR_CRUZAMENTO_MAPA = {
  id: 'cruzamento.mapa',
  versao: 1,
  titulo: 'Análise Integrada — Mapa',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Mapa e ranking de cobertura 🗺️',
      texto:
        '% de cobertura de fiscalização por subprefeitura, com ranking ao ' +
        'lado — as subprefeituras com processos no Sistema Geo mas pouca ' +
        'fiscalização ficam fáceis de identificar.',
    },
  ],
}

export const TOUR_CRUZAMENTO_BUSCA = {
  id: 'cruzamento.busca',
  versao: 1,
  titulo: 'Análise Integrada — Busca por Processo',
  passos: [
    {
      alvo: '[data-tour="busca-campo"]',
      titulo: 'Buscar um processo 🔍',
      texto:
        'Digite o número (ou parte do número) do processo para localizá-lo ' +
        'nas duas bases combinadas.',
    },
    {
      alvo: '[data-tour="busca-filtrar"]',
      titulo: 'Listar pelos filtros',
      texto:
        'Sem digitar nada, "Filtrar" monta a lista com o que estiver marcado ' +
        'na barra lateral (respeitando a Visibilidade escolhida). Processos ' +
        'só na Fiscalização aparecem em itálico, ao final da lista.',
    },
  ],
}
