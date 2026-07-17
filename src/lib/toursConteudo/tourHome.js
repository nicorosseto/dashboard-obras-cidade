// Tour guiado da tela inicial (Home) — oferecido logo após o login.
//
// Cada passo: { alvo, titulo, texto, permissao? }
//   - alvo: seletor CSS de um atributo data-tour="…" (nunca classe de estilo).
//     Se o elemento não existir no DOM (sem permissão, dado ainda não
//     carregado, tela estreita), o motor PULA o passo — nunca quebra.
//   - permissao: código do catálogo (ex.: 'emerg.ver') — o passo some para
//     quem não tem. Para os cards da Home a presença no DOM já reflete a
//     permissão, mas declarar reforça a garantia.

export const TOUR_HOME = {
  id: 'home',
  versao: 1,
  titulo: 'Tela inicial',
  passos: [
    {
      alvo: '[data-tour="home-cabecalho"]',
      titulo: 'Bem-vindo ao Dashboard OBRAS! 👋',
      texto:
        'Este é o painel do Departamento de Controle e Uso de Vias Públicas. ' +
        'Aqui você acompanha os dados de fiscalização de vias, obras e ' +
        'emergências em gráficos, mapas e tabelas. Vamos conhecer a tela inicial?',
    },
    {
      alvo: '[data-tour="home-card-sistema-geo"]',
      titulo: 'Módulo Dados Sistema Geo',
      texto:
        'Mostra as obras registradas no sistema Sistema Geo: quantas existem, em ' +
        'que situação estão e em qual subprefeitura. Cada cartão destes abre um ' +
        'módulo — o selo "Atualizado em" indica a data da última carga de dados.',
    },
    {
      alvo: '[data-tour="home-card-fiscalizacao"]',
      titulo: 'Módulo Fiscalização',
      texto:
        'Acompanha as vistorias e laudos dos fiscais da OBRAS, com destaque ' +
        'para as não conformidades (falhas encontradas nas obras).',
    },
    {
      alvo: '[data-tour="home-card-cruzamento"]',
      titulo: 'Módulo Análise Integrada',
      texto:
        'Cruza as bases de Fiscalização e Sistema Geo: o que aparece nas duas, o ' +
        'que está só em uma e onde há divergência de dados entre elas.',
    },
    {
      alvo: '[data-tour="home-card-emergencias"]',
      titulo: 'Módulo Emergências',
      permissao: 'emerg.ver',
      texto:
        'Monitora as obras de emergência comunicadas pelas permissionárias. O ' +
        'selo vermelho (quando aparece) indica emergências com o prazo de 48h ' +
        'vencido — as que merecem atenção primeiro.',
    },
    {
      alvo: '[data-tour="home-card-relatorio"]',
      titulo: 'Módulo Apresentação',
      texto:
        'Prévia do relatório mensal em slides, no formato da apresentação ' +
        'institucional — com download dos dados e da imagem de cada slide.',
    },
    {
      alvo: '[data-tour="home-card-multas"]',
      titulo: 'Módulo Multas',
      permissao: 'multas.ver',
      texto:
        'Multas de processo sincronizadas periodicamente da planilha de ' +
        'controle, já cruzadas com o Sistema Geo e a Fiscalização — inclui uma ' +
        'seção para conferir inconsistências de preenchimento da planilha.',
    },
    {
      alvo: '[data-tour="home-kpis"]',
      titulo: 'Números gerais',
      texto:
        'Resumo rápido do sistema: total de protocolos do Sistema Geo, total de ' +
        'vistorias da Fiscalização e a data/hora da última atualização de dados.',
    },
    {
      alvo: '[data-tour="home-configuracoes"]',
      titulo: 'Configurações (administração)',
      texto:
        'Área do administrador: criar usuários, montar perfis de acesso, ' +
        'atualizar os dados do sistema e consultar o log de acessos.',
    },
    {
      alvo: '[data-tour="home-sair"]',
      titulo: 'Sair do sistema',
      texto:
        'Encerra a sua sessão. Por segurança, o sistema também desconecta ' +
        'sozinho após 12 horas do login.',
    },
    {
      alvo: '[data-tour="home-btn-tour"]',
      titulo: 'Rever este tour quando quiser',
      texto:
        'Pronto! Se quiser rever esta apresentação no futuro, é só clicar ' +
        'neste botão. Os demais módulos também oferecem um tour na primeira ' +
        'vez que você os abrir.',
    },
  ],
}
