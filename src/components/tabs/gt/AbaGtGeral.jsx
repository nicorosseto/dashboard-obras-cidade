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
// ⚠️ Casa só por `tipo_linha === 'total'` (não pelo texto da permissionária)
// — a Edge Function classifica como 'total' qualquer rótulo que COMECE com
// "Total Geral" (ex.: "Total Geral 2023"), então exigir o texto exato aqui
// deixava os 3 gráficos "por ano" sempre zerados (achado de 27/07/2026, dado
// real da homologação).
function serieHistoricaDash(gtDash) {
  return BLOCOS_ANO.map(({ bloco, label }) => {
    const linha = (gtDash || []).find(
      (d) => d.bloco === bloco && d.tipo_linha === 'total'
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

  // Ranking de permissionárias em DOIS gráficos separados — "quem trabalha
  // mais" (compatibilizadas) e "quem trava mais" (paralisadas) podem ser
  // empresas diferentes; um ranking combinado escondia essa diferença
  // (pedido do usuário, 27/07/2026).
  const linhasCompat = useMemo(
    () => linhas.filter((l) => l.status_grupo === 'compatibilizada'),
    [linhas]
  )
  const linhasParal = useMemo(
    () => linhas.filter((l) => l.status_grupo === 'paralisada'),
    [linhas]
  )

  const norcrestDrillCompat = useMemo(() => todasGtNorcrest(linhasCompat), [linhasCompat])
  const porPermissionariaCompat = useMemo(
    () =>
      norcrestDrillCompat
        ? agregaGtPorUnidadeNorcrest(linhasCompat)
        : agregaGtPorPermissionaria(linhasCompat).slice(0, 10),
    [linhasCompat, norcrestDrillCompat]
  )
  const pagPermCompat = usePaginadorGrafico(porPermissionariaCompat, {
    tamanho: 8,
    ativo: norcrestDrillCompat,
  })

  const norcrestDrillParal = useMemo(() => todasGtNorcrest(linhasParal), [linhasParal])
  const porPermissionariaParal = useMemo(
    () =>
      norcrestDrillParal
        ? agregaGtPorUnidadeNorcrest(linhasParal)
        : agregaGtPorPermissionaria(linhasParal).slice(0, 10),
    [linhasParal, norcrestDrillParal]
  )
  const pagPermParal = usePaginadorGrafico(porPermissionariaParal, {
    tamanho: 8,
    ativo: norcrestDrillParal,
  })

  const colsAno = [
    { key: 'ano', label: 'Ano' },
    { key: 'qtde_obras', label: 'Qtde de Obras' },
    { key: 'compatibilizadas', label: 'Compatibilizadas' },
    { key: 'paralisadas', label: 'Paralisadas' },
    { key: 'pct', label: '% Compatibilizada' },
  ]
  const colsPermCompat = [
    {
      key: 'nome',
      label: norcrestDrillCompat ? 'Unidade NORCREST' : 'Permissionária',
    },
    { key: 'total', label: 'Obras Compatibilizadas' },
  ]
  const colsPermParal = [
    {
      key: 'nome',
      label: norcrestDrillParal ? 'Unidade NORCREST' : 'Permissionária',
    },
    { key: 'total', label: 'Obras Paralisadas' },
  ]

  const legendaPct = serieAnual
    .map((s) => `${s.pct}% (${s.ano})`)
    .join(' → ')

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
            {legendaPct && (
              <p className="text-[10px] text-gray-400 text-center -mt-2">
                Evolução da taxa: {legendaPct}.
              </p>
            )}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          titulo={
            norcrestDrillCompat
              ? 'Compatibilizadas por Unidade NORCREST'
              : 'Top 10 Compatibilizadas por Permissionária'
          }
        >
          <div className="relative">
            <div className="absolute -top-8 right-0 z-10">
              <BotaoExportarGrafico
                dados={porPermissionariaCompat}
                colunas={colsPermCompat}
                titulo={
                  norcrestDrillCompat
                    ? 'Compatibilizadas por Unidade NORCREST'
                    : 'Top 10 Compatibilizadas por Permissionária'
                }
                modulo="gt"
              />
            </div>
            <ResponsiveContainer
              width="100%"
              height={Math.max(280, pagPermCompat.itens.length * 26)}
            >
              <BarChart
                data={pagPermCompat.itens}
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
                <Bar dataKey="total" fill="#1F7A4D" radius={[0, 3, 3, 0]}>
                  <LabelList
                    dataKey="total"
                    position="right"
                    style={{ fontSize: 10, fill: '#1F7A4D', fontWeight: 'bold' }}
                    formatter={fmtNumero}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {pagPermCompat.ligado && <ControlePaginacao {...pagPermCompat} />}
          </div>
        </ChartCard>

        <ChartCard
          titulo={
            norcrestDrillParal
              ? 'Paralisadas por Unidade NORCREST'
              : 'Top 10 Paralisadas por Permissionária'
          }
        >
          <div className="relative">
            <div className="absolute -top-8 right-0 z-10">
              <BotaoExportarGrafico
                dados={porPermissionariaParal}
                colunas={colsPermParal}
                titulo={
                  norcrestDrillParal
                    ? 'Paralisadas por Unidade NORCREST'
                    : 'Top 10 Paralisadas por Permissionária'
                }
                modulo="gt"
              />
            </div>
            <ResponsiveContainer
              width="100%"
              height={Math.max(280, pagPermParal.itens.length * 26)}
            >
              <BarChart
                data={pagPermParal.itens}
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
                <Bar dataKey="total" fill="#D97706" radius={[0, 3, 3, 0]}>
                  <LabelList
                    dataKey="total"
                    position="right"
                    style={{ fontSize: 10, fill: '#D97706', fontWeight: 'bold' }}
                    formatter={fmtNumero}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {pagPermParal.ligado && <ControlePaginacao {...pagPermParal} />}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
