# Guia: ambiente de testes (produção vs. teste)

> **Objetivo:** ter um **segundo banco Supabase** só para testes, separado do
> banco real (produção). Assim você pode testar uploads, mudanças e experimentos
> **sem medo de estragar os dados de verdade**.

> 🌐 **Este guia é feito 100% pelo navegador** — nos painéis do **Supabase**,
> do **Vercel** e no **GitHub**. Você **não** precisa de terminal nem de rodar
> nada no computador.

## Por que fazer isso?

Hoje o site tem **um** banco só. Quando você testa um upload de emergências, por
exemplo, ele **apaga e reinsere dados no banco real** — não tem volta. Com um
ambiente de teste, fica assim:

| Ambiente | Onde roda | URL fixa | Banco que usa |
|---|---|---|---|
| 🟢 **Produção** | branch `main` | `dashboard-obras-cidade.vercel.app` | banco **real** |
| 🟡 **Homologação** | branch `homologacao` | `homolog-dashboard-obras-cidade.vercel.app` | banco **de teste** (`obras-dev`) |

> 📝 **"Homologação"** é o nome que usamos para o ambiente de teste (mesmo termo
> usado em outros sistemas). Tecnicamente, no Vercel ele é um deploy de **Preview**;
> demos a ele uma **URL fixa e amigável** (`homolog-...`) apontando para o branch
> `homologacao`, para não depender do link aleatório que o Vercel gera a cada PR.

Para você **nunca confundir**, o app mostra uma **faixa colorida no topo da tela**
quando NÃO está em produção (controlada pela variável `VITE_APP_ENV`). Em
homologação aparece **🟡 HOMOLOGAÇÃO (AMBIENTE DE TESTE)**.

> 🔧 Existe ainda um modo `development` (faixa azul), mas ele só aparece em
> execução **local** (terminal) — fora do seu fluxo de trabalho, que é pelo
> navegador. No seu dia a dia, o que importa são **Produção** 🟢 e **Homologação** 🟡.

> ⏱️ Tempo estimado: ~20-30 minutos. Não é urgente — o site funciona sem isso.

---

## Passo 1 — Criar o 2º projeto Supabase

1. Acesse <https://supabase.com/dashboard> e faça login.
2. Clique em **New Project**.
3. Dê um nome claro, ex.: **`obras-dev`** (ou `obras-teste`).
4. Escolha uma senha forte para o banco (guarde-a) e a região (use a mesma da produção).
5. Clique em **Create new project** e aguarde alguns minutos até ficar pronto.

> 💡 O plano gratuito do Supabase permite **2 projetos** — então dá para ter
> produção + teste sem custo.

## Passo 2 — Copiar a estrutura (criar as tabelas vazias)

No projeto novo (`obras-dev`), vá em **SQL Editor → New query** e rode os scripts
**exatamente nesta ordem** (há dependências entre eles — não dá para rodar pasta
por pasta):

1. `supabase/auth/01-auth-setup.sql` — cria a tabela `profiles`.
2. `supabase/fixes/recursion.sql` — cria a função `is_admin()` (base do RLS).
3. `supabase/auth/02-usuarios-internos.sql` — usa `is_admin()`.
4. `supabase/schema/01-fiscalizacoes.sql`
5. `supabase/schema/02-emergencias.sql` — usa `is_admin()`.
6. `supabase/schema/03-sistema-geo.sql`

Isso cria as mesmas tabelas da produção, porém **vazias**.

> ⚠️ **A ordem importa!** O schema de Emergências usa a função `is_admin()`, criada
> no passo 2. Se você rodar o `02-emergencias.sql` antes, dá o erro
> `function public.is_admin(uuid) does not exist`. Os scripts são idempotentes, então
> basta rodar na ordem certa (ou re-rodar o que faltou).

> 🚨 **Pegadinha importante (causa de "Acesso não permitido" no login):** o
> `recursion.sql` (passo 2) **conserta** as políticas de segurança que o
> `01-auth-setup.sql` cria com um defeito de recursão. Se você **re-rodar o
> `01-auth-setup.sql` depois**, o defeito **volta** e o login quebra com o erro
> `infinite recursion detected in policy for relation "profiles"`. **Regra:** se
> precisar re-rodar o `01-auth-setup.sql`, **sempre rode o `recursion.sql` logo
> em seguida** (ele tem que ser o **último** script de auth a rodar).

