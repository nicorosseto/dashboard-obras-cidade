export default function ThSort({ colKey, label, sortKey, sortDir, onSort, className = '', title }) {
  const ativo = colKey === sortKey
  return (
    <th
      onClick={() => onSort(colKey)}
      title={title}
      className={`cursor-pointer select-none group ${className}`}
    >
      <span className="inline-flex items-center gap-0.5">
        <span className="group-hover:text-navy transition-colors">{label}</span>
        <span
          className={`text-[10px] leading-none transition-colors ${
            ativo ? 'text-navy' : 'text-slate-300 group-hover:text-slate-400'
          }`}
        >
          {ativo ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  )
}
