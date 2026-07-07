// Conteúdo do manual de atualização de dados de Emergências, renderizado
// nativamente (mesmo padrão visual dos pop-ups "?" de AjudaUpload.jsx) em vez
// de um <iframe> do PDF. O PDF original continua disponível só para download
// (link no cabeçalho do ModalManual, em PaginaEmergencias.jsx). As imagens
// (com as setas vermelhas indicando onde clicar) vêm do PDF final revisado
// pelo usuário — recortadas página a página, não do rascunho original.
const BASE = '/manuais/emergencias'

function Secao({ numero, titulo, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-navy border-b-2 border-navy pb-2">
        {numero}. {titulo}
      </h2>
      {children}
    </section>
  )
}

function SubSecao({ numero, titulo, children }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-red uppercase tracking-wide">
        {numero} {titulo}
      </h3>
      {children}
    </div>
  )
}

function Passos({ children }) {
  return <ol className="space-y-2.5">{children}</ol>
}

function Passo({ n, children }) {
  return (
    <li className="flex gap-3 items-start">
      <span className="shrink-0 w-5 h-5 rounded-full bg-navy text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <span className="text-sm text-gray-700 leading-relaxed">{children}</span>
    </li>
  )
}

function Print({ src, legenda, alt }) {
  return (
    <figure className="my-1.5">
      <img
        src={`${BASE}/${src}`}
        alt={alt}
        loading="lazy"
        className="w-full rounded-md border border-grey-line shadow-card"
      />
      {legenda && (
        <figcaption className="text-[11px] text-gray-500 italic text-center mt-1">
          {legenda}
        </figcaption>
      )}
    </figure>
  )
}

function Nota({ titulo, children }) {
  return (
    <div className="bg-blue-50 border-l-4 border-navy rounded-r-md p-3">
      <p className="text-[11px] font-bold text-navy uppercase tracking-wide mb-1">{titulo}</p>
      <p className="text-xs text-gray-700 leading-relaxed">{children}</p>
    </div>
  )
}

function Atencao({ titulo, children }) {
  return (
    <div className="bg-red-50 border-l-4 border-red rounded-r-md p-3">
      <p className="text-[11px] font-bold text-red uppercase tracking-wide mb-1">{titulo}</p>
      <p className="text-xs text-red-800 leading-relaxed">{children}</p>
    </div>
  )
}

