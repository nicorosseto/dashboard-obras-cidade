# Domínio e particularidades — OBRAS Dashboard

> Arquivo de referência linkado pelo `CLAUDE.md` raiz (via `@`). Reúne as
> particularidades aprendidas na prática (comportamentos não óbvios do sistema)
> e o glossário de domínio. **Atualize aqui** sempre que uma nova particularidade
> for descoberta ou uma regra de negócio mudar.

## Particularidades importantes (aprendidas na prática)

- **Login SEM restrição de domínio (decisão de 09/06/2026):** o controle de
  acesso é "só o admin cria contas" — o cadastro público (sign-up) fica
  **desabilitado no painel do Supabase** (Authentication → Sign In / Up).
  A tabela `email_exceptions` ficou obsoleta para o login (mantida no banco
  por histórico); a aba "Exceções de Domínio" foi removida do painel admin.
- **Reset de senha NÃO usa e-mail:** o fluxo oficial é o admin redefinir pela
  tela de Configurações (função `admin_reset_user_password`), que força o
  usuário a trocar a senha no próximo login (flag `primeiro_acesso`). O fluxo
  de e-mail do Supabase foi removido do front (redirecionava para localhost e
  não era confiável).
- **Cadastro só por username (decisão de 09/06/2026):** o painel admin cria
  usuários **apenas por nickname/username** (`admin_create_internal_user`). O
  cadastro por e-mail externo foi **removido** do painel — o único usuário por
  e-mail é o **mestre** (o e-mail do próprio dono, já existente). Combina com o
  sign-up público desabilitado: não há caminho de criação por e-mail.
- **Usuários internos** (domínio `@obras.app`): o Supabase Auth rejeita esse
  domínio via `signUp`. Por isso são criados por uma função PostgreSQL
  `SECURITY DEFINER` (`admin_create_internal_user`) que insere direto em
  `auth.users`.
