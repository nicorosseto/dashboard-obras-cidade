import { useRef, useEffect, useState } from 'react'
import { NAVY, NAVY_LIGHT } from '../lib/cores.js'

export default function ModuleDropdown({
  modules = [],
  activeModuleId = null,
  onSelect = () => {},
  showAdmin = false,
  onAdmin = () => {},
  accentFrom = NAVY,
  accentTo = NAVY_LIGHT,
}) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false)
      }
    }
    if (aberto) {
      document.addEventListener('mousedown', handleClickFora)
      return () => document.removeEventListener('mousedown', handleClickFora)
    }
  }, [aberto])

  const handleSelectModule = (moduleId) => {
    onSelect(moduleId)
    setAberto(false)
  }

  if (!modules || modules.length === 0) return null

  const accentGradient = `linear-gradient(to right, ${accentFrom}, ${accentTo})`

  return (
    <div className="relative" ref={containerRef}>
      {/* Botão com cor do módulo ativo */}
      <button
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white rounded-sm transition-all hover:opacity-90"
        style={{ background: accentGradient }}
      >
        <span>Módulos</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="absolute top-full mt-1 left-0 bg-slate-700 rounded-lg shadow-lg py-1 min-w-[220px] z-50 border border-white/10">
          {/* Tira colorida no topo do painel */}
          <div className="h-0.5 w-full rounded-t-lg mb-1" style={{ background: accentGradient }} />
          {modules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => handleSelectModule(mod.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors ${
                mod.id === activeModuleId
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {mod.icon && <span className="w-4 h-4 shrink-0">{mod.icon}</span>}
              <span className="flex-1">{mod.label}</span>
              <svg
                className="w-3.5 h-3.5 text-white/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}

          {showAdmin && (
            <>
              <div className="my-1 border-t border-white/20" />
              <button
                onClick={() => {
                  onAdmin()
                  setAberto(false)
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                <span>Configurações</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