## Passo 2.5 — Criar seu usuário e destravar o login

Os scripts acima criam a **estrutura**, mas o banco novo começa **sem nenhuma
conta**. Para conseguir entrar, faça (tudo no painel do `obras-dev`):

1. **Autorizar seu e-mail** — SQL Editor → rode o `supabase/fixes/login.sql` (libera
   a checagem de e-mail que roda **antes** do login e insere seu e-mail nas exceções).
2. **Garantir o conserto da recursão** — rode o `supabase/fixes/recursion.sql`
   **de novo, por último** (ver a pegadinha acima). Sem isso, o login dá
   "Acesso não permitido" mesmo com o e-mail autorizado.
3. **Criar a conta** — menu **Authentication → Users → Add user → Create new user**:
   - E-mail: o seu (ex.: `seu.email@gmail.com`).
   - Senha: a que você quiser (mín. 6 caracteres) — **essa será sua senha de homologação**.
   - ✅ **Marque "Auto Confirm User"** (senão o login falha por e-mail não confirmado).
4. **Virar admin** — SQL Editor → rode:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'SEU-EMAIL-AQUI';
   ```

> 🔎 **Como diagnosticar se travar:** no SQL Editor, troque o seletor **Role** (perto
> do botão Run) de `postgres` para **`anon`** e rode
> `select email from public.email_exceptions;`. Se der erro de **recursão**, falta
> rodar o `recursion.sql` (passo 2 acima). Se vier vazio, falta o `login.sql`.

## Passo 3 — Pegar as chaves do banco de teste

No projeto `obras-dev`, vá em **Settings → API** e anote:

- **Project URL** → será o `VITE_SUPABASE_URL` de teste.
- **Publishable key** (`sb_publishable_...`) → será o `VITE_SUPABASE_PUBLISHABLE_KEY` de teste.

> ⚠️ **Nunca** use a chave **secreta** (`service_role` / `secret`) no front-end.

## Passo 4 — Configurar as variáveis no Vercel (a parte que separa os ambientes)

No Vercel (<https://vercel.com>), abra o projeto e vá em
**Settings → Environment Variables**. O segredo é que cada variável pode ser
marcada para **um ambiente específico**:

**a) Produção (banco real)** — marque apenas **Production**:

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL do banco **real** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | chave publishable do banco **real** |
| `VITE_APP_ENV` | `production` |

**b) Teste (banco de teste)** — marque apenas **Preview**:

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL do `obras-dev` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | chave publishable do `obras-dev` |
| `VITE_APP_ENV` | `preview` |

Pronto: a partir daí, **o site oficial usa o banco real** e **todo link de preview
de PR usa o banco de teste** — automaticamente, sem você mudar nada no código.

## Passo 5 — Testar (tudo pelo navegador)

1. No **GitHub**, crie/abra um **Pull Request** qualquer (ex.: o desta entrega).
2. O **Vercel** gera automaticamente um **link de preview** para esse PR. Você o
   encontra de duas formas, ambas no navegador:
   - na **página do PR** no GitHub, na lista de checks/comentários do Vercel
     (link tipo `obras-xxx.vercel.app`); ou
   - no **painel do Vercel**, aba **Deployments**, no deploy marcado como `Preview`.
3. **Abra esse link.** Você deve ver a faixa **🟡 HOMOLOGAÇÃO (AMBIENTE DE TESTE)**
   no topo da tela — sinal de que está no banco de teste.
4. Faça seus testes à vontade (inclusive uploads): eles mexem **só no banco de teste**.
5. Quando estiver tudo certo, faça o **merge** do PR para `main` pelo GitHub: o
   site real (🟢 Produção) continua intacto.

> ✅ Repare que nenhum passo pede para rodar algo no computador — é tudo clique
> em painel web (GitHub, Vercel, Supabase).

## Passo 6 — URL fixa de homologação (`homolog-dashboard-obras-cidade.vercel.app`)

O link de preview que o Vercel gera a cada PR é **aleatório** (muda sempre). Para
ter um endereço **fixo e fácil de lembrar** para a homologação, criamos um branch
de vida longa chamado **`homologacao`** e ligamos uma URL bonita a ele.

1. **Branch `homologacao`** — já existe no GitHub (criado pelo Claude). Ele é um
   branch permanente, como o `main`, e tudo que é enviado a ele entra no escopo
   **Preview** do Vercel (logo, usa o banco de teste `obras-dev`).
2. No **Vercel**, abra o projeto → **Settings → Domains** → botão **Add**.
3. Digite **`homolog-dashboard-obras-cidade.vercel.app`** e confirme (se o nome estiver
   livre, o Vercel adiciona na hora — é de graça).
4. Depois de adicionado, no ajuste desse domínio procure o campo **Git Branch**
   (ou "Branch") e selecione/escreva **`homologacao`**. Salve.
   - Isso faz a URL servir **sempre o último deploy do branch `homologacao`**,
     em vez da produção.
5. Pronto: acesse **`https://homolog-dashboard-obras-cidade.vercel.app/`** — deve abrir
   com a faixa **🟡 HOMOLOGAÇÃO** e conectada ao banco de teste.

