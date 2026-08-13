# Dashboard OBRAS

> Painel de monitoramento de fiscalizações de vias públicas, infraestrutura e emergências da **Secretaria das Subprefeituras da Prefeitura de São Paulo**.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=flat-square&logo=vercel&logoColor=white)

**[→ Acessar a demo ao vivo](https://dashboard-obras-cidade.vercel.app/)** — sem
login, dados fictícios gerados sinteticamente (ver seção abaixo).

---

## ⚠️ Sobre este repositório

Este é um **espelho público** (mirror), gerado a partir de um repositório privado onde o projeto está **em uso real** por um órgão da Prefeitura de São Paulo. Por conta da **LGPD** (Lei Geral de Proteção de Dados) e de políticas de confidencialidade do setor público, todo o histórico de commits foi processado antes da publicação: nomes de departamentos, empresas parceiras/permissionárias, e-mails, domínios internos e identificadores técnicos de infraestrutura (banco de dados, deploy) foram **substituídos por versões fictícias**. Nenhum dado real de fiscalização, usuário ou empresa aparece neste repositório — o código e a arquitetura são reais, os nomes não.

---

## O que é este projeto

O **OBRAS** (Departamento de Controle e Uso de Vias Públicas) é o órgão responsável por fiscalizar as empresas permissionárias — como NORCREST, concessionárias e empreiteiras — que realizam obras em vias públicas de São Paulo.

Antes deste sistema, o acompanhamento era feito em planilhas Excel compartilhadas manualmente. Este dashboard centraliza os dados em tempo real, com visualizações interativas que permitem à equipe identificar gargalos por permissionária, subprefeitura e período.

O sistema está em **uso real** pela equipe do OBRAS.

---

## Módulos

### Fiscalização de Vias
Dados dos laudos de fiscalização emitidos pelo OBRAS.
- **Visão Geral** — Distribuição por status (Legislação Atendida vs. Não Conformidades), evolução de solucionados vs. em andamento, ranking de permissionárias
- **Evolução Temporal** — Linha do tempo anual e mensal com filtro por status, agrupamento trimestral
- **Distribuição Espacial** — Mapa choropleth interativo das 32 subprefeituras de SP, rankings, tipos de falha
- **Busca por Processo** — Busca por número de processo com ativação explícita via botão "Filtrar"

### Sistema Geo
Protocolos de infraestrutura urbana por subprefeitura.
- Filtros por permissionária, período e status (com drill-down de sub-status)
- Mapa choropleth sincronizado com a sidebar de filtros
- Busca por processo com paginação

### Análise Integrada (Cruzamento Fiscalização × Sistema Geo)
Cruza as duas bases de dados por número de processo, revelando divergências e lacunas.
- **Só na Fiscalização** — laudos sem correspondente no Sistema Geo (possível obra não cadastrada)
- **Divergências por Permissionária / Subprefeitura** — mesmo processo com campos diferentes nas duas bases
- **Só no Sistema Geo** — protocolos sem laudo de fiscalização
- **Lista de Processos** — tabela unificada com dados de ambas as fontes

### Emergências
Upload e análise de ocorrências de emergências em vias públicas.
- **Dashboard** — KPIs, distribuição por status, top permissionárias e subprefeituras, evolução mensal
- **Geral** — Tabela cruzada permissionária × status com totais
- **Informadas** — Lista agrupada de processos em aberto por permissionária, com exportação
- **Prazo 48h (SLA)** — Cruza emergências com posicionamento de obras; classifica em Dentro do Prazo / Vencido / Não Avaliável; filtros-chip, gráficos, tabela ordenável
- **Busca por Processo** — Busca parcial por número de processo, com informação de vistoria
- **Histórico** — Registro de todos os uploads com detalhamento por permissionária
- Upload aceita planilha principal + planilha auxiliar de posicionamento de obras (formato Excel)

### Painel Administrativo
Exclusivo para usuários com perfil `admin` — **não navegável na demo pública**
(o código completo está em `src/components/admin/`).
- Criação e gestão de usuários internos (domínio `@obras.app`)
- Perfis de acesso dinâmicos — cada perfil define quais módulos e abas o usuário enxerga
- Redefinição de senhas com fluxo obrigatório de primeiro acesso
- Atualização de dados: Sistema Geo e Fiscalização via upload de planilha Excel consolidada
- Histórico de importações com detalhamento por status

---

## Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| Interface | React 18 + Vite 5 | SPA rápida com HMR durante o desenvolvimento |
| Estilo | Tailwind CSS 3 | Utilidades prontas, paleta customizada da identidade visual |
| Gráficos | Recharts | Compatível com React, sem dependências pesadas |
| Mapas | Leaflet + react-leaflet | Mapa choropleth com GeoJSON das subprefeituras de SP |
| Planilhas | SheetJS (xlsx) | Leitura e exportação de Excel no navegador, sem backend |
| Banco de dados | Supabase (PostgreSQL) | RLS nativo, Auth integrada, paginação automática |
| Hospedagem | Vercel | Deploy automático a cada push no `main` |

---

## Como rodar localmente

### Pré-requisitos
- Node.js 18+
- Projeto no Supabase com o schema do repositório aplicado (`supabase/schema/`)

### Instalação

```bash
git clone https://github.com/nicorosseto/dashboard-obras-cidade.git
cd dashboard-obras-cidade
npm install
cp .env.local.example .env.local
# Edite .env.local com sua URL e chave pública do Supabase
npm run dev
```

Abra `http://localhost:5173` no navegador.

### Variáveis de ambiente

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_anon_key_publica
VITE_APP_ENV=development   # development | preview | production
```

> A `service_role` **nunca** vai para o front-end. `VITE_APP_ENV` controla a faixa de aviso de ambiente (amarela em `development`/`preview`). Para rodar produção e testes em bancos separados, veja [`docs/guia-ambiente-testes.md`](docs/guia-ambiente-testes.md).

---

## Fluxo de trabalho (Git)

O projeto usa um fluxo **homologação-primeiro**:

1. Branch de trabalho parte da `homologacao` → merge com **Squash and merge**
2. Validação num ambiente de homologação dedicado
3. PR de promoção `homologacao → main` com **Create a merge commit**
4. GitHub Action espelha `main → homologacao` automaticamente

PRs de documentação pura vão direto para `main` (sem passar pela homologação).

---

## Decisões técnicas

### RLS — Row Level Security
Todas as tabelas têm políticas RLS ativas. Usuários autenticados podem ler; escrita exige `service_role` (usada apenas nos scripts de importação).

### Criação de usuários internos via `SECURITY DEFINER`
O Supabase Auth rejeita domínios sem MX válido (`@obras.app`). A solução usa uma função PostgreSQL com `SECURITY DEFINER` que insere diretamente em `auth.users`, contornando a validação de e-mail sem expor a `service_role`.

### Permissões por perfil de acesso
Controle fino de visibilidade de módulos e abas. Perfis são criados dinamicamente pelo admin; sem permissão, o elemento some da interface. Admin ignora perfis e enxerga tudo. RLS continua "qualquer autenticado lê" — a restrição por módulo no banco é trabalho futuro.

### Carga paginada automática do Sistema Geo
O Supabase tem limite de 1.000 linhas por request. `fetchAll()` em `src/lib/supabase.js` pagina em ondas de 8 páginas paralelas, para por esgotamento (não pelo `count`, que pode vir subestimado em tabelas grandes), com retry e timeout por requisição.

### Fuso horário explícito
Todos os timestamps passam por `fmtDataHora()` / `fmtDataSP()` em `src/lib/aggregations.js`, que força `America/Sao_Paulo` — necessário porque o Supabase armazena em UTC e o JavaScript sem fuso explícito gera divergências.

### Upload de emergências em lote
`DELETE` total + `INSERT` em lotes, em vez de upsert linha a linha. Garante que dados obsoletos não persistam; inclui pré-visualização obrigatória antes de confirmar. Upload auxiliar de posicionamento de obras complementa o principal.

### Listagem de processos por ação explícita
As abas de busca/listagem de processos (Fiscalização, Sistema Geo, Análise Integrada, Emergências) só montam a tabela quando o usuário clica em **"Filtrar"** ou digita um número. Isso evita travar o sistema ao selecionar permissionárias com muitos registros.

### Lógica pura separada da UI
A lógica de negócio do módulo Emergências vive em `src/lib/emergencias.js`; os componentes em `src/components/tabs/emerg/` consomem apenas o que precisam. `PaginaEmergencias.jsx` é um orquestrador de ~280 linhas.

---

## Uso de Inteligência Artificial

Este projeto foi desenvolvido em colaboração com o **Claude** (Anthropic), utilizado como assistente de engenharia ao longo de todo o processo.

O Claude contribuiu com:
- Arquitetura de componentes, queries SQL e políticas RLS
- Debugging de comportamentos inesperados (paginação, fuso horário, upload, carga)
- Refatorações de lógica de agregação, filtros e exportação
- Criação e manutenção da documentação do projeto

Todos os commits com contribuição de IA incluem o trailer `Co-Authored-By: Claude <noreply@anthropic.com>`.

O código foi revisado, testado e validado manualmente antes de cada deploy em produção.

---

## Lições aprendidas

- **RLS desde o dia 1.** Adicionar políticas depois de popular tabelas grandes exige mais cuidado; definir antes poupa retrabalho.
- **Fuso horário tem que ser explícito.** JavaScript converte UTC para o fuso local silenciosamente — `America/Sao_Paulo` deve ser forçado em todo display de data.
- **Paginação automática é obrigatória no Supabase.** O limite de 1.000 linhas não gera erro — retorna dados incompletos silenciosamente.
- **`count` do Supabase pode ser subestimado.** Em tabelas grandes, usar para barra de progresso apenas; parar por esgotamento (última página < 1.000 linhas), nunca pelo count.
- **Commit deferido para não travar a UI.** Após `setState`, trabalho síncrono pesado (ordenar 175k objetos, serializar cache) deve ir para `setTimeout(0)` para o React renderizar o spinner antes de bloquear a thread.
- **Usuários internos e auth corporativa não combinam por padrão.** O Supabase não aceita domínios sem MX — resolvido com função `SECURITY DEFINER`.

---

## Estrutura do projeto

```
dashboard-obras-cidade/
├── src/
│   ├── App.jsx                    # Layout raiz, estado global, navegação
│   ├── components/
│   │   ├── charts/                # Recharts e Leaflet (donut, barra, linha, mapa)
│   │   ├── tabs/
│   │   │   ├── emerg/             # Componentes do módulo Emergências (9 arquivos)
│   │   │   └── (Pagina*.jsx)      # Orquestradores de cada módulo
│   │   └── (ExportModal, Header, AdminPanel…)
│   ├── lib/
│   │   ├── supabase.js            # Cliente + fetchAll paginado
│   │   ├── auth.js                # Login / logout / sessão
│   │   ├── aggregations.js        # KPIs, rankings, filtros, formatação de datas
│   │   ├── emergencias.js         # Lógica pura do módulo Emergências
│   │   ├── datas.js               # toIsoDate unificado (usado pelos 3 importadores)
│   │   ├── permissoes.js          # RPC minhas_permissoes + catálogo de permissões
│   │   └── exportarXLSX.js        # Export genérico via SheetJS
│   └── data/
│       └── subprefeituras-sp.geojson
├── .github/workflows/
│   └── espelhar-main-homologacao.yml  # Espelha main → homologacao após cada promoção
├── supabase/                      # Scripts SQL (schema, policies, fixes, seed)
└── docs/                          # Documentação técnica do projeto
```

---

## Licença

Este é um espelho público, com fins de portfólio, de um projeto cujo código-fonte original é de uso interno da Prefeitura de São Paulo. Nomes, dados e identificadores foram anonimizados conforme descrito no início deste README.

---

<sub>Desenvolvido por Nicolas Rosseto · Co-Authored-By: Claude (Anthropic)</sub>
