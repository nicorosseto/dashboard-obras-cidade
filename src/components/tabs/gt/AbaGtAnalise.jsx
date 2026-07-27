import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { fmtNumero, fmtAreaDecimal } from '../../../lib/aggregations.js'
import {
  STATUS_GT,
  STATUS_GT_COR,
  STATUS_GRUPO_LABEL,
  STATUS_GRUPO_COR,
  agregaGtPorStatusGrupo,
  agregaGtPorStatus,
  agregaGtPorStatusEAno,
  pendenciasAcionaveisGt,
  agregaGtPorTecnica,
  matrizGtRecapeStatus,
  recapeConcluidoParalisadoGt,
  agregaGtMetragemPorStatus,
} from '../../../lib/gtObras.js'
import DonutComparativo from '../../charts/DonutComparativo.jsx'
import ChartTooltip from '../../charts/ChartTooltip.jsx'
import BotaoExportarGrafico from '../../BotaoExportarGrafico.jsx'
import { ChartCard, KpiCard } from '../emerg/shared.jsx'
import { NAVY_MID, RED } from '../../../lib/cores.js'

const COLS_PENDENCIAS = [
  { key: 'status', label: 'Status' },
  { key: 'esperaQuem', label: 'Espera quem?' },
  { key: 'qtd', label: 'Qtde' },
  { key: 'metragem', label: 'Metragem (m²)', transform: (v) => fmtAreaDecimal(v) },
]

const COLS_TECNICA = [
  { key: 'tecnica', label: 'Técnica' },
  { key: 'total', label: 'Total de análises' },
  { key: 'compatibilizadas', label: 'Compatibilizadas' },
  { key: 'pct', label: '% Compatibilização', transform: (v) => `${v.toFixed(0)}%` },
]

const COLS_RECAPE = [
  { key: 'situacao', label: 'Situação do Recape' },
  { key: 'compatibilizada', label: 'Compatibilizada' },
  { key: 'paralisada', label: 'Paralisada' },
  { key: 'nao_classificado', label: 'Não Classificado' },
  { key: 'total', label: 'Total' },
]

const COLS_METRAGEM = [
  { key: 'status', label: 'Status' },
  { key: 'metragem', label: 'Metragem (m²)', transform: (v) => fmtAreaDecimal(v) },
]

