import { useMemo, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  LineChart,
  Line,
} from 'recharts'
import { fmtNumero, fmtAreaDecimal } from '../../../lib/aggregations.js'
import {
  fmtValorBRL,
  valorTotalMultas,
  areaTotalMultas,
  agregaMultasPorPermissionaria,
  agregaMultasPorStatus,
  agregaMultasPorMes,
  agregaMultasPorAno,
  agregaMultasPorSubprefeitura,
  excluirSemProcesso,
  todasNorcrest,
  agregaMultasPorUnidadeNorcrest,
} from '../../../lib/multas.js'
import { fmtMesAno } from '../../../lib/emergencias.js'
import ChartTooltip from '../../charts/ChartTooltip.jsx'
import BotaoExportarGrafico from '../../BotaoExportarGrafico.jsx'
import { ChartCard, KpiCard } from '../emerg/shared.jsx'
import {
  usePaginadorGrafico,
  ControlePaginacao,
} from '../../charts/PaginadorGrafico.jsx'
import { NAVY, NAVY_MID, RED } from '../../../lib/cores.js'

const COR_STATUS = {
  LAVRADO: NAVY,
  'NÃO LAVRADO': '#6B7280',
  'NAO LAVRADO': '#6B7280',
  PENDENTE: '#F59E0B',
  'Sem status': '#9CA3AF',
}

