# Edge Functions (Supabase)

Esta pasta guarda o código das **Edge Functions** do projeto — funções
serverless que rodam no runtime **Deno** do Supabase (fora do site, fora do
front-end). Diferente do `supabase/schema/` (SQL rodado manualmente no SQL
Editor), Edge Functions são **implantadas** (deploy) no painel do Supabase.

> ⚠️ O usuário trabalha 100% pelo navegador (sem terminal local) — por isso
> os passos abaixo usam o **editor de funções do painel do Supabase**
> (Edge Functions → Deploy a new function → colar o código), não a CLI
> (`supabase functions deploy`).

## `sync-multas` (Trilha A — módulo Multas)

Baixa a planilha "CONTROLE DE AÇÕES FISCAIS - OBRAS / CORBETT" (Google
Drive, `.xlsx`) via Google Drive API, faz o parsing (parser seletivo
próprio, sem SheetJS — ver comentário no topo do `index.ts`) e grava
(upsert) em `public.multas`. Dashboard é **READ-ONLY**: esta função é o
único caminho de escrita da tabela.

### 1. Rodar o SQL antes (nos dois bancos, NESTA ORDEM)

1. `supabase/schema/21-multas.sql` — cria as tabelas `multas` e
   `multas_sync_config`.
2. `supabase/fixes/multas-indice-unico-auto-multa.sql` — índice único de
   `auto_multa` (parcial → total; upsert do PostgREST exige índice total).
3. `supabase/fixes/multas-chave-sintetica-sem-auto.sql` — coluna
   `chave_sintetica` (chave de upsert para linhas sem `auto_multa`, A2).
4. `supabase/schema/22-multas-ui.sql` — permissões do catálogo do módulo
   (`multas.ver`, `multas.aba_inconsistencias`, `multas.aba_busca`,
   `multas.atualizar`) + concede as de visualização ao perfil "Visualização
   completa".
5. `supabase/schema/23-multas-inconsistencias-nota.sql` — opcional, só
   atualiza nome/descrição da permissão `multas.aba_inconsistencias` no
   catálogo (sem impacto funcional).

**Status:** os 5 itens já rodaram no **obras-dev**. **Nenhum rodou em
produção ainda** — é o primeiro passo da promoção do módulo.

### 2. Cadastrar o secret (nos dois projetos Supabase)

Painel do Supabase → projeto (obras-dev, depois o de produção) → **Edge
Functions** (menu lateral) → aba **Secrets** → **Add new secret**:

- **Nome:** `GOOGLE_SERVICE_ACCOUNT_JSON`
- **Valor:** o conteúdo **inteiro** do arquivo JSON da conta de serviço
  `obras-multas-leitor` (baixado do Google Cloud Console no A0) — copiar e
  colar o JSON completo, entre chaves `{...}`.

⚠️ **Nunca** colar esse JSON em chat, commit ou qualquer arquivo do
repositório — só no campo de secret do Supabase (que é criptografado e não
aparece de novo depois de salvo).

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` **não** precisam ser
cadastrados — o runtime das Edge Functions já injeta os dois
automaticamente.

**Status:** cadastrado no **obras-dev**. **Falta cadastrar em produção.**

### 3. Implantar a função

Painel do Supabase → **Edge Functions** → `sync-multas` já existir →
substituir o conteúdo pelo `index.ts` atual → **Deploy** (ou "Deploy a new
function" se for a primeira vez no projeto).

**Status:** implantada no **obras-dev**, já com o fix de CORS (16/07/2026
— sem ele, o botão "Atualizar agora" da UI falha com "Failed to send a
request to the Edge Function", pois o navegador manda um preflight OPTIONS
que a função precisa responder). **Falta implantar em produção.**

⚠️ **Regra geral: sempre que o código de uma função mudar, ela precisa ser
REIMPLANTADA** — subir o código no repositório (merge do PR) não atualiza
sozinho a função rodando no Supabase. É um passo manual, sempre.

### 4. Testar manualmente (antes do cron)

Painel do Supabase → **Edge Functions** → `sync-multas` → botão **Invoke**
(ou copiar a URL da função e abrir com `?force=1`, ex.:
`https://<ref>.supabase.co/functions/v1/sync-multas?force=1`, com o header
`Authorization: Bearer <service_role key>` — o painel de Invoke já monta
isso). Conferir a resposta JSON (`executado: true`, `com_processo`/
`sem_processo`, `com_chave`/`sem_chave`) e depois olhar a tabela `multas` no
**Table Editor**.

Ou, mais simples: pelo próprio dashboard, módulo Multas → botão "Atualizar
agora" (exige a permissão `multas.atualizar`, concedida só pelo admin).

### 5. Agendar o cron (opcional, depois do teste manual OK)

Painel do Supabase → **Database** → **Cron Jobs** → **Create a new cron
job**: chama a URL da função `sync-multas` (sem `force`) num intervalo curto
e fixo (ex.: a cada 5 minutos — mínimo do Supabase). A função **se
autolimita**: só sincroniza de verdade quando já passou
`multas_sync_config.intervalo_minutos` desde a última execução — por isso o
"intervalo ajustável pelo usuário" (pedido no A0) é editado **na tabela**
(`update multas_sync_config set intervalo_minutos = X where id = 1`), não
reconfigurando o cron job toda vez.

O botão **"Atualizar agora"** da UI chama a mesma URL com `?force=1`,
ignorando o intervalo — por isso o cron não é estritamente necessário para
o módulo funcionar (o admin pode sincronizar manualmente quando precisar).

**Status:** não confirmado se foi criado no obras-dev — não bloqueia a
promoção (o botão manual cobre o caso de uso hoje); criar quando desejar
sincronização automática periódica.

## Checklist de promoção do módulo Multas para produção

Resumo executável dos passos 1–3 acima, só para produção (obras-dev já
está com tudo isso feito):

- [ ] Rodar os 5 SQLs da seção 1, na ordem, no banco de **produção**.
- [ ] Cadastrar o secret `GOOGLE_SERVICE_ACCOUNT_JSON` no projeto de
      **produção**.
- [ ] Implantar `sync-multas` (código atual, com CORS) no projeto de
      **produção**.
- [ ] Testar manualmente (Invoke ou botão "Atualizar agora" em produção,
      já logado como admin) e conferir a tabela `multas` no Table Editor.
- [ ] (Opcional) Criar o cron job em produção.

Só depois desse checklist a promoção `homologacao → main` entrega o módulo
Multas **funcional** em produção — sem ele, a PR de promoção sobe o código
normalmente, mas a tela abre com a tabela vazia (sem dados sincronizados).

### Limitações conhecidas (aceitas, não bloqueiam a promoção)

- Sem retry/backoff no download do Drive (diferente do `fetchAll` do
  Sistema Geo) — falha vira `ultima_sync_status = 'erro'`, tentativa seguinte
  do cron (ou clique manual) resolve sozinha.
- Trade-off aceito no A2: se um dos 4 campos que compõem a
  `chave_sintetica` mudar na planilha para uma linha sem `auto_multa`, a
  linha antiga não é sobrescrita (vira uma linha "nova"). Volume baixo
  (~166-168 linhas), decisão deliberada — ver `docs/plano-melhorias-2026-07.md`.
- Normalização de texto livre (`TIPO DE PROCESSO`/`STATUS SEI`) não foi
  implementada — decisão do usuário, adiada para uma etapa futura se
  necessário.
