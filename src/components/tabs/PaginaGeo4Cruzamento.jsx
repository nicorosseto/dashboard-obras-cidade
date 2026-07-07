// Módulo "Análise Integrada" (Cruzamento Fiscalização × Sistema Geo). Compõe as
// 8 abas — lógica em src/lib/cruzamento.js, cada aba em
// src/components/tabs/cruzamento/*.jsx (Fase M5, Etapa 2).
import { useMemo } from 'react'
import { computarCruzamento, filtrarParaCruzamento, contarFiltrosAtivos } from '../../lib/cruzamento.js'
import AbaVisaoGeral from './cruzamento/AbaVisaoGeral.jsx'
import AbaCobertura from './cruzamento/AbaCobertura.jsx'
import AbaStatusCruzado from './cruzamento/AbaStatusCruzado.jsx'
import AbaLinhaTempo from './cruzamento/AbaLinhaTempo.jsx'
import AbaDivergencias from './cruzamento/AbaDivergencias.jsx'
import AbaExecutoras from './cruzamento/AbaExecutoras.jsx'
import AbaMapa from './cruzamento/AbaMapa.jsx'
import AbaBusca from './cruzamento/AbaBusca.jsx'

export default function PaginaGeo4Cruzamento({ rowsFisc, rowsGeo, filtros, abaAtiva = 'visao-geral' }) {
  const { fisc: fiscFiltrada, geo: geoFiltrado } = useMemo(
    () => filtrarParaCruzamento(rowsFisc, rowsGeo, filtros),
    [rowsFisc, rowsGeo, filtros]
  )

  // Drill-down NORCREST: quando "NORCREST (consolidado)" está no filtro, desagrega por unidade
  const norcrestDrillDown = filtros?.permissionarias?.has?.('NORCREST') ?? false

  const dados = useMemo(
    () => computarCruzamento(fiscFiltrada, geoFiltrado, !norcrestDrillDown),
    [fiscFiltrada, geoFiltrado, norcrestDrillDown]
  )

  const nFiltrosAtivos = useMemo(() => contarFiltrosAtivos(filtros), [filtros])
  const visibilidade = filtros?.visibilidade ?? 'todos'

  const { soFisc, soGeo, emComum, divSubpref, divStatus,
          porPermissionaria, porSubpref, porPermSub,
          matrizStatus, topGeoStatuses,
          matrizStatusInd, topGeoStatusesInd,
          prazosBinsArr, evolucaoMensal, porExecutora } = dados

  return (
    <div className="space-y-4">
      {/* Descrição do módulo */}
      <div className="flex items-start gap-3 px-4 py-3 bg-violet-50 border border-violet-100 rounded-lg">
        <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-violet-600 text-white mt-0.5" style={{ fontSize: 14 }}>⚖️</div>
        <div>
          <p className="text-sm font-semibold text-violet-900">Análise Integrada — Fiscalização × Sistema Geo</p>
          <p className="text-xs text-violet-700 mt-0.5 leading-relaxed">
            Reconcilia as duas bases de dados: identifica processos presentes nas duas (em comum),
            processos da Fiscalização sem registro no Sistema Geo, e obras do Sistema Geo ainda não fiscalizadas.
            Use os filtros da barra lateral para restringir a análise por permissionária, subprefeitura ou status.
          </p>
        </div>
      </div>

      {/* Aviso universo parcial */}
      {nFiltrosAtivos > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-700">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span><strong>Filtros ativos — universo parcial.</strong> Os dados abaixo refletem o subconjunto filtrado.</span>
        </div>
      )}

      {/* Conteúdo da aba ativa */}
      {abaAtiva === 'visao-geral'    && <AbaVisaoGeral    dados={dados} visibilidade={visibilidade} norcrestDrillDown={norcrestDrillDown} />}
      {abaAtiva === 'cobertura'      && <AbaCobertura     porPermissionaria={porPermissionaria} porPermSub={porPermSub} norcrestDrillDown={norcrestDrillDown} />}
      {abaAtiva === 'status-cruzado' && <AbaStatusCruzado
          matrizStatus={matrizStatus} topGeoStatuses={topGeoStatuses}
          matrizStatusInd={matrizStatusInd} topGeoStatusesInd={topGeoStatusesInd}
          divStatus={divStatus} />}
      {abaAtiva === 'linha-tempo'    && <AbaLinhaTempo    prazosBinsArr={prazosBinsArr} evolucaoMensal={evolucaoMensal} />}
      {abaAtiva === 'divergencias'   && <AbaDivergencias  soFisc={soFisc} divSubpref={divSubpref} soGeo={soGeo} />}
      {abaAtiva === 'executoras'     && <AbaExecutoras    porExecutora={porExecutora} />}
      {abaAtiva === 'mapa'           && <AbaMapa          porSubpref={porSubpref} />}
      {abaAtiva === 'busca'          && <AbaBusca         emComum={emComum} soFisc={soFisc} soGeo={soGeo} nFiltrosAtivos={nFiltrosAtivos} visibilidade={visibilidade} />}
    </div>
  )
}
