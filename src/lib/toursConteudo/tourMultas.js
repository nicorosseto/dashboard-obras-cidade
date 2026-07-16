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
      titulo: '3 abas',
      texto:
        'Visão Geral (KPIs e gráficos), Inconsistências (erros de preenchimento da ' +
        'planilha) e Busca/Lista (por número de processo ou auto da multa).',
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
      alvo: '[data-tour="multas-kpis"]',
      titulo: 'KPIs e gráficos',
      texto:
        'Total de multas, valor total, quantas estão vinculadas a um processo real ' +
        'e a distribuição por permissionária, status e mês da infração.',
    },
    {
      alvo: '[data-tour="header-modulos"]',
      titulo: 'Trocar de módulo',
      texto: 'Este menu leva aos outros módulos do sistema sem precisar voltar à tela inicial.',
    },
    {
      alvo: '[data-tour="header-btn-tour"]',
      titulo: 'Rever este tour',
      texto: 'Pronto! Para rever este módulo, é só clicar neste botão "?".',
    },
  ],
}

export const TOUR_MULTAS_INCONSISTENCIAS = {
  id: 'multas.inconsistencias',
  versao: 1,
  titulo: 'Multas — Inconsistências',
  passos: [
    {
      alvo: '[data-tour="multas-inconsistencias-tabela"]',
      titulo: 'O raio-x dos erros de preenchimento',
      texto:
        'Duas listas: multas sem número de processo na planilha e multas com número ' +
        'de processo que não bate com nenhum registro do Sistema Geo/Fiscalização. A ' +
        'correção é sempre feita na planilha — a próxima sincronização já traz o dado certo.',
    },
  ],
}

export const TOUR_MULTAS_BUSCA = {
  id: 'multas.busca',
  versao: 1,
  titulo: 'Multas — Busca/Lista',
  passos: [
    {
      alvo: '[data-tour="multas-busca-campo"]',
      titulo: 'Buscar uma multa',
      texto: 'Digite parte do número de processo ou do auto da multa para localizar rapidamente.',
    },
    {
      alvo: '[data-tour="multas-busca-filtrar"]',
      titulo: 'Listar tudo',
      texto: 'Sem digitar nada, clique aqui para listar todas as multas carregadas.',
    },
  ],
}
