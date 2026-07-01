# PRD — Documento de Requisitos do Produto · OBRAS Dashboard

> **O que é este documento.** Um PRD (*Product Requirements Document*) descreve
> **o que** o produto é e **por quê** — visão, usuários, objetivos, escopo e
> requisitos. É o documento mais estável do projeto (muda pouco). Ele complementa,
> mas não substitui:
> - `docs/progresso.md` — *onde estamos* (status de execução, muda toda hora);
> - `CLAUDE.md` + `.claude/rules/` — *como trabalhar* (regras operacionais);
> - `docs/plano-de-acao.html` — roteiro visual interativo.
>
> **Versão:** 1.0 · **Data:** 10/06/2026 · **Estágio:** Piloto / validação.

---

## 1. Visão geral

O **OBRAS Dashboard** é um painel web interno que transforma planilhas de
fiscalização de vias públicas em **gráficos, mapas e tabelas**, para a equipe da
**OBRAS** (Departamento de Controle e Uso de Vias Públicas, da Secretaria das
Subprefeituras da Prefeitura de São Paulo) acompanhar obras, emergências e
infraestrutura urbana e tomar decisões com base em dados.

**Frase-resumo:** *"Tirar os dados das planilhas soltas e colocá-los, vivos e
visuais, num só lugar — para enxergar, decidir e cobrar mais rápido."*

## 2. Problema

Os dados de fiscalização viviam **dispersos em planilhas Excel**, exportadas de
sistemas diferentes (SEI, Sistema Geo, etc.). Isso gerava três dores:

1. **Fragmentação** — cada análise exigia abrir e cruzar planilhas manualmente.
2. **Lentidão** — transformar planilha em informação visual era trabalhoso e
   demorado, atrasando decisões.
3. **Dificuldade de acompanhamento** — monitorar o andamento das obras e cobrar
   as permissionárias (empresas) dependia de garimpo manual.

## 3. Usuários e perfis de acesso

**Público:** equipe **interna** da OBRAS. Não há (por ora) acesso externo.

| Perfil | Quem é | O que pode fazer |
|---|---|---|
| **Admin** | Responsáveis pelo sistema (incl. o usuário mestre) | Tudo: ver todos os módulos, gerenciar usuários, subir planilhas, configurar. |
| **User** | Demais membros da equipe | Acesso **configurável por módulo** — cada usuário recebe do admin o conjunto de módulos que pode ver (definido caso a caso). |

**Login:** por **username/nickname** (sem e-mail), criado pelo admin. O único
acesso por e-mail é o **usuário mestre**. Não há cadastro público. Detalhes
operacionais de autenticação em `.claude/rules/dominio.md`.

> A matriz fina de permissões (quais módulos/ações por usuário) é detalhada e
> implementada na etapa **A3** do roadmap.

## 4. Objetivos e métricas de sucesso

**Objetivos do produto:**
- **O1** — Centralizar dados dispersos num só painel.
- **O2** — Agilizar a decisão com visão visual (gráficos/mapas no lugar de planilhas).
- **O3** — Acompanhar e cobrar as permissionárias (status, prazos, volumes por empresa).

**O que define o sucesso do piloto** (todos importam):
- **Confiabilidade dos dados** — números corretos, sem "furos"; confiança total
  no que a tela mostra.
- **Facilidade de uso** — a equipe usa sem treinamento: sobe planilha e lê os
  gráficos sozinha.
- **Rapidez** — menor tempo entre "ter a planilha" e "ter a análise pronta".
- **Profundidade** — análises mais ricas (cruzamentos, histórico, novos
  indicadores) que hoje não existem.

## 5. Escopo — módulos

O sistema tem duas grandes seções no cabeçalho (**Fiscalização** e **Sistema Geo**)
mais o módulo de **Emergências**.

### 5.1 Fiscalização
Fiscalizações de vias, recapes e termos. Gráficos gerais, temporais, espaciais
(mapa) e detalhamento.

### 5.2 Sistema Geo
Processos de licenciamento de obras na via pública (~175 mil processos), por
subprefeitura. O **número do processo** é a **chave central** do sistema — é por
ele que análises futuras de outras planilhas serão conectadas (ver §8).
Visões: geral (tipos, permissionárias, status), temporal e por subprefeitura.

### 5.3 Emergências
Upload de planilha Excel + análise das emergências informadas. Guarda
**histórico de uploads** (quem subiu, quando, totais) — modelo a ser replicado
para os outros módulos (etapas D1/D2).

## 6. Fora de escopo (o que o sistema NÃO fará)

Definido com o dono do produto para manter o foco:

- **Não edita dados à mão.** O sistema **importa planilhas** e analisa; ninguém
  digita/corrige um registro individual na tela. Se um dado está errado,
  corrige-se **na planilha** e sobe de novo. **A planilha é a fonte da verdade.**
