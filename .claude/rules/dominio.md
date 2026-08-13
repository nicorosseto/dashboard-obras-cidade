# Domínio e particularidades — OBRAS Dashboard

> Arquivo de referência linkado pelo `CLAUDE.md` raiz. Reúne o essencial do
> domínio de negócio e comportamentos não óbvios do sistema — versão
> resumida para o repositório público (a versão completa, com histórico de
> bugs e decisões datadas, fica no repositório privado do projeto).

## Login e permissões

- **Cadastro fechado:** só o administrador cria contas (sign-up público
  desabilitado). Usuários internos (domínio interno fictício de e-mail) são
  criados só por nome de usuário, via função de banco `SECURITY DEFINER`
  (o Supabase Auth rejeita domínios sem MX válido no `signUp` padrão).
- **Reset de senha pelo painel, não por e-mail:** o admin redefine a senha
  do usuário direto na tela de Configurações; o sistema força a troca no
  próximo login (`primeiro_acesso`).
- **`ativo` não é bloqueio:** o campo indica só se o usuário concluiu o
  primeiro acesso (trocou a senha-padrão) — nunca "conta desativada". O
  reconhecimento de admin no front depende só de `role === 'admin'`.
- **Permissões por perfil de acesso:** controle fino de telas/ações por
  usuário. Tabelas: `permissoes_catalogo` (permissões por aba/módulo),
  `perfis_acesso` (perfis dinâmicos criados pelo admin), `perfil_permissoes`
  (matriz perfil × permissão). Sem permissão, o elemento **some** da
  interface (aba, botão, card da Home) — não fica desabilitado visível.
  Admin ignora perfis (enxerga tudo); usuário comum sem perfil não vê
  nenhum módulo. É controle de **interface**: o RLS do banco continua
  permitindo leitura para qualquer autenticado.
- **Checklist para todo módulo/aba novo não-exclusivo do admin:** criar a
  permissão no catálogo (SQL idempotente, migrado nos dois ambientes),
  atualizar a lista de permissões no front, decidir quais perfis recebem a
  permissão, e documentar a permissão no mapa de descrições que alimenta a
  legenda do editor de perfis.

## Upload de dados

- **Fiscalização e Sistema Geo:** upload de planilha Excel consolidada pela
  tela de Configurações → Atualizar Dados (exclusivo do admin). Fluxo:
  analisa a planilha sem gravar → mostra resumo de diffs → confirma →
  grava em lotes (DELETE + INSERT/UPSERT) → snapshot de histórico.
- **Emergências:** upload com pré-visualização — arrasta a planilha →
  análise com resumo (total, por status, período) sem gravar → confirma →
  substitui todos os dados. Duas planilhas: principal (ocorrências) e
  auxiliar de posicionamento de obras (uma enriquece a outra por número de
  processo). Deduplicação por processo mantendo o registro mais recente;
  normalização de status (case/espaços) sem fundir valores realmente
  distintos; se o cabeçalho não bate com o esperado, abre um mapeamento
  manual coluna → campo antes de gravar.
- **Datas em formato brasileiro:** parsing de data centralizado numa única
  função (`toIsoDate`) que aceita `DD/MM/AAAA`, `DD-MM-AAAA`, serial do
  Excel e ISO — nunca usar `new Date(string)` como fallback genérico (já
  causou inversão de dia/mês em produção).

## Regra de prazo (SLA)

Aba dedicada que cruza, em memória, ocorrências × posicionamento de obras
por número de processo. Prazo = data de início da obra + 48h; sem
posicionamento, cai num prazo **estimado** a partir da data de cadastro
(marcado visualmente como estimativa, não fato). Vencido = ainda em aberto
e o prazo já passou. O "agora" usado no cálculo é atualizado periodicamente
enquanto a aba está aberta, para não congelar no horário em que a tela foi
aberta.

## Cruzamento entre bases

Aba que cruza a base de Fiscalização com a de infraestrutura (Sistema Geo)
pela mesma chave de processo, em memória (dados já carregados no cliente).
Sub-abas: registros só numa base ou só na outra (possível lacuna de
cadastro), e divergências de campo (permissionária/região) para o mesmo
processo entre as duas bases — normalmente indica erro de digitação num
cadastro manual.

## Padrão de listagem sob demanda

Toda aba de busca/lista de processos só monta a tabela por ação explícita
do usuário (botão "Filtrar" ou busca por número) — os filtros da barra
lateral nunca disparam a listagem sozinhos. Evita travar a tela ao
selecionar um filtro com muitos resultados. O carregamento usa um indicador
padrão e adia o commit da lista renderizada para a próxima volta do event
loop, para o indicador aparecer antes do trabalho pesado de ordenação.

## Exportação de dados

Todo gráfico/tabela do dashboard tem um botão de exportação (XLSX, com CSV
como opção secundária) que respeita a seleção de colunas do usuário
(persistida no navegador por módulo). Um botão flutuante geral permite
exportar o conjunto completo de registros com colunas configuráveis.

## Tour guiado

Onboarding interativo por biblioteca leve carregada sob demanda (zero custo
no carregamento inicial). Cada tela/aba/botão relevante expõe um atributo
de marcação dedicado no HTML (nunca uma classe de estilo, para não quebrar
o tour em refatorações visuais); os passos ficam num registro central e
podem ser filtrados por permissão, para nunca convidar o usuário a um
recurso que ele não tem acesso.

## Glossário de domínio

- **Permissionária:** empresa autorizada a operar em via pública.
- **Subprefeitura:** divisão administrativa/regional usada nos mapas e
  filtros.
- **Recape:** recapeamento de via.
- **Termo:** termo de fiscalização emitido.
- **Sistema Geo:** base de protocolos de infraestrutura urbana por região.
