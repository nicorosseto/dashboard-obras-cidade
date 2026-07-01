import LinhaTemporal from '../charts/LinhaTemporal.jsx'
import Trimestres from '../charts/Trimestres.jsx'

export default function Pagina2Temporal({ rows }) {
  return (
    <div className="space-y-4">
      <LinhaTemporal titulo="Evolução de Laudos por Status" rows={rows} />
      <Trimestres titulo="Laudos Solucionados por Trimestre" rows={rows} />
    </div>
  )
}
