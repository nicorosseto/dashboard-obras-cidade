# Arquitetura e referência técnica — OBRAS Dashboard

> Arquivo de referência linkado pelo `CLAUDE.md` raiz (via `@`). Reúne o que é
> consulta pontual (stack, cores, pastas, comandos), para manter o `CLAUDE.md`
> principal enxuto. **Atualize aqui** quando o stack, a estrutura ou os comandos
> mudarem.

## Tecnologias (o "stack")

| Camada | Ferramenta | Para que serve |
|---|---|---|
| Interface (front-end) | **React 18 + Vite 5** | Monta as telas no navegador |
| Estilo | **Tailwind CSS 3** | Classes utilitárias de estilo |
| Gráficos | **Recharts** | Gráficos de barra, linha, donut |
| Mapas | **Leaflet + react-leaflet** | Mapa choropleth de São Paulo |
| Planilhas | **SheetJS (xlsx)** | Ler/exportar Excel |
| Banco + Login | **Supabase** (PostgreSQL + Auth + RLS) | Dados e autenticação |
| Hospedagem | **Vercel** | Publica o site automaticamente |
| Código | **GitHub** | Guarda o histórico do código |

## Paleta de cores (identidade visual)

- `navy` (azul-marinho institucional): `#1F3864`
- `navy-light`: `#2E4F7F`
- `red` (vermelho institucional): `#C00000`
- `grey-bg` (fundo cinza): `#F2F2F2`

Definidas em `tailwind.config.js`.

## Estrutura de pastas

```
dashboard-obras-cidade/
├── src/
│   ├── App.jsx                 # Componente raiz: layout, navegação, estado global
│   ├── main.jsx                # Ponto de entrada do React
│   ├── index.css               # Estilos globais + import do Tailwind
│   ├── components/             # Componentes de interface reutilizáveis
│   │   ├── charts/             # Gráficos (Recharts/Leaflet)
│   │   └── tabs/               # Conteúdo de cada aba do dashboard (Pagina*)
│   ├── pages/                  # Telas de nível alto (Home, Login)
│   ├── lib/                    # Lógica não-visual
│   │   ├── supabase.js         # Conexão com o Supabase
│   │   ├── auth.js             # Login/logout
│   │   └── aggregations.js     # Cálculos, KPIs, formatação de datas
│   └── data/                   # Dados estáticos (GeoJSON de SP)
├── scripts/                    # Scripts Python de importação de dados (.py/.ipynb)
├── supabase/                   # Scripts SQL do banco
├── public/                     # Arquivos servidos como estão (logos)
└── (configs na raiz)           # package.json, vite.config.js, etc.
```

## Comandos úteis

```bash
npm install      # instala dependências (1ª vez)
npm run dev      # roda localmente em modo desenvolvimento
npm run build    # gera a versão de produção (testa se compila)
npm run preview  # pré-visualiza a build de produção
npm run lint     # aponta problemas no código (ESLint)
npm run format   # formata o código (Prettier)
npm test         # roda os testes (Vitest, modo run)
```

## Hook de início de sessão (`.claude/hooks/session-start.sh`)

Script que o Claude Code roda **sozinho no começo de cada sessão** (configurado em
`.claude/settings.json` → `SessionStart`). Roda de forma **síncrona** (a sessão só
começa depois que ele termina), garantindo que tudo esteja pronto. Faz:

1. **`npm install`** — instala as dependências, para `lint`/`build`/`test` rodarem sem erro.
2. **Auditoria automática (gaps 1–3 de `auditoria.md`)** — `git fetch` + checa promoção
   pendente e branches não promovidas; entrega o panorama como contexto da sessão.

⚠️ O **Gap 4 (PRs abertos)** e a reconciliação com o diário de bordo continuam manuais
(o hook não tem acesso ao GitHub MCP). Detalhes no protocolo de startup do `CLAUDE.md`.

## MCP servers (`.mcp.json` + `.claude/settings.json`)

Desde **02/07/2026** (PR #225) o projeto tem 5 **MCP servers** configurados — pontes que
dão ao Claude ferramentas de **consulta** a sistemas externos. Definidos em `.mcp.json`
(raiz) e habilitados em `.claude/settings.json` (`enabledMcpjsonServers`):

| Server | Serve para |
|---|---|
| **context7** | Doc atualizada de bibliotecas (React, Recharts, Supabase-js, Tailwind…) |
| **vercel** | Deploys, logs de build e status do projeto na Vercel |
| **supabase-dev** | Banco de **homologação** (`obras-dev`, ref `exemplorefdevooo0001`) — **read-only** |
| **supabase-prod** | Banco de **produção** (ref `exemplorefprodooo001`) — **read-only** |
| **playwright** | Automação de navegador (abrir a homologação, screenshot, testar fluxo) |

⚠️ Regras (detalhe completo em **`docs/mcp-servers.md`**):
- **Supabase é READ-ONLY** — escrita de banco continua só pelos scripts SQL numerados,
  rodados pelo usuário nos 2 bancos. O MCP serve para o Claude **conferir** schema/dados.
- **MCPs carregam só no INÍCIO da sessão** — mexer no `.mcp.json` no meio de um chat só
  vale no chat seguinte.
- **Vercel e Supabase exigem OAuth uma vez**, autorizado **pelo usuário** em sessão
  interativa (o Claude automático não completa o login). context7/playwright não exigem.
