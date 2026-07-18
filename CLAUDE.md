# CLAUDE.md — Memória do Projeto OBRAS Dashboard

> Lido automaticamente no início de cada conversa — a "memória de longo prazo" do
> projeto. **Alvo: < 200 linhas.** O material de referência fica nos arquivos
> linkados abaixo (carregados via `@`).

## 🌐 REGRA #0 — IDIOMA: SEMPRE PORTUGUÊS DO BRASIL (a primeira coisa deste arquivo, de propósito)

**TODA saída do Claude — resposta final E raciocínio interno/thinking — é em
português do Brasil, sem exceção, em toda sessão, novo chat ou não.** Isso
inclui a primeira mensagem de qualquer chat novo, antes mesmo de terminar de
ler o resto deste arquivo.

> ⚠️ **Por que está aqui em cima, repetido (não só na seção 2):** essa regra já
> existia na seção 2 e mesmo assim o Claude respondeu em inglês **num chat
> novo**, logo na 1ª mensagem, em 18/07/2026 — a regra estava "enterrada" longe
> do topo e não impediu o erro. Histórico: also apontado em 16/07/2026
> ("pensando em inglês"). **Dois incidentes registrados; se acontecer de novo,
> mover esta regra para um hook automático em vez de confiar só em texto.**

## Arquivos de referência (carregados automaticamente)

**⚠️ LEIA TODOS a cada nova sessão — não pular nenhum.** Cada um guarda regras que
valem para todo o trabalho; ignorá-los já causou erros de processo.

- `.claude/STARTUP_CHECKLIST.md` — resumo visual da abertura de sessão
- `@.claude/rules/arquitetura.md` — stack, cores, pastas, comandos
- `@.claude/rules/dominio.md` — particularidades do sistema e glossário
- `@.claude/rules/tokens.md` — limites e gestão de contexto/tokens (CRÍTICO)
- `@.claude/rules/github.md` — templates de PR e padrões
- `@.claude/rules/auditoria.md` — auditoria de pendências (sistema anti-perda — CRÍTICO)
- `docs/mcp-servers.md` — MCP servers do projeto (Context7, Vercel, Supabase read-only, Playwright)
- `docs/progresso.md` — status atual do projeto
- `docs/diario-de-bordo.md` — registro por sessão (reconciliar no startup)

> **Como manter:** ao mudar algo, edite o arquivo do tema certo e o status em
> `docs/progresso.md`. Use este `CLAUDE.md` só para **regras de trabalho** gerais.
> **Antes de editá-lo:** salvar backup datado em `.claude/backups/CLAUDE.md.AAAA-MM-DD.md`
> e **não enxugar a ponto de perder o "porquê"** das regras — as lições com contexto
> (datas, nº de PR/erro) são o que evita repetir os erros (lição de 25/06/2026).

---

## 🚀 PROTOCOLO OBRIGATÓRIO DE STARTUP (antes de qualquer tarefa)

**CRÍTICO — todo chat novo ou após 4h+ de inatividade, na ordem:**

> ⚙️ **Hook automático de startup (desde 26/06/2026):** o
> `.claude/hooks/session-start.sh` (registrado em `.claude/settings.json`) roda
> sozinho no início de cada sessão e já faz parte deste protocolo: instala as
> dependências npm (`npm install`) e executa os **gaps 1–3 da auditoria** (fetch +
> promoção pendente + branches não promovidas), entregando o panorama como contexto.
> Ainda assim, confira o resultado e **complete o que o hook não faz**: o **Gap 4
> (PRs abertos, via GitHub MCP)** e a **reconciliação com o diário de bordo** continuam
> manuais. Se o hook não rodou (sessão local, hook ainda não na branch atual), execute
> os passos abaixo na mão.

1. **Autoria Git** (senão os commits saem "Unverified") — *o hook já faz; refazer se preciso*:
   `git config user.email noreply@anthropic.com && git config user.name Claude`
2. **🔍 AUDITORIA DE PENDÊNCIAS (sistema anti-perda — `@.claude/rules/auditoria.md`):**
   rodar os **4 gaps + varredura de PRs abertos** e **reconciliar** com
   `docs/diario-de-bordo.md`. Relatar ao usuário tudo que encontrar (inclusive
   "auditoria limpa"). É o passo que evita perder trabalho de um chat para outro —
   não pular.
3. **Promoção pendente?** `git log origin/main..origin/homologacao --oneline` — se
   houver commits, ler `git show origin/homologacao:docs/progresso.md` (a `homologacao`
   está à frente); senão ler `docs/progresso.md` do branch atual.
4. **Estado do código:** `git log --oneline -15` + `git status`; checar branches de
   trabalho inacabadas.
5. **Ler TODAS as regras:** todos os arquivos de referência listados no topo +
   `docs/progresso.md` + `docs/diario-de-bordo.md`.
