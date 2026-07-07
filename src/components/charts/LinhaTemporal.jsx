import { useState } from 'react'
import BotaoExportarGrafico from '../BotaoExportarGrafico.jsx'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import {
  evolucaoAnual,
  evolucaoMensal,
  fmtNumero,
} from '../../lib/aggregations.js'
import ChartTooltip from './ChartTooltip.jsx'

const OPCOES = [
  { key: 'anual', label: 'Anual' },
  { key: 'mensal', label: 'Mensal' },
]

export default function LinhaTemporal({ titulo, rows }) {
  const [granularidade, setGranularidade] = useState('anual')
  const dados =
    granularidade === 'anual' ? evolucaoAnual(rows) : evolucaoMensal(rows)
  const showLabels = granularidade === 'anual'

  return (
    <div className="bg-white rounded-md shadow-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-navy uppercase tracking-wide">
          {titulo}
        </h3>
        <div className="flex items-center gap-2">
        <BotaoExportarGrafico
          dados={dados}
          colunas={[
            { key: 'periodo', label: 'Período' },
            { key: 'leg_atendida', label: 'Leg. Atendida' },
            { key: 'nao_atendida', label: 'Não Conformidades' },
          ]}
          titulo={titulo}
          modulo="fiscalizacao"
        />
        <div className="inline-flex rounded-sm border border-grey-line overflow-hidden">
          {OPCOES.map((o) => (
            <button
              key={o.key}
              onClick={() => setGranularidade(o.key)}
              className={`px-3 py-1 text-xs font-medium ${
                granularidade === o.key
                  ? 'bg-navy text-white'
                  : 'bg-white text-navy hover:bg-grey-bg'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={310}>
        <LineChart
          data={dados}
          margin={{ top: 24, right: 24, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="periodo"
            tick={{ fontSize: 10 }}
            angle={granularidade === 'mensal' ? -45 : 0}
            textAnchor={granularidade === 'mensal' ? 'end' : 'middle'}
            height={granularidade === 'mensal' ? 60 : 30}
            interval={granularidade === 'mensal' ? 2 : 0}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="leg_atendida"
            name="Legislação Atendida"
            stroke="#1F3864"
            strokeWidth={2}
          >
            {showLabels && (
              <LabelList
                dataKey="leg_atendida"
                position="top"
                style={{ fontSize: 10, fill: '#1F3864' }}
                formatter={fmtNumero}
              />
            )}
          </Line>
          <Line
            type="monotone"
            dataKey="nao_atendida"
            name="Legislação Não Atendida"
            stroke="#C00000"
            strokeWidth={2}
          >
            {showLabels && (
              <LabelList
                dataKey="nao_atendida"
                position="bottom"
                style={{ fontSize: 10, fill: '#C00000' }}
                formatter={fmtNumero}
              />
            )}
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
