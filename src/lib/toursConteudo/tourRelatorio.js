// Tour do módulo Apresentação (relatório mensal em slides). Módulo linear
// (rola por slides, sem abas) — um único tour de entrada, sem mini-tours.

export const TOUR_RELATORIO = {
  id: 'relatorio',
  versao: 1,
  titulo: 'Módulo Apresentação',
  passos: [
    {
      alvo: '[data-tour="header-modulo"]',
      titulo: 'Módulo Apresentação 📊',
      texto:
        'Prévia do relatório mensal em slides, espelhando a apresentação ' +
        'institucional — cada slide traz o número e o título do arquivo ' +
        'PowerPoint original, para você localizar rápido.',
    },
    {
      alvo: '[data-tour="relatorio-permissionaria"]',
      titulo: 'Ajustar para uma permissionária',
      texto:
        'Escolha uma permissionária aqui para ajustar a apresentação ' +
        'inteira para os dados dela: os rankings destacam a barra dela e a ' +
        'janela de exibição se desloca até a posição dela quando está fora ' +
        'do topo.',
    },
    {
      alvo: '[data-tour="relatorio-indice"]',
      titulo: 'Ir direto a um slide',
      texto: '"Ir para slide…" abre um índice numerado — clique para pular direto.',
    },
    {
      alvo: '[data-tour="relatorio-legenda"]',
      titulo: '3 tipos de slide',
      texto:
        'A borda colorida de cada slide indica o tipo: 🟢 dado real (vem do ' +
        'banco), ⚪ texto institucional (fixo) e 🟡 futuro (sem fonte de ' +
        'dados ainda — ex.: itens que dependem de sistema que o OBRAS não ' +
        'tem hoje).',
    },
    {
      alvo: '[data-tour="relatorio-baixar-todos"]',
      titulo: 'Baixar tudo de uma vez',
      texto:
        'Gera um Excel com uma aba por slide de dados. Cada slide também tem ' +
        'seus próprios botões de download (dados e imagem PNG) no canto.',
    },
    {
      alvo: '[data-tour="conteudo-modulo"]',
      titulo: 'Os slides',
      texto:
        'Role a página para ver a apresentação completa — o layout reproduz ' +
        'o modelo institucional (títulos, caixas de destaque, painéis de ' +
        'totais). Alguns slides têm campos para você digitar valores (ex.: ' +
        'multa por m²), que ficam salvos neste navegador.',
    },
    {
      alvo: '[data-tour="header-modulos"]',
      titulo: 'Trocar de módulo',
      texto:
        'Este menu leva aos outros módulos do sistema sem precisar voltar à ' +
        'tela inicial.',
    },
    {
      alvo: '[data-tour="header-btn-tour"]',
      titulo: 'Rever este tour',
      texto: 'Pronto! Para rever esta apresentação, é só clicar neste botão "?".',
    },
  ],
}
