// Botão minúsculo que dispara o ExportModal no modo "dados do gráfico".
// Uso:
//   <BotaoExportarGrafico
//     dados={[{ permissionaria: 'NORCREST', total: 123 }, ...]}
//     colunas={[{ key: 'permissionaria', label: 'Permissionária' }, { key: 'total', label: 'Total' }]}
//     titulo="Top 10 Permissionárias"
//     modulo="sistemaGeo"   // opcional — define qual módulo aparece no seletor ao clicar "registros completos"
//   />

export default function BotaoExportarGrafico({ dados, colunas, titulo, modulo }) {
  function exportar() {
    window.dispatchEvent(
      new CustomEvent('obras:exportar-grafico', {
        detail: { dados, colunas, titulo, modulo },
      })
    )
  }

  return (
    <button
      onClick={exportar}
      title={`Exportar dados: ${titulo}`}
      className="p-1 rounded-sm text-gray-400 hover:text-navy hover:bg-grey-bg transition-colors"
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  )
}