- **Não substitui os sistemas-fonte.** Ele **lê** dados exportados de outros
  sistemas (SEI, Sistema Geo…); é um painel de análise, não o sistema onde os dados
  nascem.
- **Sem acesso público/externo.** 100% interno da equipe OBRAS — sem login
  para permissionárias ou cidadãos.
- **Sem app de loja (iOS/Android).** É web, responsivo no navegador (inclusive
  celular), mas não haverá aplicativo instalável.

## 7. Requisitos

### 7.1 Funcionais (o que o sistema faz)
- **RF1** — Autenticação por username (admin cria contas; sem cadastro público).
- **RF2** — Perfis admin/user, com acesso por módulo configurável pelo admin.
- **RF3** — Importar planilhas Excel (Emergências hoje; Sistema Geo e Fiscalização
  pela tela nas etapas D1/D2), com validação de formato/colunas e relatório de
  divergências antes de confirmar.
- **RF4** — Visualizar dados em gráficos (Recharts), mapa choropleth de SP
  (Leaflet) e tabelas, com filtros (período, permissionária, subprefeitura, status).
- **RF5** — Exportar dados/relatórios em Excel.
- **RF6** — Registrar histórico/auditoria de uploads (quem, quando, totais).
- **RF7** — Gerenciar usuários (criar, ativar/desativar, redefinir senha, papel).

### 7.2 Não-funcionais (como o sistema se comporta)
- **RNF1 — Segurança:** RLS no Supabase; leitura exige login; segredos nunca no
  front nem no Git; chave `service_role` só em ambiente protegido. (Ver §6 do
  `CLAUDE.md`.)
- **RNF2 — Dois ambientes:** **produção** (`dashboard-obras-cidade.vercel.app`,
  branch `main`) e **homologação** (`homolog-dashboard-obras-cidade.vercel.app`,
  branch `homologacao`, banco `obras-dev`), com faixa visual de aviso fora da
  produção.
- **RNF3 — Idioma:** interface e conteúdo em **português do Brasil** (o público
  é o setor público brasileiro).
- **RNF4 — Volume:** suportar bem ~175 mil registros do Sistema Geo (paginação,
  uploads em lotes).
- **RNF5 — Fuso horário:** datas sempre em `America/Sao_Paulo`.
- **RNF6 — Usabilidade:** pop-ups exigem confirmação manual; nada some por timer.

## 8. Arquitetura de dados (resumo)

- **Banco:** Supabase (PostgreSQL). Tabelas principais: `sistemaGeo`,
  `emergencias` (+ `emergencias_snapshots`), fiscalizações, e as de auth
  (`profiles`, `access_logs`).
- **Chave central de análise:** o **número do processo** do Sistema Geo. A visão de
  futuro é subir **novas planilhas** com mais informações que se **ligam pelo
  número do processo**, ampliando as análises sem refazer a base (etapa **D3**).
- **Bibliotecas mestras** (fonte da verdade no banco):
  - `subprefeituras` (32) e `distritos` (96) — `04-subprefeituras.sql` (etapa
    **B1**); distritos guardados para análises futuras.
  - `status_sistemaGeo` (47 status → nome legível + grupo) e `status_grupos` —
    `05-status-sistema-geo.sql` (etapa **B2**), substituindo os dicionários antes
    "chumbados" no notebook. Editável/expansível; a classificação de status
    novos na hora do upload entra no **D1**.

## 9. Roadmap

O roadmap detalhado e priorizado (itens A1–D3) vive no **Backlog de ajustes** em
`docs/progresso.md`, que é a fonte viva de status. Resumo dos blocos:

- **Bloco A — Segurança e acesso:** login obrigatório no Sistema Geo (✅), login
  simplificado (✅), permissões por perfil (A3).
- **Bloco B — Dados mestres:** bibliotecas de subprefeituras (B1) e de status (B2).
- **Bloco C — UX de análise:** filtros por status unificado (C1), mapa interativo
  estilo Power BI (C2), ajustes de gráficos/alertas (C3).
- **Bloco D — Entrada de dados:** upload de Sistema Geo (D1) e Fiscalização (D2)
  pela tela, e modelo para futuras planilhas ligadas pelo processo (D3).

## 10. Premissas e decisões

- O projeto está em **piloto/validação**: foco em estabilizar, profissionalizar e
  ampliar análises antes de virar oficial para toda a equipe.
- Decisões estruturais (visibilidade do repo, convenções, ambientes, login) estão
  registradas em `docs/progresso.md` (seção "Decisões já tomadas") e no `CLAUDE.md`.
- Este PRD deve ser **revisado** quando houver mudança de visão, novos perfis de
  usuário, ou entrada de público externo no escopo.
