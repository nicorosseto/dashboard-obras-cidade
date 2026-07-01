# Banco de dados (Supabase / PostgreSQL)

Esta pasta guarda **todos os scripts SQL** do projeto. Eles **não** são executados
pelo site automaticamente — você os roda **manualmente** no painel do Supabase:

> **Como rodar um script:** painel do Supabase → menu lateral **SQL Editor** →
> **New query** → cole o conteúdo do arquivo → botão **Run** (canto inferior direito).
> A maioria é **idempotente** (pode rodar mais de uma vez sem estragar nada);
> as exceções estão sinalizadas abaixo.

---

## Estrutura das pastas

| Pasta | Emoji | O que contém |
|---|---|---|
| `schema/` | 🏗️ | A "planta" das tabelas — cria a estrutura onde os dados moram. |
| `auth/`   | 🔐 | Login, perfis de usuário e regras de permissão (RLS). |
| `fixes/`  | 🔧 | Correções pontuais aplicadas depois que o banco já existia. |

Os números no início dos arquivos (`01-`, `02-`, `03-`) indicam a **ordem certa
de rodar** dentro de cada pasta.

---

## Ordem de execução (montando o banco do zero)

> ⚠️ **Atenção:** existem dependências **entre pastas**. Por exemplo: o schema de
> Emergências usa a função `is_admin()`, que é criada em `fixes/recursion.sql`, e
> essa função depende da tabela `profiles`, criada em `auth/01-auth-setup.sql`.
> Por isso, **não rode pasta por pasta** — siga exatamente esta sequência:

1. **`auth/01-auth-setup.sql`** — cria `profiles`, `email_exceptions`, `access_logs` e o RLS básico.
2. **`fixes/recursion.sql`** — cria a função `is_admin()` (base de todo o RLS) e ajusta as políticas de `profiles`. **Obrigatório**, mesmo estando em `fixes/` (ver nota abaixo).
3. **`auth/02-usuarios-internos.sql`** — usuários internos (usa `is_admin()`).
4. **`schema/01-fiscalizacoes.sql`** — tabela principal de fiscalizações.
   ⚠️ **Destrutivo:** apaga e recria as tabelas; depois é preciso reimportar os dados.
5. **`schema/02-emergencias.sql`** — tabelas do módulo de Emergências (usa `is_admin()`).
6. **`schema/03-sistema-geo.sql`** — tabela do módulo Sistema Geo (≈170 mil linhas).
7. **`schema/04-subprefeituras.sql`** — biblioteca oficial de subprefeituras (32) e
   distritos (96); fonte da verdade para todas as análises. Idempotente.
8. **`schema/05-status-sistema-geo.sql`** — catálogo de status do Sistema Geo (47 status →
   nome legível + grupo unificado) e tabela de grupos. Idempotente.

> 🔧 **Por que o `recursion.sql` é obrigatório se está em `fixes/`?** Historicamente
> ele nasceu como correção de um bug de recursão no RLS, mas acabou virando o lugar
> onde a função fundamental `is_admin()` é criada. Por isso é necessário em qualquer
> banco novo. (Melhoria futura: mover essa função para o `auth/`.)

> 🚨 **Pegadinha:** o `01-auth-setup.sql` cria as políticas de `profiles` com um
> defeito de recursão que o `recursion.sql` conserta. Se você **re-rodar o
> `01-auth-setup.sql` depois** do `recursion.sql`, o defeito **volta** e o login
> quebra com `infinite recursion detected in policy for relation "profiles"` (que
> aparece no app como "Acesso não permitido"). **Sempre rode o `recursion.sql` por
> último** entre os scripts de auth — se re-rodar o `01-auth-setup.sql`, rode o
> `recursion.sql` logo em seguida.

9. **`schema/06-permissoes.sql`** — permissões por perfil de acesso (A3):
   catálogo de 13 permissões, `perfis_acesso`, `perfil_permissoes`, coluna
   `profiles.perfil_acesso_id` e RPC `minhas_permissoes()`. Inclui seed de 4
   perfis e migração dos usuários existentes. Idempotente (usa `is_admin()`).
10. **`schema/07-atualizar-dados.sql`** — importação pela tela (D1):
    função `tem_permissao()`, políticas de escrita em `sistemaGeo`/
    `fiscalizacoes`/`status_sistemaGeo` para quem tem a permissão de upload
    e tabela `importacoes_snapshots` (histórico). Idempotente.
11. **`schema/08-tipos-processo-sistema-geo.sql`** — catálogo de tipo de
    processo do Sistema Geo (espelha o de status): permite classificar tipos
    novos no upload pela tela. Seed dos tipos conhecidos. Idempotente.
12. **`fixes/login-usuarios-internos.sql`** — conserta o login de usuários
    internos ("Database error querying schema"): campos de token em
    `auth.users` viram `''` em vez de `NULL` e recria
    `admin_create_internal_user` corrigida. Idempotente.
13. **`fixes/sistema-geo-login-obrigatorio.sql`** — endurece a segurança: leitura do
    `sistemaGeo` passa a exigir login e remove a leitura pública de `email_exceptions`
    (a checagem de domínio antes do login foi retirada do sistema).

### Correções realmente opcionais (`fixes/`)

Não são necessárias num banco recém-criado pela ordem acima — ficam como registro
histórico, use só se precisar:

- `fixes/emergencias-snapshots.sql` — adiciona a coluna `por_permissionaria` nos snapshots.
- `fixes/sistema-geo-labels.sql` — corrige `status_unificado`/rótulos sem reimportar os 170k registros.
- `fixes/sistema-geo-corrige-dados.sql` — recalcula `status_unificado`/`status_nome` a
  partir do catálogo do B2 (`status_sistemaGeo`) e limpa o placeholder `---` das
  colunas de texto, **sem reimportar**. Use no banco que estiver com dados quebrados.
- `fixes/auditoria-paridade.sql` — **diagnóstico só de leitura**: gera uma impressão
  digital (md5) de colunas, funções, políticas RLS e tabelas. Rode nos dois bancos e
  compare para confirmar que produção e `obras-dev` têm a mesma estrutura.

> ℹ️ O antigo `fixes/login.sql` foi **removido**: ele criava a política de leitura
> pública de `email_exceptions`, necessária quando o login checava o domínio do
> e-mail antes de autenticar. Essa restrição de domínio não existe mais — o
> controle de acesso é simplesmente "só o admin cria contas" (cadastro público
> desabilitado no painel do Supabase, em Authentication → Sign In / Up).

---

## ⚠️ Observações de segurança

- Nunca coloque **senhas reais** ou de produção em scripts versionados.
  Usuários internos são criados pela função de reset de senha (`auth/02-usuarios-internos.sql`).
- Nunca cole a chave `service_role` do Supabase em arquivos versionados.
  Veja a seção 6 (Segurança) do `CLAUDE.md` na raiz do projeto.
