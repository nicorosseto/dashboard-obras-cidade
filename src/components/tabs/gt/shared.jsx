import { STATUS_GRUPO_LABEL, STATUS_GRUPO_COR } from '../../../lib/gtObras.js'

// Badge de status_grupo (compatibilizada/paralisada/não classificado) —
// usado pela Lista e pela seção de Inconsistências (fonte única, evita
// duplicar o componente nas 2 telas).
export function StatusGrupoBadge({ grupo }) {
  const label = STATUS_GRUPO_LABEL[grupo] || grupo
  const cor = STATUS_GRUPO_COR[grupo] || '#9CA3AF'
  return (
    <span
      className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold"
      style={{ background: `${cor}1a`, color: cor }}
    >
      {label}
    </span>
  )
}