// Aba "Análise de Status" — aprofundamento da coluna STATUS (seção 8.2 do
// plano): funil de status com drill-down, painel de pendências acionáveis,
// status × ano, carga por técnica e o cruzamento recape × status que é a
// razão de ser do módulo. Recebe `linhas` já cruzadas e filtradas pela
// sidebar (mesma fonte da Visão Geral).
export default function AbaGtAnalise({ linhas }) {
  const gruposData = useMemo(() => agregaGtPorStatusGrupo(linhas), [linhas])
  const totalGrupos = gruposData.reduce((acc, g) => acc + g.qtd, 0)

  // Drill-down automático (mesmo padrão do gráfico "Processos por Status"
  // do Sistema Geo): quando o conjunto filtrado cai inteiro num único grupo
  // (ex.: sidebar com "Situação = Paralisada"), troca o donut de grupo
  // pelos 10 status individuais daquele grupo.
  const grupoUnico = gruposData.length === 1 ? gruposData[0] : null
  const statusIndividualData = useMemo(
    () => (grupoUnico ? agregaGtPorStatus(linhas) : []),
    [linhas, grupoUnico]
  )

  const donutGrupos = gruposData.map((g) => ({
    nome: g.nome,
    valor: g.qtd,
    pct: totalGrupos > 0 ? Math.round((g.qtd / totalGrupos) * 100) : 0,
    cor: g.cor,
  }))

  const pend = useMemo(() => pendenciasAcionaveisGt(linhas), [linhas])
  const statusAno = useMemo(() => agregaGtPorStatusEAno(linhas), [linhas])
  const tecnica = useMemo(() => agregaGtPorTecnica(linhas), [linhas])
  const recapeMatriz = useMemo(() => matrizGtRecapeStatus(linhas), [linhas])
  const piorCaso = useMemo(() => recapeConcluidoParalisadoGt(linhas), [linhas])
  const metragemPorStatus = useMemo(() => agregaGtMetragemPorStatus(linhas), [linhas])

  return (
    <div className="space-y-4">
      <div
        className="bg-white rounded-md shadow-card p-4"
        data-tour="gt-analise-status"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wide">
            {grupoUnico
              ? `Status — ${STATUS_GRUPO_LABEL[grupoUnico.grupo] || grupoUnico.grupo}`
              : 'Funil de Status'}
          </h3>
          <BotaoExportarGrafico
            dados={grupoUnico ? statusIndividualData : gruposData}
            colunas={
              grupoUnico
                ? [
                    { key: 'status', label: 'Status' },
                    { key: 'qtd', label: 'Qtde' },
                  ]
                : [
                    { key: 'nome', label: 'Situação' },
                    { key: 'qtd', label: 'Qtde' },
                  ]
            }
            titulo="Funil de Status"
            modulo="gt"
          />
        </div>
        {grupoUnico ? (
          <ResponsiveContainer width="100%" height={Math.max(220, statusIndividualData.length * 30)}>
            <BarChart
              data={statusIndividualData}
              layout="vertical"
              margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E0E0E0" />
              <XAxis type="number" tick={{ fontSize: 10 }} hide />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 10 }} width={170} />
              <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
              <Bar dataKey="qtd" radius={[0, 3, 3, 0]}>
                {statusIndividualData.map((d, i) => (
                  <Cell key={i} fill={STATUS_GT_COR[d.status] || '#9CA3AF'} />
                ))}
                <LabelList
                  dataKey="qtd"
                  position="right"
                  style={{ fontSize: 10, fontWeight: 'bold' }}
                  formatter={fmtNumero}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <DonutComparativo
            dados={donutGrupos}
            cores={donutGrupos.map((d) => d.cor)}
            total={totalGrupos}
          />
        )}
      </div>

      <div
        className="bg-white rounded-md shadow-card p-4 space-y-3"
        data-tour="gt-analise-pendencias"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wide">
            ⭐ Pendências Acionáveis
          </h3>
          <BotaoExportarGrafico
            dados={pend.linhas}
            colunas={COLS_PENDENCIAS}
            titulo="Pendências Acionáveis"
            modulo="gt"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <KpiCard label="Total Parado" valor={pend.totalQtd} cor="#D97706" destaque />
          <div
            className="bg-white rounded-md shadow-card px-3 py-2.5 border-l-4"
            style={{ borderLeftColor: NAVY_MID }}
          >
            <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold truncate">
              Metragem em Risco
            </div>
            <div className="font-bold mt-0.5 tabular-nums text-2xl" style={{ color: NAVY_MID }}>
              {fmtAreaDecimal(pend.totalMetragem)}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-sm border border-grey-line">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-navy text-white text-left">
                <th className="p-2 whitespace-nowrap">Status</th>
                <th className="p-2 whitespace-nowrap">Espera quem?</th>
                <th className="p-2 whitespace-nowrap text-right">Qtde</th>
                <th className="p-2 whitespace-nowrap text-right">Metragem (m²)</th>
              </tr>
            </thead>
            <tbody>
              {pend.linhas.map((l, i) => (
                <tr key={l.status} className={i % 2 === 0 ? 'bg-white' : 'bg-grey-bg'}>
                  <td className="p-2 whitespace-nowrap">{l.status}</td>
                  <td className="p-2 whitespace-nowrap text-gray-600">{l.esperaQuem}</td>
                  <td className="p-2 whitespace-nowrap text-right tabular-nums">
                    {fmtNumero(l.qtd)}
                  </td>
                  <td className="p-2 whitespace-nowrap text-right tabular-nums">
                    {fmtAreaDecimal(l.metragem)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-grey-bg border-t-2 border-grey-line">
                <td className="p-2" colSpan={2}>
                  Total parado
                </td>
                <td className="p-2 text-right tabular-nums">{fmtNumero(pend.totalQtd)}</td>
                <td className="p-2 text-right tabular-nums">
                  {fmtAreaDecimal(pend.totalMetragem)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ChartCard titulo="Status × Ano do Processo">
        <div className="relative" data-tour="gt-analise-status-ano">
          <div className="absolute -top-8 right-0 z-10">
            <BotaoExportarGrafico
              dados={statusAno}
              colunas={[
                { key: 'ano', label: 'Ano' },
                ...STATUS_GT.map((s) => ({ key: s, label: s })),
              ]}
              titulo="Status × Ano do Processo"
              modulo="gt"
            />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={statusAno} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNumero} />
              <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {STATUS_GT.map((status) => (
                <Bar
                  key={status}
                  dataKey={status}
                  name={status}
                  stackId="status"
                  fill={STATUS_GT_COR[status]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-400 text-center -mt-2">
            Separa passivo antigo de fluxo corrente — um status concentrado no
            ano mais recente é fila de trabalho, não acúmulo histórico.
          </p>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard titulo="Metragem por Status (m²)">
          <div className="relative">
            <div className="absolute -top-8 right-0 z-10">
              <BotaoExportarGrafico
                dados={metragemPorStatus}
                colunas={COLS_METRAGEM}
                titulo="Metragem por Status"
                modulo="gt"
              />
            </div>
            <ResponsiveContainer
              width="100%"
              height={Math.max(260, metragemPorStatus.length * 28)}
            >
              <BarChart
                data={metragemPorStatus}
                layout="vertical"
                margin={{ top: 4, right: 60, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E0E0E0" />
                <XAxis type="number" tick={{ fontSize: 10 }} hide />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 10 }} width={170} />
                <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
                <Bar dataKey="metragem" radius={[0, 3, 3, 0]}>
                  {metragemPorStatus.map((d, i) => (
                    <Cell key={i} fill={STATUS_GT_COR[d.status] || '#9CA3AF'} />
                  ))}
                  <LabelList
                    dataKey="metragem"
                    position="right"
                    style={{ fontSize: 9, fontWeight: 'bold' }}
                    formatter={fmtAreaDecimal}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <div
          className="bg-white rounded-md shadow-card p-4 space-y-3"
          data-tour="gt-analise-tecnica"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-navy uppercase tracking-wide">
                Carga por Técnica
              </h3>
              <p className="text-[10px] text-gray-400">
                ⚠️ Medida de produtividade individual — use com cuidado.
              </p>
            </div>
            <BotaoExportarGrafico
              dados={tecnica}
              colunas={COLS_TECNICA}
              titulo="Carga por Técnica"
              modulo="gt"
            />
          </div>
          <div className="overflow-x-auto rounded-sm border border-grey-line">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-navy text-white text-left">
                  <th className="p-2 whitespace-nowrap">Técnica</th>
                  <th className="p-2 whitespace-nowrap text-right">Total</th>
                  <th className="p-2 whitespace-nowrap text-right">Compatibilizadas</th>
                  <th className="p-2 whitespace-nowrap text-right">% Compat.</th>
                </tr>
              </thead>
              <tbody>
                {tecnica.map((t, i) => (
                  <tr key={t.tecnica} className={i % 2 === 0 ? 'bg-white' : 'bg-grey-bg'}>
                    <td className="p-2 whitespace-nowrap">{t.tecnica}</td>
                    <td className="p-2 whitespace-nowrap text-right tabular-nums">
                      {fmtNumero(t.total)}
                    </td>
                    <td className="p-2 whitespace-nowrap text-right tabular-nums">
                      {fmtNumero(t.compatibilizadas)}
                    </td>
                    <td className="p-2 whitespace-nowrap text-right tabular-nums">
                      {t.pct.toFixed(0)}%
                    </td>
                  </tr>
                ))}
                {tecnica.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400">
                      Nenhuma análise carregada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div
        className="bg-white rounded-md shadow-card p-4 space-y-3"
        data-tour="gt-analise-recape"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-navy uppercase tracking-wide">
              Situação do Recape × Status da Obra
            </h3>
            <p className="text-[10px] text-gray-400">
              O pior caso: recape já concluído com a obra ainda paralisada — a
              via será reaberta pela permissionária depois de recapeada.
            </p>
          </div>
          <BotaoExportarGrafico
            dados={recapeMatriz}
            colunas={COLS_RECAPE}
            titulo="Situação do Recape × Status"
            modulo="gt"
          />
        </div>
        <KpiCard
          label="Recape Concluído + Obra Paralisada"
          valor={piorCaso}
          cor={RED}
          destaque
        />
        <div className="overflow-x-auto rounded-sm border border-grey-line">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-navy text-white text-left">
                <th className="p-2 whitespace-nowrap">Situação do Recape</th>
                <th className="p-2 whitespace-nowrap text-right">Compatibilizada</th>
                <th className="p-2 whitespace-nowrap text-right">Paralisada</th>
                <th className="p-2 whitespace-nowrap text-right">Não Classificado</th>
                <th className="p-2 whitespace-nowrap text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recapeMatriz.map((r, i) => {
                const piorLinha = r.situacao === 'CONCLUIDO' && r.paralisada > 0
                return (
                  <tr key={r.situacao} className={i % 2 === 0 ? 'bg-white' : 'bg-grey-bg'}>
                    <td className="p-2 whitespace-nowrap">{r.situacao}</td>
                    <td className="p-2 whitespace-nowrap text-right tabular-nums">
                      {fmtNumero(r.compatibilizada)}
                    </td>
                    <td
                      className={`p-2 whitespace-nowrap text-right tabular-nums ${piorLinha ? 'font-bold text-red' : ''}`}
                    >
                      {fmtNumero(r.paralisada)}
                    </td>
                    <td className="p-2 whitespace-nowrap text-right tabular-nums">
                      {fmtNumero(r.nao_classificado)}
                    </td>
                    <td className="p-2 whitespace-nowrap text-right tabular-nums">
                      {fmtNumero(r.total)}
                    </td>
                  </tr>
                )
              })}
              {recapeMatriz.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">
                    Nenhum dado de recape carregado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
