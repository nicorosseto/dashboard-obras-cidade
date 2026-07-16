import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  LineChart, Line,
} from 'recharts'
import { fmtNumero } from '../../../lib/aggregations.js'
import {
  resumoVinculo,
  fmtValorBRL,
  valorTotalMultas,
  agregaMultasPorPermissionaria,
  agregaMultasPorStatus,
  agregaMultasPorMes,
  agregaSituacaoVinculo,
} from '../../../lib/multas.js'
import { fmtMesAno } from '../../../lib/emergencias.js'
import ChartTooltip from '../../charts/ChartTooltip.jsx'
import BotaoExportarGrafico from '../../BotaoExportarGrafico.jsx'
import { ChartCard, KpiCard } from '../emerg/shared.jsx'
import { NAVY, NAVY_LIGHT, NAVY_MID, RED } from '../../../lib/cores.js'

const COR_STATUS = {
  LAVRADO: NAVY,
  'NÃO LAVRADO': '#6B7280',
  'NAO LAVRADO': '#6B7280',
  PENDENTE: '#F59E0B',
  'Sem status': '#9CA3AF',
}

export default function AbaMultasGeral({ linhas }) {
  const resumo = useMemo(() => resumoVinculo(linhas), [linhas])
  const valorTotal = useMemo(() => valorTotalMultas(linhas), [linhas])
  const pctVinculadas = resumo.total ? ((resumo.vinculadas / resumo.total) * 100).toFixed(1) : '0.0'

  const porPermissionaria = useMemo(() => agregaMultasPorPermissionaria(linhas).slice(0, 10), [linhas])
  const porStatus = useMemo(() => agregaMultasPorStatus(linhas), [linhas])
  const porMes = useMemo(() => agregaMultasPorMes(linhas).slice(-18), [linhas])
  const porSituacao = useMemo(() => agregaSituacaoVinculo(linhas), [linhas])

  const colsPerm = [{ key: 'nome', label: 'Permissionária' }, { key: 'total', label: 'Total de Multas' }]
  const colsStatus = [{ key: 'status', label: 'Status' }, { key: 'qtd', label: 'Quantidade' }]
  const colsMes = [{ key: 'mes', label: 'Mês' }, { key: 'qtd', label: 'Quantidade' }]
  const colsSituacao = [{ key: 'nome', label: 'Situação' }, { key: 'qtd', label: 'Quantidade' }]

  return (
    <div className="space-y-4" data-tour="multas-kpis">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total de Multas" valor={resumo.total} cor={RED} destaque />
        <div className="bg-white rounded-md shadow-card px-3 py-2.5 border-l-4" style={{ borderLeftColor: NAVY }}>
          <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold truncate" title="Valor Total (R$)">
            Valor Total (R$)
          </div>
          <div className="font-bold mt-0.5 tabular-nums text-2xl" style={{ color: NAVY }}>{fmtValorBRL(valorTotal)}</div>
        </div>
        <KpiCard label="Vinculadas" valor={resumo.vinculadas} cor={NAVY_LIGHT} pct={parseFloat(pctVinculadas)} />
        <KpiCard label="Processo Inexistente" valor={resumo.processoInexistente} cor={RED} />
        <KpiCard label="Sem Processo" valor={resumo.semProcesso} cor={NAVY_MID} />
        <KpiCard label="% Vinculadas" valor={parseFloat(pctVinculadas)} cor={NAVY_LIGHT} sufixo="%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard titulo="Multas por Permissionária (top 10)">
          <div className="relative">
            <div className="absolute -top-8 right-0 z-10">
              <BotaoExportarGrafico dados={porPermissionaria} colunas={colsPerm} titulo="Multas por Permissionária" modulo="multas" />
            </div>
            <ResponsiveContainer width="100%" height={Math.max(280, porPermissionaria.length * 26)}>
              <BarChart data={porPermissionaria} layout="vertical" margin={{ top: 4, right: 60, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E0E0E0" />
                <XAxis type="number" tick={{ fontSize: 10 }} hide />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={130} />
                <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
                <Bar dataKey="total" fill={RED} radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="total" position="right" style={{ fontSize: 10, fill: RED, fontWeight: 'bold' }} formatter={fmtNumero} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard titulo="Situação do Vínculo">
          <div className="relative">
            <div className="absolute -top-8 right-0 z-10">
              <BotaoExportarGrafico dados={porSituacao} colunas={colsSituacao} titulo="Situação do Vínculo das Multas" modulo="multas" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={porSituacao} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={1}>
                  {porSituacao.map((s, i) => (
                    <Cell key={i} fill={s.cor} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center">
              {porSituacao.map((s) => (
                <div key={s.situacao} className="flex items-center gap-1 text-[10px] text-gray-600">
                  <div className="w-2.5 h-2.5 rounded-xs" style={{ background: s.cor }} />
                  <span>{s.nome} ({fmtNumero(s.qtd)})</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard titulo="Por Status">
          <div className="relative">
            <div className="absolute -top-8 right-0 z-10">
              <BotaoExportarGrafico dados={porStatus} colunas={colsStatus} titulo="Multas por Status" modulo="multas" />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={porStatus} dataKey="qtd" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={1}>
                  {porStatus.map((s, i) => (
                    <Cell key={i} fill={COR_STATUS[s.status] || '#9CA3AF'} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center">
              {porStatus.map((s) => (
                <div key={s.status} className="flex items-center gap-1 text-[10px] text-gray-600">
                  <div className="w-2.5 h-2.5 rounded-xs" style={{ background: COR_STATUS[s.status] || '#9CA3AF' }} />
                  <span>{s.status} ({fmtNumero(s.qtd)})</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {porMes.length > 0 && (
          <ChartCard titulo="Multas por Mês (infração) — últimos 18 meses">
            <div className="relative">
              <div className="absolute -top-8 right-0 z-10">
                <BotaoExportarGrafico dados={porMes} colunas={colsMes} titulo="Multas por Mês" modulo="multas" />
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={porMes} margin={{ top: 12, right: 24, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickFormatter={fmtMesAno} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNumero} />
                  <Tooltip content={<ChartTooltip labelFormatter={fmtMesAno} />} wrapperStyle={{ zIndex: 50 }} />
                  <Line type="monotone" dataKey="qtd" name="Multas" stroke={RED} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>
    </div>
  )
}
