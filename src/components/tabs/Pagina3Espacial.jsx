import MapaSP from '../charts/MapaSP.jsx'
import BarGrupado from '../charts/BarGrupado.jsx'
import RegioesPie from '../charts/RegioesPie.jsx'
import TiposFalhaBar from '../charts/TiposFalhaBar.jsx'
import BotaoExportarGrafico from '../BotaoExportarGrafico.jsx'
import {
  contagemPorSubprefeitura,
  contagemPorRegiao,
  rankingTiposFalha,
  rankingLegislacaoVsNC,
} from '../../lib/aggregations.js'

export default function Pagina3Espacial({
  rows,
  contagensMapa,
  subSelecionadas,
  onSelecionarSub,
}) {
  const norcrestDrillDown =
    rows.length > 0 &&
    rows.every((r) => r.permissionaria && String(r.permissionaria).toUpperCase().startsWith('NORCREST'))

  const contagensSub = contagemPorSubprefeitura(rows)
  const regioes = contagemPorRegiao(rows)
  const tiposFalha = rankingTiposFalha(rows)
  const permsRank = rankingLegislacaoVsNC(rows, norcrestDrillDown ? Infinity : 7, !norcrestDrillDown)

  const tituloPerms = norcrestDrillDown ? 'NORCREST — por Unidade' : 'Laudos por Permissionária'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <MapaSP
        titulo="Mapa da Cidade de São Paulo"
        contagens={contagensMapa || contagensSub}
        unidade="laudos"
        selecionadas={subSelecionadas}
        onSelecionar={onSelecionarSub}
      />
      <BarGrupado
        titulo={tituloPerms}
        dados={permsRank}
        paginar={norcrestDrillDown}
        acoes={
          <BotaoExportarGrafico
            dados={permsRank}
            colunas={[
              { key: 'nome', label: norcrestDrillDown ? 'Unidade NORCREST' : 'Permissionária' },
              { key: 'leg_atendida', label: 'Leg. Atendida' },
              { key: 'nao_atendida', label: 'Não Conformidades' },
              { key: 'total', label: 'Total' },
            ]}
            titulo={`${tituloPerms} — Fiscalização`}
            modulo="fiscalizacao"
          />
        }
      />
      <RegioesPie
        titulo="Obras por Região"
        dados={regioes}
        acoes={
          <BotaoExportarGrafico
            dados={regioes}
            colunas={[
              { key: 'regiao', label: 'Região' },
              { key: 'laudos', label: 'Laudos' },
              { key: 'pct', label: '% do Total' },
            ]}
            titulo="Obras por Região — Fiscalização"
            modulo="fiscalizacao"
          />
        }
      />
      <TiposFalhaBar
        titulo="Tipos de Falhas"
        dados={tiposFalha}
        acoes={
          <BotaoExportarGrafico
            dados={tiposFalha}
            colunas={[
              { key: 'nome', label: 'Tipo de Falha' },
              { key: 'laudos', label: 'Laudos' },
            ]}
            titulo="Tipos de Falhas — Fiscalização"
            modulo="fiscalizacao"
          />
        }
      />
    </div>
  )
}
