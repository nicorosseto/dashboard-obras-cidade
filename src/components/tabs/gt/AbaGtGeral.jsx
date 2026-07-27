import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { fmtNumero, fmtAreaDecimal } from '../../../lib/aggregations.js'
import {
  kpisGt,
  agregaGtPorPermissionaria,
  todasGtNorcrest,
  agregaGtPorUnidadeNorcrest,
} from '../../../lib/gtObras.js'
import ChartTooltip from '../../charts/ChartTooltip.jsx'
import BotaoExportarGrafico from '../../BotaoExportarGrafico.jsx'
import { ChartCard, KpiCard } from '../emerg/shared.jsx'
import {
  usePaginadorGrafico,
  ControlePaginacao,
} from '../../charts/PaginadorGrafico.jsx'
import { INDIGO, NAVY, NAVY_MID } from '../../../lib/cores.js'

const BLOCOS_ANO = [
  { bloco: '2023', label: '2023' },
  { bloco: '2024', label: '2024' },
  { bloco: '2025_2026', label: '2025/2026' },
]

// Extrai a linha "Total Geral" de cada bloco anual do gt_dash — série
// histórica (seção 8.1 do plano). Não depende dos filtros da sidebar: vem
// direto da planilha, cobrindo 2023/2024 (que a base granular não cobre bem).
function serieHistoricaDash(gtDash) {
  return BLOCOS_ANO.map(({ bloco, label }) => {
    const linha = (gtDash || []).find(
      (d) =>
        d.bloco === bloco &&
        d.tipo_linha === 'total' &&
        /^total geral$/i.test(String(d.permissionaria || '').trim())
    )
    const qtde = Number(linha?.qtde_obras) || 0
    const compat = Number(linha?.obras_compatibilizadas) || 0
    const paral = Number(linha?.obras_paralisadas) || 0
    return {
      ano: label,
      qtde_obras: qtde,
      compatibilizadas: compat,
      paralisadas: paral,
      pct: qtde > 0 ? Math.round((compat / qtde) * 1000) / 10 : 0,
    }
  })
}

export default function AbaGtGeral({ linhas, gtDash }) {
  const kpis = useMemo(() => kpisGt(linhas), [linhas])
  const serieAnual = useMemo(() => serieHistoricaDash(gtDash), [gtDash])

  const norcrestDrill = useMemo(() => todasGtNorcrest(linhas), [linhas])
  const porPermissionaria = useMemo(
    () =>
      norcrestDrill
        ? agregaGtPorUnidadeNorcrest(linhas)
        : agregaGtPorPermissionaria(linhas).slice(0, 10),
    [linhas, norcrestDrill]
  )
  const pagPerm = usePaginadorGrafico(porPermissionaria, {
    tamanho: 8,
    ativo: norcrestDrill,
  })

  const colsAno = [
    { key: 'ano', label: 'Ano' },
    { key: 'qtde_obras', label: 'Qtde de Obras' },
    { key: 'compatibilizadas', label: 'Compatibilizadas' },
    { key: 'paralisadas', label: 'Paralisadas' },
    { key: 'pct', label: '% Compatibilizada' },
  ]
  const colsPerm = [
    { key: 'nome', label: norcrestDrill ? 'Unidade NORCREST' : 'Permissionária' },
    { key: 'total', label: 'Total de Obras' },
  ]

  return (
    <div className="space-y-4" data-tour="gt-kpis">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <KpiCard label="Qtde Total de Obras" valor={kpis.total} cor={INDIGO} destaque />
        <KpiCard
          label="Compatibilizadas"
          valor={kpis.compatibilizadas}
          cor="#1F7A4D"
        />
        <KpiCard label="Paralisadas" valor={kpis.paralisadas} cor="#D97706" />
        <div
          className="bg-white rounded-md shadow-card px-3 py-2.5 border-l-4"
          style={{ borderLeftColor: NAVY_MID }}
        >
          <div
            className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold truncate"
            title="Metragem Compatibilizada (m²)"
          >
            Metragem Compatibilizada
          </div>
          <div
            className="font-bold mt-0.5 tabular-nums text-2xl"
            style={{ color: NAVY_MID }}
          >
            {fmtAreaDecimal(kpis.metragem)}
          </div>
        </div>
        <div
          className="bg-white rounded-md shadow-card px-3 py-2.5 border-l-4"
          style={{ borderLeftColor: NAVY }}
        >
          <div
            className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold truncate"
            title="% Compatibilizada"
          >
            % Compatibilizada
          </div>
          <div
            className="font-bold mt-0.5 tabular-nums text-2xl"
            style={{ color: NAVY }}
          >
            {kpis.pct.toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard titulo="Série Histórica por Ano (planilha DASH)">
          <div className="relative">
            <div className="absolute -top-8 right-0 z-10">
              <BotaoExportarGrafico
                dados={serieAnual}
                colunas={colsAno}
                titulo="Série Histórica por Ano"
                modulo="gt"
              />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={serieAnual}
                margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNumero} />
                <Tooltip
                  content={<ChartTooltip />}
                  wrapperStyle={{ zIndex: 50 }}
                />
                <Bar
                  dataKey="compatibilizadas"
                  name="Compatibilizadas"
                  fill="#1F7A4D"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="paralisadas"
                  name="Paralisadas"
                  fill="#D97706"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard titulo="% Compatibilizada por Ano">
          <div className="relative">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={serieAnual}
                margin={{ top: 12, right: 24, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  wrapperStyle={{ zIndex: 50 }}
                />
                <Line
                  type="monotone"
                  dataKey="pct"
                  name="% Compatibilizada"
                  stroke={INDIGO}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-gray-400 text-center -mt-2">
              Achado da análise: a taxa vem caindo — 84% (2023) → 87% (2024) →
              76% (2025/2026).
            </p>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        titulo={
          norcrestDrill
            ? 'Obras por Unidade NORCREST'
            : 'Ranking de Permissionárias (top 10)'
        }
      >
        <div className="relative">
          <div className="absolute -top-8 right-0 z-10">
            <BotaoExportarGrafico
              dados={porPermissionaria}
              colunas={colsPerm}
              titulo={
                norcrestDrill ? 'Obras por Unidade NORCREST' : 'Ranking de Permissionárias'
              }
              modulo="gt"
            />
          </div>
          <ResponsiveContainer
            width="100%"
            height={Math.max(280, pagPerm.itens.length * 26)}
          >
            <BarChart
              data={pagPerm.itens}
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
                width={130}
              />
              <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
              <Bar dataKey="total" fill={INDIGO} radius={[0, 3, 3, 0]}>
                <LabelList
                  dataKey="total"
                  position="right"
                  style={{ fontSize: 10, fill: INDIGO, fontWeight: 'bold' }}
                  formatter={fmtNumero}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {pagPerm.ligado && <ControlePaginacao {...pagPerm} />}
        </div>
      </ChartCard>
    </div>
  )
}
