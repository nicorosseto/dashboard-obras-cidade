import { fmtNumero } from '../lib/aggregations.js'

function CardNumero({ label, valor, sublabel }) {
  return (
    <div className="bg-white rounded-md shadow-card px-4 py-3 flex flex-col">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </div>
      <div className="text-2xl font-bold text-navy mt-1 leading-tight">
        {valor}
      </div>
      {sublabel && (
        <div className="text-[10px] text-gray-500 italic mt-0.5">
          {sublabel}
        </div>
      )}
    </div>
  )
}

export default function KPIStripGeo({ kpis }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <CardNumero label="Total de Protocolos" valor={fmtNumero(kpis.total)} />
      <CardNumero label="Mais Protocolos" valor={kpis.maisProtocolos || '—'} />
      <CardNumero label="Média Diária" valor={fmtNumero(kpis.mediaDiaria)} />
      <CardNumero
        label="% do Total"
        valor={`${(kpis.pctTotal ?? 100).toFixed(1)}%`}
        sublabel="Permissionária"
      />
    </section>
  )
}