export default function AbaMultasGeral({ linhas }) {
  // Multas sem número de processo são ruído para a visão geral por padrão
  // (não há obra/processo real a acompanhar) — ficam de fora dos KPIs e
  // gráficos daqui; seguem auditáveis na seção de Inconsistências, dentro da
  // aba Lista (melhoria de 16/07/2026, 2ª rodada de feedback da validação).
  // Seletor (decisão do usuário, 02/08/2026, Frente 3): permite incluí-las,
  // recalculando tudo — sem substituir o padrão (que continua excluindo).
  const [incluirSemProcesso, setIncluirSemProcesso] = useState(false)
  const semProcessoQtd = useMemo(
    () => (linhas || []).length - excluirSemProcesso(linhas).length,
    [linhas]
  )
  const linhasValidas = useMemo(
    () => (incluirSemProcesso ? linhas || [] : excluirSemProcesso(linhas)),
    [linhas, incluirSemProcesso]
  )

  const total = linhasValidas.length
  const valorTotal = useMemo(
    () => valorTotalMultas(linhasValidas),
    [linhasValidas]
  )
  const areaTotal = useMemo(
    () => areaTotalMultas(linhasValidas),
    [linhasValidas]
  )

  // Drill-down NORCREST por unidade (padrão do sistema): quando TODAS as multas
  // filtradas são da NORCREST (ex.: filtro de Permissionária = NORCREST na
  // sidebar), o gráfico de permissionárias vira "por unidade" — igual ao
  // drill-down de AbaMotivosInvalidos.jsx/relatorio.js.
  const norcrestDrill = useMemo(() => todasNorcrest(linhasValidas), [linhasValidas])
  const porPermissionaria = useMemo(
    () =>
      norcrestDrill
        ? agregaMultasPorUnidadeNorcrest(linhasValidas)
        : agregaMultasPorPermissionaria(linhasValidas).slice(0, 10),
    [linhasValidas, norcrestDrill]
  )
  // Paginação do gráfico só no drill-down da NORCREST (8 unidades por vez).
  const pagPerm = usePaginadorGrafico(porPermissionaria, {
    tamanho: 8,
    ativo: norcrestDrill,
  })
  const porStatus = useMemo(
    () => agregaMultasPorStatus(linhasValidas),
    [linhasValidas]
  )
  const porMes = useMemo(
    () => agregaMultasPorMes(linhasValidas).slice(-18),
    [linhasValidas]
  )
  const porAno = useMemo(
    () => agregaMultasPorAno(linhasValidas),
    [linhasValidas]
  )
  const porSubprefeitura = useMemo(
    () => agregaMultasPorSubprefeitura(linhasValidas).slice(0, 15),
    [linhasValidas]
  )
  const pagSub = usePaginadorGrafico(porSubprefeitura, {
    tamanho: 15,
    ativo: false,
  })

  const colsPerm = [
    { key: 'nome', label: norcrestDrill ? 'Unidade NORCREST' : 'Permissionária' },
    { key: 'total', label: 'Total de Multas' },
  ]
  const colsStatus = [
    { key: 'status', label: 'Status' },
    { key: 'qtd', label: 'Quantidade' },
  ]
  const colsMes = [
    { key: 'mes', label: 'Mês' },
    { key: 'qtd', label: 'Quantidade' },
  ]
  const colsAno = [
    { key: 'ano', label: 'Ano' },
    { key: 'qtd', label: 'Quantidade' },
  ]
  const colsSub = [
    { key: 'nome', label: 'Subprefeitura' },
    { key: 'total', label: 'Total de Multas' },
  ]

  return (
    <div className="space-y-4" data-tour="multas-kpis">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Total de Multas" valor={total} cor={RED} destaque />
        <div
          className="bg-white rounded-md shadow-card px-3 py-2.5 border-l-4"
          style={{ borderLeftColor: NAVY }}
        >
          <div
            className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold truncate"
            title="Valor Total (R$)"
          >
            Valor Total (R$)
          </div>
          <div
            className="font-bold mt-0.5 tabular-nums text-2xl"
            style={{ color: NAVY }}
          >
            {fmtValorBRL(valorTotal)}
          </div>
        </div>
        <div
          className="bg-white rounded-md shadow-card px-3 py-2.5 border-l-4"
          style={{ borderLeftColor: NAVY_MID }}
        >
          <div
            className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold truncate"
            title="Área Total (m²)"
          >
            Área Total (m²)
          </div>
          <div
            className="font-bold mt-0.5 tabular-nums text-2xl"
            style={{ color: NAVY_MID }}
          >
            {fmtAreaDecimal(areaTotal)}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 -mt-2">
        <p className="text-[10px] text-gray-400">
          {incluirSemProcesso
            ? `Incluindo ${fmtNumero(semProcessoQtd)} multa(s) sem número de processo nos KPIs e gráficos abaixo.`
            : `Não conta ${fmtNumero(semProcessoQtd)} multa(s) sem número de processo na planilha — veja-as na aba Lista, seção "Inconsistências".`}
        </p>
        {semProcessoQtd > 0 && (
          <label className="flex items-center gap-1.5 text-[10px] text-gray-600 cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={incluirSemProcesso}
              onChange={(e) => setIncluirSemProcesso(e.target.checked)}
              className="w-3.5 h-3.5 accent-red"
              data-tour="multas-incluir-sem-processo"
            />
            Incluir multas sem processo
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          titulo={
            norcrestDrill
              ? 'Multas por Unidade NORCREST'
              : 'Multas por Permissionária (top 10)'
          }
        >
          <div className="relative">
            <div className="absolute -top-8 right-0 z-10">
              <BotaoExportarGrafico
                dados={porPermissionaria}
                colunas={colsPerm}
                titulo={
                  norcrestDrill
                    ? 'Multas por Unidade NORCREST'
                    : 'Multas por Permissionária'
                }
                modulo="multas"
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
                <Tooltip
                  content={<ChartTooltip />}
                  wrapperStyle={{ zIndex: 50 }}
                />
                <Bar dataKey="total" fill={RED} radius={[0, 3, 3, 0]}>
                  <LabelList
                    dataKey="total"
                    position="right"
                    style={{ fontSize: 10, fill: RED, fontWeight: 'bold' }}
                    formatter={fmtNumero}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {pagPerm.ligado && <ControlePaginacao {...pagPerm} />}
          </div>
        </ChartCard>

        <ChartCard titulo="Multas por Subprefeitura (top 15)">
          <div className="relative">
            <div className="absolute -top-8 right-0 z-10">
              <BotaoExportarGrafico
                dados={porSubprefeitura}
                colunas={colsSub}
                titulo="Multas por Subprefeitura"
                modulo="multas"
              />
            </div>
            <ResponsiveContainer
              width="100%"
              height={Math.max(280, pagSub.itens.length * 22)}
            >
              <BarChart
                data={pagSub.itens}
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
                  width={60}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  wrapperStyle={{ zIndex: 50 }}
                />
                <Bar dataKey="total" fill={NAVY} radius={[0, 3, 3, 0]}>
                  <LabelList
                    dataKey="total"
                    position="right"
                    style={{ fontSize: 10, fill: NAVY, fontWeight: 'bold' }}
                    formatter={fmtNumero}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard titulo="Por Status">
          <div className="relative">
            <div className="absolute -top-8 right-0 z-10">
              <BotaoExportarGrafico
                dados={porStatus}
                colunas={colsStatus}
                titulo="Multas por Status"
                modulo="multas"
              />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={porStatus}
                  dataKey="qtd"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={95}
                  paddingAngle={1}
                >
                  {porStatus.map((s, i) => (
                    <Cell
                      key={i}
                      fill={COR_STATUS[s.status] || '#9CA3AF'}
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
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center">
              {porStatus.map((s) => (
                <div
                  key={s.status}
                  className="flex items-center gap-1 text-[10px] text-gray-600"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-xs"
                    style={{ background: COR_STATUS[s.status] || '#9CA3AF' }}
                  />
                  <span>
                    {s.status} ({fmtNumero(s.qtd)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {porMes.length > 0 && (
          <ChartCard titulo="Multas por Mês (infração) — últimos 18 meses">
            <div className="relative">
              <div className="absolute -top-8 right-0 z-10">
                <BotaoExportarGrafico
                  dados={porMes}
                  colunas={colsMes}
                  titulo="Multas por Mês"
                  modulo="multas"
                />
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={porMes}
                  margin={{ top: 12, right: 24, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 10 }}
                    tickFormatter={fmtMesAno}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNumero} />
                  <Tooltip
                    content={<ChartTooltip labelFormatter={fmtMesAno} />}
                    wrapperStyle={{ zIndex: 50 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="qtd"
                    name="Multas"
                    stroke={RED}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      {porAno.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          <ChartCard titulo="Multas por Ano (infração)">
            <div className="relative">
              <div className="absolute -top-8 right-0 z-10">
                <BotaoExportarGrafico
                  dados={porAno}
                  colunas={colsAno}
                  titulo="Multas por Ano"
                  modulo="multas"
                />
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={porAno}
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
                    dataKey="qtd"
                    name="Multas"
                    fill={RED}
                    radius={[3, 3, 0, 0]}
                  >
                    <LabelList
                      dataKey="qtd"
                      position="top"
                      style={{ fontSize: 10, fill: RED, fontWeight: 'bold' }}
                      formatter={fmtNumero}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  )
}
