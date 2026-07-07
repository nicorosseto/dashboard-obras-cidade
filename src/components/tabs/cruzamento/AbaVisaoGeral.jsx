// Aba 1 — Visão Geral. Extraído de PaginaGeo4Cruzamento.jsx (Fase M5, Etapa 2).
import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { fmtNumero } from '../../../lib/aggregations.js'
import ChartTooltip from '../../charts/ChartTooltip.jsx'
import { usePaginadorGrafico, ControlePaginacao } from '../../charts/PaginadorGrafico.jsx'
import { NAVY, RED } from '../../../lib/cores.js'
import { KPICard, SecaoCard } from './shared.jsx'
import { VERDE, AMBER, CORES_STATUS_GEO } from './cores.js'

export default function AbaVisaoGeral({ dados, visibilidade, norcrestDrillDown = false }) {
  const { totalFisc, totalGeo, nComum, soFisc, soGeo, porPermissionaria, porSubpref,
          matrizStatus, topGeoStatuses, matrizStatusInd, topGeoStatusesInd } = dados
  const coberturaFisc = totalFisc > 0 ? Math.round((nComum / totalFisc) * 100) : 0
  const [modoStatus, setModoStatus] = useState('agrupado')

  const donutData = [
    { nome: 'Em comum',           valor: nComum,        pct: totalFisc > 0 ? Math.round(nComum / totalFisc * 100) : 0 },
    { nome: 'Só na Fiscalização', valor: soFisc.length, pct: totalFisc > 0 ? Math.round(soFisc.length / totalFisc * 100) : 0 },
    { nome: 'Só no Sistema Geo',     valor: soGeo.length,  pct: totalGeo  > 0 ? Math.round(soGeo.length  / totalGeo  * 100) : 0 },
  ]

  // Permissionárias Sistema Geo com mais processos fiscalizados — todas as unidades no drill-down
  const top10GeoFiscalizados = [...porPermissionaria]
    .filter(p => p.totalGeo > 0)
    .sort((a, b) => b.emComum - a.emComum)
    .slice(0, norcrestDrillDown ? Infinity : 10)

  // Barras: perspectiva Sistema Geo — "quanto foi fiscalizado" vs "nunca fiscalizado"
  const topPermGeo = [...porPermissionaria]
    .filter(p => p.totalGeo > 0)
    .sort((a, b) => b.totalGeo - a.totalGeo)
    .slice(0, norcrestDrillDown ? Infinity : 15)
    .map(p => ({ nome: p.perm, emComum: p.emComum, soGeo: p.soGeo }))

  // Paginação no drill-down da NORCREST (8 unidades por vez) — lista e barras.
  const pagFisc = usePaginadorGrafico(top10GeoFiscalizados, { tamanho: 8, ativo: norcrestDrillDown })
  const pagPermGeo = usePaginadorGrafico(topPermGeo, { tamanho: 8, ativo: norcrestDrillDown })

  const topSubGeo = [...porSubpref]
    .filter(s => s.totalGeo > 0)
    .sort((a, b) => b.totalGeo - a.totalGeo).slice(0, 15)
    .map(s => ({ nome: s.sub, emComum: s.emComum, soGeo: s.soGeo }))

  const matrizAtiva      = modoStatus === 'agrupado' ? matrizStatus    : matrizStatusInd
  const statusAtivos     = modoStatus === 'agrupado' ? topGeoStatuses  : topGeoStatusesInd

  // Destaque do card conforme filtro de visibilidade
  const destEmComum = visibilidade === 'em-comum'
  const destSoFisc  = visibilidade === 'so-fisc'
  const destSoGeo   = visibilidade === 'so-geo'

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Processos na Fiscalização" valor={totalFisc} sub="únicos (id_origem)" />
        <KPICard label="Processos no Sistema Geo"    valor={totalGeo}  sub="registros únicos" />
        <KPICard label="Em comum" valor={nComum} sub={`${coberturaFisc}% da fisc. no Sistema Geo`} destaque={destEmComum} />
        <KPICard label="Só na Fiscalização" valor={soFisc.length} sub="não cadastrado no Sistema Geo" destaque={destSoFisc} />
        <KPICard label="Só no Sistema Geo"    valor={soGeo.length}  sub="nunca fiscalizado"        destaque={destSoGeo} />
      </div>

      {/* Donut + alerta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SecaoCard titulo="Distribuição geral">
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={donutData} dataKey="valor" nameKey="nome"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  paddingAngle={2} startAngle={90} endAngle={-270}
                  labelLine={false}
                  label={e => e.pct >= 5 ? `${e.pct}%` : ''}
                  style={{ fontSize: 11 }}
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={[NAVY, RED, AMBER][i]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-gray-500 uppercase">Fisc.</span>
              <span className="text-xl font-bold text-navy">{coberturaFisc}%</span>
              <span className="text-[9px] text-gray-400">no Sistema Geo</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            {donutData.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-xs shrink-0" style={{ background: [NAVY, RED, AMBER][i] }} />
                <span className="flex-1 text-gray-600">{d.nome}</span>
                <span className="font-semibold tabular-nums">{fmtNumero(d.valor)}</span>
              </div>
            ))}
          </div>
        </SecaoCard>

        <div className="lg:col-span-2">
          <SecaoCard titulo={norcrestDrillDown ? 'NORCREST — por unidade (Sistema Geo — processos fiscalizados)' : 'Top 10 permissionárias do Sistema Geo — processos fiscalizados'}>
            <p className="text-xs text-gray-500 mb-3">
              {norcrestDrillDown ? 'Unidades NORCREST com processos no Sistema Geo e quanto cada uma já foi fiscalizada.' : 'Permissionárias com mais processos no Sistema Geo, e quanto cada uma já foi fiscalizada.'}
            </p>
            <div className="space-y-2.5">
              {pagFisc.itens.map((p, i) => {
                const rank = pagFisc.verTodas ? i + 1 : pagFisc.pagina * pagFisc.tamanho + i + 1
                return (
                <div key={p.perm} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-navy text-white font-bold text-[10px] shrink-0">{rank}</span>
                  <span className="w-28 truncate font-medium shrink-0">{p.perm}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${p.pctCob}%`, background: p.pctCob >= 70 ? VERDE : p.pctCob >= 40 ? AMBER : RED }}
                    />
                  </div>
                  <span className={`w-10 text-right font-semibold tabular-nums shrink-0 ${p.pctCob >= 70 ? 'text-verde' : p.pctCob >= 40 ? 'text-amber-600' : 'text-red'}`}>
                    {p.pctCob}%
                  </span>
                  <span className="text-gray-400 tabular-nums shrink-0">{fmtNumero(p.emComum)}/{fmtNumero(p.totalGeo)}</span>
                </div>
                )
              })}
            </div>
            {pagFisc.ligado && <ControlePaginacao {...pagFisc} />}
          </SecaoCard>
        </div>
      </div>

      {/* Status Sistema Geo × Status Fiscalização — com toggle agrupado/individual */}
      <SecaoCard titulo="Status Sistema Geo por status da Fiscalização — processos em comum">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-500">
            Como se distribuem os status do Sistema Geo para cada situação na Fiscalização.
          </p>
          <div className="flex gap-1 shrink-0 ml-4">
            {['agrupado', 'individual'].map(m => (
              <button key={m} onClick={() => setModoStatus(m)}
                className={`text-xs px-3 py-1 rounded-sm font-medium transition-colors ${modoStatus === m ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {m === 'agrupado' ? 'Agrupado' : 'Individual'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={matrizAtiva} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="statusFisc" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {statusAtivos.map((sg, i) => (
              <Bar key={sg} dataKey={sg} name={sg} fill={CORES_STATUS_GEO[i % CORES_STATUS_GEO.length]} stackId="a" />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </SecaoCard>

      {/* Barras por permissionária — perspectiva Sistema Geo */}
      <SecaoCard titulo={norcrestDrillDown ? 'NORCREST — por unidade (fiscalizados × não fiscalizados)' : 'Fiscalização dos processos Sistema Geo por permissionária (top 15)'}>
        <p className="text-xs text-gray-500 mb-3">
          {norcrestDrillDown ? 'Por unidade NORCREST: processos fiscalizados (azul) vs. nunca fiscalizados (âmbar).' : 'De cada permissionária no Sistema Geo, quantos processos foram fiscalizados (azul) vs. nunca fiscalizados (âmbar).'}
        </p>
        <ResponsiveContainer width="100%" height={Math.max(300, pagPermGeo.itens.length * 34)}>
          <BarChart data={pagPermGeo.itens} layout="vertical" margin={{ left: 120, right: 20, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={115} />
            <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="emComum" name="Fiscalizados"        stackId="a" fill={NAVY} />
            <Bar dataKey="soGeo"   name="Não fiscalizados"    stackId="a" fill={AMBER} />
          </BarChart>
        </ResponsiveContainer>
        {pagPermGeo.ligado && <ControlePaginacao {...pagPermGeo} />}
      </SecaoCard>

      {/* Barras por subprefeitura — perspectiva Sistema Geo */}
      <SecaoCard titulo="Fiscalização dos processos Sistema Geo por subprefeitura (top 15)">
        <p className="text-xs text-gray-500 mb-3">
          De cada subprefeitura no Sistema Geo, quantos processos foram fiscalizados (azul) vs. nunca fiscalizados (âmbar).
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topSubGeo} layout="vertical" margin={{ left: 40, right: 20, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={35} />
            <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="emComum" name="Fiscalizados"        stackId="a" fill={NAVY} />
            <Bar dataKey="soGeo"   name="Não fiscalizados"    stackId="a" fill={AMBER} />
          </BarChart>
        </ResponsiveContainer>
      </SecaoCard>
    </div>
  )
}
