// Tours do módulo Configurações (admin): tour de entrada + mini-tours por
// aba. Aba ativa em número (abaAdmin, igual ao padrão de Sistema Geo/
// Fiscalização) — 0=Usuários (aba inicial, sem mini-tour próprio).

export const TOUR_CONFIGURACOES = {
  id: 'configuracoes',
  versao: 1,
  titulo: 'Módulo Configurações',
  passos: [
    {
      alvo: '[data-tour="header-modulo"]',
      titulo: 'Configurações ⚙️',
      texto:
        'Área exclusiva do administrador: criar usuários, montar perfis de ' +
        'acesso, atualizar os dados do sistema e consultar o log de acessos.',
    },
    {
      alvo: '[data-tour="header-abas"]',
      titulo: 'As 4 abas',
      texto:
        'Usuários, Perfis de Acesso, Atualizar Dados e Log de Acessos. Na 1ª ' +
        'vez que abrir cada uma (exceto Usuários, que já é esta), um ' +
        'mini-tour explica o que ela faz.',
    },
    {
      alvo: '[data-tour="header-modulos"]',
      titulo: 'Trocar de módulo',
      texto:
        'Este menu leva aos outros módulos do sistema sem precisar voltar à ' +
        'tela inicial.',
    },
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Usuários 👤',
      texto:
        'Cria usuários internos por nome de usuário (username) — não por ' +
        'e-mail. Cada novo usuário começa com "1º acesso pendente" até ' +
        'trocar a senha-padrão; você também pode resetar a senha de ' +
        'qualquer usuário por aqui a qualquer momento.',
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

export const TOUR_CONFIGURACOES_PERFIS = {
  id: 'configuracoes.1',
  versao: 1,
  titulo: 'Configurações — Perfis de Acesso',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Perfis de Acesso 🛡️',
      texto:
        'Cada perfil é um conjunto de permissões (quais módulos, abas e ' +
        'botões o usuário enxerga). Crie perfis e marque as permissões numa ' +
        'matriz — a legenda "ℹ️ O que cada permissão libera?" explica cada ' +
        'item. Editar um perfil vale na hora para todos os usuários dele.',
    },
  ],
}

export const TOUR_CONFIGURACOES_ATUALIZAR = {
  id: 'configuracoes.2',
  versao: 1,
  titulo: 'Configurações — Atualizar Dados',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Atualizar Dados 🔄',
      texto:
        'Upload das planilhas de Sistema Geo e Fiscalização (sub-abas ' +
        'separadas). O fluxo sempre analisa a planilha primeiro — mostra um ' +
        'resumo do que vai mudar — antes de você confirmar a gravação. O ' +
        'botão (?) de cada sub-aba explica as regras específicas daquele ' +
        'tipo de planilha.',
    },
  ],
}

export const TOUR_CONFIGURACOES_LOGS = {
  id: 'configuracoes.3',
  versao: 1,
  titulo: 'Configurações — Log de Acessos',
  passos: [
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Log de Acessos 📋',
      texto:
        'Lista de logins no sistema — quem entrou e quando. As colunas são ' +
        'ordenáveis (clique no cabeçalho).',
    },
  ],
}
