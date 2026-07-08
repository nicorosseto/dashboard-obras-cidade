# MCP Servers do projeto — OBRAS Dashboard

> **Registrado em 02/07/2026.** Este documento é o registro completo da pesquisa e
> configuração dos **MCP servers** (Model Context Protocol) do projeto. Existe para
> que qualquer sessão futura entenda **o que está configurado, por quê, o que é
> gratuito, como autorizar e como isso muda o fluxo de trabalho** — sem reprocessar.

---

## 1. O que é um MCP server (resumo)

Um **MCP server** é uma "ponte" que dá ao Claude Code **novas ferramentas** para
consultar sistemas externos (documentação de bibliotecas, banco de dados, plataforma
de deploy, navegador). Em vez de o Claude "adivinhar" a API de uma lib ou o schema do
banco, ele **consulta a fonte real**. Isso reduz erro e retrabalho.

Neste projeto, os MCPs foram configurados em **02/07/2026** para acelerar as próximas
melhorias (ex.: o módulo "Relatório Mensal") — dar ao Claude acesso de **leitura** ao
banco, à doc atualizada das libs (Recharts, Supabase-js, etc.) e ao Vercel/Playwright.

---

## 2. Servers configurados (5)

Definidos em **`.mcp.json`** (raiz do repo) e habilitados em
**`.claude/settings.json`** (`enabledMcpjsonServers`). Configurados via PR **#225**
(mergeado em produção).

| Server | Tipo | Para que serve | Gratuito? |
|---|---|---|---|
| **context7** | http | Documentação **atualizada** de bibliotecas (React, Recharts, Supabase-js, Tailwind…) sob demanda — evita API "alucinada" | ✅ Sim |
| **vercel** | http | Consulta deploys, logs de build, status do projeto na Vercel | ✅ Sim (plano atual) |
| **supabase-dev** | http | Acesso **read-only** ao banco de **homologação** (`obras-dev`) | ✅ Sim |
| **supabase-prod** | http | Acesso **read-only** ao banco de **produção** | ✅ Sim |
| **playwright** | stdio (`npx`) | Automação de navegador (abrir a homologação, tirar screenshot, testar fluxo) | ✅ Sim |

**Conteúdo exato do `.mcp.json`:**

```json
{
  "mcpServers": {
    "context7":     { "type": "http", "url": "https://mcp.context7.com/mcp" },
    "vercel":       { "type": "http", "url": "https://mcp.vercel.com" },
    "supabase-dev":  { "type": "http", "url": "https://mcp.supabase.com/mcp?project_ref=exemplorefdevooo0001&read_only=true" },
    "supabase-prod": { "type": "http", "url": "https://mcp.supabase.com/mcp?project_ref=exemplorefprodooo001&read_only=true" },
    "playwright":   { "command": "npx", "args": ["-y", "@playwright/mcp@latest"] }
  }
}
```

- **`project_ref` do obras-dev (homologação):** `exemplorefdevooo0001`
  (`https://exemplorefdevooo0001.supabase.co`).
- **`project_ref` da produção:** `exemplorefprodooo001`
  (`https://exemplorefprodooo001.supabase.co`).
- Ambos os Supabase têm **`read_only=true`** na URL — **nunca** escrevem no banco.

---

## 3. ⚠️ Regras de uso (importantes)

- **Supabase MCP é SOMENTE LEITURA.** Serve para o Claude **consultar** schema,
  contagens, amostras de dados e conferir suposições. **Escrita de banco (DDL/DML)
  continua exclusivamente pelos scripts SQL numerados** (`supabase/schema/NN-*.sql`),
  **rodados pelo usuário nos DOIS bancos** (obras-dev **e** produção). O MCP
  read-only **não substitui** esse fluxo — é uma salvaguarda contra alteração
  acidental de dados sensíveis da Prefeitura.
