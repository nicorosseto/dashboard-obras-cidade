import { useMemo } from 'react'
import BotaoExportarGrafico from '../BotaoExportarGrafico.jsx'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { SIGLA_TO_NOME } from '../../data/subprefeituras-sp.js'
import {
  contagemPorSubprefeituraGeo,
  processosPorRegiao,
  topPermissionarias,
  fmtNumero,
} from '../../lib/aggregations.js'
import ChartTooltip from '../charts/ChartTooltip.jsx'
import MapaSP from '../charts/MapaSP.jsx'
import { usePaginadorGrafico, ControlePaginacao } from '../charts/PaginadorGrafico.jsx'

const COR_REGIAO = {
  Leste: '#5B9BD5',
  Sul: '#4472C4',
  Oeste: '#ED7D31',
  Central: '#7030A0',
  Norte: '#E91E63',
  'Não classificado': '#888888',
}

export default function PaginaGeo3Subprefeitura({
  rows,
  contagensMapa,
  subSelecionadas,
  onSelecionarSub,
}) {
  const contagens = useMemo(() => contagemPorSubprefeituraGeo(rows), [rows])

  // Top 15 subprefeituras — descending (maior em cima).
  // Recharts BarChart layout="vertical" pinta o índice 0 do array no TOPO do eixo Y.
  const barData = useMemo(() => {
    return Array.from(contagens.entries())
      .filter(([k]) => k !== '(sem)')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([sigla, total]) => ({
        nome: SIGLA_TO_NOME[sigla]
          ? `${SIGLA_TO_NOME[sigla]} (${sigla})`
          : sigla,
        total,
      }))
  }, [contagens])

  // Drill-down NORCREST: quando todos os rows são NORCREST, desagrega por unidade
  const norcrestDrillDown = useMemo(
    () => rows.length > 0 && rows.every((r) => r.permissionaria && String(r.permissionaria).toUpperCase().startsWith('NORCREST')),
    [rows]
  )

  // Top 10 permissionárias — desagrega todas as unidades quando NORCREST filtrada
  const permData = useMemo(() => {
    const limite = norcrestDrillDown ? Infinity : 10
    return topPermissionarias(rows, limite, !norcrestDrillDown).map(({ nome, count }) => ({
      nome,
      total: count,
    }))
  }, [rows, norcrestDrillDown])

  // Paginação no drill-down da NORCREST (8 unidades por vez).
  const pagPerm = usePaginadorGrafico(permData, { tamanho: 8, ativo: norcrestDrillDown })

  // Pizza por Região
  const regiaoData = useMemo(() => processosPorRegiao(rows), [rows])

  return (
    <div className="space-y-4">
      {/* Top row: mapa + top 15 subprefeituras */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        style={{ minHeight: 420 }}
      >
        <MapaSP
          titulo="Mapa de Processos por Subprefeitura"
          contagens={contagensMapa || contagens}
          unidade="processos"
          selecionadas={subSelecionadas}
          onSelecionar={onSelecionarSub}
        />

        <div className="bg-white rounded-md shadow-card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-navy text-center uppercase tracking-wide flex-1">
              Processos por Subprefeitura (Top 15)
            </h3>
            <BotaoExportarGrafico
              dados={barData}
              colunas={[
                { key: 'nome', label: 'Subprefeitura' },
                { key: 'total', label: 'Total' },
              ]}
              titulo="Processos por Subprefeitura (Top 15) — Sistema Geo"
              modulo="sistemaGeo"
            />
          </div>
          <ResponsiveContainer
            width="100%"
            height={Math.max(400, barData.length * 26)}
          >
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 4, right: 60, left: 0, bottom: 4 }}
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
                width={160}
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
        </div>
      </div>

      {/* Bottom row: top 10 permissionárias + pizza região */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-md shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-navy text-center uppercase tracking-wide flex-1">
              {norcrestDrillDown ? 'NORCREST — por Unidade' : 'Obras por Permissionária (Top 10)'}
            </h3>
            <BotaoExportarGrafico
              dados={permData}
              colunas={[
                { key: 'nome', label: norcrestDrillDown ? 'Unidade NORCREST' : 'Permissionária' },
                { key: 'total', label: 'Total' },
              ]}
              titulo={norcrestDrillDown ? 'NORCREST — por Unidade — Sistema Geo' : 'Obras por Permissionária (Top 10) — Sistema Geo'}
              modulo="sistemaGeo"
            />
          </div>
          <ResponsiveContainer
            width="100%"
            height={Math.max(280, pagPerm.itens.length * 30)}
          >
            <BarChart
              data={pagPerm.itens}
              margin={{ top: 20, right: 12, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis
                dataKey="nome"
                tick={{ fontSize: 9 }}
                angle={-45}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNumero} />
              <Tooltip
                content={<ChartTooltip />}
                wrapperStyle={{ zIndex: 50 }}
              />
              <Bar dataKey="total" fill="#1F3864" radius={[3, 3, 0, 0]}>
                <LabelList
                  dataKey="total"
                  position="top"
                  style={{ fontSize: 9, fill: '#1F3864', fontWeight: 'bold' }}
                  formatter={fmtNumero}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {pagPerm.ligado && <ControlePaginacao {...pagPerm} />}
        </div>

        <div className="bg-white rounded-md shadow-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-navy text-center uppercase tracking-wide flex-1">
              Obras por Região
            </h3>
            <BotaoExportarGrafico
              dados={regiaoData}
              colunas={[
                { key: 'regiao', label: 'Região' },
                { key: 'count', label: 'Total' },
                { key: 'pct', label: '% do Total' },
              ]}
              titulo="Obras por Região — Sistema Geo"
              modulo="sistemaGeo"
            />
          </div>
          <div className="relative">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={regiaoData}
                  dataKey="count"
                  nameKey="regiao"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  labelLine={false}
                  label={(e) => `${fmtNumero(e.count)} (${e.pct}%)`}
                  style={{ fontSize: '10px' }}
                >
                  {regiaoData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={COR_REGIAO[d.regiao] || '#888'}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<ChartTooltip />}
                  wrapperStyle={{ zIndex: 50 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
            {regiaoData.map((d) => (
              <div
                key={d.regiao}
                className="flex items-center gap-1 text-[10px] text-gray-600"
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: COR_REGIAO[d.regiao] || '#888' }}
                />
                <span>Região {d.regiao}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
