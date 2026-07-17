// Tour do módulo Multas (Trilha A, A4). Padrão de Emergências: tour de
// entrada + mini-tour por aba (exceto a inicial "Visão Geral", coberta pelo
// tour de entrada).

export const TOUR_MULTAS = {
  id: 'multas',
  versao: 1,
  titulo: 'Módulo Multas',
  passos: [
    {
      alvo: '[data-tour="header-modulo"]',
      titulo: 'Módulo Multas 🎫',
      texto:
        'Multas de processo sincronizadas periodicamente da planilha "CONTROLE DE ' +
        'AÇÕES FISCAIS - OBRAS / CORBETT", já cruzadas com o Sistema Geo e a ' +
        'Fiscalização — este dashboard é somente leitura, a edição continua na planilha.',
    },
    {
      alvo: '[data-tour="header-abas"]',
      titulo: '2 abas',
      texto:
        'Visão Geral (KPIs e gráficos) e Lista (busca por número de processo ou ' +
        'auto da multa — a Lista também tem uma seção auxiliar para conferir ' +
        'inconsistências da planilha).',
    },
    {
      alvo: '[data-tour="multas-atualizar"]',
      titulo: 'Atualizar agora',
      texto:
        'Força uma nova sincronização com a planilha na hora, sem esperar o ' +
        'intervalo automático — só aparece para quem tem essa permissão.',
      permissao: 'multas.atualizar',
    },
    {
      alvo: '[data-tour="sidebar-filtros"]',
      titulo: 'Filtros',
      texto:
        'Barra lateral de filtros (clique para abrir, quando estiver ' +
        'recolhida): permissionária (NORCREST consolidada), status da multa, ' +
        'situação do vínculo, subprefeitura e período da infração — tudo ' +
        'que marcar filtra as duas abas de uma vez.',
    },
    {
      alvo: '[data-tour="multas-kpis"]',
      titulo: 'KPIs e gráficos',
      texto:
        'Total de multas, valor total, quantas estão vinculadas a um processo real ' +
        'e a distribuição por permissionária, status e mês da infração.',
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

// A Inconsistências deixou de ser aba própria (2ª rodada de feedback,
// 16/07/2026) — virou uma seção auxiliar/alternável dentro desta aba
// (botão "Verificar inconsistências"), então o passo dela entra aqui.
export const TOUR_MULTAS_BUSCA = {
  id: 'multas.busca',
  versao: 1,
  titulo: 'Multas — Lista',
  passos: [
    {
      alvo: '[data-tour="multas-busca-campo"]',
      titulo: 'Buscar uma multa',
      texto:
        'Digite parte do número de processo ou do auto da multa para localizar rapidamente.',
    },
    {
      alvo: '[data-tour="multas-busca-filtrar"]',
      titulo: 'Listar tudo',
      texto:
        'Sem digitar nada, clique aqui para listar todas as multas carregadas.',
    },
    {
      alvo: '[data-tour="multas-toggle-inconsistencias"]',
      titulo: 'Verificar inconsistências',
      texto:
        'Seção auxiliar: multas sem número de processo na planilha e multas com número ' +
        'que não bate com nenhum registro do Sistema Geo/Fiscalização. É só conferência — a ' +
        'correção é sempre feita na planilha, a próxima sincronização já traz o dado certo.',
      permissao: 'multas.aba_inconsistencias',
    },
  ],
}
