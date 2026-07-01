# Manual do Usuário — OBRAS Dashboard

> Guia completo de uso do sistema, escrito para quem vai operar no dia a dia.
> Linguagem simples, passo a passo, pensado para quem não é da área de tecnologia.
> **Tudo é feito pelo navegador** (Chrome, Edge, Firefox) — não há programa para instalar.
>
> **Versão:** 1.0 · **Data:** 23/06/2026
> Material complementar: `docs/prd.md` (visão do produto), `docs/progresso.md`
> (o que já foi feito), `docs/guia-ambiente-testes.md` (ambiente de homologação).

---

## Índice

1. [O que é o sistema](#1-o-que-é-o-sistema)
2. [Entrar no sistema (login e 1º acesso)](#2-entrar-no-sistema-login-e-1º-acesso)
3. [A tela inicial (Home)](#3-a-tela-inicial-home)
4. [Navegação: cabeçalho, módulos e abas](#4-navegação-cabeçalho-módulos-e-abas)
5. [Filtros (a barra lateral)](#5-filtros-a-barra-lateral)
6. [Módulo Fiscalização](#6-módulo-fiscalização)
7. [Módulo Sistema Geo](#7-módulo-sistema-geo)
8. [Módulo Análise Integrada](#8-módulo-análise-integrada)
9. [Módulo Emergências](#9-módulo-emergências)
10. [A regra das 48h (explicada)](#10-a-regra-das-48h-explicada)
11. [Exportar dados (Excel)](#11-exportar-dados-excel)
12. [Atualizar dados (upload de planilhas)](#12-atualizar-dados-upload-de-planilhas)
13. [Painel do Administrador](#13-painel-do-administrador)
14. [Glossário](#14-glossário)
15. [Dúvidas frequentes (FAQ)](#15-dúvidas-frequentes-faq)

---

## 1. O que é o sistema

O **OBRAS Dashboard** transforma as planilhas de fiscalização de vias públicas
da OBRAS (Prefeitura de São Paulo) em **gráficos, mapas e tabelas**, num só lugar.
Em vez de abrir e cruzar planilhas Excel à mão, você enxerga tudo na tela e filtra
o que quiser.

O sistema tem **quatro módulos** principais:

| Módulo | Cor | O que mostra |
|---|---|---|
| **Fiscalização** | Verde | Fiscalizações de vias, laudos, não-conformidades, recapes, termos. |
| **Sistema Geo** | Azul-marinho | Processos de licenciamento de obras na via (~175 mil), por subprefeitura. |
| **Análise Integrada** | Violeta | Cruzamento das bases de Fiscalização e Sistema Geo. |
| **Emergências** | Âmbar | Emergências informadas, prazos das 48h e posicionamento de obras. |

E o **Painel do Administrador** (Configurações), só para quem é admin.

> **Importante:** o sistema **não edita dados à mão**. Ele lê planilhas e analisa.
> Se um dado está errado, corrige-se **na planilha** e sobe de novo. A planilha é
> sempre a fonte da verdade.

---

## 2. Entrar no sistema (login e 1º acesso)

### Login
1. Abra o endereço do sistema no navegador.
2. Digite seu **usuário** (apelido/nickname) e sua **senha**.
3. Clique em **Entrar**.

> Você **não** se cadastra sozinho — quem cria sua conta é o administrador. Não há
> login com e-mail (exceto o usuário mestre). Se não tem conta, fale com o admin.

### Primeiro acesso (trocar a senha)
- Na primeira vez que você entra, o sistema **pede para trocar a senha** (a senha
  inicial é temporária, definida pelo admin).
- Escolha uma senha nova e confirme. A partir daí, é com ela que você entra.

### Esqueci a senha
- Não há recuperação por e-mail. Peça ao **administrador** para **redefinir sua
  senha** — ele gera uma temporária e, no próximo acesso, você troca de novo.

### A sessão expira em 12 horas
- Por segurança (computador compartilhado de repartição), o sistema **desconecta
  sozinho 12 horas após o login**. É só entrar de novo. Isso é normal.

---

## 3. A tela inicial (Home)

Depois de entrar, você cai na **Home** — um "hub" com **cards** para cada módulo
que você tem permissão de ver. Clique no card para abrir o módulo.

- Cada card tem a **cor do módulo** e um ícone.
- Há também **indicadores rápidos** (KPIs) no topo, como "Total de Protocolos".
- Se você **não vê nenhum card**, significa que seu perfil de acesso ainda não tem
  módulos liberados → fale com o admin (ver [FAQ](#15-dúvidas-frequentes-faq)).

### Por que às vezes os cards ficam "apagados" ao entrar?
- O módulo Sistema Geo tem **muitos dados (~175 mil linhas)**. Enquanto eles carregam,
  os cards ficam temporariamente desabilitados e aparece a **porcentagem carregada**.
- Quando termina, os cards "acendem" e você pode clicar. É só aguardar alguns segundos.

---

## 4. Navegação: cabeçalho, módulos e abas

O **cabeçalho** (topo da tela) é igual em todos os módulos e tem **duas linhas**:

- **Linha de cima:** logo, nome do módulo ativo (com ícone colorido), o botão
  **"Módulos"** (para trocar de módulo), seu nome de usuário e o botão **Sair**.
- **Linha de baixo:** o nome do Departamento à esquerda e as **abas** do módulo à direita.

### Trocar de módulo
- Clique em **"Módulos"** (linha de cima) e escolha outro módulo, ou volte à **Home**
  e clique no card desejado.

### As abas
- Cada módulo tem suas próprias abas (ex.: Visão Geral, Evolução Temporal…).
- A aba ativa fica sublinhada. Clique para trocar.
- **No celular**, as abas aparecem só como ícones (sem texto) — toque para navegar.

---

## 5. Filtros (a barra lateral)

Nos módulos de análise (Fiscalização, Sistema Geo, Análise Integrada) há uma **barra
lateral de filtros** à esquerda. Ela vem **recolhida** — clique para abri-la.

### Como usar
1. Abra a barra lateral.
2. Clique num bloco para expandi-lo (ex.: **Permissionária**, **Subprefeitura**, **Período**).
3. Marque o que quiser filtrar. **A tela inteira reage na hora** — gráficos, KPIs,
   tabelas e mapa passam a mostrar só o recorte filtrado.
4. Para desfazer tudo, use **"Limpar filtros"**.

### Filtros mais comuns
- **Período (datas):** escolha um ano (atalho) ou digite as datas De/Até.
- **Permissionária:** a empresa responsável. A **"NORCREST (consolidado)"** junta
  todas as bases da NORCREST num item só (clique no `+` para ver as bases separadas).
- **Subprefeitura:** o território. Também dá para **clicar no mapa** para filtrar.
- **Status / Etapa (Sistema Geo):** situação do processo.

> **Dica:** o mapa e a barra lateral trabalham juntos. Clicar numa subprefeitura no
> mapa filtra a tela toda; clicar de novo (ou "Limpar filtros") desfaz.

> **Atenção ao filtrar por data:** registros **sem data** não entram no filtro por
> período. Se "sumiram" registros, pode ser isso (há processos antigos sem data).

---

## 6. Módulo Fiscalização

Cor **verde**. Mostra as fiscalizações de vias e seus laudos. Abas:

- **Visão Geral** — gráficos-resumo: legislação atendida × não-conformidades,
  solucionados × em andamento, e as permissionárias com mais laudos.
- **Evolução Temporal** — como os números evoluem ao longo do tempo (meses, anos,
  trimestres).
- **Distribuição Espacial** — o **mapa** de São Paulo colorido por subprefeitura;
  clique numa área para filtrar.
- **Detalhes** — a **tabela** com os laudos, linha a linha; dá para ordenar clicando
  no cabeçalho das colunas.
- **Executoras** — análise por executora (a empresa que executa a obra): laudos,
  não-conformidades e % de NC, com gráficos e drill-down (clique numa permissionária
  para ver as executoras dela).
- **Busca por Processo** — digite o número do processo para encontrá-lo.

> **Não-Conformidade (NC):** é quando a fiscalização encontrou problema na obra. É o
> indicador central da Fiscalização.

---

## 7. Módulo Sistema Geo

Cor **azul-marinho**. Mostra os processos de licenciamento de obras na via pública
(~175 mil), por subprefeitura. O **número do processo** é a chave que liga tudo. Abas:

- **Visão Geral** — tipos de obra, permissionárias e **status** dos processos. O
  gráfico de status tem **drill-down**: quando todos os dados filtrados são de um
  único grupo, ele detalha os sub-status.
- **Linha do Tempo** — evolução dos processos ao longo do tempo.
- **Subprefeitura** — distribuição por território (gráficos + mapa).
- **Busca por Processo** — encontre um processo pelo número.

> **Status unificado:** os muitos status da planilha são agrupados em categorias
> legíveis. No filtro, marcar um grupo marca todos os sub-status dele. Sub-status de
> grupos diferentes não se misturam (o sistema bloqueia para não confundir a leitura).

---

## 8. Módulo Análise Integrada

Cor **violeta**. Cruza as bases de **Fiscalização** e **Sistema Geo** pelo número do
processo, para responder perguntas que nenhuma base sozinha responde. Tem **8 abas**:

1. **Visão Geral** — panorama da cobertura (em comum / só Fiscalização / só Sistema Geo),
   com donut e barras por permissionária e subprefeitura.
2. **Cobertura** — tabelas de cobertura por permissionária e por subprefeitura
   (quanto de cada base tem correspondência na outra).
3. **Status Cruzado** — compara o status no Sistema Geo com o status na Fiscalização e
   destaca inconsistências (ex.: "encerrado" num lado e "em andamento" no outro).
4. **Linha do Tempo** — prazos entre cadastro e fiscalização; evolução mensal.
5. **Divergências** — processos só na Fiscalização, divergências de permissionária/
   subprefeitura, e processos só no Sistema Geo.
6. **Executoras** — cruza executora (Sistema Geo) com os laudos da Fiscalização.
7. **Mapa** — cobertura por subprefeitura no mapa, com ranking lateral.
8. **Lista de Processos** — tabela dirigida pelos filtros: aparece vazia até você
   aplicar um filtro **ou** buscar um número. Mostra cada processo com dados das duas
   bases lado a lado.

> Cada aba tem um **texto explicativo** no topo dizendo o que ela mostra — leia-o se
> tiver dúvida sobre o que está vendo.

---

## 9. Módulo Emergências

Cor **âmbar**. Trata das emergências informadas e do cumprimento do prazo de 48h. Abas:

- **Visão Geral** — resumo das emergências.
- **Informadas** — lista das emergências com status "Informada" (o número entre
  parênteses na aba é a contagem).
- **Prazo 48h** — a aba do **SLA das 48h** (ver seção seguinte). Mostra quais
  emergências estão dentro do prazo e quais venceram.
- **Dashboard** — visão analítica com gráficos.
- **Busca por Processo** — encontre uma emergência pelo número.
- **Histórico** — registro dos uploads feitos (quem subiu, quando, totais).

### Subir a planilha de Emergências
- Clique em **"Atualizar dados"** (canto superior direito). Abre um **modal** com
  **dois uploads**:
  1. **Planilha principal** de emergências.
  2. **Planilha de posicionamento de obras** (opcional, mas importante — destaque âmbar).
- Veja o passo a passo completo em [Atualizar dados](#12-atualizar-dados-upload-de-planilhas).

> ⚠️ **Muito importante:** confirmar a planilha principal **substitui TODA a base de
> emergências E apaga o posicionamento**. Você precisa subir **as duas planilhas
> juntas** (primeiro a principal, depois o posicionamento). Não suba só uma "para
> corrigir um detalhe" — você perderia o posicionamento.

---

## 10. A regra das 48h (explicada)

A aba **Prazo 48h** verifica se cada emergência "Informada" foi atendida dentro de
**48 horas**. Como funciona:

- **Prazo = aviso de início da obra + 48h.** O "aviso de início" vem da planilha de
  **posicionamento de obras**.
- **Quando não há posicionamento**, o sistema usa a **data de cadastro + 48h** como
  base. Nesse caso o prazo é **ESTIMADO** (porque não temos a data real de início).
- **Vencido** = a emergência está "Informada" e já passou do prazo.

### Real × Estimado (por que aparecem cores diferentes)
- **Atraso REAL** (vermelho sólido): calculado pela **data de início** da obra
  (temos o posicionamento).
- **Atraso ESTIMADO** (âmbar tracejado): calculado pela **data de cadastro** (não
  temos posicionamento daquela emergência).

> As emergências antigas (de 2019–2021, com número SEI) **não têm posicionamento** —
> por isso aparecem sempre como estimadas. Isso é esperado, não é erro.

### Filtros e indicadores da aba
- A aba tem **filtros próprios** (não usa a barra lateral): Situação (Dentro do prazo
  / Vencido), faixa de dias em atraso e Status.
- Indicadores: dentro do prazo, vencidos, % no prazo, em aberto no prazo.
- Gráficos: situação dos prazos (donut) e permissionárias com mais vencidos (top 10).

---

## 11. Exportar dados (Excel)

Há **duas formas** de exportar:

### A) Exportar os dados de um gráfico
- Cada gráfico/tabela tem um ícone **⬇**. Clique nele para baixar **exatamente os
  dados daquele gráfico** em Excel — sem precisar escolher colunas.

### B) Exportar a base completa (com escolha de colunas)
- Use o **botão flutuante** no canto inferior direito da tela (fica levemente apagado
  até você passar o mouse). Ele abre um **modal** onde você:
  1. Escolhe o modo (dados do gráfico × registros completos).
  2. Escolhe **quais colunas** exportar (a seleção fica salva para a próxima vez).
  3. Baixa em **Excel** (XLSX) ou CSV.

> O export respeita os **filtros aplicados**. Se você filtrou por uma permissionária
> e um período, o arquivo sai só com esse recorte. **Confira os filtros antes de
> exportar** para não gerar uma planilha com o recorte errado.

> Exportar a base **completa** do Sistema Geo (175 mil linhas) pode demorar e pesar.
> Sempre que possível, **filtre antes** de exportar.

---

## 12. Atualizar dados (upload de planilhas)

> O upload de **Fiscalização** e **Sistema Geo** fica em **Configurações → Atualizar
> Dados** (só admin). O upload de **Emergências** fica no próprio módulo Emergências
> (botão "Atualizar dados"), para quem tem a permissão `emerg.upload`.

### Fluxo geral (vale para todos)
1. **Arraste a planilha** (ou clique para escolher o arquivo).
2. O sistema **analisa sem gravar** e mostra um **resumo** (totais, período, etc.).
3. Você **confere** o resumo. Há uma checagem de segurança ("pré-voo") antes de gravar.
4. **Confirma** → o sistema substitui os dados (apaga os antigos e insere os novos em
   lotes) e guarda um registro no histórico.

> ⚠️ Não feche a aba durante a gravação — o sistema avisa se você tentar sair no meio.

### Emergências — passo a passo
1. Clique em **"Atualizar dados"** → abre o modal com os dois uploads.
2. **Primeiro** suba a **planilha principal** → veja a prévia → confirme.
3. **Depois** suba a **planilha de posicionamento de obras** → prévia → confirme.
4. O modal fecha sozinho ao concluir; aparece a confirmação de sucesso.

> Se o cabeçalho da planilha estiver fora do padrão, o sistema abre um **mapeamento
> manual de colunas** — você indica qual coluna corresponde a cada campo e segue.

---

## 13. Painel do Administrador

Só para usuários **admin**. Acesse por **Módulos → Configurações**. Abas:

- **Usuários** — criar, listar, redefinir senha e excluir usuários.
- **Perfis de Acesso** — criar perfis e definir, numa matriz, o que cada perfil enxerga.
- **Atualizar Dados** — upload de Sistema Geo e Fiscalização (ver seção 12).
- **Log de Acessos** — registro de entradas/saídas no sistema.

### Como dar acesso a um novo usuário (ordem importa!)
1. **Crie o perfil primeiro** (aba "Perfis de Acesso"): dê um nome (ex.: "Emergências")
   e marque as permissões que ele deve ter — incluindo **as abas** do módulo.
2. **Depois crie o usuário** (aba "Usuários"): informe usuário + senha temporária e
   **escolha o perfil** criado.

> ⚠️ Se você criar o usuário com **"Sem perfil"**, ele entra e **não vê nenhum
> módulo**. Sempre atribua um perfil. (O perfil pode ser trocado depois no dropdown
> da lista de usuários.)

> ⚠️ Ao adicionar uma **nova aba** a um módulo, lembre de **conceder a permissão
> dessa aba aos perfis** que devem vê-la — senão o admin vê a aba mas os usuários não.

### Sobre a coluna "Ativo"
- "Ativo" **não é** liga/desliga de acesso. Ela só indica se o usuário **já concluiu
  o primeiro acesso** (trocou a senha temporária). Um usuário recém-criado fica
  "Inativo" até entrar pela primeira vez — é normal, ele tem acesso normalmente.
- Para tirar o acesso de alguém, use **Excluir** (não há "bloquear").

### Redefinir senha
1. Na linha do usuário, clique em **Redefinir senha**.
2. Defina uma **senha temporária** e repasse a ela.
3. No próximo acesso, o usuário será obrigado a trocar a senha.

---

## 14. Glossário

- **Permissionária:** empresa autorizada a operar na via pública (ex.: NORCREST).
- **Executora:** empresa que executa a obra (pode ser diferente da permissionária).
- **Não-Conformidade (NC):** problema encontrado pela fiscalização numa obra.
- **Subprefeitura:** divisão administrativa de São Paulo (usada no mapa).
- **Processo / número do processo:** a chave que identifica cada obra; liga as bases.
- **Status unificado:** agrupamento legível dos vários status da planilha.
- **Emergência "Informada":** emergência que foi comunicada.
- **Regra das 48h:** prazo para atender a emergência (início + 48h; ver seção 10).
- **NORCREST (consolidado):** soma de todas as bases da NORCREST num único item.
- **Recape:** recapeamento de via. **Termo:** termo de fiscalização emitido.
- **Homologação:** o ambiente de **teste** (não é o sistema "de verdade"); tem uma
  faixa amarela 🟡 no topo avisando.

---

## 15. Dúvidas frequentes (FAQ)

**"Entrei e não aparece nenhum módulo / aparece 'sem módulos liberados'."**
Seu perfil de acesso não tem módulos. Peça ao admin para atribuir um perfil com os
módulos que você precisa.

**"A tela ficou branca / o site não abre direito."**
Em geral é o **antivírus** (ex.: Kaspersky) bloqueando os arquivos do site por engano.
Peça para adicionar o endereço do sistema como **exceção** no antivírus. Antes disso,
confirme que não é só lentidão de carregamento (aguarde alguns segundos).

**"Sumiram registros depois que filtrei por data."**
Registros **sem data** não entram no filtro por período. Tire o filtro de data para
conferir, ou lembre que processos antigos podem não ter data.

**"Os números das 48h mudaram / muitas viraram 'estimado'."**
Provavelmente o **posicionamento de obras** não foi carregado (ou foi apagado ao
subir só a planilha principal). Suba **as duas planilhas** de emergências juntas.

**"O sistema me desconectou sozinho."**
Normal: a sessão expira em **12 horas** por segurança. É só entrar de novo.

**"Cadê o botão de exportar?"**
No ícone **⬇** de cada gráfico/tabela, ou no **botão flutuante** no canto inferior
direito da tela (ver seção 11).

**"Posso editar um dado errado na tela?"**
Não. O sistema **não edita dados**. Corrija **na planilha** e suba de novo — a
planilha é a fonte da verdade.

**"Estou no ambiente certo?"**
Se houver uma **faixa amarela 🟡 "HOMOLOGAÇÃO"** no topo, você está no ambiente de
**teste**. O sistema "de verdade" (produção) **não** tem essa faixa.

---

> **Sugestão de manutenção:** sempre que uma tela, aba ou regra mudar, atualize este
> manual junto (no mesmo PR), assim como o `docs/progresso.md`. Mantê-lo fiel é o que
> o torna útil para a equipe.
