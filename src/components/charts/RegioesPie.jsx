import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { fmtNumero } from '../../lib/aggregations.js'
import ChartTooltip from './ChartTooltip.jsx'
import { NAVY, NAVY_LIGHT, NAVY_MID, RED } from '../../lib/cores.js'

const CORES = {
  Leste: NAVY,
  Sul: NAVY_LIGHT,
  Central: NAVY_MID,
  Oeste: '#8FAADC',
  Norte: RED,
}

export default function RegioesPie({ titulo, dados, acoes }) {
  // dados: [{ regiao, laudos, pct }]
  const ordenado = [...dados].sort((a, b) => b.laudos - a.laudos)

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
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={ordenado}
            dataKey="laudos"
            nameKey="regiao"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={0}
            labelLine={false}
            label={(e) => `${fmtNumero(e.laudos)} (${e.pct}%)`}
            style={{ fontSize: '11px' }}
          >
            {ordenado.map((d) => (
              <Cell
                key={d.regiao}
                fill={CORES[d.regiao] || '#888'}
                stroke="#fff"
                strokeWidth={1}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