export default function ManualEmergencias() {
  return (
    <div className="space-y-7 text-gray-700">
      <div id="introducao" className="space-y-2.5">
        <p className="text-sm leading-relaxed">
          Este guia mostra o passo a passo completo para atualizar a base de dados
          do módulo Emergências. O processo tem duas etapas: primeiro você exporta
          dois arquivos do Sistema Geo; depois, envia esses arquivos dentro do
          OBRAS, onde o sistema lê, organiza e substitui os dados automaticamente.
        </p>
        <Nota titulo="O que você vai precisar">
          Acesso ao sistema Sistema Geo e um usuário com permissão de "Atualizar
          dados" no módulo Emergências do OBRAS. Reserve os dois arquivos
          exportados na Parte 1 — eles serão usados juntos na Parte 2.
        </Nota>
      </div>

      <div id="parte-1">
        <Secao numero={1} titulo="Exportando os dados do Sistema Geo">
          <p className="text-sm leading-relaxed">
            Nesta etapa você baixa, no próprio Sistema Geo, os dois arquivos que serão
            enviados ao OBRAS: a planilha do Dashboard e a planilha de
            Posicionamento Atual de Emergências.
          </p>

          <SubSecao numero="1.1" titulo="Dashboard">
            <Passos>
              <Passo n={1}>Acesse o menu lateral do sistema e clique em "Dashboard".</Passo>
              <Passo n={2}>
                Preencha "Período de" com a data de início do uso do sistema, ou
                deixe em branco — o sistema considera automaticamente o primeiro
                registro cadastrado.
              </Passo>
              <Passo n={3}>Preencha "Período Até" com a data de hoje.</Passo>
              <Passo n={4}>Em "Licenças Emitidas / Totais", selecione a opção "Quantidades Totais".</Passo>
            </Passos>
            <Print
              src="01-dashboard-filtros.png"
              alt='Filtros do Dashboard, com setas indicando Período De, Período Até e Licenças Emitidas / Totais'
              legenda='Filtro "Licenças Emitidas / Totais" com a opção "Quantidades Totais" selecionada.'
            />
            <Passos>
              <Passo n={5}>
                Role a tela até a tabela de processos — organizada em abas por tipo
                de processo. Vá até a aba "Emergência", aguarde o carregamento e
                clique em "Exportar".
              </Passo>
            </Passos>
            <Print
              src="02-dashboard-exportar.png"
              alt='Aba "Emergência" da tabela de processos, com seta no botão "Exportar"'
              legenda='Aba "Emergência" da tabela de processos, com o botão "Exportar".'
            />
          </SubSecao>

          <SubSecao numero="1.2" titulo="Consultas Gerenciais">
            <Passos>
              <Passo n={1}>Acesse o menu lateral do sistema e clique em "Consultas Gerenciais".</Passo>
              <Passo n={2}>Na tela seguinte, selecione o item "Posicionamento Atual – Emergências".</Passo>
            </Passos>
            <Print
              src="03-consultas-menu.png"
              alt='Menu lateral com seta no item "Consultas Gerenciais"'
              legenda='Seleção do relatório "Posicionamento Atual – Emergências".'
            />
            <Print
              src="04-consultas-selecionado.png"
              alt='Lista de consultas com seta no item "Posicionamento Atual - Emergência"'
              legenda="Item selecionado na lista de consultas gerenciais."
            />
            <Passos>
              <Passo n={3}>
                Preencha "Data inicial" com a data de início do uso do sistema —
                este campo é obrigatório, não pode ficar em branco.
              </Passo>
              <Passo n={4}>Preencha "Período Até" com a data de hoje.</Passo>
              <Passo n={5}>Mantenha a opção "Selecionar todas" marcada.</Passo>
              <Passo n={6}>Após filtrar o resultado, clique em "Exportar".</Passo>
            </Passos>
            <Print
              src="05-posicionamento-filtros-resultado.png"
              alt='Filtros preenchidos (data inicial, data final, "Selecionar todas") e resultado filtrado, com setas indicando cada campo e o botão "Exportar"'
              legenda='Filtros preenchidos: data inicial, período até e "Selecionar todas". Resultado filtrado, pronto para exportar.'
            />
          </SubSecao>

          <Nota titulo="Ao final desta parte">
            Você terá dois arquivos baixados: a planilha do Dashboard e a planilha
            de Posicionamento Atual – Emergências. Guarde os dois no computador —
            eles serão enviados juntos na Parte 2.
          </Nota>
        </Secao>
      </div>

      <div id="parte-2">
        <Secao numero={2} titulo="Atualizando os dados no OBRAS">
          <p className="text-sm leading-relaxed">
            Com os dois arquivos exportados do Sistema Geo em mãos, o restante do
            processo acontece dentro do sistema OBRAS.
          </p>

          <SubSecao numero="2.1" titulo="Acessando o módulo">
            <Passos>
              <Passo n={1}>Entre no sistema OBRAS e acesse o módulo Emergências.</Passo>
            </Passos>
            <Print
              src="06-obras-home.png"
              alt="Card do módulo Emergências na tela inicial do OBRAS"
              legenda="Card do módulo Emergências na tela inicial do OBRAS."
            />
            <Passos>
              <Passo n={2}>
                Dentro do módulo, localize e clique no botão "Atualizar dados", no
                canto superior direito da tela.
              </Passo>
            </Passos>
            <Print
              src="07-obras-atualizar-dados-botao.png"
              alt='Botão "Atualizar dados" no módulo Emergências'
              legenda='Botão "Atualizar dados" no módulo Emergências.'
            />
          </SubSecao>

          <SubSecao numero="2.2" titulo="Enviando os arquivos">
            <Passos>
              <Passo n={1}>
                Na janela que abre, arraste (ou clique para selecionar) a planilha
                do Dashboard na área superior "Atualizar Emergências".
              </Passo>
              <Passo n={2}>
                Arraste também a planilha de Posicionamento Atual – Emergências na
                área inferior "Posicionamento de Obras", destacada em amarelo.
              </Passo>
            </Passos>
            <Print
              src="08-obras-modal-vazio.png"
              alt='Janela "Atualizar dados de Emergências" com as duas áreas de envio'
              legenda='Janela "Atualizar dados de Emergências" com as duas áreas de envio.'
            />
            <Nota titulo="Por que enviar o posicionamento?">
              A planilha de Posicionamento é opcional, mas importante: sem ela, o
              sistema não consegue calcular a regra das 48h (emergências com
              status "Informada" há mais tempo do que o permitido).
            </Nota>
          </SubSecao>

          <SubSecao numero="2.3" titulo="Conferindo a prévia">
            <p className="text-sm leading-relaxed">
              Ao soltar a planilha do Dashboard, o sistema lê o arquivo e mostra uma
              prévia com o total de processos, o período coberto e a quantidade por
              status. Nada é gravado ainda nesta etapa:
            </p>
            <Print
              src="09-previa-emergencias.png"
              alt="Prévia da planilha do Dashboard, antes de confirmar"
              legenda="Prévia da planilha do Dashboard, antes de confirmar."
            />
            <p className="text-sm leading-relaxed">
              Ao soltar também a planilha de Posicionamento, a prévia das duas
              planilhas aparece junto, com o aviso de que os dados atuais serão
              substituídos pelos da planilha:
            </p>
            <Print
              src="10-previa-ambos.png"
              alt="Prévia combinada das duas planilhas, com o aviso de substituição total"
              legenda="Prévia combinada das duas planilhas, com o aviso de substituição total."
            />
            <Nota titulo="Cabeçalho diferente do esperado?">
              Se alguma coluna da planilha não for reconhecida automaticamente, o
              sistema abre uma tela extra pedindo para indicar manualmente qual
              coluna da planilha corresponde a cada campo, antes de continuar.
            </Nota>
          </SubSecao>

          <SubSecao numero="2.4" titulo="Confirmando a importação">
            <Passos>
              <Passo n={1}>Confira os números do resumo e clique em "Confirmar e importar".</Passo>
            </Passos>
            <Atencao titulo="Não feche a janela">
              Uma barra de progresso mostra o andamento de cada planilha. Não feche
              esta janela nem atualize a página enquanto a importação estiver em
              andamento — a ação substitui todos os dados atuais e não pode ser
              desfeita.
            </Atencao>
            <Print
              src="11-gravando-emergencias.png"
              alt="Importação da planilha de Emergências em andamento"
              legenda="Importação da planilha de Emergências em andamento."
            />
            <Print
              src="12-gravando-obras.png"
              alt="Emergências concluída; posicionamento de obras em andamento"
              legenda="Emergências concluída; posicionamento de obras em andamento."
            />
            <Passos>
              <Passo n={2}>
                Ao concluir, aparece uma mensagem de confirmação com o total de
                registros importados de cada planilha. Clique em "Ok" para fechar.
              </Passo>
            </Passos>
            <Print
              src="13-sucesso.png"
              alt="Mensagem de confirmação — atualização concluída"
              legenda="Mensagem de confirmação — atualização concluída."
            />
          </SubSecao>

          <p className="text-sm leading-relaxed font-medium text-navy">
            A atualização está concluída. Os dados novos já aparecem em todas as
            abas do módulo Emergências.
          </p>
        </Secao>
      </div>
    </div>
  )
}
