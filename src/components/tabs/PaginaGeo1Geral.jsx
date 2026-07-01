import { useMemo, useState } from 'react'
import BotaoExportarGrafico from '../BotaoExportarGrafico.jsx'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from 'recharts'
import { fmtNumero, topPermissionarias } from '../../lib/aggregations.js'
import ChartTooltip from '../charts/ChartTooltip.jsx'
import { usePaginadorGrafico, ControlePaginacao } from '../charts/PaginadorGrafico.jsx'

const DONUT_COLORS = [
  '#1F3864',
  '#2E4F7F',
  '#4472C4',
  '#C00000',
  '#E55B4D',
  '#0E8A6B', // "Demais Serviços" — verde-teal, bom contraste no branco
  '#374151', // "Outros" — cinza-grafite escuro, legível no branco
]

function LegendItem({ d, color }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div
      onMouseEnter={() => d.detalhe && setAberto(true)}
      onMouseLeave={() => setAberto(false)}
    >
      <div className="flex items-center gap-1.5 text-xs px-1 py-0.5 rounded hover:bg-grey-bg cursor-default">
        <div
          className="w-2.5 h-2.5 rounded-sm shrink-0"
          style={{ background: color }}
        />
        <span className="flex-1 truncate min-w-0">{d.nome}</span>
        <span className="text-gray-500 shrink-0 tabular-nums">
          {fmtNumero(d.valor)}
        </span>
        <span className="text-gray-400 shrink-0 tabular-nums w-7 text-right">
          {d.pct}%
        </span>
        {d.detalhe && (
          <span className="text-gray-400 text-[10px] shrink-0">
            {aberto ? '▲' : '▼'}
          </span>
        )}
      </div>
      {aberto && d.detalhe && d.detalhe.length > 0 && (
        <div className="ml-4 pl-2 border-l-2 border-grey-line mt-0.5 mb-1 space-y-0.5">
          {d.detalhe.map(({ nome, valor }) => (
            <div
              key={nome}
              className="flex items-center justify-between text-[10px] text-gray-500 px-1"
            >
              <span className="truncate min-w-0">{nome}</span>
              <span className="shrink-0 ml-2 font-medium text-gray-700 tabular-nums">
                {fmtNumero(valor)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TooltipDonut({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-grey-line rounded shadow-card p-2 text-xs w-[210px]">
      <div className="font-semibold text-navy mb-0.5 truncate">{d.nome}</div>
      <div className="text-gray-600">
        {fmtNumero(d.valor)} processos ({d.pct}%)
      </div>
      {d.detalhe && d.detalhe.length > 0 && (
        <div className="mt-2 pt-1 border-t border-grey-line space-y-0.5">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
            Inclui
          </div>
          {d.detalhe.map(({ nome, valor }) => (
            <div key={nome} className="flex items-center justify-between gap-3">
              <span className="text-gray-500 truncate min-w-0">{nome}</span>
              <span className="text-gray-700 font-medium shrink-0 tabular-nums">
                {fmtNumero(valor)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChartCard({ titulo, acoes, children }) {
  return (
    <div className="bg-white rounded-md shadow-card p-4 flex flex-col">
      {titulo && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-navy uppercase tracking-wide flex-1 text-center">
            {titulo}
          </h3>
          {acoes && <div className="ml-2 flex-shrink-0">{acoes}</div>}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  )
}

export default function PaginaGeo1Geral({ rows }) {
  // Donut: tipo_processo_nome - top 6 + Outros (com detalhamento no tooltip)
  const tipoProcessoData = useMemo(() => {
    const map = new Map()
    rows.forEach((r) => {
      const k = r.tipo_processo_nome || r.tipo_processo || '(sem)'
      map.set(k, (map.get(k) || 0) + 1)
    })
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    const top6 = sorted.slice(0, 6)
    const outrosList = sorted.slice(6)
    const outrosTotal = outrosList.reduce((s, [, v]) => s + v, 0)
    const result = top6.map(([nome, valor]) => ({ nome, valor, detalhe: null }))
    if (outrosTotal > 0)
      result.push({
        nome: 'Outros',
        valor: outrosTotal,
        detalhe: outrosList
          .map(([nome, valor]) => ({ nome, valor }))
          .sort((a, b) => b.valor - a.valor),
      })
    const total = result.reduce((s, d) => s + d.valor, 0)
    return result.map((d) => ({
      ...d,
      pct: total ? Math.round((d.valor / total) * 100) : 0,
    }))
  }, [rows])

  // Drill-down NORCREST: quando todos os rows são NORCREST, desagrega por unidade
  const norcrestDrillDown = useMemo(
    () => rows.length > 0 && rows.every((r) => r.permissionaria && String(r.permissionaria).toUpperCase().startsWith('NORCREST')),
    [rows]
  )

  // Horizontal bar: top 10 permissionárias — desagrega todas as unidades quando NORCREST filtrada
  const permissionariasData = useMemo(() => {
    const limite = norcrestDrillDown ? Infinity : 10
    return topPermissionarias(rows, limite, !norcrestDrillDown).map(({ nome, count }) => ({
      nome,
      total: count,
    }))
  }, [rows, norcrestDrillDown])

  // Paginação no drill-down da NORCREST (mantém o gráfico legível: 8 por vez).
  const pagPerm = usePaginadorGrafico(permissionariasData, { tamanho: 8, ativo: norcrestDrillDown })

  // Vertical bar: etapa_nome
  const etapaData = useMemo(() => {
    const map = new Map()
    rows.forEach((r) => {
      const k = r.etapa_nome
      if (!k) return
      map.set(k, (map.get(k) || 0) + 1)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([nome, total]) => ({ nome, total }))
  }, [rows])

  // Vertical bar: tipo_obra_nome (oculta categoria sem valor)
  const tipoObraData = useMemo(() => {
    const map = new Map()
    rows.forEach((r) => {
      const k = r.tipo_obra_nome || r.tipo_obra
      if (!k) return
      map.set(k, (map.get(k) || 0) + 1)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([nome, total]) => ({ nome, total }))
  }, [rows])

  // Vertical bar: status — drill-down automático quando 1 único grupo está filtrado
  const statusData = useMemo(() => {
    const gruposSet = new Set(rows.map((r) => r.status_unificado || '(sem)'))
    if (gruposSet.size === 1 && rows.length > 0) {
      const grupoAtivo = Array.from(gruposSet)[0]
      const map = new Map()
      rows.forEach((r) => {
        const k = r.status_nome || r.status || '(sem)'
        map.set(k, (map.get(k) || 0) + 1)
      })
      return {
        modo: 'individual',
        grupoAtivo,
        dados: Array.from(map.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([nome, total]) => ({ nome, total })),
      }
    }
    const map = new Map()
    rows.forEach((r) => {
      const k = r.status_unificado || '(sem)'
      map.set(k, (map.get(k) || 0) + 1)
    })
    return {
      modo: 'grupo',
      grupoAtivo: null,
      dados: Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([nome, total]) => ({ nome, total })),
    }
  }, [rows])

  const totalProcessos = rows.length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut: tipo_processo_nome */}
        <ChartCard
          titulo="Processos por Tipo"
          acoes={
            <BotaoExportarGrafico
              dados={tipoProcessoData}
              colunas={[
                { key: 'nome', label: 'Tipo de Processo' },
                { key: 'valor', label: 'Total' },
                { key: 'pct', label: '% do Total' },
              ]}
              titulo="Processos por Tipo — Sistema Geo"
              modulo="sistemaGeo"
            />
          }
        >
          <div className="flex items-center gap-2">
            {/* Donut — box com folga para os rótulos de % não serem cortados */}
            <div
              className="relative shrink-0"
              style={{ width: 240, height: 240 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={tipoProcessoData}
                    dataKey="valor"
                    nameKey="nome"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={82}
                    paddingAngle={1}
                    startAngle={90}
                    endAngle={-270}
                    labelLine={false}
                    label={(e) => (e.pct >= 3 ? `${e.pct}%` : '')}
                    style={{ fontSize: '10px' }}
                  >
                    {tipoProcessoData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={DONUT_COLORS[i] || '#888'}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<TooltipDonut />}
                    wrapperStyle={{ zIndex: 50 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Total
                </div>
                <div className="text-lg font-bold text-navy">
                  {fmtNumero(totalProcessos)}
                </div>
              </div>
            </div>

            {/* Legenda lateral com hover-expand para "Outros" — largura limitada
              para os valores ficarem próximos dos nomes */}
            <div className="flex-1 min-w-0 flex justify-center">
              <div className="w-full max-w-[280px] space-y-0.5">
                {tipoProcessoData.map((d, i) => (
                  <LegendItem
                    key={d.nome}
                    d={d}
                    color={DONUT_COLORS[i] || '#888'}
                  />
                ))}
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Horizontal bar: top 10 permissionárias (desagrega NORCREST quando filtrada) */}
        <ChartCard
          titulo={norcrestDrillDown ? 'NORCREST — por Unidade' : 'Top 10 Permissionárias'}
          acoes={
            <BotaoExportarGrafico
              dados={permissionariasData}
              colunas={[
                { key: 'nome', label: norcrestDrillDown ? 'Unidade NORCREST' : 'Permissionária' },
                { key: 'total', label: 'Total' },
              ]}
              titulo={norcrestDrillDown ? 'NORCREST — Todas as Unidades — Sistema Geo' : 'Top 10 Permissionárias — Sistema Geo'}
              modulo="sistemaGeo"
            />
          }
        >
          <ResponsiveContainer
            width="100%"
            height={Math.max(220, pagPerm.itens.length * 26)}
          >
            <BarChart
              data={pagPerm.itens}
              layout="vertical"
              margin={{ top: 4, right: 52, left: 0, bottom: 4 }}
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
                tick={{ fontSize: 10 }}
                width={130}
              />
              <Tooltip
                content={<ChartTooltip />}
                wrapperStyle={{ zIndex: 50 }}
              />
              <Bar dataKey="total" fill="#1F3864" radius={[0, 3, 3, 0]}>
                <LabelList
                  dataKey="total"
                  position="right"
                  style={{ fontSize: 10, fill: '#1F3864', fontWeight: 'bold' }}
                  formatter={fmtNumero}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {pagPerm.ligado && <ControlePaginacao {...pagPerm} />}
        </ChartCard>
      </div>

      {/* Linha inferior: 3 gráficos de barras em colunas iguais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tipo de Obra */}
        <ChartCard
          titulo="Processos por Tipo de Obra"
          acoes={
            <BotaoExportarGrafico
              dados={tipoObraData}
              colunas={[
                { key: 'nome', label: 'Tipo de Obra' },
                { key: 'total', label: 'Total' },
              ]}
              titulo="Processos por Tipo de Obra — Sistema Geo"
              modulo="sistemaGeo"
            />
          }
        >
          <ResponsiveContainer
            width="100%"
            height={Math.max(200, tipoObraData.length * 28)}
          >
            <BarChart
              data={tipoObraData}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 0, bottom: 4 }}
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
                tick={{ fontSize: 10 }}
                width={120}
              />
              <Tooltip
                content={<ChartTooltip />}
                wrapperStyle={{ zIndex: 50 }}
              />
              <Bar dataKey="total" fill="#2E4F7F" radius={[0, 3, 3, 0]}>
                <LabelList
                  dataKey="total"
                  position="right"
                  style={{ fontSize: 10, fill: '#2E4F7F', fontWeight: 'bold' }}
                  formatter={fmtNumero}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Status — grupos ou sub-status conforme filtro */}
        <ChartCard
          titulo={
            statusData.modo === 'individual'
              ? `Status — ${statusData.grupoAtivo}`
              : 'Processos por Status'
          }
          acoes={
            <BotaoExportarGrafico
              dados={statusData.dados}
              colunas={[
                { key: 'nome', label: 'Status' },
                { key: 'total', label: 'Total' },
              ]}
              titulo="Processos por Status — Sistema Geo"
              modulo="sistemaGeo"
            />
          }
        >
          <ResponsiveContainer
            width="100%"
            height={Math.max(200, statusData.dados.length * 28)}
          >
            <BarChart
              data={statusData.dados}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 0, bottom: 4 }}
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
                tick={{ fontSize: 10 }}
                width={statusData.modo === 'individual' ? 150 : 120}
              />
              <Tooltip
                content={<ChartTooltip />}
                wrapperStyle={{ zIndex: 50 }}
              />
              <Bar dataKey="total" fill="#1F3864" radius={[0, 3, 3, 0]}>
                <LabelList
                  dataKey="total"
                  position="right"
                  style={{ fontSize: 10, fill: '#1F3864', fontWeight: 'bold' }}
                  formatter={fmtNumero}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Etapa */}
        <ChartCard
          titulo="Processos por Etapa"
          acoes={
            <BotaoExportarGrafico
              dados={etapaData}
              colunas={[
                { key: 'nome', label: 'Etapa' },
                { key: 'total', label: 'Total' },
              ]}
              titulo="Processos por Etapa — Sistema Geo"
              modulo="sistemaGeo"
            />
          }
        >
          <ResponsiveContainer
            width="100%"
            height={Math.max(200, etapaData.length * 28)}
          >
            <BarChart
              data={etapaData}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 0, bottom: 4 }}
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
                tick={{ fontSize: 10 }}
                width={120}
              />
              <Tooltip
                content={<ChartTooltip />}
                wrapperStyle={{ zIndex: 50 }}
              />
              <Bar dataKey="total" fill="#1F3864" radius={[0, 3, 3, 0]}>
                <LabelList
                  dataKey="total"
                  position="right"
                  style={{ fontSize: 10, fill: '#1F3864', fontWeight: 'bold' }}
                  formatter={fmtNumero}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
