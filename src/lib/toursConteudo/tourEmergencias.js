// Tours do módulo Emergências: tour de entrada (1º acesso) + mini-tours por
// aba (1º clique). IDs das abas são strings (ver Header.jsx, bloco
// mostrarEmergencias), não números como em Sistema Geo/Fiscalização.

export const TOUR_EMERGENCIAS = {
  id: 'emergencias',
  versao: 1,
  titulo: 'Módulo Emergências',
  passos: [
    {
      alvo: '[data-tour="header-modulo"]',
      titulo: 'Módulo Emergências 🚨',
      texto:
        'Aqui você monitora as obras de emergência comunicadas pelas ' +
        'permissionárias — identifique rápido os protocolos com maior tempo ' +
        'em aberto e priorize as intervenções críticas.',
    },
    {
      alvo: '[data-tour="header-abas"]',
      titulo: 'Abas do módulo',
      texto:
        'Visão Geral, Informadas, Prazo 48h, Dashboard, Busca por Processo, ' +
        'Motivo Inválido e Histórico. Na 1ª vez que abrir cada uma, um ' +
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
        'Barra lateral de filtros (clique para abrir, quando estiver ' +
        'recolhida): permissionária, status, data de cadastro, vistoria — ' +
        'tudo que marcar filtra a tela inteira. Algumas abas bloqueiam ' +
        'filtros que não fazem sentido nelas (ficam esmaecidos).',
    },
    {
      alvo: '[data-tour="emerg-manual"]',
      titulo: 'Manual de atualização',
      permissao: 'emerg.upload',
      texto:
        '"Como atualizar?" abre o passo a passo ilustrado de como gerar e ' +
        'subir a planilha de emergências.',
    },
    {
      alvo: '[data-tour="emerg-atualizar"]',
      titulo: 'Atualizar dados',
      permissao: 'emerg.upload',
      texto:
        '"Atualizar dados" abre o upload da planilha principal e da ' +
        'planilha de posicionamento de obras — com prévia antes de gravar.',
    },
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Gráficos e tabelas',
      texto:
        'Passe o mouse sobre os gráficos para ver os detalhes. Alguns têm ' +
        'exportação própria (botão ⬇) direto na aba.',
    },
    {
      alvo: '[data-tour="header-btn-tour"]',
      titulo: 'Rever este tour',
      texto:
        'Pronto! Para rever a apresentação da aba em que estiver, é só ' +
        'clicar neste botão "?".',
    },
  ],
}

export const TOUR_EMERGENCIAS_INFORMADAS = {
  id: 'emergencias.informadas',
  versao: 1,
  titulo: 'Emergências — Informadas',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Informadas 🚨',
      texto:
        'Lista as emergências com status "Informada" — as que ainda estão em ' +
        'aberto, aguardando o início do reparo pela permissionária.',
    },
  ],
}

export const TOUR_EMERGENCIAS_PRAZO48H = {
  id: 'emergencias.prazo48h',
  versao: 1,
  titulo: 'Emergências — Prazo 48h',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Prazo 48h — SLA das emergências ⏱️',
      texto:
        'A regra: a permissionária tem 48h (a partir do aviso de início da ' +
        'obra, ou do cadastro quando não há aviso) para resolver a ' +
        'emergência. Aqui você vê quem está dentro do prazo, quem já venceu, ' +
        'e filtra por faixa de dias em atraso. Atraso em vermelho = prazo ' +
        'real (pelo aviso de início); em âmbar tracejado = prazo estimado ' +
        '(sem posicionamento, contado pelo cadastro).',
    },
  ],
}

export const TOUR_EMERGENCIAS_DASHBOARD = {
  id: 'emergencias.dashboard',
  versao: 1,
  titulo: 'Emergências — Dashboard',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Dashboard 📊',
      texto:
        'Visão consolidada: distribuição por status, top subprefeituras, ' +
        'por etapa e evolução mensal dos últimos 18 meses.',
    },
  ],
}

export const TOUR_EMERGENCIAS_BUSCA = {
  id: 'emergencias.busca',
  versao: 1,
  titulo: 'Emergências — Busca por Processo',
  passos: [
    {
      alvo: '[data-tour="busca-campo"]',
      titulo: 'Buscar um processo 🔍',
      texto:
        'Digite o número (ou parte do número) do processo para localizá-lo.',
    },
    {
      alvo: '[data-tour="busca-filtrar"]',
      titulo: 'Listar pelos filtros',
      texto:
        'Sem digitar nada, o botão "Filtrar" monta a lista com o que ' +
        'estiver marcado na barra lateral.',
    },
  ],
}

export const TOUR_EMERGENCIAS_MOTIVO_INVALIDO = {
  id: 'emergencias.motivo_invalido',
  versao: 1,
  titulo: 'Emergências — Motivo Inválido',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Motivo Inválido 🔄',
      permissao: 'emerg.aba_motivo_invalido',
      texto:
        'Mostra processos cujo motivo (texto livre da empresa) parece ser ' +
        'uma obra programada, não uma emergência de verdade — manutenção, ' +
        'recape, ampliação… O agrupamento é automático por termo; um badge ' +
        'avisa quando há termos novos para classificar como válido/inválido.',
    },
  ],
}

export const TOUR_EMERGENCIAS_HISTORICO = {
  id: 'emergencias.historico',
  versao: 1,
  titulo: 'Emergências — Histórico',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Histórico de Uploads 🕑',
      texto:
        'Lista as vezes em que a planilha de emergências foi atualizada, ' +
        'com data e quem fez o upload.',
    },
  ],
}
