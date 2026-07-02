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
     da nova permissão ao mapa `PERM_DESCRICAO` em `src/components/AdminPanel.jsx`.
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

- **Módulo "Apresentação" (Melhoria 2, 02/07/2026):** módulo de topo (padrão
  Emergências: boolean `mostrarRelatorio` no `App.jsx` + layout próprio), slug interno
  `relatorio`, cor **teal**, permissão `relatorio.ver` (SQL `18-relatorio-mensal.sql`).
  Renderiza os **36 slides** da apresentação mensal institucional a partir das bases já
  carregadas (geo=`sistemaGeoLinhas`, fisc=`todasLinhas`, emerg=`emergLinhas`, **cruas**,
  sem filtros de sidebar). Cérebro em `src/lib/relatorio.js` (`MODELO_INSTITUCIONAL` +
  `resolverDadosSlide`); UI em `src/components/tabs/relatorio/` (`PaginaRelatorio` +
  `SlideRenderer`). **3 categorias de slide** com contorno próprio: 🟢 `dados` (teal,
  23 slides com dado real), ⚪ `texto` (cinza, 12 institucionais), 🟡 `futuro` (âmbar
  tracejado, 1 — metragem/multa aguarda taxa externa). Cada slide exibe
  "Slide {n} — {título}" (mapeia para o PPT do usuário). Exports: XLSX por slide
  (evento `obras:exportar-grafico`), PNG por slide (`html-to-image`, botões ficam
  fora da captura via `data-no-export`), "Baixar todos" (`exportarXLSXMultiAba`).
  KPIs sem fonte no banco (usuários/executantes do Sistema Geo, tempo de resposta NORCREST)
  aparecem como "preencher manualmente". ⚠️ Ao editar o seed, manter os testes de
  `src/tests/relatorio.test.js` (contagem 23/12/1 e nºs 1–36 sem buracos) e o plano
  `docs/plano-melhoria-2-apresentacao.md` alinhados. v2 no radar: .pptx/PDF com seleção
  de slides; Fase C: editor persistindo em `relatorio_modelos`.

## Glossário de domínio

- **Permissionária:** empresa autorizada a operar em via pública (ex.: NORCREST).
- **Emergência "Informada":** status de uma emergência comunicada.
- **Subprefeitura:** divisão administrativa de SP (usada no mapa).
- **Recape:** recapeamento de via.
- **Termo:** termo de fiscalização emitido.
