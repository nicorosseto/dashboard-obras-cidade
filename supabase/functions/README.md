# Edge Functions (Supabase)

Esta pasta guarda o código das **Edge Functions** do projeto — funções
serverless que rodam no runtime **Deno** do Supabase (fora do site, fora do
front-end). Diferente do `supabase/schema/` (SQL rodado manualmente no SQL
Editor), Edge Functions são **implantadas** (deploy) no painel do Supabase.

> ⚠️ O usuário trabalha 100% pelo navegador (sem terminal local) — por isso
> os passos abaixo usam o **editor de funções do painel do Supabase**
> (Edge Functions → Deploy a new function → colar o código), não a CLI
> (`supabase functions deploy`).

## `sync-multas` (Trilha A, A1 — spike)

Baixa a planilha de Multas (Google Drive, `.xlsx`) via Google Drive API,
faz o parsing com SheetJS e grava (upsert) em `public.multas`. Detalhe da
lógica e dos comentários no próprio `sync-multas/index.ts`.

### 1. Rodar o SQL antes (nos dois bancos)

`supabase/schema/21-multas.sql` — cria as tabelas `multas` e
`multas_sync_config`. Rodar no **obras-dev** primeiro (testar), depois em
**produção**.

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

### 3. Implantar a função

Painel do Supabase → **Edge Functions** → **Deploy a new function**:

- **Nome da função:** `sync-multas` (tem que bater com o nome da pasta)
- Colar o conteúdo de `sync-multas/index.ts` no editor
- **Deploy**

Repetir no projeto de produção quando o spike no obras-dev funcionar.

### 4. Testar manualmente (antes do cron)

Painel do Supabase → **Edge Functions** → `sync-multas` → botão **Invoke**
(ou copiar a URL da função e abrir com `?force=1`, ex.:
`https://<ref>.supabase.co/functions/v1/sync-multas?force=1`, com o header
`Authorization: Bearer <service_role key>` — o painel de Invoke já monta
isso). Conferir a resposta JSON (`executado: true`, contagem de linhas) e
depois olhar a tabela `multas` no **Table Editor**.

### 5. Agendar o cron (depois do teste manual OK)

Painel do Supabase → **Database** → **Cron Jobs** → **Create a new cron
job**: chama a URL da função `sync-multas` (sem `force`) num intervalo curto
e fixo (ex.: a cada 5 minutos — mínimo do Supabase). A função **se
autolimita**: só sincroniza de verdade quando já passou
`multas_sync_config.intervalo_minutos` desde a última execução — por isso o
"intervalo ajustável pelo usuário" (pedido no A0) é editado **na tabela**
(`update multas_sync_config set intervalo_minutos = X where id = 1`), não
reconfigurando o cron job toda vez.

O botão **"Atualizar agora"** da UI (A4, futuro) chama a mesma URL com
`?force=1`, ignorando o intervalo.

### Limitações conhecidas do spike (A1) — resolver no A2/A4

- Linhas sem `AUTO DA MULTA` (168 na planilha levantada no A0) não têm
  chave de dedup — hoje são só **inseridas** (podem duplicar a cada sync).
  A2 decide a estratégia definitiva (ex.: chave composta com
  `linha_planilha` ou hash da linha).
- `situacao_vinculo` só marca `sem_processo` no spike; o cruzamento com
  `sistemaGeo`/`fiscalizacoes` (`vinculado_sistemaGeo`/`vinculado_fiscalizacao`/
  `processo_nao_encontrado`) fica para o A3.
- Sem retry/backoff no download do Drive (diferente do `fetchAll` do
  Sistema Geo) — falha vira `ultima_sync_status = 'erro'`, tentativa seguinte
  do cron resolve sozinha.
