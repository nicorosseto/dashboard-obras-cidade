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
import { fmtNumero } from '../../lib/aggregations.js'
import ChartTooltip from './ChartTooltip.jsx'
import { NAVY } from '../../lib/cores.js'

export default function TiposFalhaBar({ titulo, dados, acoes }) {
  // dados: [{ nome, laudos }] - ja ordenados desc
  return (
    <div className="bg-white rounded-md shadow-card p-4">
      {titulo && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-navy flex-1 text-center uppercase tracking-wide">
            {titulo}
          </h3>
          {acoes && <div className="shrink-0">{acoes}</div>}
        </div>
      )}
      <ResponsiveContainer
        width="100%"
        height={Math.max(220, dados.length * 24)}
      >
        <BarChart
          data={dados}
          layout="vertical"
          margin={{ top: 8, right: 48, left: 0, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="#E0E0E0"
          />
          <XAxis type="number" tick={{ fontSize: 10 }} hide />
          <YAxis
            type="category"
            dataKey="nome"
            tick={{ fontSize: 11 }}
            width={140}
          />
          <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
          <Bar dataKey="laudos" fill={NAVY} radius={[0, 3, 3, 0]}>
            <LabelList
              dataKey="laudos"
              position="right"
              style={{ fontSize: 11, fill: NAVY, fontWeight: 'bold' }}
              formatter={fmtNumero}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
