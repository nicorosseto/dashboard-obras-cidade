import { useMemo, useState } from 'react'
import BotaoExportarGrafico from '../BotaoExportarGrafico.jsx'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  LabelList,
} from 'recharts'
import {
  totaisAnuais,
  totaisMensais,
  totaisDiarios,
  comparativoAnualPorMes,
  fmtNumero,
} from '../../lib/aggregations.js'
import ChartTooltip from '../charts/ChartTooltip.jsx'

const MESES_ABREV = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

function formatarMes(mesStr) {
  const [ano, m] = mesStr.split('-')
  return `${MESES_ABREV[parseInt(m, 10) - 1]}/${ano}`
}

// Paleta de cores por ano (2020 em diante)
const COR_POR_ANO = {
  2020: '#4472C4',
  2021: '#5B9BD5',
  2022: '#ED7D31',
  2023: '#7030A0',
  2024: '#E91E63',
  2025: '#1F3864',
  2026: '#3F51B5',
  2027: '#26A69A',
}

export default function PaginaGeo2Temporal({ rows }) {
  const [modo, setModo] = useState('anual')

  const dadosTotais = useMemo(() => {
    if (modo === 'anual') return totaisAnuais(rows)
    if (modo === 'mensal')
      return totaisMensais(rows).map((d) => ({
        label: formatarMes(d.label),
        value: d.value,
      }))
    // diário: últimos 90 dias para evitar gráfico denso demais
    const todos = totaisDiarios(rows)
    return todos.slice(-90)
  }, [rows, modo])

  const comparativo = useMemo(() => comparativoAnualPorMes(rows), [rows])

  return (
    <div className="space-y-4">
      {/* Header: toggles + total card */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {[
            ['anual', 'Anual'],
            ['mensal', 'Mensal'],
            ['diario', 'Diário'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setModo(id)}
              className={`text-xs px-4 py-1.5 rounded font-semibold transition-colors ${
                modo === id
                  ? 'bg-navy text-white'
                  : 'border border-grey-line text-navy hover:bg-grey-bg'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="bg-white rounded-md shadow-card px-4 py-2 flex items-center gap-3">
          <div className="text-[10px] uppercase text-gray-500 font-semibold">
            Total de Protocolos
          </div>
          <div className="text-xl font-bold text-navy">
            {fmtNumero(rows.length)}
          </div>
        </div>
      </div>

      {/* Top chart: Totais de Processos */}
      <div className="bg-white rounded-md shadow-card p-4 relative">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-navy text-center uppercase tracking-wide flex-1">
            Totais de Processos
          </h3>
          <BotaoExportarGrafico
            dados={dadosTotais}
            colunas={[
              { key: 'label', label: 'Período' },
              { key: 'value', label: 'Total' },
            ]}
            titulo={`Totais de Processos (${modo}) — Sistema Geo`}
            modulo="sistemaGeo"
          />
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={dadosTotais}
            margin={{ top: 20, right: 24, left: 0, bottom: 32 }}
          >
            <defs>
              <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1F3864" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#1F3864" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              angle={modo === 'anual' ? 0 : -45}
              textAnchor={modo === 'anual' ? 'middle' : 'end'}
              height={modo === 'anual' ? 30 : 60}
              interval={modo === 'diario' ? 6 : 0}
            />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNumero} />
            <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#1F3864"
              strokeWidth={2.5}
              fill="url(#totalGradient)"
              dot={{ r: 4, fill: '#1F3864' }}
              activeDot={{ r: 6 }}
            >
              {modo === 'anual' && (
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={fmtNumero}
                  style={{ fontSize: 11, fill: '#1F3864', fontWeight: 'bold' }}
                />
              )}
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom chart: Comparativo Anual por Mês */}
      {comparativo.anos.length > 0 && (
        <div className="bg-white rounded-md shadow-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-navy text-center uppercase tracking-wide flex-1">
              Comparativos Anuais
            </h3>
            <BotaoExportarGrafico
              dados={comparativo.data}
              colunas={[
                { key: 'mes', label: 'Mês' },
                ...comparativo.anos.map((ano) => ({ key: String(ano), label: String(ano) })),
              ]}
              titulo="Comparativos Anuais — Sistema Geo"
              modulo="sistemaGeo"
            />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={comparativo.data}
              margin={{ top: 12, right: 24, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNumero} />
              <Tooltip
                content={<ChartTooltip />}
                wrapperStyle={{ zIndex: 50 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {comparativo.anos.map((ano) => (
                <Line
                  key={ano}
                  type="monotone"
                  dataKey={ano}
                  name={ano}
                  stroke={COR_POR_ANO[ano] || '#888888'}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
