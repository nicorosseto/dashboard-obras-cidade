import { fmtNumero } from '../lib/aggregations.js'

function Card({ label, valor, pct, accent }) {
  return (
    <div className="bg-white rounded-md shadow-card px-4 py-3 flex flex-col">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </div>
      <div className="flex items-baseline justify-between mt-1">
        <div
          className={`text-2xl font-bold ${accent ? 'text-red' : 'text-navy'}`}
        >
          {fmtNumero(valor)}
        </div>
        {pct !== undefined && (
          <div className="text-xs font-semibold text-gray-500 bg-grey-bg px-2 py-0.5 rounded-sm">
            {pct}%
          </div>
        )}
      </div>
    </div>
  )
}

export default function KPIStrip({ kpis }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <Card label="Total de Visitas Técnicas" valor={kpis.total} />
      <Card
        label="Legislação Atendida"
        valor={kpis.legAtendida}
        pct={kpis.pctLegAtendida}
      />
      <Card
        label="Não Conformidades"
        valor={kpis.naoConform}
        pct={kpis.pctNaoConform}
        accent
      />
      <Card
        label="Solucionados"
        valor={kpis.solucionados}
        pct={kpis.pctSolucNC}
      />
      <Card
        label="Em Andamento"
        valor={kpis.emAndamento}
        pct={kpis.pctEmAndNC}
        accent
      />
    </section>
  )
}