- **Os MCPs carregam apenas no INÍCIO da sessão.** Configurar/mergear o `.mcp.json`
  no meio de um chat **não** ativa as ferramentas naquele chat — só no **chat
  seguinte**. Por isso a configuração (#225) só passa a valer no próximo chat.
- **Custo em tokens:** cada ferramenta MCP disponível ocupa espaço no contexto. Não é
  gratuito em tokens — usar quando **agrega** (consultar schema real, doc de lib), não
  por padrão.
- **Dados sensíveis:** o repo é privado (emails reais, domínio institucional). O
  Supabase read-only pode ler esses dados — tratar as saídas com o mesmo cuidado (não
  colar dados pessoais reais em docs commitados).

---

## 4. Autorização (OAuth) — o que o USUÁRIO precisa fazer

Os servers **http** que acessam contas privadas (**Vercel**, **supabase-dev**,
**supabase-prod**) exigem **autorização OAuth uma única vez**, feita **pelo usuário**
numa sessão **interativa** (o Claude, em sessão automática, **não** consegue completar
o fluxo de login).

**Como autorizar (no chat novo, quando os MCPs estiverem carregados):**
1. Ao usar uma ferramenta desses servers pela primeira vez, o Claude Code exibe um
   **prompt de autorização** / um **link de login** (fluxo OAuth do próprio Vercel /
   Supabase).
2. O usuário **clica no link**, faz login na conta (Vercel / Supabase) e **autoriza**
   o acesso (read-only, no caso do Supabase).
3. Feito uma vez, a autorização fica salva — os chats seguintes já usam sem repetir.

- **context7** e **playwright** **não** exigem OAuth (context7 é doc pública;
  playwright roda local via `npx`).
- ⚠️ O Claude **nunca** pede código/token/URL de callback por texto — a autorização é
  sempre pelo fluxo visual do navegador, do lado do usuário.

> ⚠️ **Limitação descoberta em 02/07/2026 (Claude Code na WEB):** nas sessões do
> Claude Code **web/remotas** (as que o usuário usa), o ambiente roda em modo
> **não-interativo** e o fluxo OAuth **não dispara** — o link de login de
> Vercel/Supabase **não aparece**. A autorização exigiria uma sessão interativa
> (`/mcp` num terminal local), que não faz parte do fluxo do usuário. **Na prática:**
> Vercel/Supabase MCP ficam indisponíveis nas sessões web, e isso **não bloqueia
> nada** — o schema do banco vem dos scripts versionados em `supabase/schema/`, e
> Playwright (e o GitHub MCP do ambiente web) funcionam sem OAuth.
>
> **🔒 Registrado como bloqueado (07/07/2026):** confirmado com o usuário que, por
> ora, ele **não tem acesso ao Claude Code desktop** (única forma de abrir uma
> sessão interativa e completar o `/mcp` login). Fica **em espera** — nenhuma nova
> tentativa de autorizar Vercel/Supabase MCP até o usuário avisar que já tem acesso
> ao desktop e quer tentar. Não é uma pendência a perseguir sozinho; é uma decisão
> dele revisitar quando fizer sentido.

> **⚠️ Achado (08/07/2026):** o MCP `playwright` (`browser_run_code_unsafe`,
> `browser_navigate`, etc.) **falhou** numa sessão web com
> `Error: Chromium distribution 'chrome' is not found at
> /opt/google/chrome/chrome` — ele tenta abrir o canal "chrome" do sistema,
> que não existe no ambiente remoto (só o Chromium pré-instalado do próprio
> Claude Code, em `/opt/pw-browsers/`). **Contorno que funcionou:** não usar
> o MCP `playwright` para esse tipo de validação; em vez disso, rodar um
> script Node avulso (via `Bash`) usando o pacote **`playwright` global do
> ambiente** (`/opt/node22/lib/node_modules/playwright`, resolvido com
> `require('/opt/node22/lib/node_modules/playwright')`) com
> `chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })`
> — mesmo Chromium, caminho explícito. Serviu para validar UI real (login,
> navegação entre módulos, spinners) com a REST API do Supabase **mockada**
> via `page.route()` — técnica útil para qualquer refatoração que mexa em
> `useEffect`/carga de dados (não coberta pelos testes Vitest, que só testam
> funções puras). ⚠️ Ao mockar chamadas `.single()`/`.maybeSingle()` do
> supabase-js: o PostgREST real devolve um **objeto**, não array — o mock
> precisa checar o header `Accept: application/vnd.pgrst.object+json` e
> responder com `data[0]` (não `data`), senão `profile?.role` etc. vêm
> `undefined` e a lógica de admin/permissões quebra silenciosamente.

---

## 5. Pesquisa que motivou a configuração (02/07/2026)

O usuário pediu para pesquisar **MCPs/skills gratuitos** que ajudassem a implementar
as melhorias e a evoluir o sistema. Conclusões:

- **Escolhidos (todos gratuitos):** Context7, Vercel, Supabase (read-only, 2 bancos) e
  Playwright — cobrem doc de libs, deploy, banco e navegador.
- **Canva / geração automática de apresentação:** o autofill/API do Canva que geraria
  os slides automaticamente é **recurso Enterprise (pago)** — **descartado**. O módulo
  "Relatório Mensal" (Melhoria 2) segue a estratégia já planejada: **export de dados
  por slide via XLSX** (`exportarXLSX`) para o usuário colar no PPT/Canva, não geração
  automática da arte.

---

## 6. Impacto no fluxo de trabalho

- **Nada muda** no fluxo de PR / homologação-primeiro / promoção. Os MCPs são
  ferramentas de **consulta** do Claude, não alteram o processo de merge.
- **Escrita de banco:** continua 100% pelos scripts SQL numerados nos 2 bancos. O
  Supabase MCP é read-only por decisão de segurança.
- **Onde ver a config:** `.mcp.json` (raiz) + `.claude/settings.json`
  (`enabledMcpjsonServers`). Alterar servers = editar esses dois arquivos e abrir
  **chat novo** para recarregar.
