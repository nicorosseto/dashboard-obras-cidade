import { useMemo } from 'react'
import DonutComparativo from '../charts/DonutComparativo.jsx'
import BarGrupado from '../charts/BarGrupado.jsx'
import BotaoExportarGrafico from '../BotaoExportarGrafico.jsx'
import {
  distribuicaoLegislacaoVsNC,
  distribuicaoSolucVsEmAnd,
  rankingLegislacaoVsNC,
} from '../../lib/aggregations.js'
import { NAVY, RED } from '../../lib/cores.js'

const COLS_RANKING = [
  { key: 'nome', label: 'Permissionária' },
  { key: 'leg_atendida', label: 'Leg. Atendida' },
  { key: 'nao_atendida', label: 'Não Conformidades' },
  { key: 'total', label: 'Total' },
]

export default function Pagina1Geral({ rows }) {
  const norcrestDrillDown = useMemo(
    () => rows.length > 0 && rows.every((r) => r.permissionaria && String(r.permissionaria).toUpperCase().startsWith('NORCREST')),
    [rows]
  )

  const distLeg = useMemo(() => distribuicaoLegislacaoVsNC(rows), [rows])
  const distSoluc = useMemo(() => distribuicaoSolucVsEmAnd(rows), [rows])
  const rankingPerm = useMemo(
    () => rankingLegislacaoVsNC(rows, norcrestDrillDown ? Infinity : 8, !norcrestDrillDown),
    [rows, norcrestDrillDown]
  )

  const totalLeg = distLeg[0].valor + distLeg[1].valor
  const totalNC = distSoluc[0].valor + distSoluc[1].valor

  const tituloRanking = norcrestDrillDown ? 'NORCREST — por Unidade' : 'Laudos por Permissionária (Top 8)'
  const colsRanking = norcrestDrillDown
    ? [{ key: 'nome', label: 'Unidade NORCREST' }, ...COLS_RANKING.slice(1)]
    : COLS_RANKING

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DonutComparativo
          titulo="Legislação Atendida × Não Conformidades"
          dados={distLeg}
          cores={[NAVY, RED]}
          total={totalLeg}
        />
        <DonutComparativo
          titulo="Dentro das Não Conformidades"
          dados={distSoluc}
          cores={[NAVY, RED]}
          total={totalNC}
        />
      </div>
      <div className="relative">
        <div className="absolute top-3 right-3 z-10">
          <BotaoExportarGrafico
            dados={rankingPerm}
            colunas={colsRanking}
            titulo={`${tituloRanking} — Fiscalização`}
            modulo="fiscalizacao"
          />
        </div>
        <BarGrupado
          titulo={tituloRanking}
          dados={rankingPerm}
          paginar={norcrestDrillDown}
        />
      </div>
    </div>
  )
}
