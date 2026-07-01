import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts'
import { fmtNumero, fmtData, consolidarNorcrest } from '../../../lib/aggregations.js'
import {
  exportXLSX, FAIXAS_ATRASO, faixaAtrasoDe,
  COLS_PRAZO, COLS_PRAZO_EXPORT, sortPrazo, normSubpref,
} from '../../../lib/emergencias.js'
import ChartTooltip from '../../charts/ChartTooltip.jsx'
import { usePaginadorGrafico, ControlePaginacao } from '../../charts/PaginadorGrafico.jsx'
import { KpiCard, StatusBadgeEmerg, PaginacaoBusca } from './shared.jsx'

const PAGE_SIZE = 50

const COR_SITUACAO = {
  'Dentro do prazo': '#1F7A4D',
  Vencido: '#C00000',
}

function Chip({ ativo, onClick, children, cor }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
        ativo ? 'text-white border-transparent' : 'bg-white text-gray-600 border-grey-line hover:bg-grey-bg'
      }`}
      style={ativo ? { backgroundColor: cor || '#1F3864' } : undefined}
    >
      {children}
    </button>
  )
}

export default function AbaPrazo48h({ rows, temPosicionamento }) {
  const [sortKey, setSortKey] = useState('_dias_atraso')
  const [sortDir, setSortDir] = useState('desc')
  const [pag, setPag] = useState(0)
  const [fSituacao, setFSituacao] = useState(new Set())
  const [fStatus, setFStatus] = useState(new Set())
  const [fFaixa, setFFaixa] = useState(new Set())

  function handleSort(k) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('asc') }
    setPag(0)
  }

  const statusOpts = useMemo(() => {
    const s = new Set()
    for (const r of rows) if (r.status) s.add(r.status)
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'pt'))
  }, [rows])

  const filtradas = useMemo(() => {
    return rows.filter((r) => {
      if (fSituacao.size > 0) {
        const ok = [...fSituacao].some((s) => {
          if (s === 'Vencido (est.)') return r._vencido && r._estimado
          if (s === 'Vencido') return r._vencido
          return r._situacao === s
        })
        if (!ok) return false
      }
      if (fStatus.size > 0 && !fStatus.has(r.status)) return false
      if (fFaixa.size > 0) {
        const fx = faixaAtrasoDe(r._dias_atraso)
        if (!fx || !fFaixa.has(fx)) return false
      }
      return true
    })
  }, [rows, fSituacao, fStatus, fFaixa])

  const filtrosAtivos = fSituacao.size > 0 || fStatus.size > 0 || fFaixa.size > 0
  const limparFiltros = () => { setFSituacao(new Set()); setFStatus(new Set()); setFFaixa(new Set()); setPag(0) }
  const toggle = (setter) => (val) => {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(val)) next.delete(val)
      else next.add(val)
      return next
    })
    setPag(0)
  }

  const kpis = useMemo(() => {
    let regulares = 0, vencidos = 0, vencReal = 0, vencEstimado = 0, abertosNoPrazo = 0
    for (const r of filtradas) {
      if (r._vencido) {
        vencidos++
        if (r._estimado) vencEstimado++
        else vencReal++
      } else {
        regulares++
        if (r.status === 'Informada') abertosNoPrazo++
      }
    }
    const total = regulares + vencidos
    return { regulares, vencidos, vencReal, vencEstimado, abertosNoPrazo, pctNoPrazo: total > 0 ? (regulares / total) * 100 : 0 }
  }, [filtradas])

  const dadosSituacao = useMemo(() => {
    const m = { 'Dentro do prazo': 0, Vencido: 0 }
    for (const r of filtradas) m[r._situacao] = (m[r._situacao] || 0) + 1
    const total = filtradas.length || 1
    return Object.entries(m).filter(([, v]) => v > 0).map(([nome, valor]) => ({
      nome, valor, pct: parseFloat(((valor / total) * 100).toFixed(1)),
    }))
  }, [filtradas])

  // Drill-down NORCREST: quando todas as linhas são NORCREST, desagrega por unidade
  const norcrestDrillDown = useMemo(
    () => rows.length > 0 && rows.every((r) => r.permissionaria && String(r.permissionaria).toUpperCase().startsWith('NORCREST')),
    [rows]
  )

  const dadosPermVencidos = useMemo(() => {
    const m = new Map()
    for (const r of filtradas) {
      if (!r._vencido) continue
      const nome = (norcrestDrillDown ? r.permissionaria : consolidarNorcrest(r.permissionaria)) || '(sem)'
      if (!m.has(nome)) m.set(nome, { nome, vencidos: 0, somaAtraso: 0 })
      const o = m.get(nome)
      o.vencidos++
      o.somaAtraso += r._dias_atraso || 0
    }
    return Array.from(m.values())
      .map((o) => ({ ...o, atrasoMedio: o.vencidos ? o.somaAtraso / o.vencidos : 0 }))
      .sort((a, b) => b.vencidos - a.vencidos)
      .slice(0, norcrestDrillDown ? Infinity : 10)
  }, [filtradas, norcrestDrillDown])

  // Paginação no drill-down da NORCREST (8 unidades por vez).
  const pagPerm = usePaginadorGrafico(dadosPermVencidos, { tamanho: 8, ativo: norcrestDrillDown })

  const tipoCol = useMemo(() => COLS_PRAZO.find((c) => c.key === sortKey)?.tipo || 'str', [sortKey])
  const sorted = useMemo(() => sortPrazo(filtradas, sortKey, sortDir, tipoCol), [filtradas, sortKey, sortDir, tipoCol])
  const totalPag = Math.ceil(sorted.length / PAGE_SIZE)
  const pagina = sorted.slice(pag * PAGE_SIZE, (pag + 1) * PAGE_SIZE)

  const exportar = () => {
    const hoje = new Date().toISOString().slice(0, 10)
    exportXLSX(sorted, COLS_PRAZO_EXPORT, `prazo-48h-${hoje}.xlsx`, 'Prazo 48h')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Dentro do prazo" valor={kpis.regulares} cor="#1F7A4D" />
        <KpiCard label="Vencidos (48h)" valor={kpis.vencidos} cor="#C00000" destaque />
        <KpiCard label="% no prazo" valor={isNaN(kpis.pctNoPrazo) ? 0 : Math.round(kpis.pctNoPrazo)} sufixo="%" cor="#1F3864" />
        <KpiCard label="Em aberto no prazo" valor={kpis.abertosNoPrazo} cor="#2E4F7F" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-md shadow-card p-4">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-2">Situação dos prazos</h3>
          {dadosSituacao.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={dadosSituacao} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {dadosSituacao.map((d) => <Cell key={d.nome} fill={COR_SITUACAO[d.nome] || '#9CA3AF'} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-1">
            {dadosSituacao.map((d) => (
              <span key={d.nome} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COR_SITUACAO[d.nome] }} />
                {d.nome}: <strong>{fmtNumero(d.valor)}</strong> ({d.pct.toFixed(1)}%)
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-md shadow-card p-4">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-2">{norcrestDrillDown ? 'NORCREST — unidades com mais vencidos' : 'Permissionárias com mais vencidos (top 10)'}</h3>
          {dadosPermVencidos.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">Nenhum processo vencido no recorte atual.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(240, pagPerm.itens.length * 24)}>
              <BarChart data={pagPerm.itens} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
                <Bar dataKey="vencidos" name="Vencidos" fill="#C00000" radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="vencidos" position="right" style={{ fontSize: 10, fill: '#374151' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {pagPerm.ligado && <ControlePaginacao {...pagPerm} />}
        </div>
      </div>

      <div className="bg-white rounded-md shadow-card p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-red uppercase tracking-wide">Regra das 48h — SLA das emergências</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {fmtNumero(sorted.length)} processos · prazo = início da obra (ou cadastro) + 48h. Vencido = "Informada" após o prazo.
            </p>
          </div>
          <button onClick={exportar} title="Exportar como Excel (.xlsx)" className="text-xs px-3 py-1.5 border border-navy text-navy rounded hover:bg-navy hover:text-white transition-colors inline-flex items-center gap-1 shrink-0">
            ⬇ Exportar Excel
          </button>
        </div>

        <div className="border border-grey-line rounded-lg p-3 space-y-2.5 bg-grey-bg/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Filtros</span>
            {filtrosAtivos && (
              <button onClick={limparFiltros} className="text-[11px] text-navy hover:underline">Limpar filtros</button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-gray-500 w-20 shrink-0">Situação</span>
            {['Dentro do prazo', 'Vencido', 'Vencido (est.)'].map((s) => (
              <Chip key={s} ativo={fSituacao.has(s)} onClick={() => toggle(setFSituacao)(s)} cor={s === 'Vencido (est.)' ? '#D97706' : COR_SITUACAO[s]}>{s}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-gray-500 w-20 shrink-0">Dias atraso</span>
            {FAIXAS_ATRASO.map((f) => (
              <Chip key={f.id} ativo={fFaixa.has(f.id)} onClick={() => toggle(setFFaixa)(f.id)} cor="#C00000">{f.label}</Chip>
            ))}
          </div>
          {statusOpts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-500 w-24 shrink-0">Status Sistema Geo</span>
              {statusOpts.map((s) => (
                <Chip key={s} ativo={fStatus.has(s)} onClick={() => toggle(setFStatus)(s)}>{s}</Chip>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-red" />
            Atraso <strong>real</strong> (pelo aviso de início)
            {kpis.vencReal > 0 && <span className="text-gray-400">· {fmtNumero(kpis.vencReal)}</span>}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border-2 border-dashed border-amber-500 bg-amber-50" />
            Atraso <strong>estimado</strong> (pela data de cadastro)
            {kpis.vencEstimado > 0 && <span className="text-gray-400">· {fmtNumero(kpis.vencEstimado)}</span>}
          </span>
        </div>

        {!temPosicionamento && (
          <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[11px] text-amber-800">
            Nenhuma planilha de <strong>posicionamento de obras</strong> foi carregada. Os prazos abaixo são <strong>estimados</strong> pela data de cadastro.
          </div>
        )}

        <div className="overflow-x-auto rounded border border-grey-line">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-navy text-white text-left">
                {COLS_PRAZO.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`p-2 whitespace-nowrap cursor-pointer select-none group${col.sepBefore ? ' border-l-2 border-white/20' : ''}`}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      <span className="group-hover:text-white/80 transition-colors">{col.label}</span>
                      <span className={`text-[10px] leading-none ${sortKey === col.key ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`}>
                        {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagina.map((it, i) => {
                const estilo = it._vencido
                  ? it._estimado ? 'bg-amber-50' : 'bg-red/5'
                  : i % 2 === 0 ? 'bg-white' : 'bg-grey-bg'
                return (
                  <tr key={it.id || i} className={estilo}>
                    <td className="p-2 font-mono text-[11px] whitespace-nowrap">{it.num_processo || '—'}</td>
                    <td className="p-2 whitespace-nowrap">{it.permissionaria || '—'}</td>
                    <td className="p-2 whitespace-nowrap">{normSubpref(it.subprefeitura) || '—'}</td>
                    <td className="p-2 whitespace-nowrap"><StatusBadgeEmerg status={it.status} /></td>
                    <td className="p-2 whitespace-nowrap">{fmtData(it.data_cadastro) || '—'}</td>
                    <td className="p-2 whitespace-nowrap">
                      {it._aviso_inicio ? fmtData(it._aviso_inicio) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {it._aviso_termino ? fmtData(it._aviso_termino) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {it._prazo_iso ? (
                        <span className={it._estimado ? 'text-amber-700 italic' : 'text-navy'} title={it._estimado ? 'Prazo estimado pela data de cadastro' : 'Prazo real pelo aviso de início da obra'}>
                          {fmtData(it._prazo_iso)}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-2 whitespace-nowrap text-center">
                      {it._dias_atraso != null ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${it._estimado ? 'bg-amber-50 text-amber-700 border border-dashed border-amber-400' : 'bg-red/10 text-red'}`}
                          title={it._estimado ? 'Atraso estimado (pela data de cadastro)' : 'Atraso real (pelo aviso de início)'}>
                          {fmtNumero(it._dias_atraso)}d
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-2 whitespace-nowrap text-center">
                      {it._vencido ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${it._estimado ? 'bg-amber-100 text-amber-800 border border-dashed border-amber-400' : 'bg-red/10 text-red'}`}>
                          Vencido{it._estimado ? ' (est.)' : ''}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">Dentro do prazo</span>
                      )}
                    </td>
                    <td className="p-2 text-center border-l-2 border-gray-200">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${it._possui_vistoria === 'Sim' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {it._possui_vistoria}
                      </span>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {it._status_vistoria && it._status_vistoria !== '—' ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          it._status_vistoria === 'Legislação Atendida' ? 'bg-green-50 text-green-700 border border-green-200' :
                          it._status_vistoria === 'Solucionado'         ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          it._status_vistoria === 'Em Andamento'        ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                                          'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                          {it._status_vistoria}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                )
              })}
              {pagina.length === 0 && (
                <tr>
                  <td colSpan={COLS_PRAZO.length} className="p-4 text-center text-gray-400">
                    Nenhum processo para os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginacaoBusca pag={pag} total={totalPag} onChange={setPag} count={sorted.length} />
      </div>
    </div>
  )
}
