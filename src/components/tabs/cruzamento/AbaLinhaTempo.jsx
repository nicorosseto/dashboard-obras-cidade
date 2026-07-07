// Aba 4 — Linha do Tempo. Extraído de PaginaGeo4Cruzamento.jsx (Fase M5, Etapa 2).
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import ChartTooltip from '../../charts/ChartTooltip.jsx'
import { NAVY } from '../../../lib/cores.js'
import { fmtMes } from '../../../lib/cruzamento.js'
import { SecaoCard } from './shared.jsx'
import { VERDE, VIOLET } from './cores.js'

export default function AbaLinhaTempo({ prazosBinsArr, evolucaoMensal }) {
  return (
    <div className="space-y-5">
      <SecaoCard titulo="Prazo entre cadastro no Sistema Geo e primeiro laudo de fiscalização">
        <p className="text-xs text-gray-500 mb-4">
          Para os processos em comum, quantos dias passaram entre a data de cadastro no Sistema Geo e
          o laudo de fiscalização mais antigo? Períodos longos indicam atraso na fiscalização.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={prazosBinsArr} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip unidade="processos" />} wrapperStyle={{ zIndex: 50 }} />
            <Bar dataKey="count" name="Processos" fill={VIOLET} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SecaoCard>

      <SecaoCard titulo="Evolução mensal — entradas no Sistema Geo × laudos de Fiscalização (últimos 24 meses)">
        <p className="text-xs text-gray-500 mb-4">
          Comparação mês a mês do volume de novas obras cadastradas no Sistema Geo
          e de laudos de fiscalização emitidos. Divergências prolongadas indicam gargalo.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={evolucaoMensal} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mes" tickFormatter={fmtMes} tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip labelFormatter={fmtMes} />} wrapperStyle={{ zIndex: 50 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="sistemaGeo" name="Entradas Sistema Geo"   stroke={NAVY}  strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="fisc"     name="Laudos Fiscalização" stroke={VERDE} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </SecaoCard>
    </div>
  )
}
