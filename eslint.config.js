// Configuração do ESLint 9 (flat config) para o projeto Vite + React.
// O ESLint aponta erros e más práticas no código JS/JSX.
// A formatação (estilo) fica por conta do Prettier — por isso o
// `eslint-config-prettier` entra por último, desligando as regras de
// estilo do ESLint que poderiam conflitar com o Prettier.

import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

export default [
  // Pastas/arquivos que o ESLint deve ignorar
  { ignores: ['dist/**', 'node_modules/**'] },

  // Regras recomendadas (JS + React + Vite Fast Refresh)
  js.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactRefresh.configs.vite,

  // Ajustes específicos do projeto
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser, // window, document, fetch...
        ...globals.node, // process, etc. (arquivos de config)
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Regras essenciais de Hooks (clássicas, sem as experimentais do Compiler)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Não usamos PropTypes neste projeto
      'react/prop-types': 'off',
      // Aspas literais em texto JSX são aceitáveis (textos de UI em pt-br)
      'react/no-unescaped-entities': 'off',
      // Permite exportar constantes junto com componentes (padrão do template Vite)
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Variáveis não usadas viram aviso (não erro); ignora as em MAIÚSCULA/_
      'no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' },
      ],
    },
  },

  // Desliga regras de estilo do ESLint que brigam com o Prettier (sempre por último)
  prettier,
]
