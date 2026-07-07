// Aba 7 — Mapa. Extraído de PaginaGeo4Cruzamento.jsx (Fase M5, Etapa 2).
import { useState, useMemo } from 'react'
import { fmtNumero } from '../../../lib/aggregations.js'
import MapaSP from '../../charts/MapaSP.jsx'
import { SecaoCard, TabelaPaginada } from './shared.jsx'

const COLS_MAPA_SUB = [
  { key: 'sub',      label: 'Subprefeitura' },
  { key: 'totalGeo', label: 'Total Sistema Geo',  render: r => fmtNumero(r.totalGeo) },
  { key: 'emComum',  label: 'Fiscalizados',     render: r => fmtNumero(r.emComum) },
  { key: 'soGeo',    label: 'Não fiscalizados', render: r => fmtNumero(r.soGeo) },
  {
    key: 'pctCob', label: '% Fiscalizado',
    render: r => (
      <span className={`font-semibold ${r.pctCob < 70 ? 'text-red' : 'text-verde'}`}>
        {r.pctCob}%
      </span>
    ),
  },
]

export default function AbaMapa({ porSubpref }) {
  const [subSelecionada, setSubSelecionada] = useState(null)

  const contagensCobertura = useMemo(() => {
    const m = new Map()
    for (const s of porSubpref) {
      if (s.sub && s.sub !== '(sem)') m.set(s.sub, s.pctCob)
    }
    return m
  }, [porSubpref])

  const selecionadas = useMemo(
    () => new Set(subSelecionada ? [subSelecionada] : []),
    [subSelecionada]
  )

  const detalheSub = subSelecionada
    ? porSubpref.find(s => s.sub === subSelecionada)
    : null

  function handleSelecionar(sigla) {
    setSubSelecionada(s => s === sigla ? null : sigla)
  }

  return (
    <div className="space-y-4">
      {/* Mapa (MapaSP já é um card próprio) + coluna direita, ambos 760px → alinhados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mapa — altura fixa; MapaSP preenche (h-full interno) */}
        <div className="lg:col-span-2" style={{ height: 760 }}>
          <MapaSP
            titulo="Cobertura de Fiscalização por Subprefeitura (%)"
            contagens={contagensCobertura}
            unidade="% cob."
            selecionadas={selecionadas}
            onSelecionar={handleSelecionar}
          />
        </div>

        {/* Coluna direita — mesma altura do mapa, dois painéis meio a meio */}
        <div className="flex flex-col gap-3" style={{ height: 760 }}>

          {/* Painel de detalhe — sempre flex-1 (metade da coluna), tamanho fixo */}
          <SecaoCard
            titulo={detalheSub ? `Subprefeitura: ${detalheSub.sub}` : 'Subprefeitura'}
            className="flex-1 min-h-0 flex flex-col"
          >
            {detalheSub ? (
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 text-sm pr-1">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { l: 'Total Sistema Geo', v: fmtNumero(detalheSub.totalGeo) },
                    { l: 'Em comum',       v: fmtNumero(detalheSub.emComum) },
                    { l: 'Só Fisc.',       v: fmtNumero(detalheSub.soFisc) },
                    { l: 'Só Sistema Geo',    v: fmtNumero(detalheSub.soGeo) },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-slate-50 rounded-sm p-2">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{l}</p>
                      <p className="text-base font-bold text-navy tabular-nums">{v}</p>
                    </div>
                  ))}
                </div>
                <div className={`rounded-sm p-2 text-center ${detalheSub.pctCob < 70 ? 'bg-red/5 border border-red/20' : 'bg-verde/5 border border-verde/20'}`}>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Cobertura Sistema Geo</p>
                  <p className={`text-2xl font-bold tabular-nums ${detalheSub.pctCob < 70 ? 'text-red' : 'text-verde'}`}>
                    {detalheSub.pctCob}%
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {detalheSub.pctCob < 70 ? 'Baixa cobertura' : 'Boa cobertura'}
                  </p>
                </div>
                <button onClick={() => setSubSelecionada(null)}
                  className="w-full text-xs py-1.5 border border-slate-200 rounded-sm text-gray-500 hover:bg-slate-50 shrink-0">
                  Limpar seleção
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                <svg className="w-10 h-10 mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z" />
                </svg>
                <p className="text-sm font-medium">Nenhuma subprefeitura selecionada</p>
                <p className="text-xs mt-1">Clique em uma região do mapa para ver os detalhes.</p>
              </div>
            )}
          </SecaoCard>

          {/* Ranking — sempre flex-1 (metade da coluna), scroll interno */}
          <SecaoCard titulo="Ranking por cobertura" className="flex-1 min-h-0 flex flex-col">
            <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1 px-1 shrink-0">
              <span className="col-span-1">Sub.</span>
              <span className="text-right">Sistema Geo</span>
              <span className="text-right">% cob.</span>
            </div>
            <div className="space-y-0.5 overflow-y-auto pr-1 flex-1 min-h-0">
              {[...porSubpref].sort((a, b) => a.pctCob - b.pctCob)
                .filter(s => s.sub !== '(sem)' && s.totalGeo > 0)
                .map((s) => (
                  <button key={s.sub} onClick={() => handleSelecionar(s.sub)}
                    className={`w-full grid grid-cols-3 gap-1 text-xs px-1 py-1 rounded-sm text-left transition-colors ${subSelecionada === s.sub ? 'bg-navy/10 font-semibold' : 'hover:bg-slate-50'}`}>
                    <span className="truncate">{s.sub}</span>
                    <span className="text-right text-gray-500 tabular-nums">{fmtNumero(s.totalGeo)}</span>
                    <span className={`text-right font-semibold tabular-nums ${s.pctCob < 70 ? 'text-red' : 'text-verde'}`}>{s.pctCob}%</span>
                  </button>
                ))}
            </div>
          </SecaoCard>
        </div>
      </div>

      {/* Tabela completa */}
      <SecaoCard titulo="Todas as subprefeituras">
        <TabelaPaginada
          rows={porSubpref.filter(s => s.sub !== '(sem)')}
          colunas={COLS_MAPA_SUB}
          emptyMsg="Nenhum dado disponível."
          defaultSort="pctCob"
          defaultDir="asc"
        />
      </SecaoCard>
    </div>
  )
}
