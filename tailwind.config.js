/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta principal (estilo Power BI da Prefeitura SP)
        navy: '#1F3864',
        'navy-light': '#2E4F7F',
        'navy-mid': '#4472C4',
        red: '#C00000',
        'grey-bg': '#F2F2F2',
        'grey-line': '#D9D9D9',
        // Acentos antigos (mantidos para compatibilidade)
        primary: '#2E75B6',
        accent: '#ED7D31',
        success: '#70AD47',
        norcrest: '#7030A0',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}
