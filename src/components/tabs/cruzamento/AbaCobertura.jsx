// Aba 2 — Cobertura por Permissionária. Extraído de PaginaGeo4Cruzamento.jsx
// (Fase M5, Etapa 2).
import { fmtNumero } from '../../../lib/aggregations.js'
import { SecaoCard, TabelaPaginada } from './shared.jsx'

const COLS_COBERTURA = [
  { key: 'perm',      label: 'Permissionária' },
  { key: 'totalFisc', label: 'Total Fisc.',       render: r => fmtNumero(r.totalFisc) },
  { key: 'totalGeo',  label: 'Total Sistema Geo',    render: r => fmtNumero(r.totalGeo) },
  { key: 'emComum',   label: 'Em comum',          render: r => fmtNumero(r.emComum) },
  { key: 'soFisc',    label: 'Só Fisc.',          render: r => fmtNumero(r.soFisc) },
  { key: 'soGeo',     label: 'Só Sistema Geo',       render: r => fmtNumero(r.soGeo) },
  {
    key: 'pctCob', label: '% Cob. Sistema Geo',
    render: r => (
      <span className={`font-semibold ${r.pctCob < 70 ? 'text-red' : 'text-verde'}`}>
        {r.pctCob}%
      </span>
    ),
  },
]

const COLS_PERM_SUB = [
  { key: 'perm',     label: 'Permissionária' },
  { key: 'sub',      label: 'Subprefeitura' },
  { key: 'totalGeo', label: 'Total Sistema Geo',  render: r => fmtNumero(r.totalGeo) },
  { key: 'fisc',     label: 'Fiscalizados',    render: r => fmtNumero(r.fisc) },
  { key: 'laudos',   label: 'Laudos',          render: r => fmtNumero(r.laudos) },
  {
    key: 'pctCob', label: '% Fiscalizado',
    render: r => (
      <span className={`font-semibold ${r.pctCob < 70 ? 'text-red' : 'text-verde'}`}>
        {r.pctCob}%
      </span>
    ),
  },
]

export default function AbaCobertura({ porPermissionaria, porPermSub, norcrestDrillDown = false }) {
  const rows = porPermissionaria.filter(p => p.totalGeo > 0)
  return (
    <div className="space-y-5">
      <SecaoCard titulo={norcrestDrillDown ? 'NORCREST — Cobertura Fisc. × Sistema Geo por unidade' : 'Cobertura Fisc. × Sistema Geo por permissionária'}>
        <p className="text-xs text-gray-500 mb-4">
          <strong>% Cob. Sistema Geo</strong> = processos em comum ÷ total no Sistema Geo para aquela permissionária.
          Vermelho quando abaixo de 70% — indica baixa fiscalização.
          Ordenação padrão: menor cobertura primeiro. Permissionárias sem registro no Sistema Geo são omitidas.
        </p>
        <TabelaPaginada
          rows={rows}
          colunas={COLS_COBERTURA}
          emptyMsg="Nenhum dado disponível."
          defaultSort="pctCob"
          defaultDir="asc"
        />
      </SecaoCard>

      <SecaoCard titulo="Permissionária × Subprefeitura — fiscalizações detalhadas">
        <p className="text-xs text-gray-500 mb-4">
          Cada linha é uma combinação de permissionária + subprefeitura nos processos em comum.
          Clique no cabeçalho de qualquer coluna para ordenar. Use para identificar onde a fiscalização está concentrada ou ausente.
        </p>
        <TabelaPaginada
          rows={porPermSub}
          colunas={COLS_PERM_SUB}
          emptyMsg="Nenhum dado disponível."
          defaultSort="fisc"
          defaultDir="desc"
        />
      </SecaoCard>
    </div>
  )
}
