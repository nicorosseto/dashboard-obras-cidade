import { useState, useMemo } from 'react'
import { fmtNumero, fmtData, consolidarNorcrest } from '../../../lib/aggregations.js'
import {
  COLUNAS_EXPORT,
  enrichRow,
  exportXLSX,
  normProc,
  statusVistoriaDe,
} from '../../../lib/emergencias.js'

export default function AbaInformadas({ linhas, totalInformadas, vistoriaMap }) {
  const [viewMode, setViewMode] = useState('consolidada')
  const [todosAbertos, setTodosAbertos] = useState(false)
  const [abertos, setAbertos] = useState(new Set())

  const grupos = useMemo(() => {
    const m = new Map()
    for (const r of linhas) {
      if (r.status !== 'Informada') continue
      const ehNorcrest = String(r.permissionaria || '').toUpperCase().startsWith('NORCREST')
      let key
      if (viewMode === 'unidades') {
        if (!ehNorcrest) continue
        key = r.permissionaria || '(NORCREST sem unidade)'
      } else {
        key = consolidarNorcrest(r.permissionaria) || '(sem)'
      }
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(r)
    }
    for (const [, arr] of m)
      arr.sort((a, b) => (b.data_cadastro || '').localeCompare(a.data_cadastro || ''))
    return Array.from(m.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([nome, items]) => ({ nome, items }))
  }, [linhas, viewMode])

  const totalNaView = useMemo(() => grupos.reduce((s, g) => s + g.items.length, 0), [grupos])

  const toggleGrupo = (nome) => {
    const next = new Set(abertos)
    if (next.has(nome)) next.delete(nome)
    else next.add(nome)
    setAbertos(next)
  }
  const toggleTodos = () => {
    if (todosAbertos) { setAbertos(new Set()); setTodosAbertos(false) }
    else { setAbertos(new Set(grupos.map((g) => g.nome))); setTodosAbertos(true) }
  }

  const exportarTudo = () => {
    let alvo = linhas.filter((r) => r.status === 'Informada')
    if (viewMode === 'unidades') {
      alvo = alvo.filter((r) => String(r.permissionaria || '').toUpperCase().startsWith('NORCREST'))
    }
    const enriched = alvo.map((r) => enrichRow(r, vistoriaMap))
    const hoje = new Date().toISOString().slice(0, 10)
    const sufixo = viewMode === 'unidades' ? 'norcrest-unidades' : 'todas'
    exportXLSX(enriched, COLUNAS_EXPORT, `informadas-${sufixo}-${hoje}.xlsx`, 'Informadas')
  }
  const exportarGrupo = (grupo) => {
    const enriched = grupo.items.map((r) => enrichRow(r, vistoriaMap))
    const safe = grupo.nome.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 28)
    const hoje = new Date().toISOString().slice(0, 10)
    exportXLSX(enriched, COLUNAS_EXPORT, `informadas-${safe}-${hoje}.xlsx`, safe)
  }

  const maxQtd = grupos[0]?.items.length || 1

  return (
    <div className="bg-white rounded-md shadow-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-red uppercase tracking-wide">
            Processos com Status "Informada"
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            {viewMode === 'unidades' ? (
              <>{fmtNumero(totalNaView)} processos da NORCREST · {grupos.length} unidades</>
            ) : (
              <>{fmtNumero(totalInformadas)} processos · {grupos.length} permissionárias</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded border border-grey-line overflow-hidden text-[11px]">
            <button
              onClick={() => setViewMode('consolidada')}
              className={`px-2.5 py-1 ${viewMode === 'consolidada' ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-grey-bg'}`}
            >
              NORCREST consolidada
            </button>
            <button
              onClick={() => setViewMode('unidades')}
              className={`px-2.5 py-1 border-l border-grey-line ${viewMode === 'unidades' ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-grey-bg'}`}
              title="Mostrar apenas unidades NORCREST"
            >
              Por unidades
            </button>
          </div>
          <button
            onClick={exportarTudo}
            title="Exportar como Excel (.xlsx) com colunas separadas"
            className="text-xs px-3 py-1.5 border border-navy text-navy rounded hover:bg-navy hover:text-white transition-colors inline-flex items-center gap-1"
          >
            ⬇ Exportar Excel
          </button>
          <button
            onClick={toggleTodos}
            className="text-xs px-3 py-1.5 border border-navy text-navy rounded hover:bg-navy hover:text-white transition-colors"
          >
            {todosAbertos ? 'Recolher todas' : 'Expandir todas'}
          </button>
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="text-xs text-gray-500 py-6 text-center">
          {viewMode === 'unidades'
            ? 'Nenhuma unidade NORCREST com processos "Informada" nos filtros atuais.'
            : 'Nenhum processo "Informada" nos filtros atuais.'}
        </div>
      ) : (
        <div className="space-y-1">
          {grupos.map((g) => {
            const aberto = abertos.has(g.nome)
            const baseTotal = viewMode === 'unidades' ? totalNaView : totalInformadas
            const pct = baseTotal ? (g.items.length / baseTotal) * 100 : 0
            return (
              <div key={g.nome} className="border border-grey-line rounded">
                <div className="w-full flex items-center gap-3 px-3 py-2 hover:bg-grey-bg">
                  <button onClick={() => toggleGrupo(g.nome)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                    <span className={`w-4 text-navy font-bold text-sm leading-none transition-transform ${aberto ? 'rotate-90' : ''}`}>▶</span>
                    <span className="font-semibold text-sm truncate">{g.nome}</span>
                  </button>
                  <div className="hidden sm:block w-32">
                    <div className="h-1.5 bg-grey-bg rounded overflow-hidden">
                      <div className="h-full bg-red" style={{ width: `${(g.items.length / maxQtd) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-red tabular-nums w-16 text-right">{fmtNumero(g.items.length)}</span>
                  <span className="text-[10px] text-gray-500 w-12 text-right tabular-nums">{pct.toFixed(1)}%</span>
                  <button
                    onClick={() => exportarGrupo(g)}
                    title={`Exportar processos de ${g.nome} em Excel`}
                    className="text-[10px] px-2 py-1 border border-navy/40 text-navy rounded hover:bg-navy hover:text-white transition-colors"
                  >
                    ⬇ XLSX
                  </button>
                </div>
                {aberto && (
                  <div className="overflow-x-auto border-t border-grey-line">
                    <table className="min-w-full text-[11px]">
                      <thead className="bg-grey-bg/50">
                        <tr>
                          <th className="text-left p-2">Processo</th>
                          <th className="text-left p-2">Data Cadastro</th>
                          <th className="text-left p-2">Etapa</th>
                          <th className="text-left p-2">Permissionária</th>
                          <th className="text-left p-2">Subprefeitura</th>
                          <th className="text-left p-2">Possui Vistoria?</th>
                          <th className="text-left p-2">Status Vistoria</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.items.map((it) => {
                          const key = normProc(it.num_processo)
                          const v = vistoriaMap?.get?.(key)
                          const temVist = !!v
                          const statusV = temVist ? statusVistoriaDe(v) : '—'
                          return (
                            <tr key={it.id} className="border-t border-grey-line/50">
                              <td className="p-2 font-mono">{it.num_processo}</td>
                              <td className="p-2">{fmtData(it.data_cadastro) || '—'}</td>
                              <td className="p-2">{it.etapa || '—'}</td>
                              <td className="p-2">{it.permissionaria || '—'}</td>
                              <td className="p-2">{it.subprefeitura || '—'}</td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${temVist ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {temVist ? 'Sim' : 'Não'}
                                </span>
                              </td>
                              <td className="p-2">
                                {temVist ? (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    statusV === 'Legislação Atendida' ? 'bg-green-50 text-green-700 border border-green-200' :
                                    statusV === 'Solucionado'         ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    statusV === 'Em Andamento'        ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                                        'bg-gray-50 text-gray-600 border border-gray-200'
                                  }`}>
                                    {statusV}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
