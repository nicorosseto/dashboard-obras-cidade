import React from 'react'

/**
 * Estado vazio padronizado para tabelas e seções sem dados.
 * Uso: <EmptyState mensagem="Nenhum resultado com os filtros atuais." />
 */
export default function EmptyState({
  mensagem = 'Nenhum dado encontrado.',
  sub = null,
  icone = null,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
    >
      <div className="text-3xl mb-3 opacity-40 select-none">
        {icone ?? '🔍'}
      </div>
      <p className="text-sm text-gray-500 font-medium">{mensagem}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