6. **Lembrar do checklist de execução** (detalhado na seção 2): notificar toda PR ·
   atualizar docs ao terminar (incl. **diário de bordo**) · trailer `Co-Authored-By`
   em todo commit · nova aba/módulo não-exclusiva do admin → atualizar catálogo de
   permissões · nova tela/aba/botão visível → atualizar o **tour guiado**
   (regra em `dominio.md`, "Tour guiado").
7. **Só então** proceder com a tarefa.

> Não pular nenhum passo — viola-lo causa erros de processo (PR não notificada,
> regra não consultada, doc desatualizada) que o usuário descobre tarde.

---

## 1. O que é este projeto

Dashboard web da **OBRAS** (Departamento de Controle e Uso de Vias Públicas) da
**Secretaria das Subprefeituras da Prefeitura de São Paulo**. Mostra dados de
fiscalização de vias, emergências e infraestrutura (Sistema Geo) em gráficos, mapas e
tabelas, lendo de um banco na nuvem. Seções no cabeçalho: **Fiscalização**
(vias, recapes, termos) e **Sistema Geo** (infraestrutura por subprefeitura); mais o
módulo **Emergências** (upload de Excel + análise). Stack e pastas:
`@.claude/rules/arquitetura.md`.

## 2. Regras de comunicação e trabalho

- **Idioma:** SEMPRE **português do Brasil** — inclusive o **raciocínio interno**
  (texto de pensamento/planejamento), não só a resposta final. Regra completa e
  reforçada no topo do arquivo (**REGRA #0**, antes até dos "Arquivos de
  referência") — ver lá o histórico dos 2 incidentes (16/07 e 18/07/2026).
- **⏳ REGRA TEMPORÁRIA (13/07 → 19/07/2026, remover depois):** quando o Claude
  estiver rodando no modelo **Fable 5**, ele atua só como **planejador/orquestrador**:
  todo texto longo ou código longo é delegado a **subagentes Sonnet 5** (via Agent
  tool, `model: "sonnet"`), e o Fable apenas revisa/integra o resultado. Edições
  curtas e pontuais podem ser feitas diretamente. **Após 19/07/2026, apagar esta
  regra** (pedido do usuário em 13/07/2026).
- **⚠️ O usuário trabalha 100% pelo NAVEGADOR** (Claude Code web, GitHub, Vercel,
  Supabase) — **sem terminal local**. Portanto:
  - **NUNCA** pedir que ele rode comandos locais (`npm run dev`, `npm install`,
    `git ...`) — quem roda build/lint/teste sou EU, no ambiente remoto, e reporto.
  - Para ele testar, guiar SEMPRE pelo navegador: preview do Vercel, produção após
    merge, ou painéis web. Antes de propor um passo, checar se cabe no navegador.
- **Branch de trabalho:** criada a partir da `homologacao`; merge via PR no fluxo
  homologação-primeiro (seção 4). Nunca push direto em `main` sem permissão.
- **Nomes de branch:** prefixo de tipo + descrição em pt-br kebab-case (`feat/`,
  `fix/`, `docs/`, `refactor/`, `chore/`, `perf/`). Ex.: `docs/readme-profissional`.
  **Não usar** nomes auto-gerados (`claude/sleepy-...`) — propor nome descritivo antes.
- **Commits:** Conventional Commits em pt-br + trailer
  `Co-Authored-By: Claude <noreply@anthropic.com>` (não usar links `claude.ai/code/...`;
  o ambiente injeta rodapé "Generated by Claude Code" na descrição do PR — **remover**).
- **Didática:** o usuário está aprendendo — explicar termos, dizer onde clicar, ir
  passo a passo.
- **Redesign visual grande (layout de tela inteira):** oferecer uma **prévia
  em HTML (Artifact)** antes de implementar no código de verdade (funcionou
  bem no redesign da Home — detalhe em `dominio.md`).
- **🚨 Avisar sobre execução de PRs (OBRIGATÓRIO):** ao deixar uma PR pronta, avisar
  EXPLICITAMENTE no chat — não basta "criei a PR"; ele precisa saber que está PRONTA
  E AGUARDANDO o merge dele. Mensagem padrão: *"Implementado — PR #XX (Squash and
  merge; apagar branch). … Para testar na homologação: … Quando validar, me avisa que
  abro a promoção."* (formato completo em `@.claude/rules/github.md`).
- **Manter a memória atualizada (proativo, sem o usuário pedir):** a cada tarefa,
  atualizar **no mesmo PR** os docs afetados — `docs/progresso.md` sempre (status +
  próximo passo; erro corrigido → linha em "Registro de erros e correções");
  `arquitetura.md`/`dominio.md` se mudar stack/pastas/regras de negócio; `docs/prd.md`
  se mudar visão/perfis/escopo. Faz parte de "terminar" a tarefa.
- **🔔 Checklist de docs após cada PR (regra de 26/06/2026):** ao entregar qualquer PR,
  rodar o checklist de `@.claude/rules/github.md` (seção "Checklist de docs") e avisar
  no chat o resultado: *"📝 Docs: progresso.md ✅ · diário ✅"* (ou abrir PR de docs se
  ficou pendente). O usuário **não precisa pedir** — é obrigatório a cada entrega.
