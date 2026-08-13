# Arquitetura e referência técnica — OBRAS Dashboard

> Arquivo de referência linkado pelo `CLAUDE.md` raiz. Reúne o que é consulta
> pontual (stack, cores, pastas, comandos).

## Tecnologias (o "stack")

| Camada | Ferramenta | Para que serve |
|---|---|---|
| Interface (front-end) | **React 19 + Vite 8 (Rolldown)** | Monta as telas no navegador |
| Estilo | **Tailwind CSS 4** | Classes utilitárias de estilo |
| Gráficos | **Recharts** | Gráficos de barra, linha, donut |
| Mapas | **Leaflet + react-leaflet** | Mapa choropleth por região |
| Planilhas | **SheetJS (xlsx)** | Ler/exportar Excel |
| Imagem de slide | **html-to-image** | Exporta o card de cada slide do módulo Apresentação como PNG |
| Banco + Login | **Supabase** (PostgreSQL + Auth + RLS) | Dados e autenticação |
| Hospedagem | **Vercel** | Publica o site automaticamente |
| Código | **GitHub** | Guarda o histórico do código |

## Paleta de cores (identidade visual)

- `navy` (azul-marinho institucional): `#1F3864`
- `navy-light`: `#2E4F7F`
- `red` (vermelho institucional): `#C00000`
- `grey-bg` (fundo cinza): `#F2F2F2`

Definidas no bloco `@theme` de `src/index.css` (Tailwind 4 — configuração
CSS-first, sem `tailwind.config.js`).

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
│   │   ├── aggregations.js     # Cálculos, KPIs, formatação de datas
│   │   └── cores.js            # Paleta institucional em JS (gráficos, gradientes)
│   ├── hooks/                  # Hooks React de carga de dados
│   │   ├── useCargaFiscalizacao.js
│   │   ├── useCargaSistemaGeo.js      # cache stale-while-revalidate
│   │   ├── useCargaEmergencias.js
│   │   └── useAvisoAtualizacao.js   # datas por módulo + polling "dados atualizados"
│   └── data/                   # Dados estáticos (GeoJSON)
├── supabase/                   # Scripts SQL do banco
├── public/                     # Arquivos servidos como estão
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

⚠️ **`npm run build` exige um `.env.local` com valores dummy** para
compilar fora do Vercel: o módulo de conexão com o banco lança erro no
topo se faltarem `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`, e o
minificador (Oxc/Rolldown) faz constant-folding dessa checagem — sem as
variáveis, ele elimina a aplicação inteira como código morto (o build
"passa" mas o bundle sai vazio, ~19 kB). Para builds fiéis fora do Vercel:
```bash
printf 'VITE_SUPABASE_URL=https://exemplo-dummy.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=chave-dummy\n' > .env.local
```

⚠️ **`npm run format` reformata o repositório inteiro**, não só os arquivos
tocados — evite rodar sem escopo numa branch de trabalho; prefira
`npx prettier --write <arquivo1> <arquivo2>` nos arquivos que a tarefa
realmente tocou.
