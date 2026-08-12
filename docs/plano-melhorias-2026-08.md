# Plano de execução — melhorias de agosto/2026

> ✅ **CONCLUÍDO em 12/08/2026** — as 4 frentes foram implementadas e estão em
> **produção** (promoção final PR #437). Detalhe de cada entrega em
> `docs/progresso.md` (seções "Apresentação — Frente 1/2", "Multas — Frente 3",
> "Identidade visual — Frente 4a/4c"). A única parte deliberadamente fora de
> escopo foi a **PR 4b (cores)** — o usuário decidiu manter a paleta atual
> (navy/red). Este arquivo fica como **registro histórico** do planejamento;
> não editar para novas tarefas — abrir um plano novo se precisar.
>
> **Escrito em 31/07/2026** a pedido do usuário, para ser **executado na próxima
> sessão (pelo Sonnet)**. Cada frente é independente e virou **1 ou mais PRs
> próprios** — não misturar frentes no mesmo PR.
>
> **Antes de começar qualquer frente:** rodar o protocolo de startup do `CLAUDE.md`
> (autoria git, auditoria de pendências, leitura das regras) e criar a branch a
> partir da `homologacao`. Todas as frentes mexem em **código/interface** → fluxo
> normal (PR → `homologacao` → validação → promoção), e a **pergunta do mirror
> público** é obrigatória na entrega (regra da seção 2 do `CLAUDE.md`).

## Ordem sugerida de execução

| # | Frente | Tamanho | Depende de |
|---|---|---|---|
| 1 | Apresentação — 6 ajustes pontuais (já registrados) | médio | — |
| 2 | Indicador de completude de dados ("dado parcial") | **grande** | — |
| 3 | Multas — sem processo / processo inexistente | médio | — |
| 4 | Identidade visual PMSP (layout) | grande | ideal depois da 1 e 2 |

Motivo da ordem: as frentes 1 e 2 mexem nos **mesmos arquivos** (`relatorio.js` +
`SlideRenderer.jsx`) — fazer a 1 primeiro (que **remove** slides e elementos)
evita escrever indicador de completude para slide que vai sumir. A frente 4
(visual) mexe em cor/tipografia de tudo e conflita com qualquer PR aberto, então
vai por último.

---

# FRENTE 1 — Apresentação: 6 ajustes pontuais

Já registrados em `docs/plano-melhoria-2-apresentacao.md`, seção "Melhorias
visuais/dados registradas em 31/07/2026" (PR #423). **Ler lá o detalhe**; abaixo
só o resumo executivo e o que ficou pendente de decisão.

1. Slide 7 — remover o KPI manual "Usuários cadastrados no Sistema Geo".
2. Slide 9 — legenda do donut ao **lado** do gráfico, não abaixo.
3. Slides 12/13/29/30 — rótulo de dado sobrepondo a legenda (barra dupla).
4. Remover a ilustração genérica (`MapaGenericoSP`) das capas e dos slides
   18/33/38/39; no 33, `IconeGenerico` por tipo de falha.
5. Slides 8 e 20 — remover os cards "X anos e Y meses de Sistema Geo / de Controle
   Tecnológico" (`painelTexto`).
6. Remover o slide 33 e os slides 45 em diante (45–52).

## ⚠️ Duas perguntas a fazer ao usuário ANTES de executar a frente 1

- **Item 6 — o slide 52 é o encerramento** ("OBRAS — OBRIGADO!"). Removendo
  "45 em diante", a apresentação passa a terminar no slide 44 (GT de
  Planejamento NORCREST/WINSLOW). Confirmar: é isso mesmo, ou o encerramento deve
  ser mantido/movido?
- **Item 4 vs. item 6 — o slide 33 aparece nos dois** (item 4 pede para tirar a
  imagem dele; item 6 pede para remover o slide inteiro). Como o 6 remove o
  slide, o trecho do item 4 sobre o 33 fica sem efeito. Confirmar que o slide 33
  sai mesmo — se sair, o item 4 se resume a `MapaGenericoSP` nas capas + 18/38/39.

---

# FRENTE 2 — Indicador de "dado parcial" nos slides

## O problema (pedido do usuário)

> "Existem slides que possuem informações parciais no sistema. Como a análise por
> classificação viária. (…) adicione no slide uma informação dizendo que nem
> todos os dados sobre essa informação estão na base. Se possível coloque até a %
> de dados preenchidos em relação ao total de registros."

Hoje o slide mostra o gráfico como se a base fosse completa. Quando o campo que
alimenta a análise está vazio em parte das linhas, essas linhas **somem
silenciosamente** do gráfico — e quem lê a apresentação não tem como saber que
o número não cobre 100% da base.

O caso do usuário (classificação viária) é o mais grave porque a função
`classificacaoViaria` (`relatorio.js`) filtra por `LOCAL`/`COLETORA`/`ARTERIAL`:
qualquer linha com o campo vazio — ou com um valor fora desses três — não
aparece em **nenhum** dos 3 grupos, sem aviso nenhum.

## Levantamento — slides afetados e o campo de cada um

Levantamento feito lendo `resolverDadosSlide` (`src/lib/relatorio.js`) e as
funções de `src/lib/aggregations.js` que ele chama. Coluna "comportamento hoje"
diz o que acontece com a linha cujo campo está vazio.

### 🔴 Prioridade alta — a linha SOME da análise, sem aviso

| Slide | Agregação | Campo que pode faltar | Comportamento hoje |
|---|---|---|---|
| **34** | `fisc_classificacao_viaria` | `classificacao_viaria` | **Some.** `classificacaoViaria()` só conta `LOCAL`/`COLETORA`/`ARTERIAL`; vazio ou valor diferente não entra em nenhum grupo. **É o caso citado pelo usuário.** |
| **21** | `fisc_avanco` | `data_inicio` | **Some.** `if (!r.data_inicio) continue` no loop do case. |
| **20.1** | `fisc_soluc_trimestral` | `data_conclusao` | **Some.** `evolucaoTrimestral` faz `if (!dataRef) continue`. |
| **10, 11, 14, 15, 16** | `geo_controle_mensal`, `geo_emerg_mensal`, `geo_autorizacoes_anual`, `geo_emerg_anual`, `geo_emerg_barra_anual` | `data_cadastro` | **Some.** `comparativoAnualPorMes` faz `if (!d) continue` (e descarta mês inválido). |
| **8, 12, 13** | `geo_por_permissionaria`, `geo_total_vs_emerg`, `geo_emerg_vs_corretiva` | `permissionaria` | **Some.** `if (!k) continue` após `consolidarNorcrest`. |
| **23, 24, 27, 28** | `fisc_metragem_norcrest`, `fisc_recomposicao*` | `area_m2` | **Conta como zero** (`Number(r.area_m2) \|\| 0`) — a linha entra na contagem de vias mas soma 0 m², **subestimando a área** e a economia estimada sem avisar. |

### 🟡 Prioridade média — a linha entra, mas num balde genérico

| Slide | Agregação | Campo | Comportamento hoje |
|---|---|---|---|
| **18, 38, 39** | `geo_por_regiao`, `fisc_por_regiao`, `fisc_andamento_por_regiao` | `subprefeitura` | Vira `'Não classificado'` (região) e `'(sem)'` (detalhe por subprefeitura). Já é visível, mas sem % explícito. |
| **9** | `geo_por_tipo_processo` | `tipo_processo_nome`/`tipo_processo` | Vira `'(sem tipo)'` e **cai dentro do bucket "Expansão/Implantação"** (é o catch-all). ⚠️ Isso **infla** a Expansão com linhas sem tipo — checar quantas são. |
| **16.1, 17, 31** | `geo_norcrest_por_unidade`, `emerg_norcrest_por_unidade`, `fisc_nc_vs_andamento_norcrest` | unidade da NORCREST | Vira `'NORCREST (s/ unidade)'`. Já visível como barra própria. |
| **7** | `geo_visao_geral` | `executora` | Vazio é filtrado do `Set` de executoras distintas — a contagem é de "executoras conhecidas", não do total. |

### ⚪ Não precisam de indicador

- Slides `texto`/`futuro` (não têm dado).
- **20, 29, 30, 32** — usam campos booleanos (`legislacao_atendida`,
  `tem_nao_conformidade`, `falha_*`). Booleano nulo é semanticamente "não", não
  "faltando" — **não tratar como dado parcial** (evita alarme falso em massa).
- **40, 41** (Multas) — a exclusão de "sem processo" já é declarada na tela; a
  frente 3 mexe justamente nisso.

## Implementação proposta

### 1) Função pura em `src/lib/relatorio.js`

```js
// Completude de um campo na base: quantas linhas realmente têm o dado.
// `preenchido` opcional para campos que não são "vazio simples"
// (ex.: classificação viária, onde só 3 valores contam como preenchidos).
export function completude(rows, campo, preenchido) {
  const total = (rows || []).length
  const ok = (rows || []).filter(
    preenchido || ((r) => r[campo] !== null && r[campo] !== undefined && String(r[campo]).trim() !== '')
  ).length
  return { preenchidos: ok, total, pct: total ? Math.round((ok / total) * 1000) / 10 : 0 }
}
```

- `pct` com 1 casa decimal (padrão `pct1` já existente no arquivo).
- `total === 0` → `pct: 0` (nunca dividir por zero).

### 2) Cada `case` afetado devolve `completude`

Adicionar ao objeto retornado, **só nos slides da tabela acima**:

```js
return {
  ...base,
  dados,
  colunas: [...],
  completude: completude(fisc, 'classificacao_viaria', (r) =>
    ['LOCAL', 'COLETORA', 'ARTERIAL'].includes(String(r.classificacao_viaria || '').trim().toUpperCase())
  ),
}
```

⚠️ Usar a **mesma base** que o slide de fato analisa (`fisc` filtrado pela
permissionária, ou `fiscAll`/`geoAll` nos slides NORCREST-específicos) — senão o %
não corresponde ao gráfico exibido.

### 3) Aviso no `SlideRenderer.jsx`

Um componente novo (`AvisoCompletude`), renderizado logo abaixo do cabeçalho do
slide, **só quando `pct < 100`**:

> ⚠️ **Dado parcial:** 68,4% dos registros têm classificação viária preenchida
> (53.412 de 78.088). Os demais não aparecem neste gráfico.

- Visual discreto, faixa âmbar (mesmo tom de `CATEGORIA.futuro` — o usuário já
  associa âmbar a "dado incompleto" no módulo).
- **Deve entrar na captura PNG** do slide (não usar `data-no-export`) — o aviso
  precisa aparecer na apresentação final, é o objetivo do pedido.
- Faixas sugeridas de severidade (a confirmar com o usuário): ≥99% não mostra
  nada; 90–99% mostra em cinza discreto; <90% em âmbar.

### 4) Testes (`src/tests/relatorio.test.js`)

- `completude` — campo cheio (100%), metade (50%), base vazia (0% sem
  divisão por zero), `preenchido` customizado.
- Um teste por slide de prioridade alta conferindo que `completude.pct` bate com
  a fixture.
- Manter as contagens de slides do seed alinhadas com o que a frente 1 remover.

### 5) ⚠️ Descobrir os números reais ANTES de prometer o texto

O levantamento acima é do **código**, não dos dados. Não sabemos ainda quanto de
cada campo está de fato vazio em produção. Rodar no banco (via MCP Supabase, que
**precisa de OAuth autorizado pelo usuário** — ver seção "Bloqueios") algo como:

```sql
select count(*) total,
       count(*) filter (where classificacao_viaria is null or btrim(classificacao_viaria) = '') vazio
from fiscalizacoes;
```

…para cada campo da tabela. Se um campo estiver 100% preenchido, **não vale**
gastar código com indicador nele. Se estiver muito vazio (ex.: <50%), vale
avisar o usuário antes — pode indicar problema de importação, não só "dado
parcial".

---

# FRENTE 3 — Multas: multas sem processo e processo inexistente

## O pedido do usuário

> "Preciso adicionar na visão geral a contagem das multas que não contêm
> processos. Descobri que é uma análise importante e que deve ser somada às
> demais multas e análises. E sobre a tabela de 'Processo inexistente' precisamos
> pensar também sobre o que fazer com ele depois. Talvez também precise
> adicioná-los à análise geral."

## Estado atual (levantado em `src/lib/multas.js` + `AbaMultasGeral.jsx`)

Cada multa recebe `_situacao_vinculo` (calculado em memória por `cruzarMultas`),
com 4 valores possíveis:

| Situação | Significado | Entra na Visão Geral hoje? |
|---|---|---|
| `vinculado_sistemaGeo` | nº de processo bate com o Sistema Geo | ✅ sim |
| `vinculado_fiscalizacao` | bate com a Fiscalização | ✅ sim |
| `processo_nao_encontrado` | **tem** nº de processo, mas não bate com nenhuma base | ✅ sim |
| `sem_processo` | a planilha não trouxe nº de processo | ❌ **não** — `excluirSemProcesso` |

`excluirSemProcesso` (`multas.js`) é aplicada uma vez em `AbaMultasGeral.jsx`
(`linhasValidas`) e alimenta **todos** os KPIs e gráficos da Visão Geral, além
dos slides 40/41 da Apresentação (onde a mesma regra foi reescrita como
`excluirMultasSemProcesso` — **por causa do ciclo de import**, ver `dominio.md`).

Ou seja: hoje **só `sem_processo` fica de fora**. `processo_nao_encontrado` já
está dentro da análise geral.

## O que fazer

⚠️ **Este é o ponto do plano que mais precisa de decisão do usuário antes de
codar** — o pedido tem duas leituras possíveis e elas levam a resultados bem
diferentes. **Perguntar antes de implementar:**

**Pergunta A — "somar às demais análises" quer dizer o quê?**
1. **Incluir `sem_processo` em tudo** (remover `excluirSemProcesso` da Visão
   Geral): os KPIs Total/Valor/Área passam a cobrir 100% da planilha. Simples,
   mas quebra a comparabilidade com os números que ele já viu/apresentou, e
   volta atrás numa decisão tomada em 16/07/2026 (registrada em `dominio.md`:
   "não representam obra/processo real a acompanhar").
2. **Mostrar os dois números lado a lado** (recomendado): os KPIs atuais
   continuam como estão (base analisável) e ganham um KPI/linha extra "Multas
   sem processo: N (R$ X · Y m²)", além de um total geral. Ninguém perde o
   número antigo e o dado novo fica visível.
3. **Um seletor na tela** ("incluir multas sem processo: sim/não") que
   recalcula tudo. Mais flexível, mais trabalho, e cria a dúvida de qual é "o"
   número oficial ao exportar.

**Pergunta B — o que fazer com "Processo inexistente"?** Ele já entra na análise
geral. As opções aqui são sobre *visibilidade*, não sobre inclusão:
1. Deixar como está e só documentar.
2. Adicionar um KPI próprio na Visão Geral (hoje os 4 cards de vínculo vivem
   **exclusivamente** dentro da seção "Verificar inconsistências" da aba Lista —
   decisão de 16/07/2026, que este pedido parcialmente reverte).
3. Criar um acompanhamento ao longo do tempo (ex.: gráfico "processos
   inexistentes por mês") para mostrar se o problema está crescendo ou sendo
   corrigido na planilha de origem.

### Implementação (assumindo a opção 2 da pergunta A — a recomendada)

1. **`src/lib/multas.js`** — nova função `resumoMultasPorVinculo(linhas)`
   devolvendo, para cada situação de vínculo, `{ qtd, valor, area }`
   (reaproveitando `agruparPorVinculo`, `valorTotalMultas` e `areaTotalMultas`,
   que já existem). Sem duplicar a lógica de soma.
2. **`AbaMultasGeral.jsx`** — abaixo da faixa de KPIs atual, um bloco
   "Composição da base" com: analisáveis (o que os KPIs mostram) · sem processo ·
   processo inexistente · **total geral**. Substituir o texto solto de hoje
   ("Não conta multas sem número de processo…", linhas 164–167) por esse bloco.
3. **Export** — o botão de export da Visão Geral deve levar o mesmo recorte que a
   tela mostra (conferir `BotaoExportarGrafico`/`ExportModal`; se os KPIs mudarem
   de escopo, o export precisa acompanhar).
4. **Apresentação (slides 40/41)** — se o número da Visão Geral mudar, os slides
   têm que mudar junto, senão a apresentação institucional diverge da tela.
   ⚠️ **Não importar de `multas.js` dentro de `relatorio.js`** (ciclo de import
   → +38 kB no bundle principal; lição registrada em `dominio.md`, 29/07/2026) —
   manter a reescrita local, como já está hoje.
5. **Testes** (`src/tests/multas.test.js`) — `resumoMultasPorVinculo` com as 4
   situações, incluindo o caso de base vazia e o de multa sem `valor`/`area_m2`.

---

# FRENTE 4 — Identidade visual da Prefeitura de São Paulo

> Baseado no **"Guia de Estilo Visual — Prefeitura de São Paulo"** (195 páginas)
> e no arquivo de logo, enviados pelo usuário em 31/07/2026. Pedido explícito:
> **"uma melhoria no layout, mas sem tantas mudanças drásticas"** — ou seja,
> alinhar a identidade **sem** refazer as telas.

## O que o guia define (extraído das páginas relevantes)

### Marca (págs. 13–23)
- Duas versões oficiais: **vertical** (brasão acima, texto abaixo) e
  **horizontal** (brasão à esquerda, texto à direita). Existe versão com a
  **tagline "Aqui o trabalho não para."**.
- **Área de arejamento: 20% da largura da marca** em todos os lados — nenhum
  elemento gráfico pode invadir.
- **Usos incorretos (pág. 15):** não reduzir abaixo do tamanho mínimo, não
  rotacionar, não alterar proporção, não aplicar cores fora da paleta do guia,
  não usar sobre fundo sem contraste, não usar a marca incompleta.
- Aplicações monocromáticas (branco/preto) são válidas sobre fundos de 10% a
  100% de cinza (pág. 14).

### Cores (págs. 34–35)
O guia organiza a paleta **por área temática**, cada uma com 2 tons. As
relevantes para o OBRAS (departamento da Secretaria das Subprefeituras):

| Área | Tom 1 | Tom 2 |
|---|---|---|
| **OBRAS** | verde-oliva escuro | verde claro |
| **ZELADORIA** | `#F46403` | `#FFC285` |
| **URBANISMO** | `#0A328D` | `#5CCABD` |
| **GESTÃO** | `#03989E` | `#46C8CD` |
| **SEGURANÇA** | `#157FCE` | `#002D4F` |
| **SEHAB** | `#104F82` | azul médio |

⚠️ **Três inconsistências reais no PDF** (achadas ao cruzar a pág. 34 com a 35 —
registrar e **perguntar ao usuário** antes de usar qualquer uma delas):
1. **OBRAS** — os swatches da pág. 34 são **verdes**, mas os códigos impressos na
   pág. 35 dizem `#CE9EE9`/`#F5E1FF` (lilás) — são os mesmos códigos de
   ACESSIBILIDADE, aparentemente copiados por engano. **Os hex do verde de OBRAS
   não constam no guia.**
2. **SEHAB (2º tom)** — hex impresso `#FF8DCC` (rosa), mas o RGB ao lado é
   `R66 G143 B204` = `#428FCC` (azul) e o swatch é azul. O **RGB** é o correto.
3. **MUDANÇAS CLIMÁTICAS (2º tom)** — hex `#5FE084` (verde, bate com o swatch),
   mas o RGB `R95 G24 B132` é roxo. O **hex** é o correto.

**Descompasso com a paleta atual do dashboard:** hoje o sistema usa
`navy #1F3864` + `red #C00000` (`@theme` do `src/index.css`), que **não existem
no guia**. Os azuis institucionais do guia mais próximos são `#002D4F`,
`#0A328D` e `#104F82`.

### Tipografia (págs. 36–37)
- Fonte oficial: **Axiforma** (Thin → Heavy). Títulos em **itálico** (SemiBold
  Italic / Bold Italic / ExtraBold Italic / Black Italic / Heavy Italic); corpo
  de texto nos pesos romanos.
- ⚠️ **Axiforma é uma fonte comercial paga** (fundição Kastelov) — **não pode ser
  simplesmente baixada e servida** pelo Vercel sem licença de webfont. Isso é um
  **bloqueio real** desta frente, não um detalhe: ou o usuário confirma que a
  Prefeitura tem licença web (e fornece os arquivos), ou usamos uma alternativa
  livre visualmente próxima. Sugestões (Google Fonts, geométricas): **Manrope**,
  **Poppins**, **Figtree**. Recomendo **Manrope** (proporções e terminais mais
  próximos do Axiforma, e tem os pesos necessários).

## Escopo proposto (deliberadamente conservador)

O usuário pediu "sem mudanças drásticas". Proposta: **3 PRs pequenos e
reversíveis**, nesta ordem, validando cada um antes do seguinte.

**PR 4a — Tipografia**
- Adicionar a fonte escolhida (self-hosted via `@font-face`, arquivos no
  `public/` — **não** usar CDN do Google Fonts: a CSP do projeto e o modo demo
  não devem depender de rede externa).
- Aplicar no `@theme`/`body` do `src/index.css`; manter tamanhos e pesos atuais.
- Títulos de módulo/slide podem receber o itálico institucional — avaliar caso a
  caso, **sem** aplicar itálico em tabela ou corpo de texto (prejudica leitura de
  dado numérico).
- Risco baixo, efeito visível imediato.

**PR 4b — Cores**
- Ajustar as 4 cores do `@theme` (`navy`, `navy-light`, `red`, `grey-bg`) para os
  valores oficiais mais próximos, **mantendo os mesmos nomes de token** — assim
  nenhum componente precisa mudar (a paleta já é centralizada em `index.css` +
  `src/lib/cores.js`, ver `dominio.md`).
- ⚠️ **Depende da decisão do usuário sobre qual área temática representa o
  OBRAS** (OBRAS? ZELADORIA? URBANISMO?). Sem essa resposta, não executar.
- ⚠️ **Verificar contraste (WCAG AA)** de cada troca sobre os fundos usados hoje
  — várias cores do guia são bem mais saturadas que a paleta atual, e texto
  branco sobre `#F46403` (laranja da Zeladoria), por exemplo, não passa em AA.
- ⚠️ **Cores de módulo** (teal da Apresentação, âmbar de Emergências, violeta da
  Análise Integrada, índigo do GT Obras, vermelho do Multas) foram escolhidas
  para **diferenciar módulos**, não por identidade institucional. Decidir com o
  usuário se elas migram para a paleta do guia ou ficam como estão (recomendo
  ficarem — trocá-las quebra o reconhecimento de módulo que já está consolidado).

**PR 4c — Marca**
- Substituir o logo atual pela versão oficial do arquivo enviado, respeitando a
  **área de arejamento de 20%** e o tamanho mínimo.
- Escolher vertical × horizontal por contexto (o cabeçalho do dashboard pede a
  **horizontal**).
- ⚠️ **O logo real NÃO vai para o mirror público** — `public/logos` está em
  `mirror/excluir.txt` de propósito. Conferir que o arquivo novo cai nesse mesmo
  caminho (ou adicionar o caminho novo ao `excluir.txt` **antes** do próximo sync).

## Fora de escopo (registrar como "não faremos agora")
- Refazer layout de telas, grids ou navegação.
- Aplicar a tagline "Aqui o trabalho não para." — é linguagem de campanha, não
  cabe num painel interno de gestão.
- Os capítulos de redes sociais (págs. 24–32) e o passo a passo do Canva
  (págs. 43–59) do guia: não se aplicam a este projeto.

---

# Bloqueios conhecidos e perguntas abertas

Consolidado do que **precisa de resposta ou ação do usuário** antes/durante a
execução:

| # | Frente | Pergunta / bloqueio |
|---|---|---|
| 1 | 1 | Removendo os slides 45+, a apresentação termina no 44 — e o slide de encerramento (52)? |
| 2 | 1 | O slide 33 sai inteiro (item 6) ou só perde a imagem (item 4)? |
| 3 | 2 | Faixas do aviso de completude: mostrar sempre que <100%, ou só abaixo de 90%? |
| 4 | 2 | **MCP Supabase precisa de OAuth autorizado** para medir o preenchimento real dos campos. Em sessão web não-interativa o login não dispara. Sem isso, dá para implementar o indicador (ele calcula em memória, no navegador), mas **não** dá para saber de antemão quais campos valem a pena. |
| 5 | 3 | Como "somar" as multas sem processo: incluir em tudo, mostrar lado a lado (recomendado) ou seletor? |
| 6 | 3 | "Processo inexistente" — manter só nas inconsistências, promover a KPI da Visão Geral, ou criar acompanhamento temporal? |
| 7 | 4 | **Licença da fonte Axiforma** (paga). Tem licença web? Senão, aprova a substituta livre (recomendo Manrope)? |
| 8 | 4 | Qual área temática do guia representa o OBRAS: OBRAS, ZELADORIA ou URBANISMO? |
| 9 | 4 | Os hex do verde de **OBRAS** não constam no guia (a pág. 35 repete os códigos de ACESSIBILIDADE por engano). Se a escolha for OBRAS, precisamos dos códigos corretos. |
| 10 | 4 | As cores por módulo (teal/âmbar/violeta/índigo/vermelho) mudam para a paleta do guia ou permanecem? |

---

# Checklist obrigatório em cada PR destas frentes

Da regra do projeto (`CLAUDE.md` §2 + `.claude/rules/github.md`):

- [ ] Branch criada a partir da `homologacao`, nome descritivo em pt-br.
- [ ] `npm test` + `npm run lint` + `npm run build` (com `.env.local` dummy).
- [ ] ⚠️ **Não rodar `npm run format` puro.** Formatar só os arquivos tocados
      (`npx prettier --write <arquivos>`) — e, em `relatorio.js`/
      `relatorio.test.js`, **nem isso**: esses dois têm objetos literais em
      estilo denso manual e o Prettier reformata o arquivo inteiro, inflando o
      diff em ~1.400 linhas (aconteceu em 31/07/2026 — ver diário de bordo).
      Conferir `git diff --stat` antes de commitar.
- [ ] Tour guiado atualizado se a PR criou/alterou tela, aba, botão ou gráfico
      (`data-tour` + `src/lib/toursConteudo/` + `src/tests/tour.test.js`).
- [ ] `docs/progresso.md` e `docs/diario-de-bordo.md` atualizados **no mesmo PR**.
- [ ] Avisar explicitamente no chat que a PR está **pronta e aguardando merge**.
- [ ] 🪞 **Perguntar sobre o mirror público** (todas estas frentes mexem em
      código/interface).