- **Status do usuário:** começa "Inativo"; vira "Ativo" após o 1º acesso
  (função `concluir_primeiro_acesso`). ⚠️ **`ativo` ≠ bloqueio:** o campo só
  indica se o usuário **concluiu o primeiro acesso** (trocou a senha-padrão),
  nunca "conta bloqueada" — contas são removidas via "Excluir", não desativadas.
  Por isso o **reconhecimento de admin no front NÃO depende de `ativo`** (só de
  `role === 'admin'`): exigir `ativo === true` deixava um admin recém-criado, com
  1º acesso pendente, sem nenhum módulo na Home ("Seu acesso ainda não tem
  módulos liberados"). Corrigido em `App.jsx` (`isAdmin` e a carga de permissões)
  e `auth.js` (`isAdmin()`) em 23/06/2026.
  ⚡ **Coluna renomeada (24/06/2026, Onda 1):** por essa semântica enganosa (parecia
  liga/desliga de acesso), a coluna **"Ativo"** do painel de Usuários virou **"1º acesso
  concluído"** (toggle "Concluído"/"Pendente" + tooltip explicando que não bloqueia).
  A coluna read-only "1º Acesso" (Pendente/—), que duplicava essa informação, foi
  **removida** — consolidadas numa só.
- **Permissões por perfil de acesso (A3, 11/06/2026):** controle fino de
  telas/ações por usuário. Banco (`supabase/schema/06-permissoes.sql`):
  `permissoes_catalogo` (permissões por aba/módulo), `perfis_acesso` (perfis
  dinâmicos criados pelo admin), `perfil_permissoes` (matriz perfil × permissão)
  e `profiles.perfil_acesso_id`. Front: `src/lib/permissoes.js` (RPC
  `minhas_permissoes()`); sem permissão o elemento **some** da interface (aba,
  botão de seção, card da Home, exportar, upload). Regras: **admin ignora perfis**
  (enxerga tudo); usuário comum sem perfil **não vê nenhum módulo**; editar um
  perfil vale na hora para todos os usuários dele; `emerg.upload` não entra em
  nenhum perfil seed — só o admin concede. `fisc.upload` e `geo.upload` foram
  removidos do catálogo (upload de Fisc/Geo fica em Configurações → Atualizar
  Dados, exclusivo do admin). A carga pesada do Sistema Geo (175k linhas) só
  acontece se o usuário tiver alguma aba do Sistema Geo.
  ⚠️ É controle de **interface** (UX): o RLS continua "qualquer autenticado lê"
  nas tabelas de dados — restrição por módulo no banco fica para depois.
  ⚠️ **Regra para novos módulos/abas (19/06/2026):** toda vez que uma nova aba
  ou módulo for adicionado ao sistema **e não for exclusivo do admin**, é
  obrigatório:
  1. Criar a permissão no banco (`INSERT INTO permissoes_catalogo`) em script
     numerado (ex.: `13-xxx.sql`) — idempotente, rodar nos 2 bancos.
  2. Atualizar `TODAS_PERMISSOES` em `src/lib/permissoes.js`.
  3. Decidir quais perfis existentes devem receber a nova permissão e incluir
     o `INSERT INTO perfil_permissoes … ON CONFLICT DO NOTHING` no mesmo script.
  4. Se for uma aba com permissão própria (não só acesso ao módulo), adicionar
     ao `PERMISSAO_POR_ABA` ou ao array de abas do módulo (ex.: `ABAS_CRUZAMENTO`).
  5. **⚠️ OBRIGATÓRIO (24/06/2026):** Adicionar o código e a descrição amigável
     da nova permissão ao mapa `PERM_DESCRICAO` em `src/components/admin/AbaPerfis.jsx`
     (o mapa morava em `AdminPanel.jsx` antes do split do painel admin — corrigido
     aqui em 16/07/2026, achado do A4).
     Esse mapa alimenta a **legenda expansível** que o admin vê ao editar um perfil
     ("ℹ️ O que cada permissão libera?"). Sem isso, a nova permissão aparece no
     formulário sem explicação — o admin não sabe o que está marcando.
     Formato: `'codigo.da.perm': 'Frase curta do que abre na interface (módulo + aba/botão)'`
  Não fazer isso causa a situação em que o admin vê a aba mas usuários comuns não
  — mesmo que o perfil deles devesse ter acesso.
  ⚠️ **Não esquecer o perfil "Emergências" (lição de 23/06/2026):** o perfil seed
  "Emergências" nasceu (script 06) só com `emerg.ver`. As abas adicionadas depois
  (`emerg.aba_processo` no script 12 e `emerg.aba_prazo48h` no script 14) só foram
  concedidas a "Visualização completa" — o perfil "Emergências" ficou sem elas até a
  correção `fixes/perfil-emergencias-abas.sql`. Ao adicionar nova aba de Emergências,
  conceder TAMBÉM ao perfil "Emergências", não só ao "Visualização completa".
- **Leitura do `sistemaGeo` exige login:** a política RLS antiga era pública
  (`using (true)`); desde 09/06/2026 só usuário autenticado lê
  (`fixes/sistema-geo-login-obrigatorio.sql`). A escrita continua sem política:
  só a chave secreta (service_role) importa dados.
- **Fuso horário:** todas as datas exibidas usam `America/Sao_Paulo` via
  `fmtDataHora` / `fmtDataSP` em `src/lib/aggregations.js`.
- **Upload de emergências:** tem **pré-visualização** (decisão de 12/06):
  arrasta → análise com resumo (total, por status, período) SEM gravar →
  confirma → substitui todos os dados (DELETE + INSERT em lotes) → usa o
  array já em memória (não re-baixa). `beforeunload` protege durante a
  gravação. O **histórico** dos uploads fica só na aba "Histórico" da própria
  tela de Emergências (a aba "Histórico de Uploads" das Configurações foi
  removida — era redundante; lê `emergencias_snapshots`).
- **Upload de emergências — dedup/normalização/mapeamento (22/06/2026, Fase 1):**
  o importador (`PaginaEmergencias.jsx`) passou a (1) **deduplicar por
  `num_processo`** mantendo a linha de `data_cadastro` mais recente — antes
  duplicatas na planilha inflavam a contagem da tela vs. a planilha; (2)
  **normalizar o status** com `trim` + colapso de espaços + correção de caixa
  (`normalizeStatusEmerg` + `CANON_STATUS_EMERG`) — `INFORMADA`/`Informada` caem
  no mesmo balde, mas **valores distintos nunca são fundidos** ("Informada" ≠
  "Informado", diferem por letra); (3) **validar o cabeçalho** (`detectarColunas`
  por apelidos case-insensitive) e, se faltar coluna, abrir o **mapeamento
  manual** (`MapeamentoColunas`) para o usuário casar coluna→campo antes de
  gravar. A prévia agora distingue "sem nº de processo" de "duplicados
  unificados". ⚠️ Corrige **uploads futuros**; para alinhar os dados atuais é
  preciso **reimportar** a planilha (a base é substituída a cada upload).
- **Datas da planilha de emergências — formato DD-MM-AAAA (22/06/2026, PR #140):**
  a planilha traz `dataCadastro` como **texto `DD-MM-AAAA` com traço** (ex.: `11-12-2019`).
  `toIsoDate` aceita barra **ou traço** (`[\/-]`), sempre dia→mês→ano, além de ISO
  e Date objects (métodos UTC para não deslocar no fuso UTC-3). `sheet_to_json`
  **sem `raw: false`** (datas vêm como Date via `cellDates: true`). ⚠️ Nunca usar
  `new Date(string)` como fallback — inverte datas dia-primeiro. Bug: `raw: false`
  → texto `M/D/YY` → lido como `D/M/YY` → ~75k linhas com dia>12 viravam null.
- **`toIsoDate` unificado em `src/lib/datas.js` (24/06/2026, Onda 1):** a função
  estava **duplicada em 3 arquivos** (`importarSistemaGeo.js`, `importarFiscalizacao.js`,
  `PaginaEmergencias.jsx`) — exatamente a função que já causou os bugs de data. Agora
  é fonte única em `src/lib/datas.js` (versão superset: Date via métodos UTC, serial
  Excel via `XLSX.SSF.parse_date_code`, ISO, e BR `DD/MM/AAAA` ou `DD-MM-AAAA`). Os 3
  arquivos importam de lá. ⚠️ Qualquer correção de parsing de data vale agora para os
  três importadores de uma vez — não recriar cópias locais.
- **Planilha auxiliar de posicionamento de obras (`emergencias_obras`, Fase 2,
  22/06/2026):** segundo upload na tela de Emergências (`PaginaEmergencias.jsx`),
  destacado em **âmbar** como "opcional, mas importante", logo abaixo do upload
  principal. Tabela `emergencias_obras` (`supabase/schema/13-emergencias-obras.sql`):
  `codigo_aio` (chave), `data_inicio_obra`, `data_fim_obra` (fim **previsto**, não
  real), `tipo_obra`, `logradouro`, `numero_obra`, `natureza_obra`, `permissionaria`
  (nome completo), `executora`. **Chave de ligação:** `codigo_aio` ↔
  `emergencias.num_processo` — são a MESMA numeração. Só os primeiros meses do
  sistema viravam SEI (`6012…`, ~24k linhas, sobretudo 2019-2021); o resto fica como
  AIO numérico (ex.: `148923756`). O cruzamento normaliza com `normProc` (tira zeros
  à esquerda). Emergências SEI antigas não têm posicionamento → cairão em "Não
  avaliável" na regra das 48h (Fase 3). **Importador:** `detectarColunas(headerKeys,
  COLUNAS_OBRAS)` (genérico agora — aceita config de colunas), `mapearObras` +
  `dedupPorAio` (prefere a linha com data de início); datas vêm como texto
  `DD/MM/AAAA`, tratadas pelo `toIsoDate`. **Regra de sincronia:** ao substituir a
  planilha principal de emergências, a `emergencias_obras` é **apagada junto**
  (DELETE no `confirmarUpload`) — força re-upload das duas em conjunto. NÃO salva
  Status AIO/CET/CS nem CNPJs. ⚠️ Não é nova aba (fica no upload existente, permissão
  `emerg.upload`) — sem mudança no catálogo de permissões. A aba "Prazo 48h" (Fase 3)
  é que exigirá nova permissão.
  ⚠️ **Fix (22/06, Fase 3):** o card do upload auxiliar estava acoplado à condição
  do upload principal (`!previa && !mapPendente`) e **sumia** ao abrir a prévia da
  planilha de emergências. Desacoplado: agora só depende de `podeUpload` (tem o
  próprio controle `previaObras`/`mapPendenteObras`).
- **Aba "Motivo Inválido" (v2, 30/06/2026):** mostra processos cujo **motivo de
  natureza** (texto livre da empresa) é **incoerente com uma emergência** (manutenção,
  recape, ampliação…). **Não tem upload próprio** — deriva da planilha de
  **posicionamento já existente** (`emergencias_obras.natureza_obra`) e cruza com
  `emergencias` (por `normProc`) para status/subpref/nome tratado. Permissão
  `emerg.aba_motivo_invalido`. Componentes: `AbaMotivosInvalidos.jsx` (tabela/KPIs/card,
  só dos inválidos) + `EditorMotivos.jsx` (classificação).
  - **Agrupamento por termo (`classificarNatureza`/`agruparPorMotivo` em
    `emergencias.js`):** "vocabulário de obra + automático" — procura a **ação** no texto
    inteiro via `VOCABULARIO_MOTIVO` (manutenção, vazamento, reparo, troca, recape…),
    ignorando logradouro/bairro/genéricos (`LOGRADOURO_GENERICO`). Isso resolve o caso
    em que o texto **começa pelo endereço** (ex.: "RUA … VAZAMENTO" → grupo *Vazamento*,
    não *Rua* — bug da v1). Termos fora do vocabulário viram grupo **descoberto**.
  - **Heurística (1º palpite):** obra programada (`invalidoPadrao: true` no vocabulário —
    manutenção, recape, ampliação, nivelamento, **remanejamento**) começa **inválida**; o
    resto válida. O usuário ajusta e a escolha é **salva por termo** na tabela
    `motivo_natureza_classificacao` (`supabase/schema/16-…`, rodar nos 2 bancos). Persiste
    entre re-uploads: termos já classificados ficam; **termos novos viram pendência**.
  - **Fluxo:** após o upload normal (emergências + posicionamento), se houver pendências,
    um modal pergunta *"Ajustar agora?"* → abre o `EditorMotivos` (select Válido/Inválido
    por grupo). Se adiar, a aba ganha um **badge âmbar** (Header) + botão "Ajustar motivos".
    `App.jsx` carrega a classificação, computa `motivoGrupos`/`motivoPendentes` (passados
    ao Header e à aba) e tem `salvarClassifMotivos` (upsert por `termo`).
  - ⚠️ **Histórico:** a v1 subia uma **planilha separada** (tabela
    `emergencias_motivo_invalido`) e agrupava pela 1ª palavra (caía em "Rua"). A v2
    desativou esse upload (tabela mantida no banco, sem uso) — fonte agora é
    `emergencias_obras`. Ao mexer aqui, ajustar o **vocabulário** (não recriar lista fixa
    em outro lugar) e lembrar que a classificação é **por termo canônico**, não por texto.
  - **Editor v3 (grupos editáveis + override):** o `EditorMotivos.jsx` permite renomear,
    marcar válido/inválido, editar **palavras-chave**, **fundir** (alias) e **excluir**
    (arquivar) grupos, além de **mover um texto** específico para outro grupo (override).
    Persistência: `motivo_natureza_classificacao` ganhou `palavras/arquivado/alias_de` e há
    a tabela `motivo_natureza_override` (`chave`→`termo`; SQL `17-…`). A resolução em
    `classificarMotivo` segue **override → palavras do usuário → vocabulário → descoberta**
    e resolve alias/arquivado. ⚠️ **Perf:** o editor é **paginado** (20/grupo por página) e
    os seletores de fundir/mover são **buscáveis sob demanda** — `<select>` com todas as
    opções por linha travava com ~1337 grupos.
  - **Filtros e gráficos da aba (v3.1):** filtros da barra lateral que se aplicam aqui:
    **Permissionária** e **Status Sistema Geo** (reusam `aplicarFiltrosEmerg`); **Data de
    Cadastro**, **Possui Vistoria** e **Status da Vistoria** ficam **bloqueadas/esmaecidas**
    (`SidebarEmergencias` recebe `bloqueados`). A aba tem **filtro de data próprio por AIO**
    (`data_inicio_obra`, senão `data_cadastro`). Gráficos: linha do tempo
    (`evolucaoMotivosPorMes`), barra de permissionárias (NORCREST consolidada; com
    **drill-down por unidade** quando todos os inválidos filtrados são NORCREST — reusa
    `usePaginadorGrafico`/`ControlePaginacao`, 8/página) e donut por status. KPIs: Total,
    % inválidos, Motivos inválidos, Top permissionária, Motivo mais recorrente, Período.
- **Aba "Prazo 48h" (regra das 48h / SLA — Fase 3, 22/06/2026):** aba do módulo
  Emergências (`AbaPrazo48h` em `PaginaEmergencias.jsx`) que cruza, **em memória**,
  `emergencias` × `emergencias_obras` por `normProc(num_processo)` ↔
  `normProc(codigo_aio)`. **Prazo = `data_inicio_obra` (aviso de início) + 48h**; sem
  posicionamento, **fallback = `data_cadastro` + 48h** (prazo **ESTIMADO**).
  **Vencido** = status "Informada" e `agora > prazo`. ⚡ **`agora` vivo (24/06/2026,
  Onda 1):** `buildPrazoRows(..., agora)` recebe o "agora" de um estado (`useState`)
  atualizado a cada 60s por um `setInterval` ativo só enquanto a aba "Prazo 48h" está
  aberta. Antes o cálculo congelava no horário em que a aba abriu — numa aba deixada
  aberta por horas, os que venciam no intervalo não apareciam como vencidos. **KPIs:** Dentro do prazo /
  Vencidos (48h) / Não avaliáveis (sem nenhuma data-base). Tabela com colunas SLA
  (Nº Processo, Permissionária, Subpref., Status, Data Cadastro, Aviso Início, Aviso
  Término, Prazo 48h, Dias em atraso) **ordenáveis** (clique no cabeçalho alterna
  asc/desc; `sortPrazo` trata número × texto). Linha de vencido destacada e
  **diferenciação visual atraso REAL (pelo início, vermelho sólido) × ESTIMADO (pelo
  cadastro, âmbar tracejado)** — badges e cor do prazo. Datas comparadas via
  `parseDataPrazo` (meio-dia UTC, evita shift de fuso). Export via `exportXLSX`
  (módulo mantém export próprio; `transform` agora recebe `(valor, linha)`).
  **Permissão `emerg.aba_prazo48h`** (`supabase/schema/14-emergencias-prazo48h.sql`,
  rodar nos 2 bancos; em `TODAS_PERMISSOES` de `permissoes.js`; aba gateada no
  `Header.jsx` por `permissoes.has('emerg.aba_prazo48h')`).
  ⚡ **Ampliação (23/06/2026):** a aba ganhou **filtros próprios** (não usam a
  sidebar): Situação (Dentro do prazo / Vencido / Não avaliável), faixa de **Dias
  em atraso** (`FAIXAS_ATRASO`: 0–2 / 3–7 / 8–30 / 31+) e Status — chips de
  multi-seleção, com "Limpar filtros". Tudo recalcula sobre o conjunto filtrado.
  Novas **colunas** na tabela: **Possui Vistoria** e **Status Vistoria** (do
  `vistoriaMap`; `buildPrazoRows` agora recebe o `vistoriaMap` e grava
  `_possui_vistoria`/`_status_vistoria`). **KPIs:** Dentro do prazo / Vencidos /
  Não avaliáveis / % no prazo / Em aberto no prazo / Atraso médio (dias).
  **Gráficos:** donut "Situação dos prazos" e barra "Permissionárias com mais
  vencidos (top 10)" (NORCREST consolidada). Cores em `COR_SITUACAO`.
- **Emergências carregadas no App.jsx (23/06/2026):** a carga das tabelas
  `emergencias` (com cache SWR) e `emergencias_obras` foi **levantada do
  `PaginaEmergencias` para o `App.jsx`** (effect gateado por `emerg.ver`), junto
  com Fiscalização/Sistema Geo — assim o usuário **não espera o carregamento duas
  vezes** ao abrir o módulo. `PaginaEmergencias` virou consumidor: recebe
  `linhas`/`setLinhas`/`obras`/`setObras`/`carregando`/`emgProgresso` por prop (os
  uploads atualizam o estado do App via setters; o cache é invalidado no
  `confirmarUpload`). `emergCarregadasRef` evita recarga.
- **Hooks de carga de dados em `src/hooks/` (08/07/2026, Frente 3, Etapa 5):**
  os 5 blocos de carga que viviam soltos no `App.jsx` viraram 4 hooks
  próprios: `useCargaFiscalizacao`, `useCargaSistemaGeo`, `useCargaEmergencias`
  e `useAvisoAtualizacao` (este combina os 3 efeitos de `datasModulos`: busca
  inicial, listener do evento `obras:upload-concluido` e o polling de
  3 min). Cada um preserva exatamente a lógica anterior (cache
  stale-while-revalidate, refs de guarda contra dupla carga, `try/finally`,
  `setTimeout(0)` antes de `gravarCache`). ⚠️ **Assimetria proposital no
  logout:** `useCargaFiscalizacao`/`useCargaSistemaGeo` expõem `reset()`
  (chamado por `handleSignOut`, zera dados + ref de guarda); **Emergências
  NÃO tem `reset()`** — `handleSignOut` nunca zerou esse estado, então um
  próximo login (mesma aba, sem F5) reaproveita os dados de Emergências do
  usuário anterior até o cache/versão mudar. Isso é comportamento **herdado**
  do código pré-refactor, não uma decisão nova — se for corrigido algum dia,
  registrar aqui e em "Registro de erros e correções" (`docs/progresso.md`).
  ⚠️ **Regra para novo hook que declara estado lido por código mais acima no
  componente** (ex.: `tourBloqueado` lê `sistemaGeoCarregando`/`emergCarregando`):
  a chamada do hook precisa ficar **antes** de qualquer leitura desse valor no
  `App.jsx` (logo após `session`/`permissoes`) — colocá-la mais abaixo, "perto
  de onde faz mais sentido lógico", gera `ReferenceError: Cannot access '...'
  before initialization` (temporal dead zone) só na hora de navegar para o
  módulo, não pego pelos testes automatizados (só funções puras, não cobrem
  hooks React). Achado e corrigido nesta mesma extração — ver `progresso.md`.
  ⚠️ **Erro de carga silencioso = "zerado até um Shift+F5" (22/07/2026):**
  `useCargaSistemaGeo` só logava a exceção da carga no `console.error` (nunca
  visível ao usuário) e o `sistemaGeoCarregadoRef` travava em `true` mesmo em
  caso de falha — sem retry automático, qualquer erro transitório (timeout do
  Supabase, rate limit, blip de rede) na busca das ~175 mil linhas deixava
  Home + módulo Sistema Geo com "0" pelo resto da sessão, só resolvido por reload
  completo (nova montagem = ref reiniciado = nova tentativa, que geralmente
  dava certo por a causa ser transitória — daí a impressão de que "só
  Shift+F5 resolve"). `useCargaFiscalizacao` já não tinha esse problema por
  expor `erro` (App.jsx bloqueia a tela com mensagem clara). Corrigido:
  `useCargaSistemaGeo` ganhou `sistemaGeoErro` (via `traduzErro`) + `retry()`, e
  `AvisoErroCarga.jsx` (banner fixo no rodapé, padrão do `AvisoAtualizacao`)
  mostra "Tentar novamente" nos 5 layouts do `App.jsx`. **Regra geral para
  qualquer novo hook de carga de dataset grande:** nunca deixar um `catch`
  só com `console.error` — sempre expor um estado de erro visível (mensagem
  ou banner) e uma forma de tentar de novo sem precisar de reload manual.
- **Upload de emergências em modal (23/06/2026):** os painéis de upload (planilha
  principal + posicionamento) saíram do corpo da tela (ocupavam muito espaço) e
  foram para um **modal** acionado pelo botão "Atualizar dados" (canto superior
  direito do conteúdo, só com `emerg.upload`). O modal contém os dois uploads
  (com suas prévias/mapeamentos) e **fecha sozinho ao concluir** uma gravação
  (`progresso === 100`); o pop-up de sucesso aparece por cima.
- **Pop-ups:** todos exigem confirmação manual (botão "Ok"); nenhum fecha
  sozinho por timer.
- **Header unificado (cor/ícone por módulo, abas na 2ª linha):** `Header.jsx` é
  o cabeçalho ÚNICO de todos os módulos (inclusive Emergências e Configurações —
  a tela de Emergências usava um `<header>` próprio, removido em 16/06).
  `getModuleConfig(secaoAtiva, paginaAtiva, mostrarEmergencias)` devolve
  `{ label, icon, from, to }`: Sistema Geo navy, Fiscalização verde, Cruzamento
  violeta, Emergências âmbar, Configurações slate. O ícone do módulo aparece num
  quadrado colorido ao lado do título e uma **barra colorida de rodapé** (`h-1`)
  identifica o módulo. **2ª linha** = "Departamento…" à esquerda + abas à direita;
  as abas variam por contexto: `PageTabs` (Fisc/Geo), abas de Emergências ou abas
  do Admin — **todas renderizadas pelo `Header`**, não pelo conteúdo da página.
  ⚠️ O estado das abas de Emergências e do Admin foi **levantado para o `App.jsx`**
  (`abaEmergencias`, `abaAdmin`) para o Header controlá-las; `PaginaEmergencias`
  e `AdminPanel` recebem só `abaAtiva` e renderizam o conteúdo correspondente.
  ⚠️ Botões de navegação global do Header (ex.: "Configurações" do `ModuleDropdown`)
  NÃO devem usar `onPagina` (que é no-op na tela de Emergências) — usar handlers
  dedicados do `App.jsx` (`onAbrirConfiguracoes`, que zera `mostrarEmergencias`).
- **Indicadores de carregamento com percentual:** durante a carga do Sistema Geo,
  vários pontos mostram a % (não só spinner): `LoadingPage` pós-login (barra +
  %), KPI "Total de Protocolos" da Home ("{n}% carregado"), faixa de KPIs do
  Sistema Geo (`LoadingInline` "Carregando Sistema Geo… {n}%"), barra âmbar na tela de
  Emergências (acima do upload) e a `BarraProgresso` fixa no topo. ⚠️ **Ao atingir
  100%** há um intervalo (gravação do cache IndexedDB) antes de o spinner sumir —
  para não "travar" visualmente em 100%, todos passam a exibir **"Finalizando…"**
  (ou o número real, no KPI) nesse momento. Não mexer na ordem do `try/finally`
  da carga; é só máscara de UI.
  ✅ **Bug corrigido (18/06/2026, PR #121):** em hardware mais lento, a tela ficava
  presa em "Finalizando…" por vários segundos após a carga. Causa: `gravarCache`
  serializava (structured clone) ~175k objetos na thread principal, bloqueando o
  React antes do re-render. Correção: `setSistemaGeoCarregando(false)` (e equivalente
  em `PaginaEmergencias.jsx`) movido para **antes** de `gravarCache()`, liberando
  a UI imediatamente enquanto a serialização ocorre em segundo plano.
  ✅ **"Finalizando…" travado o tempo todo (18/06/2026):** voltou a aparecer, mas por
  causa diferente — o `count: 'estimated'` (lê `reltuples` do `pg_class`) às vezes vem
  **0 ou subestimado** (estatística desatualizada). O `reportar()` do `fetchAll` fazia
  `total = max(totalEstimado, carregadas)`, então `total === carregadas` desde o início
  → todos os indicadores marcavam 100%/"Finalizando…" durante TODA a carga (parecia
  congelado, e o KPI "Total de Protocolos" exibia **0**). Correção: (1) `fetchAll`
  reporta o `totalEstimado` **cru**; (2) todos os indicadores (`BarraProgresso`,
  `LoadingPage`, `LoadingInline`, KPI da Home) só mostram % quando o total é
  **confiável** (`total > 0 && carregadas <= total`) — senão exibem a **contagem
  crescendo** ("{n} linhas") com barra indeterminada, nunca "0" nem 100% falso.
  ✅ **Carga que nunca termina (18/06/2026):** uma das 8 partições do `fetchAll` podia
  estancar na rede sem erro → `Promise.all` pendurado para sempre. Correção: cada
  requisição usa `AbortSignal.timeout(30000)`; timeout vira erro e cai no retry com
  backoff (até 6 tentativas). Regra: nunca confiar no `count` para corretude (só p/
  estimativa visual) e sempre pôr timeout em request que entra num `Promise.all`.
  ✅ **Spinner que não some após a carga (18/06/2026, PR #128):** mesmo com
  `setSistemaGeoCarregando(false)` chamado **antes** de `gravarCache()`, o React não
  conseguia re-renderizar (esconder o spinner) porque a call stack continuava ocupada
  e o `gravarCache` (structured clone de ~175k objetos) começava antes do flush. A UI
  ficava travada em "175.312 linhas". Correção: agendar a gravação com
  `setTimeout(() => gravarCache('sistemaGeo', { versao, linhas }), 0)` em `App.jsx` —
  o `setTimeout(0)` **cede o event loop**, deixando o React fazer o re-render (esconder
  o spinner) ANTES de a serialização bloquear a thread. Regra geral: depois de um
  `setState` que precisa aparecer na tela, **nunca** rode trabalho síncrono pesado na
  mesma volta do event loop — joga para `setTimeout(0)`/microtask.
  ✅ **Cards da Home travados em carregamento indefinido (25/06/2026, PR #180):** após
  carga do cache IndexedDB + verificação de versão, o `useEffect` do Sistema Geo retornava
  cleanup `cancelado = true` em re-renders → `setSistemaGeoCarregando(false)` dentro do
  bloco `if (!cancelado)` nunca era chamado → spinner eterno, Shift+F5 resolvia (limpava
  o cache). Correção: remover o padrão `cancelado` e usar `try/finally` para garantir que
  o setter de loading **sempre** execute, independente de re-render ou erro. Mesma correção
  aplicada ao effect das Emergências. Regra: `setXCarregando(false)` deve estar em `finally`,
  nunca dentro de um `if (!cancelado)` — o estado de loading é global e deve ser liberado
  mesmo que a "onda" que o setou tenha sido sobrescrita por outra.
  ✅ **Barra "Lendo arquivo" sempre em 0% (25/06/2026):** o `file.arrayBuffer()` e
  `XLSX.read()` são operações atômicas — não emitem eventos de progresso. A barra
  determinada mostrava 0% durante toda a leitura (parecia travada). Solução: barra
  indeterminada (animate-pulse) sem percentual enquanto `progresso < 100`.
  ✅ **`LoadingInline` desalinhado, grudado no canto (achado 07/07/2026, bug
  pré-existente desde a introdução do componente — não é regressão de nenhuma
  fase recente):** o `<div>` raiz não tinha `w-full`/`h-full`; dentro de um pai
  flex-**row** (`<main className="flex-1 flex ...">`, usado nos `<Suspense
  fallback>` de módulos lazy — Emergências, Apresentação, Configurações…), o
  componente ficava do tamanho do próprio conteúdo (spinner + texto) em vez de
  preencher o espaço disponível, então o `items-center justify-center` interno
  centralizava dentro de uma caixa minúscula grudada à esquerda, não na tela
  toda. Correção: `w-full h-full` na `className` raiz do `LoadingInline`
  (`src/components/Loading.jsx`) — inofensivo nos demais usos (dentro de `div`
  soltas ou `flex-col`, onde já ocupava a largura por padrão). Regra: todo
  componente de "estado vazio/loading" que pode aparecer dentro de um pai
  flex-row precisa de `w-full` (e `h-full` se o eixo cruzado for a altura)
  para a centralização interna fazer sentido.
- **Ambientes (produção vs. teste):** a variável `VITE_APP_ENV`
  (`production` | `preview` | `development`) identifica o ambiente. Quando não é
  produção, o componente `AvisoAmbiente` (`src/components/AvisoAmbiente.jsx`, lógica
  em `src/lib/env.js`) mostra uma faixa no topo avisando que NÃO é o banco real.
  A separação produção/teste é feita por variáveis com escopo Preview/Production no
  Vercel. Passo a passo completo em `docs/guia-ambiente-testes.md`.
- **Tela branca em produção = falso-positivo do antivírus (18/06/2026):** o
  Kaspersky ("Proteção na Nuvem"/data-leak) bloqueou **intermitentemente** os assets
  `index-*.js`/`index-*.css` de `dashboard-obras-cidade.vercel.app` (libera o HTML `/` mas
  barra o JS/CSS → página em branco). **Não é bug do deploy** (Vercel mostrava
  "Ready"). Sintoma típico: o `/` carrega mas a tela fica branca; o log do antivírus
  mostra "O acesso a um site foi bloqueada" para os arquivos de `/assets/`. Solução
  (lado do usuário): adicionar exceção para `dashboard-obras-cidade.vercel.app` no
  antivírus (domínios `*.vercel.app` às vezes pegam má reputação temporária na nuvem).
  ⚠️ Antes de investigar código/deploy quando a produção "não abre", checar se o
  Vercel está "Ready" e se o antivírus/proxy não está bloqueando os assets.
- **Terminologia "homologação":** o usuário chama o ambiente de **teste** de
  **"homologação"** (termo que ele já usa em outros sistemas). Usar SEMPRE essa
  palavra ao falar do ambiente que não é produção. Espelhamento técnico:
  - URL fixa de homologação: **`homolog-dashboard-obras-cidade.vercel.app`** (domínio
    `.vercel.app` apontado para o branch **`homologacao`** no Vercel).
  - URL de produção: `dashboard-obras-cidade.vercel.app` (branch `main`).
  - A faixa amarela 🟡 exibe **"HOMOLOGAÇÃO (AMBIENTE DE TESTE)"**.
  - O branch `homologacao` é de vida longa (como o `main`); deploys dele caem no
    escopo **Preview** do Vercel, logo usam o banco de teste `obras-dev`.
  - **Fluxo homologação-primeiro (11/06/2026):** PRs de trabalho entram na
    `homologacao` (squash); validação na URL fixa; promoção via PR
    `homologacao` → `main` com **merge commit** (não squash); depois,
    espelhar `homologacao` = `main`. Os previews por PR do Vercel viram
    "pré-homologação" (opcionais). Detalhes na seção 4 do `CLAUDE.md`.
- **Sessão expira em 12h (decisão de 11/06/2026):** o Supabase renovaria o
  login para sempre; em máquina compartilhada é risco. O front guarda o
  momento do login (`obras_login_em` no localStorage) e desloga sozinho
  após `SESSAO_MAX_HORAS` (12h) — checagem ao abrir e a cada minuto
  (`sessaoExpirada`/`garantirMarcaLogin` em `src/lib/auth.js`). A sessão
  continua compartilhada entre abas (padrão web); para testar 2 usuários ao
  mesmo tempo, usar janela anônima.
- **Biblioteca de subprefeituras/distritos:** fonte da verdade no banco
  (`supabase/schema/04-subprefeituras.sql`) — 32 subprefeituras (sigla, nome,
  região) e 96 distritos. ⚠️ Padrão oficial das siglas: **MP = São Miguel**,
  **SM = São Mateus** (já estiveram trocadas no `src/data/subprefeituras-sp.js`;
  corrigido). Distritos guardados para uso futuro.
- **Subprefeitura nos dados é SIGLA:** as colunas `subprefeitura` de
  `sistemaGeo`/fiscalização gravam a **sigla** (`AD`, `MP`…), não o nome. O mapa
  (`MapaSP.jsx`) casa o nome do GeoJSON → sigla (`NOME_TO_SIGLA`) e busca a
  contagem por sigla. O arquivo `src/data/subprefeituras-sp.js` usa a grafia do
  GeoJSON nos nomes (difere da grafia oficial da tabela do banco — proposital).
- **Mapa interativo (C2, 11/06/2026):** `MapaSP.jsx` é o componente ÚNICO de
  mapa dos 2 módulos (props `unidade`, `selecionadas`, `onSelecionar`). Clicar
  numa subprefeitura filtra a tela toda (single-select); clicar de novo na
  mesma (ou "Limpar filtros") desfaz. Selecionada = borda vermelha; demais
  esmaecidas. ⚠️ O mapa colore pelas contagens com **todos os filtros exceto
  a própria subprefeitura** (memos `contagensMapaFisc`/`contagensMapaGeo` no
  `App.jsx`) — para não esvaziar ao selecionar. Mapa e sidebar compartilham o
  mesmo Set de filtro (sincronizados).
- **Atualizar Dados pela tela (D1+D2, 11/06+15/06/2026):** Configurações → aba
  "Atualizar Dados" (sub-abas Sistema Geo / Fiscalização / Histórico).
  Fluxo Sistema Geo (D1): analisa (aba "DadosSistemaGeo", colunas por posição 0..8)
  SEM gravar → mostra resumo (dedup por processo) → classifica status novos →
  confirma → pré-voo → DELETE/UPSERT em lotes → snapshot `importacoes_snapshots`.
  Fluxo Fiscalização (D2): analisa (aba "DADOS_CONSOLIDADOS", 38 colunas) SEM gravar
  → mostra resumo + "prova real" → confirma → pré-voo → DELETE/INSERT em lotes →
  snapshot. Lógica em `src/lib/importarFiscalizacao.js`.
  **Regras de NC do D2 (descobertas em 15/06):**
  - Col O (pos 14) = indicador primário de NC ("Obras com Falhas"). Quando obras=X
    mas nenhum tipo específico (P-X, pos 15-23) marcado → `falha_outros=true`
    (catch-all para `tem_nao_conformidade` GENERATED no banco).
  - Col AA (pos 26) "Outros" = STATUS (= Leg.Atendida), **NÃO** tipo de falha.
  - STATUS_SIMPL (col AK, pos 36) = fonte de verdade para status. O consolidador
    trata Leg.Atendida por exclusão (registros sem obras=X/em_and/solucionado ficam
    com col Z vazia mas AK="Legislacao Atendida"). Ler AK diretamente → zero "sem
    status", totais fecham: Leg.Atendida(53.389)+NC(23.445)=76.834.
  Banco: `07-atualizar-dados.sql` (função `tem_permissao()` + políticas de escrita).
  Lotes: DELETE 5000 / INSERT 1000. Botão (?) com regras — componente `AjudaUpload.jsx`.
  **Colunas `lote` e `executante` (18/06/2026, PR #128):** col C (LOTE/OBRAS) e
  col E (EXECUTANTE) da planilha de Fiscalização eram **ignoradas** no importador;
  passaram a ser gravadas (`lote`, `executante` em `fiscalizacoes`). Fix SQL:
  `supabase/fixes/adiciona-lote-fiscalizacoes.sql` (idempotente, rodar nos 2 bancos).
  ⚠️ Colunas novas só aparecem nas linhas **reimportadas** — após rodar o SQL, é
  preciso reimportar a planilha para popular os valores das linhas já existentes.
- **Executante como fallback de executora (regra geral, replicável):** a executora
  oficial vem do **Sistema Geo** (`geo.executora`). Quando a obra não está no Sistema Geo
  (ex.: as ~24k emergências de 2020, sem posicionamento), `geo.executora` é vazio →
  usar `fisc.executante` (col E da Fiscalização) como **fallback**. Padrão:
  `geo.executora || fisc.executante || '—'`. Aplicar em qualquer tela que exiba
  executora (hoje: Lista de Processos da Análise Integrada).
- **`CREATE OR REPLACE VIEW` no PostgreSQL — colunas novas só no fim (18/06/2026):**
  o `CREATE OR REPLACE VIEW` **não permite** alterar a ordem nem o nome das colunas
  existentes; inserir uma coluna no meio do `SELECT` gera erro
  `42P16 cannot change name of view column "<x>" to "<y>"`. Novas colunas (ex.: `lote`,
  `executante` em `vw_fiscalizacao_enriquecida`) devem ser adicionadas **no FIM** do
  SELECT. Para reordenar de fato, é preciso `DROP VIEW` + recriar (cuidado com grants
  e dependências). Regra para toda migração futura de view.
- **Lista de Processos (Análise Integrada, 18/06/2026, PR #128):** a aba "Busca por
  Processo" da Análise Integrada virou **"Lista de Processos"** — tabela dirigida pelos
  **filtros da sidebar** (não cria filtros próprios). Colunas (nesta
  ordem): Nº Processo, Permissionária, Executora, Tipo de Processo, Subprefeitura,
  Status Sistema Geo (unificado; status real no tooltip), Etapa Sistema Geo, Status
  Fiscalização, Lote, Origem Dados. Processos **só na Fiscalização** vão sempre ao
  **fim**, em itálico, com tooltip flutuante junto ao cursor. Separadores sutis (`sep`)
  isolam as colunas exclusivas de Fiscalização. Permissionária exibe o valor **cru**
  (NORCREST com a base, não consolidada). Componente: `PaginaGeo4Cruzamento.jsx`
  (`AbaBusca` + `TabelaPaginada` + `buildRows`).
- **Abas de busca por processo — listar só por ação explícita (24/06/2026):** nas
  4 abas de busca/lista de processos — Análise Integrada (`AbaBusca` em
  `PaginaGeo4Cruzamento.jsx`), Fiscalização/Sistema Geo (`PaginaBuscaProcesso.jsx`) e
  Emergências (`AbaBuscaEmerg` em `PaginaEmergencias.jsx`) — a tabela **só aparece por
  ação explícita do usuário**: clicar no botão **"Filtrar"** ou digitar um número de
  processo. Os **filtros da barra lateral NÃO disparam a listagem sozinhos** (antes,
  selecionar uma permissionária com muitos registros, ex.: NORCREST, montava a lista
  inteira e travava). Mudar um filtro da sidebar **reseta** o estado (`listarAtivado`)
  → a lista volta a ficar oculta até novo clique em "Filtrar". Ao listar, exibe o
  spinner padronizado `LoadingInline` ("Montando a lista de processos…") e o commit das
  linhas é **deferido com `setTimeout(0)`** (estado `rowsExibidas`/`resultadoExibido` +
  `carregando`), para o spinner pintar antes de a ordenação/render bloquear a thread.
  ⚠️ Ao criar nova aba de listagem, seguir o mesmo padrão: nada de auto-listar por
  filtro da sidebar; sempre botão "Filtrar" + commit deferido com `LoadingInline`.
- **Aba "Detalhes" da Fiscalização — ELIMINADA (13/07/2026, item D do plano de
  melhorias de julho):** era só um invólucro de `Tabela.jsx` (tabela crua com
  paginação/filtros próprios) e, apesar do nome, **não mostrava o número do
  processo** — a "Busca por Processo" (aba 7) tinha isso, além de NC e Falhas.
  Diagnóstico coluna a coluna encontrou 3 colunas exclusivas da Detalhes
  (Executora, Classificação Viária, Área m²), que foram **incorporadas à
  Busca por Processo** (`TabelaFisc` em `PaginaBuscaProcesso.jsx`) antes da
  eliminação — nenhuma informação foi perdida. Removidos: componente
  (`Pagina4Detalhes.jsx`/`Tabela.jsx`), rota `paginaAtiva === 4` em
  `App.jsx`, entrada `id: 4` de `ABAS_FISC` (`lib/abasPaginas.js`),
  permissão `fisc.aba_detalhes` (front + SQL
  `20-remove-fisc-aba-detalhes.sql`, DELETE com cascade em
  `perfil_permissoes`) e o mini-tour correspondente. Se uma futura tela
  precisar de "detalhe linha a linha" da fiscalização, a Busca por Processo
  já é o lugar certo — não recriar uma tabela crua separada.
- **Consolidadores externos (pré-tratamento antes do upload):** o usuário criou
  duas ferramentas **HTML+JS puro** (SheetJS, rodam 100% no navegador, nenhum
  dado sai da máquina — dado sigiloso da Prefeitura) que **pré-consolidam** as
  planilhas cruas dos sistemas de origem ANTES do upload pela tela do dashboard.
  Pipeline: `planilhas cruas → consolidador (navegador) → arquivo único limpo →
  upload no dashboard → Supabase`. **Não ficam neste repo** (são .html
  standalone, sem dado), mas definem o **formato de entrada** dos uploads:
  - **Consolidador Sistema Geo:** junta as **9 planilhas por tipo de obra** + a de
    **posicionamento** (enriquece `Executora`/`Tipo Obra` via JOIN por processo,
    com match protocolo↔SEI e trava de unicidade) + a **base acumulada** do mês
    anterior (upsert incremental). Deduplica por `Processo` (data_cadastro mais
    recente), corrige sigla `GU→G`, bloqueia permissionárias de teste. Saída:
    `consolidado_sistemaGeo ref MM-AAAA.xlsx` (aba `consolidado`, 9 colunas) →
    alimenta o **D1**. ⚠️ ~24k emergências de 2020 (SEI) ficam sem posicionamento
    (o Sistema Geo não exporta de-para protocolo↔SEI).
  - **Consolidador Fiscalização:** junta as **5 abas** (`_GMVD`, `_GMVI`,
    `_SGZC`, `_PNEL`, `CONTROLE_GERAL`; offset de 1 coluna nas de conversão,
    cabeçalho na linha 2). Recalcula **9 auxiliares** (FONTE, ANO/MES/TRIMESTRE/
    ANO_MES, N_FALHAS, TEM_NAO_CONF, STATUS_SIMPL, NORCREST). Classifica processo
    por regex (SEI `6012.AAAA/NNNNNNN-D` ou protocolo) → exclui vazios/inválidos.
    Deduplica por `PROCESSOS/VIA` (data de vistoria + prioridade de fonte). Filtro
    opcional por data-base (remove vistoria posterior; rebaixa Solucionado→Em
    andamento). Saída: `consolidado_fiscalizacao ref DD-MM-AAAA.xlsx` (aba
    `DADOS_CONSOLIDADOS`, 29 dados + 9 auxiliares) → alimentará o **D2**. ⚠️
    Exportar com `compression:true` no SheetJS (arquivos grandes estouram
    "Invalid array length" sem isso).
- **Sistema de exportação (redesign aprovado 18/06/2026):** o sistema anterior
  (`ExportButton.jsx` + `PaginaExportar.jsx` redundante, CSV via Blob) foi substituído
  pelo `ExportModal.jsx` com seleção de colunas e export por gráfico.
  Arquitetura:
  - `src/components/ExportModal.jsx` — modal em 2 telas: escolha do modo (dados
    do gráfico vs. registros completos) + seletor de colunas agrupadas por categoria.
    Seleção persistida no `localStorage` por módulo (`obras_export_cols_<modulo>`).
  - `src/lib/exportarXLSX.js` — função genérica de export via SheetJS (`xlsx`).
    Padrão XLSX; CSV disponível como opção secundária. Substitui o CSV manual via Blob.
  - Ícone `⬇` em cada gráfico/tabela (prop `dadosGrafico` + `tituloGrafico`):
    abre o modal no modo "dados do gráfico" — clique único, sem seleção de colunas.
  - Botão flutuante (`fixed bottom-6 right-6`): menor que o anterior, `opacity-40`
    em repouso e `opacity-100` no hover (transition). Abre modal no modo "registros
    completos" com seletor de colunas.
  - `PaginaExportar.jsx` **removida** (era cópia do botão flutuante).
  - Colunas disponíveis por módulo (Sistema Geo: 11, Fiscalização: 11, Análise
    Integrada: combina as duas + `origem dados`). Emergências mantém export próprio.
  ⚠️ Ao adicionar nova aba/módulo com dados exportáveis: definir as colunas em
  `ExportModal.jsx` na constante `COLUNAS_POR_MODULO` e passar `modulo` correto
  via prop.
  ⚠️ **Regra obrigatória — botão de download em todo gráfico/tabela (22/06/2026):**
  todo gráfico ou tabela adicionado ao dashboard **deve** incluir `BotaoExportarGrafico`
  com as props `dados`, `colunas`, `titulo` e `modulo`. Padrões:
  - Componentes compartilhados (`DonutComparativo`, `BarGrupado`, `RegioesPie`,
    `TiposFalhaBar`): usar a prop `acoes`.
  - Tabelas com células JSX: criar array paralelo de objetos planos antes de passar
    ao botão (SheetJS não aceita JSX).
  - Inline dentro do cabeçalho do card: envolver `BotaoExportarGrafico` num
    `<div className="absolute top-3 right-3 z-10">` ou dentro de um flex header.
  Nunca entregar gráfico ou tabela sem o botão ⬇.
- **Mensagens de erro em pt-BR:** erros do Supabase/GoTrue chegam em inglês;
  exibir SEMPRE via `traduzErro()` de `src/lib/mensagens.js` (frase exata +
  trecho, fallback para a original). Erro novo em inglês na tela = adicionar
  ao dicionário.
- **Catálogo de status do Sistema Geo:** fonte da verdade no banco
  (`supabase/schema/05-status-sistema-geo.sql`) — `status_sistemaGeo` mapeia cada
  status bruto da planilha → `status_nome` (legível) + `status_unificado`
  (grupo), e `status_grupos` lista as categorias (incl. "Verificar Novo Status").
  Substitui os dicionários `STATUS_NOME`/`STATUS_UNIFICADO` do notebook. O seed
  é **gerado a partir do notebook** (47 status do formato atual); ao mudar o
  catálogo, manter os dois alinhados até o D1 fazer o notebook/tela lerem do banco.
- **Filtro de Status do Sistema Geo (sidebar):** marcar um grupo unificado marca
  automaticamente todos os seus sub-status; o filtro casa pelo status
  **individual** (desmarcar um sub-status tira essas linhas do gráfico).
  Regras de bloqueio: sub-status de **grupos diferentes não se misturam** —
  com qualquer seleção em um grupo, os sub-status dos demais ficam
  desabilitados (tooltip explica); com seleção **parcial** num grupo, os outros
  grupos também ficam travados. Vários grupos **inteiros** podem coexistir,
  mas aí nenhum sub-status é editável. Lógica em `SidebarSistemaGeo.jsx` +
  `aplicarFiltrosGeo` (`aggregations.js`).
- **Gráfico "Processos por Status" (Visão Geral):** tem drill-down automático —
  quando todas as linhas filtradas pertencem a um único grupo unificado, exibe
  os sub-status individuais e o título vira "Status — <grupo>".
- **Carga do Sistema Geo (`fetchAll` em `src/lib/supabase.js`):** busca em **ondas
  de 8 páginas** de 1000 linhas (não estoura o 429) e **para por ESGOTAMENTO**
  (uma página voltou com menos de 1000 linhas = fim), **não pelo `count`**. ⚠️ O
  `count` do Supabase às vezes vem subestimado em tabelas grandes (parou em
  93.000 de 175k em 11/06/2026); por isso ele serve só para a **barra de
  progresso** (`BarraProgresso.jsx`), nunca para decidir quando parar. Cada
  página tem retry com backoff. Aceita `onProgress(carregadas, total)`. Seleciona
  só as colunas usadas (lista `GEO_COLS` no `App.jsx`).
- **Clique em gráfico (Recharts 3) usa `activeLabel`, NÃO `activePayload`
  (07/07/2026, M4 PR 3.1):** no Recharts 3 o `onClick` do gráfico (nível
  `<BarChart>` etc.) deixou de receber o estado interno da v2 — `activePayload`
  não existe mais; o evento traz `activeLabel` (valor do eixo de categoria) e
  `activeTooltipIndex`. Padrão para drill-down por clique:
  `const nome = e?.activeLabel ?? top[e?.activeTooltipIndex]?.nome`.
  Quebrou o drill-down de executoras (`PaginaFisc5Executoras.jsx`) na migração.
  Além disso a v3 liga `accessibilityLayer` por padrão e espalha `tabindex`
  por DEZENAS de elementos internos (svg, camadas `g.recharts-zIndex-layer_*`,
  fatias `path.recharts-sector`…) — o clique foca o elemento interno mais
  próximo, **não o svg** (por isso a 1ª correção, só em `svg:focus`, não
  resolveu — lição de 07/07). A regra do `index.css` cobre o wrapper e
  **qualquer descendente**: `.recharts-wrapper :focus:not(:focus-visible)`.
  Tab/teclado continua mostrando o contorno — não remover essa regra nem
  desligar o accessibilityLayer.
- **Paleta institucional em JS — `src/lib/cores.js` (Fase M5, 07/07/2026):**
  fonte única para `NAVY`/`NAVY_LIGHT`/`NAVY_MID`/`RED` (espelham o `@theme` de
  `index.css`), usada onde o Tailwind não serve — props de cor do Recharts,
  gradientes inline, defaults de componente. Antes eram ~150 hex literais
  duplicados em 24 arquivos. **Novo gráfico/componente que usa navy ou red em
  JS: importar de `cores.js`, nunca reescrever o hex.** ⚠️ Nem toda cor
  duplicada do `@theme` virou constante: `norcrest` (`#7030A0`) e `accent`
  (`#ED7D31`) se repetem por coincidência em 2 lugares cada (ex.: cor
  arbitrária de "ano" ou "região" num gráfico), sem representar a identidade
  da NORCREST/accent — nomear a constante como tal acoplaria conceitos
  independentes sem necessidade; ficaram como hex literal de propósito.
- **Tooltip padrão dos gráficos:** todos os gráficos (Recharts) usam o
  componente compartilhado `src/components/charts/ChartTooltip.jsx` — card
  branco, título em navy, bolinhas de cor por série e valores alinhados.
  Aplicar sempre como `<Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />`
  (o `zIndex` evita que o balão fique atrás do total central dos donuts).
  Cobre série única, múltiplas séries e pizza (com % quando o dado tem `pct`);
  aceita `labelFormatter` para formatar o rótulo do eixo X.

- **Cruzamento Fiscalização × Sistema Geo (D3, 15/06/2026):** aba "Cruzamento" (aba 4)
  no módulo Sistema Geo. Chave: `fiscalizacoes.id_origem` ↔ `sistemaGeo.processo`.
  Computado em memória no front-end (dados já carregados). Permissão
  `geo.aba_cruzamento` (SQL: `09-cruzamento.sql`). Sub-abas: "Só na Fiscalização"
  (id_origem sem correspondente no geo → possível obra não cadastrada), "Div.
  Permissionária" e "Div. Subprefeitura" (mesma chave, campo diferente entre as
  bases → erro de digitação nos dados manuais de fisc), "Só no Sistema Geo" (processo
  sem nenhum laudo → não fiscalizado, volume alto esperado). A comparação normaliza
  trim + lowercase; deduplication por id_origem mantém o laudo mais recente.

