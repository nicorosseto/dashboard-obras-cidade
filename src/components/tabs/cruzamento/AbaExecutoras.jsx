// Aba 6 — Executoras. Extraído de PaginaGeo4Cruzamento.jsx (Fase M5, Etapa 2).
import { fmtNumero } from '../../../lib/aggregations.js'
import { SecaoCard, TabelaPaginada } from './shared.jsx'

const COLS_EXECUTORAS = [
  { key: 'executora',      label: 'Executora' },
  { key: 'permissionaria', label: 'Permissionária' },
  { key: 'processos',      label: 'Processos',  render: r => fmtNumero(r.processos) },
  { key: 'laudos',         label: 'Laudos',     render: r => fmtNumero(r.laudos) },
  { key: 'nc',             label: 'NC',         render: r => fmtNumero(r.nc) },
  {
    key: 'pctNc', label: '% NC',
    render: r => (
      <span className={`font-semibold ${r.pctNc >= 30 ? 'text-red' : 'text-gray-700'}`}>
        {r.pctNc}%
      </span>
    ),
  },
]

export default function AbaExecutoras({ porExecutora }) {
  return (
    <SecaoCard titulo="Executoras com processos em comum (Fisc. × Sistema Geo)">
      <p className="text-xs text-gray-500 mb-4">
        Para os processos presentes nas duas bases, mostra a executora registrada no Sistema Geo
        com os laudos de fiscalização correspondentes. <strong>% NC ≥ 30%</strong> destacada em vermelho.
        Ordenação padrão: maior número de não conformidades primeiro.
      </p>
      <TabelaPaginada
        rows={porExecutora}
        colunas={COLS_EXECUTORAS}
        emptyMsg="Nenhum dado de executora disponível."
        defaultSort="nc"
        defaultDir="desc"
      />
    </SecaoCard>
  )
}
