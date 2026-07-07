import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { fmtNumero } from '../../lib/aggregations.js'
import ChartTooltip from './ChartTooltip.jsx'

export default function DonutComparativo({ titulo, dados, cores, total }) {
  // dados: [{ nome, valor, pct }, ...]
  return (
    <div className="bg-white rounded-md shadow-card p-4">
      {titulo && (
        <h3 className="text-sm font-semibold text-navy mb-2 text-center">
          {titulo}
        </h3>
      )}
      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={dados}
              dataKey="valor"
              nameKey="nome"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={1}
              startAngle={90}
              endAngle={-270}
              labelLine={false}
              // Só a % na fatia (texto curto, sem sobreposição). O nome e o
              // valor absoluto vão para a legenda abaixo e para o tooltip —
              // o rótulo antigo usava `\n`, que o SVG não quebra, e empilhava
              // nome+valor por cima um do outro.
              label={(e) => `${e.pct}%`}
              style={{ fontSize: '11px' }}
            >
              {dados.map((d, i) => (
                <Cell
                  key={i}
                  fill={cores[i] || '#999'}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
          </PieChart>
        </ResponsiveContainer>
        {total !== undefined && (
          <div
            className="absolute left-0 right-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ top: 0, height: 220 }}
          >
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">
              Total
            </div>
            <div className="text-xl font-bold text-navy">
              {fmtNumero(total)}
            </div>
          </div>
        )}
      </div>
      {/* Legenda: nome + valor + % por fatia (substitui o rótulo sobreposto) */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
        {dados.map((d, i) => (
          <span
            key={d.nome ?? i}
            className="inline-flex items-center gap-1.5 text-[11px] text-gray-600"
          >
            <span
              className="w-2.5 h-2.5 rounded-xs shrink-0"
              style={{ backgroundColor: cores[i] || '#999' }}
            />
            {d.nome}: <strong>{fmtNumero(d.valor)}</strong> ({d.pct}%)
          </span>
        ))}
      </div>
    </div>
  )
}
