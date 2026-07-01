import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { fmtNumero } from '../../lib/aggregations.js'
import ChartTooltip from './ChartTooltip.jsx'
import { usePaginadorGrafico, ControlePaginacao } from './PaginadorGrafico.jsx'

export default function BarGrupado({ titulo, dados, acoes, paginar = false }) {
  // Paginação opcional (ex.: drill-down da NORCREST com muitas unidades): mantém
  // o gráfico legível mostrando 8 por vez, com setas e "ver todas".
  const pag = usePaginadorGrafico(dados, { tamanho: 8, ativo: paginar })

  return (
    <div className="bg-white rounded-md shadow-card p-4">
      {titulo && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-navy flex-1 text-center uppercase tracking-wide">
            {titulo}
          </h3>
          {acoes && <div className="flex-shrink-0">{acoes}</div>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={pag.itens}
          margin={{ top: 24, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#E0E0E0"
          />
          <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="leg_atendida"
            name="Legislação Atendida"
            fill="#1F3864"
            radius={[2, 2, 0, 0]}
          >
            <LabelList
              dataKey="leg_atendida"
              position="top"
              style={{ fontSize: 10, fill: '#1F3864' }}
              formatter={fmtNumero}
            />
          </Bar>
          <Bar
            dataKey="nao_atendida"
            name="Não Atendida"
            fill="#C00000"
            radius={[2, 2, 0, 0]}
          >
            <LabelList
              dataKey="nao_atendida"
              position="top"
              style={{ fontSize: 10, fill: '#C00000' }}
              formatter={fmtNumero}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {pag.ligado && <ControlePaginacao {...pag} />}
    </div>
  )
}
