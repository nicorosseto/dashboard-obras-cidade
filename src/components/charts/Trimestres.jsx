import BotaoExportarGrafico from '../BotaoExportarGrafico.jsx'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { evolucaoTrimestral, fmtNumero } from '../../lib/aggregations.js'
import ChartTooltip from './ChartTooltip.jsx'
import { NAVY } from '../../lib/cores.js'

export default function Trimestres({ titulo, rows }) {
  const dados = evolucaoTrimestral(rows, 'solucionado')
  const total = dados.reduce((s, d) => s + d.valor, 0)

  return (
    <div className="bg-white rounded-md shadow-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-navy uppercase tracking-wide">
          {titulo}
        </h3>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-600">
            Qtde Solucionada:{' '}
            <span className="font-bold text-navy">{fmtNumero(total)}</span>
          </div>
          <BotaoExportarGrafico
            dados={dados}
            colunas={[
              { key: 'periodo', label: 'Trimestre' },
              { key: 'valor', label: 'Solucionados' },
            ]}
            titulo={titulo}
            modulo="fiscalizacao"
          />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={dados}
          margin={{ top: 24, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#E0E0E0"
          />
          <XAxis
            dataKey="periodo"
            tick={{ fontSize: 10 }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
          <Bar dataKey="valor" fill={NAVY} radius={[2, 2, 0, 0]}>
            <LabelList
              dataKey="valor"
              position="top"
              style={{ fontSize: 10, fill: NAVY }}
              formatter={fmtNumero}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
