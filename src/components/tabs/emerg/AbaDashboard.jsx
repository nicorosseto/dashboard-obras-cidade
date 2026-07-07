import { useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  LineChart, Line,
} from 'recharts'
import { fmtNumero, consolidarNorcrest } from '../../../lib/aggregations.js'
import {
  STATUS_COLOR, STATUS_PADRAO, fmtMesAno,
  agregaStatusComOutros, agregaPorPermissionaria, agregaPorSubprefeitura,
  agregaPorEtapa, evolucaoMensal,
} from '../../../lib/emergencias.js'
import ChartTooltip from '../../charts/ChartTooltip.jsx'
import { usePaginadorGrafico, ControlePaginacao } from '../../charts/PaginadorGrafico.jsx'
import { KpiCard, ChartCard } from './shared.jsx'
import { NAVY, NAVY_LIGHT, NAVY_MID, RED } from '../../../lib/cores.js'

// Card "Outros" da Visão Geral: mostra o total agrupado e, ao passar o mouse,
// um popover com os status reais contemplados (cor + nome + contagem).
function CardOutrosStatus({ outros }) {
  const [aberto, setAberto] = useState(false)
  if (!outros || outros.qtd === 0) return null
  return (
    <div
      className="relative"
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
    >
      <div className="bg-white border border-grey-line rounded-lg p-3 cursor-help h-full flex flex-col justify-between hover:border-navy/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Outros status</span>
          <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div>
          <div className="text-2xl font-bold" style={{ color: STATUS_PADRAO }}>{fmtNumero(outros.qtd)}</div>
          <p className="text-[10px] text-gray-400 leading-tight">
            {outros.detalhe.length} status agrupados · passe o mouse
          </p>
        </div>
      </div>
      {aberto && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-grey-line rounded-lg shadow-xl p-3 w-60 text-xs">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-2 border-b border-grey-line pb-1">
            Status contemplados em "Outros"
          </p>
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {outros.detalhe.map(({ status, qtd }) => (
              <div key={status} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ background: STATUS_COLOR[status] || STATUS_PADRAO }} />
                <span className="flex-1 truncate text-gray-700">{status}</span>
                <span className="text-gray-500 font-semibold shrink-0">{fmtNumero(qtd)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AbaDashboard({ linhas }) {
  const totalProcessos = linhas.length
  const totalInformadas = useMemo(
    () => linhas.filter((r) => r.status === 'Informada').length,
    [linhas]
  )
  const permissionariasComInf = useMemo(
    () => new Set(linhas.filter((r) => r.status === 'Informada').map((r) => consolidarNorcrest(r.permissionaria))).size,
    [linhas]
  )
  const subsAfetadas = useMemo(
    () => new Set(linhas.filter((r) => r.status === 'Informada').map((r) => r.subprefeitura).filter(Boolean)).size,
    [linhas]
  )

  const norcrestDrillDown = useMemo(
    () => linhas.length > 0 && linhas.every((r) => r.permissionaria && String(r.permissionaria).toUpperCase().startsWith('NORCREST')),
    [linhas]
  )

  // Agrupa em 4 status fixos + "Outros" (com detalhe dos status agrupados)
  const { fixos: statusFixos, outros: statusOutros } = useMemo(() => agregaStatusComOutros(linhas), [linhas])
  const porStatus = useMemo(() => {
    const arr = statusFixos.filter((s) => s.qtd > 0)
    if (statusOutros.qtd > 0) arr.push({ status: statusOutros.status, qtd: statusOutros.qtd })
    return arr.sort((a, b) => b.qtd - a.qtd)
  }, [statusFixos, statusOutros])
  const topPermInf    = useMemo(() => {
    const lista = agregaPorPermissionaria(linhas, { consolidar: !norcrestDrillDown, somenteInformadas: true })
    return norcrestDrillDown ? lista : lista.slice(0, 15)
  }, [linhas, norcrestDrillDown])
  // Paginação no drill-down da NORCREST (8 unidades por vez).
  const pagPerm = usePaginadorGrafico(topPermInf, { tamanho: 8, ativo: norcrestDrillDown })
  const topSubInf     = useMemo(() => agregaPorSubprefeitura(linhas, { somenteInformadas: true }).slice(0, 15), [linhas])
  const porEtapa      = useMemo(() => agregaPorEtapa(linhas), [linhas])
  const evolMensal    = useMemo(() => evolucaoMensal(linhas).slice(-18), [linhas])

  const pctInformadas = totalProcessos ? ((totalInformadas / totalProcessos) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 gap-3 ${statusOutros.qtd > 0 ? 'md:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-4'}`}>
        <KpiCard label="Total de Processos" valor={totalProcessos} cor={NAVY} destaque />
        <KpiCard label="Em Aberto (Informadas)" valor={totalInformadas} cor={RED} destaque pct={parseFloat(pctInformadas)} />
        <KpiCard label="Permissionárias Afetadas" valor={permissionariasComInf} cor={NAVY_LIGHT} />
        <KpiCard label="Subprefeituras Afetadas" valor={subsAfetadas} cor={NAVY_MID} />
        <CardOutrosStatus outros={statusOutros} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard titulo="Distribuição por Status (geral)">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={porStatus} dataKey="qtd" nameKey="status" cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={1}>
                {porStatus.map((s, i) => (
                  <Cell key={i} fill={STATUS_COLOR[s.status] || STATUS_PADRAO} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center">
            {porStatus.map((s) => (
              <div key={s.status} className="flex items-center gap-1 text-[10px] text-gray-600">
                <div className="w-2.5 h-2.5 rounded-xs" style={{ background: STATUS_COLOR[s.status] || STATUS_PADRAO }} />
                <span>{s.status} ({fmtNumero(s.qtd)})</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard titulo={norcrestDrillDown ? 'NORCREST — por Unidade com Informadas' : 'Top 15 Permissionárias com Informadas'}>
          <ResponsiveContainer width="100%" height={Math.max(280, pagPerm.itens.length * 22)}>
            <BarChart data={pagPerm.itens} layout="vertical" margin={{ top: 4, right: 60, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E0E0E0" />
              <XAxis type="number" tick={{ fontSize: 10 }} hide />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={130} />
              <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
              <Bar dataKey="total" fill={RED} radius={[0, 3, 3, 0]}>
                <LabelList dataKey="total" position="right" style={{ fontSize: 10, fill: RED, fontWeight: 'bold' }} formatter={fmtNumero} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {pagPerm.ligado && <ControlePaginacao {...pagPerm} />}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard titulo="Top 15 Subprefeituras com Informadas">
          <ResponsiveContainer width="100%" height={Math.max(280, topSubInf.length * 22)}>
            <BarChart data={topSubInf} layout="vertical" margin={{ top: 4, right: 60, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E0E0E0" />
              <XAxis type="number" tick={{ fontSize: 10 }} hide />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={70} />
              <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
              <Bar dataKey="qtd" fill={RED} radius={[0, 3, 3, 0]}>
                <LabelList dataKey="qtd" position="right" style={{ fontSize: 10, fill: RED, fontWeight: 'bold' }} formatter={fmtNumero} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard titulo="Por Etapa (AIO × ATO)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={porEtapa} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="etapa" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNumero} />
              <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
              <Bar dataKey="Informada" stackId="a" fill={RED}>
                <LabelList dataKey="Informada" position="center" style={{ fontSize: 10, fill: '#fff', fontWeight: 'bold' }} formatter={fmtNumero} />
              </Bar>
              <Bar dataKey="Encerrada" stackId="a" fill="#1F7A4D">
                <LabelList dataKey="Encerrada" position="center" style={{ fontSize: 10, fill: '#fff', fontWeight: 'bold' }} formatter={fmtNumero} />
              </Bar>
              <Bar dataKey="Outras" stackId="a" fill="#6B7280">
                <LabelList dataKey="Outras" position="center" style={{ fontSize: 10, fill: '#fff', fontWeight: 'bold' }} formatter={fmtNumero} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 mt-1 text-[10px] text-gray-600">
            <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-xs bg-red" /> Informada</span>
            <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-xs" style={{ background: '#1F7A4D' }} /> Encerrada</span>
            <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-xs" style={{ background: '#6B7280' }} /> Outras</span>
          </div>
        </ChartCard>
      </div>

      {evolMensal.length > 0 && (
        <ChartCard titulo="Evolução Mensal — últimos 18 meses">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolMensal} margin={{ top: 12, right: 24, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickFormatter={fmtMesAno} angle={-45} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNumero} />
              <Tooltip content={<ChartTooltip labelFormatter={fmtMesAno} />} wrapperStyle={{ zIndex: 50 }} />
              <Line type="monotone" dataKey="informadas" name="Informadas" stroke={RED} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="encerradas" name="Encerradas" stroke="#1F7A4D" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 mt-1 text-[10px] text-gray-600">
            <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-xs bg-red" /> Informadas</span>
            <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-xs" style={{ background: '#1F7A4D' }} /> Encerradas</span>
          </div>
        </ChartCard>
      )}
    </div>
  )
}