---

## Fluxo homologação-primeiro (definido em 11/06/2026)

Nada entra em produção sem passar pela homologação. O caminho de toda mudança:

```
branch de trabalho ──PR──▶ homologacao ──você testa──▶ PR de promoção ──▶ main
                  (squash)              (URL fixa 🟡)    (merge commit)   (🟢 produção)
```

1. **PR de trabalho** (código novo): o Claude abre com base na branch
   **`homologacao`**. Você faz **"Squash and merge"** e **pode clicar em
   "Delete branch"** (a branch de trabalho já cumpriu o papel).
2. **Teste**: em ~1-2 min, `homolog-dashboard-obras-cidade.vercel.app` atualiza.
   Valide por lá (banco de teste, sem risco).
3. **PR de promoção**: aprovado o teste, o Claude abre um PR
   `homologacao` → `main` com título `chore: promove homologação para produção`.
   Você merge com **"Create a merge commit"** (NÃO squash — squash faria as
   branches divergirem) e **NÃO clica em "Delete branch"** (ver alerta abaixo).
4. Depois da promoção, o Claude espelha a `homologacao` na `main` para
   realinhar as duas.

> 🔎 **Como saber qual botão usar (e se apaga a branch)?** A descrição de cada
> PR sempre diz as duas coisas. Regra de bolso: PR para `homologacao` =
> Squash **+ pode apagar a branch**; PR de promoção para `main` = Create a
> merge commit **+ NUNCA apagar a branch**.

> 🚨 **NUNCA clique em "Delete branch" depois de mergear o PR de promoção!**
> A branch "head" da promoção é a **própria `homologacao`** — apagá-la
> redireciona os PRs abertos para a `main` e os próximos merges vão **direto
> para produção** (aconteceu em 11/06/2026 com o #58). O botão de apagar é só
> para branches de **trabalho** (`feat/`, `fix/`, `docs/`...), nunca para a
> `homologacao`.

> 🧪 Os links de **preview por PR** do Vercel continuam existindo — são uma
> "pré-homologação" opcional (cada PR ganha uma URL temporária com o banco de
> teste). Para achá-los: painel do Vercel → projeto → **Deployments** → procure
> pela branch do PR → **Visit**. No dia a dia, porém, a homologação fixa basta.

---

## Como o aviso visual funciona (resumo técnico)

- A lógica está em [`src/lib/env.js`](../src/lib/env.js) e o componente em
  [`src/components/AvisoAmbiente.jsx`](../src/components/AvisoAmbiente.jsx).
- Ele lê `VITE_APP_ENV`:
  - `production` → não mostra nada.
  - `preview` → faixa amarela "HOMOLOGAÇÃO (AMBIENTE DE TESTE)".
  - `development` (ou rodando local) → faixa azul "DESENVOLVIMENTO LOCAL".
- Se a variável não estiver definida num build de produção, **nada aparece**
  (para não dar alarme falso no site real).