- **Ao dar o "prompt para novo chat"** (limite de contexto): checar os **dois gaps**:
  1. `git log origin/main..HEAD --oneline` — commits na branch de trabalho ainda nem na
     `homologacao` (o risco real). Se houver, o prompt DEVE nomear a branch: *"A branch
     de trabalho é `<nome>`. Leia `git show origin/homologacao:docs/progresso.md` e os
     commits extras com `git log origin/homologacao..origin/<nome> --oneline`."*
     Ideal: abrir o PR da branch → `homologacao` antes de trocar de chat.
  2. `git log origin/main..origin/homologacao --oneline` — promoção pendente. Se houver,
     incluir: *"Leia `docs/progresso.md` da `homologacao` (à frente da `main`)."*
  > ⚠️ **Lição (18/06/2026):** o chat novo leu o `progresso.md` da `homologacao`, que
  > estava atrás da branch de trabalho → 11 commits de redesign não foram promovidos e o
  > usuário só percebeu o "retrocesso" depois. O ponto cego são os commits na branch de
  > trabalho ainda fora da `homologacao`. **Sempre checar os dois gaps.**

## 3. Visibilidade do repositório

- **`dashboard-obras-cidade`:** PRIVADO — dados sensíveis (emails reais, domínio
  `@orgao-exemplo.gov.br`, senhas-padrão em seeds).
- **Mirror de portfólio (futuro):** repo público separado, anonimizado via
  `git filter-repo` preservando o histórico real. Ver `docs/pesquisa-portfolio-2026.md`.
- **Docs mestres:** `docs/prd.md` (visão), `docs/progresso.md` (execução),
  `docs/plano-de-acao.html` (roteiro). `guia-do-projeto.html` e `roteiro-modulos.html`
  são material didático.

## 4. Fluxo de trabalho no GitHub

Objetivo: histórico limpo, legível e em pt-br (o público é o setor público brasileiro).

- **Fluxo homologação-primeiro (11/06/2026):** todo código/config entra em produção via
  homologação. Exceção: docs-only (abaixo).
  1. PR de trabalho com base **`homologacao`** → **"Squash and merge"** (1 commit/tarefa).
  2. Usuário valida em `homolog-dashboard-obras-cidade.vercel.app`.
  3. Aprovado → **PR de promoção** `homologacao` → `main`, título
     **`chore: promove homologação para produção`**, merge **"Create a merge commit"**
     (NÃO squash — squash faria as branches divergirem e exigiria force-push).
  4. Espelhamento `main` → `homologacao` é **automático** (GitHub Action
     `.github/workflows/espelhar-main-homologacao.yml`) — Claude não roda nada.
- **⚡ Atalho docs-only (24/06/2026):** PR só com docs (`docs/`, `.claude/`, `CLAUDE.md`,
  `README`) — zero código/banco/interface — vai direto à **`main`** (nada a validar em
  homologação). Merge "Squash and merge"; espelhamento automático. Misturou docs +
  código → fluxo normal.
- **Toda descrição de PR diz qual botão de merge usar e se apaga a branch** (o usuário
  segue o escrito): trabalho (`feat/`, `fix/`…) → **apagar**; promoção → **NUNCA apagar**
  (a head é a `homologacao`, de vida longa; apagá-la redireciona os PRs abertos para a
  `main` — aconteceu no #58). Guia: `docs/guia-ambiente-testes.md`. Templates em
  `@.claude/rules/github.md`.
- **Branch `main`:** linha de produção (Vercel publica a cada push). **Nunca** push
  direto, force-push ou reescrita de histórico.
- **PRs:** título no padrão dos commits; descrição em pt-br com *porquê* + *o quê* +
  *como validar* (nada vazio); 1 PR por assunto/módulo, pequeno e revisável.
- **⚠️ Antes de avisar "pode mergear":** confirmar que TODOS os commits já aparecem na
  página do PR (merge antes do push completar já cortou commits nos PRs #47 e #50).
- **Idioma no GitHub:** tudo em pt-br (só os prefixos Conventional Commits em inglês).

## 5. ⚠️ Segurança (inegociável)

- **NUNCA** colocar chaves secretas do Supabase no front-end nem commitar segredos.
- A `anon key` (pública) pode ir no front-end; a `service_role` **JAMAIS**.
- Variáveis sensíveis em `.env.local` (no `.gitignore`) e nas configs do Vercel.

## 6. 🔋 Gestão de tokens (ver `@.claude/rules/tokens.md`)

Aviso antes de ações caras. Marcos: 40%, 60%, 80% consumidos → ao atingir 80%+, abrir
chat novo. Detalhes (exemplos, troca de chat, protocolo de aviso) em `tokens.md` —
**ler antes de tarefas grandes**.

---

> **Particularidades técnicas** (login, fuso, ambientes, uploads, permissões…) e o
> **glossário de domínio** estão em `@.claude/rules/dominio.md`.
