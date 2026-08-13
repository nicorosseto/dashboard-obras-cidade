# CLAUDE.md — Memória do Projeto OBRAS Dashboard

> Este arquivo é lido automaticamente pelo Claude Code no início de cada
> sessão de trabalho neste repositório — funciona como a "memória de longo
> prazo" do projeto: convenções, stack e fluxo de trabalho que o assistente
> deve seguir sem precisar ser lembrado a cada tarefa.
>
> Este é o repositório **público de portfólio**, sincronizado periodicamente
> a partir de um repositório privado (dados e histórico completo de decisão
> ficam lá). O conteúdo abaixo mostra como o projeto real é conduzido com
> apoio de IA — enxuto de propósito.

## Idioma

Todo o trabalho neste projeto — código, commits, documentação e comunicação
— é em **português do Brasil**. É o público-alvo real (setor público
brasileiro) e a convenção usada desde o início do projeto.

## O que é este projeto

Dashboard web de monitoramento de fiscalização de vias públicas,
infraestrutura urbana e emergências para uma secretaria municipal. Lê dados
de um banco na nuvem e apresenta em gráficos, mapas e tabelas. Seções
principais: **Fiscalização** (vias, recapes, termos), **Sistema Geo**
(infraestrutura por região) e o módulo **Emergências** (upload de planilha +
análise). Stack e estrutura de pastas: `@.claude/rules/arquitetura.md`.
Regras de domínio e particularidades do sistema: `@.claude/rules/dominio.md`.

## Convenções de trabalho

- **Branch de trabalho:** criada a partir de `homologacao`; nunca commit
  direto em `main`.
- **Nomes de branch:** prefixo de tipo (Conventional Commits) + descrição em
  pt-br kebab-case — `feat/`, `fix/`, `docs/`, `refactor/`, `chore/`,
  `perf/`. Exemplo: `feat/exportar-relatorio-pdf`.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/)
  em português, com trailer `Co-Authored-By: Claude <noreply@anthropic.com>`
  quando a mudança teve apoio do assistente.
- **Pull Requests:** descrição sempre explica o *porquê*, o *o quê* e o
  *como validar* — nunca uma PR com descrição vazia. Um PR por
  assunto/módulo, pequeno e revisável.
- **Segurança (inegociável):** nenhuma chave secreta do banco vai para o
  front-end nem é commitada. Só a chave pública (anon/publishable) pode
  aparecer no cliente.

## Fluxo de entrega (homologação → produção)

Todo código novo passa por um ambiente de teste antes de chegar à produção:

1. PR de trabalho com base em `homologacao` → **squash and merge**.
2. Validação manual no ambiente de homologação (URL fixa de preview).
3. Aprovado → PR de promoção `homologacao` → `main`, com **merge commit**
   (nunca squash — squash faria as branches divergirem).
4. O ambiente de homologação é realinhado automaticamente com `main` após
   a promoção (GitHub Action).

Exceção: mudanças **só de documentação** (sem código, banco ou interface)
podem ir direto para `main` — não há nada para validar em homologação.

## Manutenção da documentação

Ao final de uma tarefa, os documentos afetados são atualizados no mesmo PR:
visão geral do produto (`docs/prd.md`) se mudou escopo; regras de
arquitetura/domínio se mudou stack ou comportamento de negócio. Manter a
documentação viva é parte de "terminar" a tarefa, não um passo opcional.
