// Aba 3 — Status Cruzado. Extraído de PaginaGeo4Cruzamento.jsx (Fase M5, Etapa 2).
import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { fmtNumero, fmtData } from '../../../lib/aggregations.js'
import ChartTooltip from '../../charts/ChartTooltip.jsx'
import { SecaoCard, TabelaPaginada } from './shared.jsx'
import { CORES_STATUS_GEO } from './cores.js'

export default function AbaStatusCruzado({ matrizStatus, topGeoStatuses, matrizStatusInd, topGeoStatusesInd, divStatus }) {
  const [subAba, setSubAba] = useState('grafico')
  const [modoStatus, setModoStatus] = useState('agrupado')

  const matrizAtiva  = modoStatus === 'agrupado' ? matrizStatus    : matrizStatusInd
  const statusAtivos = modoStatus === 'agrupado' ? topGeoStatuses  : topGeoStatusesInd

  const COLS_DIV_STATUS = [
    { key: 'proc',   label: 'Processo',         render: r => r.fisc.id_origem, sortValue: r => r.fisc.id_origem || '' },
    { key: 'perm',   label: 'Permissionária',   render: r => r.geo.permissionaria || '—', sortValue: r => r.geo.permissionaria || '' },
    { key: 'sub',    label: 'Sub.', render: r => r.geo.subprefeitura || '—', sortValue: r => r.geo.subprefeitura || '' },
    { key: 'geoSt',  label: 'Status Sistema Geo',  render: r => r.geo.status_unificado || '—', sortValue: r => r.geo.status_unificado || '' },
    { key: 'fiscSt', label: 'Status Fisc.',      render: r => r.fisc.status_simplificado || '—', sortValue: r => r.fisc.status_simplificado || '' },
    { key: 'data',   label: 'Últ. laudo',        render: r => fmtData(r.fisc.data_inicio), sortValue: r => r.fisc.data_inicio || '' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {[{ id: 'grafico', l: 'Gráfico' }, { id: 'matriz', l: 'Tabela matriz' }, { id: 'inconsistencias', l: `Inconsistências (${fmtNumero(divStatus.length)})` }].map(s => (
            <button key={s.id} onClick={() => setSubAba(s.id)}
              className={`text-xs px-3 py-1.5 rounded-sm font-medium transition-colors ${subAba === s.id ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {s.l}
            </button>
          ))}
        </div>
        {(subAba === 'grafico' || subAba === 'matriz') && (
          <div className="flex gap-1 ml-2">
            {['agrupado', 'individual'].map(m => (
              <button key={m} onClick={() => setModoStatus(m)}
                className={`text-xs px-3 py-1 rounded-sm font-medium transition-colors ${modoStatus === m ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {m === 'agrupado' ? 'Agrupado' : 'Individual'}
              </button>
            ))}
          </div>
        )}
      </div>

      {subAba === 'grafico' && (
        <SecaoCard titulo="Distribuição de status Sistema Geo por status Fiscalização (processos em comum)">
          <p className="text-xs text-gray-500 mb-4">
            Para os processos presentes nas duas bases, como o status do Sistema Geo se distribui dentro de cada status da Fiscalização?
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={matrizAtiva} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="statusFisc" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {statusAtivos.map((sg, i) => (
                <Bar key={sg} dataKey={sg} name={sg} fill={CORES_STATUS_GEO[i % CORES_STATUS_GEO.length]} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </SecaoCard>
      )}

      {subAba === 'matriz' && (
        <SecaoCard titulo={`Matriz status Fiscalização × status Sistema Geo (${modoStatus === 'agrupado' ? 'top 6 agrupados' : 'top 8 individuais'})`}>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 font-semibold text-navy">Status Fisc. ↓ / Sistema Geo →</th>
                  {statusAtivos.map(sg => <th key={sg} className="text-right py-2 px-2 font-semibold text-navy whitespace-nowrap">{sg}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrizAtiva.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-1.5 pr-4 font-medium text-navy">{row.statusFisc}</td>
                    {statusAtivos.map(sg => (
                      <td key={sg} className="text-right py-1.5 px-2 tabular-nums text-gray-700">
                        {fmtNumero(row[sg] || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SecaoCard>
      )}

      {subAba === 'inconsistencias' && (
        <SecaoCard titulo="Inconsistências de status — Sistema Geo encerrado/cancelado mas Fisc. em andamento">
          <p className="text-xs text-gray-500 mb-4">
            Processos cujo Sistema Geo indica encerramento ou cancelamento, mas a Fiscalização registra "Em andamento".
            Pode indicar atraso na atualização de um dos sistemas.
          </p>
          <TabelaPaginada
            rows={divStatus}
            colunas={COLS_DIV_STATUS}
            emptyMsg="Nenhuma inconsistência de status encontrada."
          />
        </SecaoCard>
      )}
    </div>
  )
}
