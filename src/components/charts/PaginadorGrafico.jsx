import { useState, useMemo, useEffect } from 'react'

/**
 * Hook de paginação para gráficos de ranking (ex.: drill-down da NORCREST por
 * unidade). Mantém o gráfico num tamanho legível mostrando `tamanho` itens por
 * vez, com navegação por páginas e opção "ver todas".
 *
 * @param {Array}  dados   Lista completa já ordenada (maior → menor).
 * @param {object} options
 * @param {number} options.tamanho  Itens por página (padrão 8).
 * @param {boolean} options.ativo   Liga a paginação (ex.: só no drill-down).
 * @returns {{ itens, ligado, verTodas, pagina, totalPaginas, total, tamanho,
 *            proxima, anterior, toggleVerTodas }}
 */
export function usePaginadorGrafico(dados, { tamanho = 8, ativo = true } = {}) {
  const [pagina, setPagina] = useState(0)
  const [verTodas, setVerTodas] = useState(false)

  const total = dados.length
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho))
  // Só faz sentido paginar quando está ativo E há mais itens que cabem numa página.
  const ligado = ativo && total > tamanho

  // Se a página atual passou a não existir (dados encolheram), volta para a primeira.
  useEffect(() => {
    if (pagina > totalPaginas - 1) setPagina(0)
  }, [totalPaginas, pagina])

  // Ao desligar a paginação (ex.: tirou o filtro NORCREST), zera o estado.
  useEffect(() => {
    if (!ligado) {
      setPagina(0)
      setVerTodas(false)
    }
  }, [ligado])

  const itens = useMemo(() => {
    if (!ligado || verTodas) return dados
    const ini = pagina * tamanho
    return dados.slice(ini, ini + tamanho)
  }, [dados, ligado, verTodas, pagina, tamanho])

  return {
    itens,
    ligado,
    verTodas,
    pagina,
    totalPaginas,
    total,
    tamanho,
    proxima: () => setPagina((p) => Math.min(p + 1, totalPaginas - 1)),
    anterior: () => setPagina((p) => Math.max(p - 1, 0)),
    toggleVerTodas: () => setVerTodas((v) => !v),
  }
}

/**
 * Barra de controle da paginação: setas ← →, indicador "página X de Y" e botão
 * "ver todas / paginar". Renderize só quando `ligado` for verdadeiro.
 */
export function ControlePaginacao({
  pagina,
  totalPaginas,
  total,
  tamanho,
  verTodas,
  proxima,
  anterior,
  toggleVerTodas,
}) {
  const inicio = pagina * tamanho + 1
  const fim = Math.min((pagina + 1) * tamanho, total)

  return (
    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-grey-line">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={anterior}
          disabled={verTodas || pagina === 0}
          className="w-7 h-7 flex items-center justify-center rounded-sm border border-grey-line text-navy hover:bg-navy/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Página anterior"
          aria-label="Página anterior"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={proxima}
          disabled={verTodas || pagina >= totalPaginas - 1}
          className="w-7 h-7 flex items-center justify-center rounded-sm border border-grey-line text-navy hover:bg-navy/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Próxima página"
          aria-label="Próxima página"
        >
          ›
        </button>
        <span className="text-[11px] text-gray-500 ml-1 tabular-nums">
          {verTodas
            ? `Todas (${total})`
            : `${inicio}–${fim} de ${total} · pág. ${pagina + 1}/${totalPaginas}`}
        </span>
      </div>
      <button
        type="button"
        onClick={toggleVerTodas}
        className="text-[11px] font-semibold text-navy hover:underline shrink-0"
      >
        {verTodas ? 'Paginar' : 'Ver todas'}
      </button>
    </div>
  )
}