- **Módulo "Apresentação" (Melhoria 2, entregue 03/07/2026, PRs #227–#230):** módulo de
  topo (padrão Emergências: boolean `mostrarRelatorio` no `App.jsx` + layout próprio),
  slug interno `relatorio`, cor **teal**, permissão `relatorio.ver` (SQL
  `18-relatorio-mensal.sql`). Renderiza **49 slides** (numeração com lacunas
  propositais em 22/35/36/37 e o extra 20.1, para bater com o PPT de 52 páginas do
  usuário) a partir das bases já carregadas (geo=`sistemaGeoLinhas`, fisc=`todasLinhas`,
  emerg=`emergLinhas`, **cruas**, sem filtros de sidebar). Cérebro em
  `src/lib/relatorio.js` (`MODELO_INSTITUCIONAL` + `resolverDadosSlide`); UI em
  `src/components/tabs/relatorio/` (`PaginaRelatorio` + `SlideRenderer`). **3
  categorias de slide** com contorno próprio: 🟢 `dados` (teal, 29 slides com dado
  real), ⚪ `texto` (cinza, 19 institucionais), 🟡 `futuro` (âmbar tracejado, 1 —
  slide 43 "Compatibilização de Obras de Recape", que ainda não existe no sistema).
  Cada slide exibe "Slide {n} — {título}" (mapeia para o PPT do usuário).
  ⚡ **Slides 40/41 ("Multas Aplicadas"/"— NORCREST") deixaram de ser `futuro`
  (30/07/2026):** eram placeholders com números estáticos do PDF original
  (CORBETT, "dado ainda não existe no sistema") — desde que o módulo Multas
  (Trilha A) tem dados reais, viraram slides `tipo: 'kpis'` (mesmo padrão do
  slide 7) lendo de `bases.multas` (nova 4ª base, além de geo/fisc/emerg — no
  `App.jsx` é `multasCruzadas`, já cruzada com Sistema Geo/Fiscalização). KPIs:
  Total de Multas Lavradas, Valor Total Aplicado (R$), Área Total (m²) —
  mesma exclusão de "sem processo" de `AbaMultasGeral.jsx`. **Sem export**
  (tipo `kpis` não tem `dados`/`colunas`, mesmo padrão do slide 7 — não é
  regressão). ⚠️ **Cuidado com ciclo de import:** as 3 funções (excluir sem
  processo + somar valor/área) foram **reescritas em `relatorio.js`**, não
  importadas de `multas.js` — `multas.js` já importa `normUnidadeNorcrest`
  DESTE arquivo; importar na volta criaria um ciclo entre os dois módulos de
  `lib/`, e um ciclo força o bundler (Rolldown) a fundir os dois no MESMO
  chunk. Como `multas.js` é carregado sempre (`App.jsx` usa
  `cruzarMultas`/`FILTROS_VAZIOS_MULTAS` fora do módulo Multas), isso puxaria
  o `MODELO_INSTITUCIONAL` inteiro — hoje só carregado sob demanda — para o
  bundle principal (medido: +38 kB no chunk `index`). **Regra geral:** antes
  de importar de `multas.js`/`gtObras.js` dentro de `relatorio.js` (ou
  vice-versa), checar o sentido das dependências já existentes — hoje
  `multas.js` e `gtObras.js` importam de `relatorio.js` (nunca o contrário).
  - **Seletor de permissionária** (barra do módulo): filtra os slides "gerais" para
    ela; nos rankings multi-permissionária (barras), todas continuam no gráfico, a
    dela fica destacada em **teal** e a "janela" de exibição (top N) desloca até a
    posição dela quando está fora do topo (nota indica "posições X–Y de Z"; o
    download ⬇ sempre traz a lista completa). O nome dela aparece num chip no
    cabeçalho de cada slide (sai também na imagem exportada).
  - **Unidades da NORCREST agrupadas** (`normUnidadeNorcrest` em `relatorio.js`):
    NCRV/NCRS → NCR e NCJV/NCJL → NCJ, em toda análise por base NORCREST (slides
    17/31 e afins) — mesma regra de agrupamento já usada em outras telas do sistema.
  - **Campos de valor digitados pelo usuário** (multa/custo por m², slides 23/24/27/28):
    persistem no `localStorage` do navegador (`obras_relatorio_campos`), NÃO no
    banco — cada admin vê o campo vazio até digitar no próprio navegador. O cálculo
    (área × valor) é refeito ao vivo; sem valor, o slide mostra "— informe o valor".
  - **Sem coluna de nome de via na fiscalização:** os slides 24/27/28 (recomposição/
    legislação atendida) contam vias distintas por `id_origem` (a chave
    "PROCESSOS/VIA" da planilha, 1 processo ≈ 1 via) — não existe nome de logradouro
    nessa tabela.
  - Exports: XLSX por slide (evento `obras:exportar-grafico`), PNG por slide
    (`html-to-image`, botões ficam fora da captura via `data-no-export`), "Baixar
    todos" (`exportarXLSXMultiAba`).
  - KPI sem fonte no banco (usuários cadastrados no Sistema Geo; tempo de resposta da
    NORCREST) aparece como "preencher manualmente" — as EXECUTANTES do slide 7, ao
    contrário do que se pensou inicialmente, **são contadas do banco** (distintas,
    case-insensitive), não são mais manuais.
  - ⚠️ Ao editar o seed, manter os testes de `src/tests/relatorio.test.js` (121 casos:
    numeração 1–52 com as lacunas certas, contagem 27/19/3) e o plano
    `docs/plano-melhoria-2-apresentacao.md` alinhados. v2 no radar: export .pptx
    (PptxGenJS, gráficos nativos editáveis) e PDF, ambos com seleção de slides; Fase
    C: editor de modelos persistindo em `relatorio_modelos` (tabela já criada).

- **Módulo "Multas" (Trilha A, A4 — 16/07/2026):** módulo de topo (padrão
  Emergências/Apresentação: boolean `mostrarMultas` no `App.jsx`), cor
  **vermelho institucional** (`RED` + `RED_LIGHT #E23636` em `coresModulo.js`),
  permissões `multas.ver` / `multas.aba_inconsistencias` / `multas.aba_busca` /
  `multas.atualizar` (SQL `22-multas-ui.sql`; `multas.atualizar` fora dos perfis
  seed, como `emerg.upload`). **READ-ONLY**: dados vêm da Edge Function
  `sync-multas` (A1/A2) — a correção é feita NA PLANILHA, nunca no dashboard.
  Carga: `useCargaMultas` (`src/hooks/`, sem cache IndexedDB — ~8,2k linhas,
  sempre busca fresco; expõe `reset()` e `refetch()`). Cruzamento com
  Sistema Geo/Fiscalização **em memória** no `App.jsx` (`cruzarMultas` de
  `src/lib/multas.js`, via `normProc`); enquanto as bases carregam, a tela
  mostra banner âmbar "cruzamento parcial" (o memo recalcula sozinho ao
  terminar). 2 abas (`ABAS_MULTAS` em `abasPaginas.js`): Visão Geral (KPIs +
  gráficos) e Lista (padrão "listar só por ação explícita" — inclui a seção
  auxiliar de Inconsistências, ver ampliação de 16/07/2026 abaixo). Botão
  **"Atualizar agora"** (`multas.atualizar`) chama
  `supabase.functions.invoke('sync-multas', { body: { force: true } })` e
  refaz o fetch no sucesso; pop-up de resultado com botão "Ok". UI em
  `src/components/tabs/multas/`; lógica pura + agregações em
  `src/lib/multas.js` (testes em `src/tests/multas.test.js`).
  ⚡ **Ampliação (16/07/2026, feedback da validação):** (1) **sidebar de
  filtros própria** (`SidebarMultas.jsx`, padrão SidebarEmergencias):
  Período da Infração, Permissionária (NORCREST consolidada), Status da Multa,
  Situação do Vínculo e Subprefeitura — lógica pura em
  `aplicarFiltrosMultas`/`FILTROS_VAZIOS_MULTAS` (`multas.js`), estado no
  `App.jsx`; (2) **drill-down NORCREST por unidade** no gráfico de
  permissionárias (quando todas as linhas filtradas são NORCREST, desagrega
  por `normUnidadeNorcrest` de `relatorio.js`, paginado 8/página); (3)
  **permissionária exibida = grafia do banco Sistema Geo** quando a multa está
  vinculada (`_permissionaria_exibir` = `geo.permissionaria` ||
  `multa.permissionaria`) — `cruzarMultas` usa `buildProcessoMap` (Map, não
  Set) e enriquece também `_status_geo`/`_status_geo_nome`/`_status_fisc`;
  (4) colunas **Status Sistema Geo** (tooltip com o status real) e **Status
  Fiscalização** na Busca/Lista.
  ⚠️ **CORS em Edge Function chamada pela UI (lição de 16/07/2026):** função
  invocada DO NAVEGADOR precisa responder ao preflight OPTIONS com os
  headers CORS — sem isso o front vê "Failed to send a request to the Edge
  Function" (aconteceu com o "Atualizar agora"; pelo painel do Supabase
  funciona, pois Invoke/cron não passam por CORS). Padrão: bloco
  `CORS_HEADERS` + `if (req.method === 'OPTIONS')` no topo do
  `Deno.serve` e `...CORS_HEADERS` em TODAS as Responses (ver
  `sync-multas/index.ts`). Após mudar a função, é preciso REIMPLANTÁ-LA.
  ⚡ **2ª rodada de ampliação (16/07/2026):** (1) **aba "Inconsistências"
  deixou de existir no Header** — virou seção auxiliar/alternável
  ("Verificar inconsistências", `data-tour="multas-toggle-inconsistencias"`)
  DENTRO da aba **Lista** (ex-"Busca/Lista"; componente
  `AbaMultasInconsistencias` reaproveitado sem mudança), porque o usuário
  principal do sistema não corrige esses erros (vêm de outro departamento,
  só OBRAS consulta) — é apenas conferência, não precisa de destaque no
  menu. A permissão `multas.aba_inconsistencias` continua a mesma, só o
  texto no catálogo mudou (SQL `23-multas-inconsistencias-nota.sql`); (2)
  **KPIs/gráficos da Visão Geral excluem multas "sem processo"**
  (`excluirSemProcesso` em `multas.js`) — não representam obra/processo
  real a acompanhar; os 4 cards de vínculo (Vinculadas/Processo
  Inexistente/Sem Processo/% Vinculadas) saíram da Visão Geral e ficaram
  **exclusivamente** dentro da seção de Inconsistências; (3) donut
  "Situação do Vínculo" removido da Visão Geral, substituído por um
  gráfico de barras **"Multas por Subprefeitura"**
  (`agregaMultasPorSubprefeitura`); (4) **layout da tela corrigido**: o
  `TituloTela` estava fora da coluna de conteúdo (acima de toda a área,
  "invadindo" a sidebar) — corrigido para o mesmo padrão do layout
  principal (`Sidebar`/`SidebarSistemaGeo` em `App.jsx`): sidebar é o
  primeiro item do `flex` da tela, `TituloTela` fica dentro da coluna de
  conteúdo, ao lado dela. **Regra geral para telas com sidebar própria:**
  nunca colocar o `TituloTela` num wrapper que englobe a sidebar — ele
  pertence à coluna de conteúdo.
  ⚡ **3ª rodada de ampliação (20/07/2026):** card **"Área Total (m²)"** na
  Visão Geral (mesmo escopo/exclusão dos outros 2 KPIs — `excluirSemProcesso`)
  e colunas **Subprefeitura**/**Área (m²)** nas tabelas de Inconsistências
  (ao lado de Logradouro) e da aba Lista (após Status) — os dois campos já
  vinham do banco (`area_m2`/`subprefeitura`, gravados pelo `sync-multas`),
  só faltava exibir. **Filtro de Permissionária mais estrito:** a lista de
  opções do filtro (`multasPermissionariasDisponiveis` em `App.jsx`) passou
  a considerar **só** linhas com `_situacao_vinculo === 'vinculado_sistemaGeo'`
  — antes incluía também o texto cru da própria planilha de multas (grafia
  não tratada) para linhas sem vínculo; como processos sem número não são
  analisados, esses nomes só poluíam as opções. Não afeta os dados exibidos
  sem filtro ativo, só o que aparece como opção selecionável.

- **Módulo "GT Obras" (em construção, Fase 4 de 5 — 27/07/2026):**
  compatibilização de obras de permissionárias × programação de recape,
  alimentado pela planilha "[GT - Obras]" (Google Drive, mesma conta de
  serviço `obras-multas-leitor` do Multas — D5). Plano completo em
  `docs/plano-modulo-gt-obras.md`. Particularidades já decididas:
  - **Mapear colunas por POSIÇÃO, não por nome:** a aba `COMPATIB. CAMILA`
    tem cabeçalhos repetidos (`TRECHO` 4×, `ÁREA TOTAL DA VIA (m²)` 2×) —
    diferente do `sync-multas` (que mapeia por nome de cabeçalho). A
    Edge Function `sync-gt-obras` valida a sanidade do cabeçalho (posições
    esperadas na linha 2) e **aborta** a sincronização se não bater, em
    vez de gravar dado deslocado.
  - **Regra de "obra compatibilizada" (D1, decisão do usuário em
    27/07/2026):** status `AEO EMITIDO` ou `LIBERAR` = compatibilizada;
    os outros 8 status (`AGUARDANDO DELIBERAÇÃO`, `CANCELADO`, `DOCS
    ASSINADOS`, `AGUARDANDO COMUNIQUE-SE`, `CAMILA VERIFICAR`, `SEGURAR`,
    `NÃO EMITIR`, `AGUARDANDO ASSINATURA`) = paralisada (dicotomia
    binária). Um status novo/desconhecido (planilha viva) cai em
    `status_grupo = 'nao_classificado'` — nunca quebra a sincronização
    nem é classificado por adivinhação.
  - **`num_processo` não é chave única** (48 processos aparecem em mais
    de uma linha, um por trecho) — upsert por **chave sintética** (hash
    de processo + via + trechos + linha da planilha), sem o caminho dual
    "com/sem chave natural" que o `sync-multas` usa para `auto_multa`.
  - **`tem_erro_formula` (gt_dash) tem escopo deliberadamente limitado:**
    cobre valor negativo ou `compatibilizadas + paralisadas ≠ qtde_obras`
    como **rede de segurança geral** — nenhum caso real desse tipo está
    confirmado até agora (a linha `AXWELL TELECOM` do bloco
    2025/2026, citada inicialmente como exemplo, era erro de leitura do
    screenshot pelo executor; a sincronização real mostrou a linha
    zerada, sem anomalia — corrigido em 27/07/2026). Os `#REF!`/valores
    negativos citados na análise inicial do plano (bloco-resumo lateral
    da aba `COMPATIB. CAMILA`, colunas AB:AE) **não foram confirmados**
    nos screenshots enviados e ficam
    **fora do parser** até nova verificação — não hard-codar esses
    números específicos em testes/Edge Function. A divergência entre a
    soma dos 3 blocos anuais e o bloco "Total Geral" (confirmada: 3.135
    somado vs. 3.134 declarado) é checada à parte, no front-end
    (`conferirDashVsBase`, Fase 2), não linha a linha na Edge Function.
    ⚠️ **Bug corrigido (28/07/2026):** `conferirDashVsBase` exigia match
    **exato** de "Total Geral" no texto da permissionária para achar a
    linha de totalização de cada bloco — mais rígido que a classificação
    `tipo_linha: 'total'` que a Edge Function já calcula via
    `startsWith('TOTAL GERAL')`. Quando o texto real de um bloco anual
    trazia algo além de "Total Geral", o match exato falhava, a soma dos
    3 blocos anuais zerava e o painel "Divergência DASH × Base
    Recalculada" mostrava uma divergência de -100% **falsa** (bem
    diferente do erro real de 1 obra que o painel existe para pegar).
    Corrigido para confiar só em `tipo_linha === 'total'` — mesma fonte
    de verdade da Edge Function, sem duplicar o critério com regra
    diferente no front. **Regra geral:** quando o front precisa achar uma
    linha já classificada por um campo calculado no sync (`tipo_linha`,
    `status_grupo`…), usar esse campo diretamente — reimplementar o
    critério de classificação com um regex próprio no front arrisca ficar
    mais rígido (ou mais frouxo) que a fonte original e divergir dela.
    ⚠️ **`blocoAtual` pode "vazar" entre blocos, em teoria (trava
    preventiva adicionada em 30/07/2026, mas NÃO era a causa do bug real —
    ver "KPIs de topo × gráfico" logo abaixo):** `parseDash` só avança
    `blocoAtual` quando reconhece a linha de cabeçalho do bloco seguinte
    (coluna B === "QTDE DE OBRAS"); se ISSO falhar para um bloco (texto do
    cabeçalho variou na planilha), as linhas dele — inclusive a própria
    "Total Geral" — ficam marcadas com o bloco ANTERIOR e sobrescrevem a
    linha certa no dedup `bloco|permissionaria` (upsert). `validarBlocosDash`
    (mesmo arquivo) aborta a sync se algum dos 4 blocos não tiver exatamente
    1 linha `tipo_linha === 'total'` — mesma filosofia de
    `validarCabecalhoCompatib` ("nunca grava dado deslocado"). Mantida como
    rede de segurança geral (nenhum custo, cobre um risco real), mas a
    investigação mostrou que ESTE sintoma específico tinha outra causa.
    - **KPIs de topo × "Série Histórica por Ano" media coisas diferentes
      (causa real, achado do usuário em 30/07/2026):** os 5 KPIs da Visão
      Geral (`kpisGt(linhas)`) sempre contaram só `gt_obras` — que só tem
      dados GRANULARES de **2025/2026** (aba `COMPATIB. CAMILA` é "o recorte
      recente", ver `docs/plano-modulo-gt-obras.md` seção 2; 2023/2024 só
      existem pré-somados na aba `DASH (GT)`, sem nenhuma linha granular em
      `gt_obras`). O gráfico "Série Histórica por Ano" soma os 3 blocos
      anuais do DASH — por isso a soma dele nunca batia com um KPI que só
      cobre 1 dos 3 anos; **não havia corrupção de dado nenhuma**. Corrigido
      com `kpisGtTotalGeral(gtDash)` (`src/lib/gtObras.js`) — lê o bloco
      `total_geral` do DASH (já a soma pronta dos 3 anos) para os 5 KPIs de
      topo. `AbaGtGeral.jsx` trocou `kpisGt(linhas)` → `kpisGtTotalGeral
      (gtDash)` só ali; `kpisGt` continua servindo os rankings "por
      permissionária" (2025/2026 de propósito, sem dado granular anterior).
      **Regra geral:** ao adicionar um card/KPI a uma tela com múltiplas
      fontes de dado (granular vs. resumo pré-calculado), checar se as
      DUAS cobrem o mesmo recorte temporal/escopo antes de comparar os
      números — uma incompatibilidade de escopo parece um bug de cálculo,
      mas a correção certa é trocar a FONTE, não "consertar" a conta.
      ⚠️ **Efeito colateral (mesmo dia):** `gtDash` é a tabela CRUA, sem os
      filtros da sidebar aplicados (`gt_dash` não tem `status_grupo`/
      `subprefeitura`/`ano` para filtrar — só `bloco`/`permissionária`) —
      então, ao trocar a fonte dos KPIs de topo para `gtDash`, os filtros
      pararam de refletir neles. Corrigido com uma troca condicional em
      `AbaGtGeral.jsx`: **sem filtro ativo** usa `kpisGtTotalGeral(gtDash)`
      (todos os anos); **com QUALQUER filtro ativo** volta para
      `kpisGt(linhas)` (só 2025/2026 — único período com granularidade pra
      filtrar), com aviso âmbar explicando a troca de escopo. Novo prop
      `filtrosAtivos` encadeado `App.jsx` (`gtFiltrosAtivos`, já existia) →
      `PaginaGtObras.jsx` → `AbaGtGeral.jsx`. **Regra geral:** ao trocar a
      fonte de um KPI de "dado já filtrado" para "tabela agregada à parte",
      conferir se essa nova fonte também respeita os filtros ativos da
      tela — se não respeitar, a UI "esquece" os filtros silenciosamente.
    - **Mesclagem DASH × granular: só por permissionária, NUNCA por ano
      (30/07/2026).** O usuário pediu para somar as duas fontes ao filtrar.
      Só vale para permissionária: os 3 blocos anuais do DASH são disjuntos
      entre si e o bloco `total_geral` já tem **uma linha por
      permissionária** com os 3 anos somados pela planilha
      (`kpisGtPermissionariasDash`) — soma só `tipo_linha ===
      'permissionaria'`, porque as linhas de agrupamento ("Total
      Norcrest+Winslow", "OUTROS") repetem valores das individuais e
      duplicariam. **Por ano é matematicamente errado:** o bloco do DASH é o
      ano em que o GT ANALISOU a obra; `ano_processo` é o ano de ABERTURA do
      processo SEI (`6012.AAAA/`). A aba COMPATIB. CAMILA (1.856 linhas) ≡ o
      bloco "2025/2026" do DASH (1.853), mas contém 26 processos de 2023 e
      198 de 2024 — que já estão dentro daquele bloco. Somar
      `gt_obras(ano=2023)` + `DASH(bloco 2023)` contaria essas 26 duas vezes
      e misturaria duas grandezas diferentes. Status/subprefeitura/recape
      nem existem no DASH. **Regra geral:** antes de somar duas fontes que
      "falam do mesmo ano", confirmar que o campo de ano das duas mede o
      mesmo evento — nomes iguais escondem eixos diferentes, e a soma vira
      dupla contagem silenciosa.
    - **Permissionária sem linha própria no DASH cai no granular, não em
      zero:** a planilha joga permissionárias pequenas no balde "OUTROS",
      sem linha individual. `kpisGtPermissionariasDash` devolve `null` nesse
      caso e `AbaGtGeral.jsx` monta os KPIs dela a partir de `gt_obras`
      (2025/2026, com aviso âmbar) — decisão do usuário: mostrar o que
      existe dela é melhor que zerar. A parte dela de 2023/2024 é
      irrecuperável (está fundida dentro de "OUTROS").
  - **Sem cron (D4, decisão do usuário):** diferente do `sync-multas`
    (que tem cron + botão manual), aqui a sincronização **só roda pelo
    botão "Atualizar agora"** — `gt_sync_config` não tem
    `intervalo_minutos`/agendador, só o status da última execução.
  - **UI por fases (27/07/2026, decisão do usuário):** produção só
    quando o módulo estiver 100% pronto — sem promover fase a fase.
    Fase 3 entregou Visão Geral + Lista; a **Fase 4** entregou a aba
    "Análise de Status" (funil com drill-down, "Pendências Acionáveis",
    "Status × Ano", "Metragem por Status", "Carga por Técnica", matriz
    "Recape × Status") e a seção "Verificar inconsistências" dentro da
    Lista (padrão Multas: toggle, sem permissão própria — bundle em
    `gt.aba_lista`, mesma lógica de `gt.aba_analise` para a aba nova).
    Promovido para produção em 28/07/2026 (PR #386, 13 PRs — #373 a
    #385). Falta só a Fase 5 (dados demo sintéticos para o modo
    `VITE_DEMO_MODE`, sem impacto em produção real).
    ⚡ **"Carga por Técnica" removida (28/07/2026):** já em produção, o
    usuário reconsiderou e pediu para tirar essa seção do dashboard —
    não fazia sentido expor produtividade individual por técnica.
    Removida a tabela (`AbaGtAnalise.jsx`, grid de 2 colunas virou 1 —
    "Metragem por Status" ocupa a largura toda), a função
    `agregaGtPorTecnica` (`gtObras.js`) e o passo do mini-tour. A coluna
    `tecnica_analise` continua sendo ingerida pela Edge Function (só não
    aparece mais em nenhuma tela) — o pedido foi sobre exibição, não
    sobre o dado bruto. **D7 do plano (nomes reais × mirror público)
    fica resolvido para este módulo** — sem essa seção, nenhuma tela do
    GT Obras exibe nome de pessoa física; D6 (unidade da metragem) segue
    em aberto, sem relação com nomes.
  - **Cor índigo em inline style, não classe Tailwind:** `INDIGO`/
    `INDIGO_LIGHT` (`src/lib/cores.js`) seguem o padrão já usado para
    cores institucionais fora das 4 do `@theme` (violeta da Análise
    Integrada, teal da Apresentação, âmbar de Emergências…) — nunca
    `text-red`/`accent-red` (essas são só para as 4 cores do tema);
    sempre `style={{ color: INDIGO }}` ou equivalente.
  - **Um processo pode ter várias vias/trechos (achado do usuário,
    27/07/2026) — duas camadas de tratamento:**
    1. **Parsing (`sync-gt-obras`):** no Excel, quando um processo tem
       mais de uma via, permissionária/processo/status/etc. ficam em
       **célula mesclada** — só a 1ª linha do grupo tem o valor de
       verdade; as linhas de continuação chegam vazias nessas colunas
       (mesmo a planilha "mostrando" o mesmo valor visualmente). A
       Edge Function detecta a linha de continuação (sem dado de
       processo, mas com dado de via — trecho/nome_via/área) e
       **preenche para baixo** os campos de processo
       (`CAMPOS_PROCESSO`) a partir da última linha-âncora — nunca os
       campos específicos da via (trechos, área). Sem isso, a correção
       do #374 ("linha válida = permissionária OU processo") descartava
       essas linhas de continuação inteiras, perdendo a área dos
       trechos extras.
    2. **Contagem (`gtObras.js`):** `agruparGtPorProcesso` funde as
       linhas de um mesmo processo (por `num_processo_normalizado`) em
       UM registro — soma a área de todas as vias em `area_m2` e lista
       os trechos em `_vias`/`_qtd_vias`. `kpisGt` e todas as
       agregações por contagem (status, permissionária, subprefeitura,
       ano, técnica) usam esse agrupamento internamente — um processo
       de 3 vias é 1 obra, nunca 3. **Exceção:** `agregaGtPorSituacaoRecape`
       fica no nível de via de propósito (a situação do recape pode
       diferir entre trechos do mesmo processo). A aba Lista também
       agrupa antes de listar — 1 linha por processo, com todas as
       vias empilhadas na mesma célula, nunca 1 linha por trecho.
  - **Coluna "Vias" combina 3 colunas da planilha (Nome — coluna F, Trecho
    De/Até — colunas G/H) + status do recape, sem "Executora" (27/07/2026,
    ajuste pós-Fase 4):** a pedido do usuário, a coluna **Executora** saiu
    da tabela/exportação da aba Lista. Uma 1ª tentativa criou uma coluna
    própria "Status do Recape" resumindo por processo — **revertida** no
    mesmo dia: como o recape é um atributo por VIA (pode divergir entre
    trechos do mesmo processo), o usuário preferiu manter a informação
    individualizada dentro da própria coluna "Vias" em vez de um resumo
    por processo. Formato final de cada linha de via (`AbaGtLista.jsx`):
    **Nome da via em negrito** — Trecho De → Até — (status do recape entre
    parênteses, cinza), com fallback gracioso quando falta nome ou trecho
    (`textoTrecho`/`textoVia`). Cabeçalho: "Vias (nome — trecho — recape)".
    ⚡ **Reaproveitado nas tabelas de Inconsistências (28/07/2026):** as
    funções viraram `textoTrechoGt`/`textoViaGt`, exportadas de
    `gtObras.js` (fonte única — antes viviam só dentro de
    `AbaGtLista.jsx`), e o `StatusGrupoBadge` virou um componente
    compartilhado em `src/components/tabs/gt/shared.jsx` (evita import
    circular entre `AbaGtLista.jsx` ↔ `AbaGtInconsistencias.jsx`, que se
    importam mutuamente). As tabelas "Processo não encontrado" e
    "Processos duplicados" (dentro da seção "Verificar inconsistências")
    passaram a usar o mesmo padrão de colunas da Lista + a linha da
    planilha (útil ali: a correção é sempre feita direto na planilha
    "[GT - Obras]"). Como essas tabelas mostram a linha **crua, uma via
    por linha** (não agrupada por processo como a Lista), a coluna "Vias"
    aqui não tem o "N vias" nem soma metragem — é só aquela via.
  - **"Grafias ambíguas na situação do recape" — bug do "PLANEJADO"
    (28/07/2026):** `inconsistenciasGt` (`gtObras.js`) marcava qualquer
    `situacao_recape_norm` contendo `"PLANEJADO"` como ambígua — mas
    `PLANEJADO` sozinho é um status **válido** (recape agendado, ainda
    não iniciado), só apareceu na tabela por causa da própria checagem
    ampla demais (achado real de julho, ver seção 2.4 do plano:
    `"CONCLUÍDO ou EM EXEC."` e `"PLANEJADO - CONCLUIDO"` são os únicos
    casos genuinamente ambíguos, ambos misturando **dois termos** no
    mesmo texto). Corrigido para exigir a **coocorrência** de
    `"PLANEJADO"` e `"CONCLU"` no mesmo texto (a detecção de `" OU "`
    não mudou). **Regra geral:** ao escrever uma checagem de
    "inconsistência"/anomalia por substring, testar contra o valor
    isolado mais comum do domínio antes de assumir que ele nunca
    aparece sozinho — `includes('X')` sem uma 2ª condição vira
    falso-positivo em massa se `X` também for um valor legítimo.

- **Home — lista de módulos em linha, não grid (16/07/2026):** decisão
  tomada com uma **prévia em HTML (Artifact)** antes de tocar em código —
  comparou lado a lado o grid antigo × a proposta em lista, com o conteúdo
  real dos 6 módulos; o usuário aprovou com pequenos ajustes de texto antes
  da implementação (regra geral disso em `CLAUDE.md`, seção 2). `Home.jsx`
  usa um único componente `ModuleRow` para TODOS os módulos (Sistema Geo,
  Fiscalização, Análise Integrada, Emergências, Apresentação, Multas) — o
  antigo `ModuleCard` em grid + o card largo específico de Emergências foram
  unificados. Motivo: o grid quebrava visualmente a cada módulo novo (card
  órfão numa linha incompleta, breakpoints para recalcular); uma lista
  vertical (`flex flex-col gap-3`) só cresce para baixo, sem esse problema.
  A cor de cada módulo migrou do bloco colorido inteiro para uma faixa fina
  (`accent`) + o ícone. **Regra para todo módulo novo:** adicionar um bloco
  `<ModuleRow accent="..." icon={...} titulo="..." subtitulo="..."
  descricao="..." dataTour="home-card-<slug>" .../>` na lista, na posição
  desejada — nada de grid/colunas para recalcular. Subtítulos em frase normal
  (só a inicial maiúscula, nomes próprios mantêm a grafia — ex.: "Fiscalização
  × Sistema Geo"). ⚠️ **Não esquecer o passo do tour** (`tourHome.js`,
  `[data-tour="home-card-<slug>"]`) — o Multas (A4, #318) ficou sem esse
  passo por 3 sessões até ser notado aqui; sempre conferir junto com o
  checklist de novo módulo do `dominio.md`.
  ⚡ **Fix de alinhamento (16/07/2026, #323):** o `ModuleRow` usava `flex`
  para as 4 áreas (identidade/descrição/atualizado/acessar) — sem largura
  fixa, a data "Atualizado em" podia quebrar linha e colidir com o botão
  "Acessar", e as colunas não ficavam alinhadas entre módulos diferentes.
  Trocado para **CSS grid** com colunas de largura fixa a partir de `md:`
  (`grid-cols-[240px_1fr_190px_100px]`) + `whitespace-nowrap` na data —
  cada área vira uma "coluna" de verdade, igual numa tabela, alinhada em
  todas as linhas. Regra geral: quando um layout precisa alinhar a mesma
  informação em várias linhas/cards irmãos, preferir `grid` com colunas de
  largura fixa a `flex` (que reflui conforme o conteúdo de cada linha).
- **Tour guiado (onboarding interativo — PR 1 em 08/07/2026, #273):** tours passo
  a passo com a biblioteca **driver.js** (~6 kB gzip, lazy — só carrega quando um
  tour dispara; zero custo no boot). Arquitetura: `src/lib/tourRegistro.js`
  (registro central `TOURS` + `passosDisponiveis()`, módulo puro/testável),
  `src/lib/tour.js` (motor: lazy-load, popover institucional `.obras-tour` no
  `index.css`, persistência), `src/lib/toursConteudo/` (1 arquivo por tour com os
  passos), `src/components/tour/` (`ConviteTour` + `BotaoTour` "?"). Persistência
  na tabela **`tour_visto`** (`supabase/schema/19-tour-guiado.sql`, RLS: cada
  usuário só a própria linha) — o convite aparece UMA vez por usuário (em
  qualquer navegador); "Agora não" grava `dispensado` e não pergunta de novo; o
  botão "?" re-executa quando quiser. **Segurança/robustez:** cada passo pode
  declarar `permissao` (filtrada em tempo de execução — usuário nunca vê tour do
  que não tem acesso) e alvo ausente no DOM é **pulado** sem erro (lazy-loading,
  tela estreita, botão condicional); consulta a `tour_visto` falhou (ex.: SQL 19
  não rodado) → **falha fechada**, nenhum convite aparece. Guard: convite não
  dispara por cima da troca de senha obrigatória do 1º acesso.
  ⚠️ **REGRA OBRIGATÓRIA (como a do catálogo de permissões):** toda nova tela,
  aba, módulo, botão ou gráfico relevante exige, no MESMO PR: (1) atributo
  `data-tour="…"` no elemento; (2) criar/ajustar os passos em
  `src/lib/toursConteudo/` (com a `permissao` certa se o recurso for gateado);
  (3) atualizar `src/tests/tour.test.js` — a lista `COBERTURA_EXIGIDA` trava
  área sem tour (teste vermelho). Alvos SEMPRE via `[data-tour="…"]`, nunca
  classe CSS (refactor de estilo quebraria o tour). Item correspondente no
  checklist de PR de `github.md`. Tours dos módulos: PRs 2–4 do plano (tour de
  entrada no 1º acesso ao módulo + mini-tours por aba no 1º clique, ids
  `<modulo>` / `<modulo>.<aba>`).
  ⚡ **Sub-toggle dentro de uma aba também precisa de tour próprio
  (achado de 28/07/2026, GT Obras):** a seção "Verificar inconsistências"
  (dentro da aba Lista do GT Obras, mesmo padrão do Multas) tinha um
  passo no mini-tour da aba só EXPLICANDO o botão, mas nada cobrindo o
  que aparece depois de clicar nele — porque `passosDisponiveis` filtra
  os alvos ausentes do DOM **uma vez, no início do tour** (não
  re-consulta a cada passo), e os elementos de dentro da seção só
  existem no DOM depois do clique. Corrigido levantando o toggle local
  (`useState` em `AbaGtLista.jsx`) para o `App.jsx`
  (`gtInconsistenciasAbertas`), que passa a computar `tourAbaId =
  'gt.busca.inconsistencias'` quando a seção está aberta — reaproveitando
  o MESMO efeito que já dispara os mini-tours de aba (sem duplicar
  lógica). **Regra geral:** qualquer seção que só monta seu conteúdo
  depois de um clique (toggle, modal, aba secundária sem id próprio no
  Header) precisa de um id de tour e um sub-estado espelhado no
  `App.jsx` para o tour poder disparar no 1º acesso — não basta um passo
  no tour "de fora" explicando o botão.

- **Modo demo (portfólio público, decisão de 19/07/2026 — Opção B):** flag
  `VITE_DEMO_MODE=true` faz o app rodar 100% estático, sem NENHUMA chamada ao
  Supabase (nem Auth, nem tabelas) — usado no deploy Vercel do repo público
  (mirror `dashboard-obras-cidade`), nunca em produção/homologação/dev normal.
  Helper `ehModoDemo()` em `src/lib/demo.js` (lê a flag a cada chamada, não em
  module-load — necessário para os testes simularem os dois cenários).
  - **Login:** sem tela de Login — `App.jsx` seta uma `DEMO_SESSION` fake
    ("Visitante (demo)") direto no primeiro `useEffect`, sem falar com
    `supabase.auth`. `signOut`/`getProfile`/`isAdmin`/`sessaoExpirada`
    (`auth.js`) têm bypass: `signOut` não faz nada (`handleSignOut` do
    `App.jsx` mantém a sessão viva no modo demo — não bloqueia o portfólio
    atrás de um login que não existe, "sair" só volta pra Home), `getProfile`
    devolve `DEMO_PROFILE` (`role: 'visitante'`, nunca `'admin'` — o painel de
    Configurações fica automaticamente inacessível), `sessaoExpirada` sempre
    `false`.
  - **Permissões:** `carregarPermissoes()` (`permissoes.js`) devolve
    `permissoesDemo()` — TODAS as permissões de visualização do catálogo,
    **exceto** `emerg.upload` e `multas.atualizar` (as únicas de escrita).
    Não depende do parâmetro `isAdmin`.
  - **Dados:** os hooks de carga (`useCargaFiscalizacao/SistemaGeo/Emergencias/
    Multas`, `useAvisoAtualizacao`) têm um branch `if (ehModoDemo())` que troca
    `fetchAll`/`versaoTabela`/`fetchDatasModulos` (Supabase) por
    `demoFetchJSON(nome)` (`fetch` de `public/demo-data/<nome>.json`) — sem
    cache IndexedDB (`lerCache`/`gravarCache` puladas) e sem polling
    (`useAvisoAtualizacao` lê `meta.json` uma vez, não repete a cada 3 min).
    Snapshots inexistentes (classificação de motivos) entram como array vazio
    — sem erro no console.
  - **Escrita desligada:** `salvarClassifMotivos` (`App.jsx`) é no-op no modo
    demo. Tour guiado: `tour.js` usa um `Map` em memória
    (`toursVistosDemo`) em vez da tabela `tour_visto` — o convite pode
    reaparecer a cada F5 (aceitável: reforça que é uma demonstração).
  - **Faixa visual:** `getAmbiente()` (`env.js`) devolve a faixa "🔍
    DEMONSTRAÇÃO — DADOS FICTÍCIOS PARA PORTFÓLIO" (teal) **antes** de checar
    `VITE_APP_ENV` — tem precedência sobre a faixa de homologação.
  - **Dados sintéticos (Fase 1):** `scripts/gerar-dados-demo.mjs` gera
    `public/demo-data/*.json` (sistemaGeo ~8k, fiscalizações ~5k, emergências
    ~3k, posicionamento de obras ~2k, multas ~500, `meta.json`) com PRNG
    determinístico (seed fixa — reproduzível), usando os **nomes reais** do
    sistema (NORCREST com unidades, HARGROVE, WINSLOW, siglas de subprefeitura,
    status reais do catálogo) — o script do mirror de portfólio
    (`mirror/espelhar-portfolio.sh`) já sabe trocar esses nomes pelos
    fictícios do repo público. Não é amostra real (exigiria acesso ao banco);
    trocável no futuro regenerando os mesmos JSONs a partir de uma amostra
    real anonimizada, sem mudar código do app.
    ⚡ **GT Obras (28/07/2026, Fase 5 do módulo):** mesmo gerador ganhou
    `gt_obras.json` (~1,9k) e `gt_dash.json` (36 linhas — 4 blocos × 9,
    sem divergência forçada entre a soma dos anos e o "Total Geral"). O
    hook `useCargaGtObras.js` já tinha o branch de modo demo desde a Fase
    2 — só faltavam os JSONs. Exercita as 4 situações de vínculo
    (Sistema Geo/Fiscalização/sem processo/não encontrado), duplicados e
    grafias ambíguas de recape. `tecnica_analise` usa rótulos genéricos
    ("TÉCNICA 1".."TÉCNICA 5"), nunca nomes reais. Introduziu 3 nomes/
    códigos reais novos que precisaram de regra em
    `mirror/replacements.txt`: `AXWELL TELECOM` (permissionária
    real citada em `docs/plano-modulo-gt-obras.md`) e `TG`/`MNED`
    (códigos reais de unidade da NORCREST, curtos demais para substring
    solta — mesma técnica "entre aspas" do achado de `TIM`/`CLARO` em
    19/07/2026, ver bloco abaixo). **Regra geral, reforçada aqui:**
    sempre que o gerador de demo ganhar um vocabulário novo (nome de
    permissionária, código de unidade, sigla), checar ANTES se já existe
    regra de anonimização — senão o dado real vaza pro mirror público no
    próximo sync.
  - **⚠️ Deploy demo no Vercel — 3 variáveis, não 1:** além de
    `VITE_DEMO_MODE=true`, o deploy da demo PRECISA de
    `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` com **valores dummy**
    (ex.: `https://exemplo-dummy.supabase.co` / `chave-dummy`): o
    `src/lib/supabase.js` lança erro no topo do módulo se elas faltarem e o
    minificador elimina o app inteiro como código morto (mesmo fenômeno do
    build local, ver `arquitetura.md`). O cliente Supabase criado com URL
    dummy é inofensivo — no modo demo nenhuma chamada chega a ele.
    ⚠️ Recíproca no ambiente local: o Vitest lê o `.env.local`; rodar
    `npm test` com `VITE_DEMO_MODE=true` deixado lá (ex.: depois de um smoke
    test do modo demo) derruba o teste "ehModoDemo() é false por padrão" —
    remover a flag do `.env.local` antes de rodar a suíte.
  - **Ampliação — painel de Configurações somente leitura na demo
    (20/07/2026):** o visitante da demo pública passou a abrir também o
    painel de **Configurações** (pedido do usuário: "tem bastante coisa
    importante, principalmente em relação à atualização dos dados"), mas
    sem virar admin de verdade e sem nenhuma ação funcionar de fato —
    Opção C do que foi discutido: Usuários e Perfis de Acesso "ao vivo"
    somente leitura + Histórico de importações "ao vivo"; o fluxo completo
    de upload fica de fora (só citado como código visível no repo).
    - `App.jsx` ganhou `podeVerConfiguracoes = isAdmin || ehModoDemo()`,
      **separada** de `isAdmin` (que continua só admin de verdade, usada nas
      ações reais). É essa variável — não `isAdmin` — que controla o link
      "Configurações" do Rodape da Home, o item "Configurações" do
      `ModuleDropdown` (atalho ⚙ dentro de cada módulo) e a renderização do
      `AdminPanel` na página 5.
    - `AdminPanel.jsx` despacha para versões `*Demo` quando `ehModoDemo()`:
      `AbaUsuariosDemo.jsx`, `AbaPerfisDemo.jsx` e `AtualizarDadosDemo.jsx`
      (abas 0, 1 e 2). A aba 3 (**Log de Acessos**) **some da navegação** no
      modo demo — filtrada em `Header.jsx` no ponto de uso de `ABAS_ADMIN`
      (`.filter(a => a.id !== 3)`), sem alterar `ABAS_ADMIN` em si (usada
      fora do modo demo também).
    - **Dados fictícios** em `src/lib/demoAdminData.js` (hand-written, baixo
      volume): `USUARIOS_DEMO` (~10 perfis de `profiles`), `PERFIS_DEMO`
      (~5 perfis de acesso fictícios: Visualização completa, Fiscalização,
      Sistema Geo, Emergências, Multas), `PERFIL_PERMISSOES_DEMO` (matriz
      perfil→permissões usando os códigos **reais** de `TODAS_PERMISSOES`,
      para a tela sair coerente) e `SNAPSHOTS_DEMO` (~8 registros de
      histórico de importação, mesmas colunas de `importacoes_snapshots`).
    - `AbaUsuariosDemo.jsx`/`AbaPerfisDemo.jsx` reaproveitam o máximo
      possível do visual real: `loginDisplay` (exportada de
      `AbaUsuarios.jsx`) e `MODULO_LABEL`/`PERM_DESCRICAO` (exportadas de
      `AbaPerfis.jsx`) — nada de duplicar rótulos. Toda ação de escrita
      (criar/editar/excluir usuário ou perfil, redefinir senha, trocar
      tipo/perfil/"1º acesso") vira elemento **desabilitado** com
      `title="Indisponível nesta demonstração pública"` — nenhuma delas
      abre modal/formulário. A aba Perfis mantém uma interação legítima
      (não é ação de escrita): trocar qual perfil tem a matriz de
      permissões exibida.
    - `AtualizarDadosDemo.jsx` não simula o fluxo de upload — só mostra uma
      nota explicando isso e o histórico (`SNAPSHOTS_DEMO`). Reaproveita o
      componente `TabelaHistoricoImportacoes`, extraído de dentro de
      `AtualizarDados.jsx` (antes era só o corpo de `HistoricoImportacoes`,
      que buscava e renderizava junto) — agora a busca via Supabase e a
      tabela pura são duas funções separadas, e a tabela pura é usada tanto
      pela versão real (dados do banco) quanto pela demo (`SNAPSHOTS_DEMO`).

## Glossário de domínio

- **Permissionária:** empresa autorizada a operar em via pública (ex.: NORCREST).
- **Emergência "Informada":** status de uma emergência comunicada.
- **Subprefeitura:** divisão administrativa de SP (usada no mapa).
- **Recape:** recapeamento de via.
- **Termo:** termo de fiscalização emitido.
