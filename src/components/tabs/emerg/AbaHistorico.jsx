import { useState } from 'react'
import { fmtNumero, fmtData, fmtDataHora } from '../../../lib/aggregations.js'
import { STATUS_COLOR } from '../../../lib/emergencias.js'
import { LoadingInline } from '../../Loading.jsx'

const STATUS_PRINCIPAIS = new Set(['Informada', 'Encerrada', 'Cancelada'])

function somarOutros(pStatObj) {
  let s = 0
  for (const [k, v] of Object.entries(pStatObj || {})) {
    if (!STATUS_PRINCIPAIS.has(k)) s += Number(v) || 0
  }
  return s
}

export default function AbaHistorico({ snapshots, carregando }) {
  const [abertos, setAbertos] = useState(new Set())
  const toggle = (id) => {
    const next = new Set(abertos)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setAbertos(next)
  }

  return (
    <div className="bg-white rounded-md shadow-card p-4">
      <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-2">Histórico de Uploads</h3>
      <p className="text-[11px] text-gray-500 mb-4">
        Para excluir registros do histórico, acesse o painel de administração (⚙).
      </p>
      {carregando ? (
        <LoadingInline mensagem="Carregando histórico..." />
      ) : snapshots.length === 0 ? (
        <div className="text-sm text-gray-500 py-4 text-center">Nenhum upload registrado ainda.</div>
      ) : (
        <>
          <div
            className="grid grid-cols-13 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b-2 border-grey-line mb-1"
            style={{ gridTemplateColumns: 'auto repeat(12, minmax(0, 1fr))' }}
          >
            <span className="w-4"></span>
            <span className="col-span-3">Quando</span>
            <span className="col-span-3">Usuário</span>
            <span className="col-span-2">Arquivo</span>
            <span className="col-span-1 text-right">Total</span>
            <span className="col-span-1 text-right">Inf.</span>
            <span className="col-span-1 text-right">Enc.</span>
            <span className="col-span-1 text-right">Outros</span>
          </div>
          <div className="space-y-1">
            {snapshots.map((s) => {
              const pStat = Object.fromEntries((s.por_status || []).map((x) => [x.status, x.qtd]))
              const outros = somarOutros(pStat)
              const aberto = abertos.has(s.id)
              const perPerm = s.por_permissionaria || null
              return (
                <div key={s.id} className="border border-grey-line rounded">
                  <button onClick={() => toggle(s.id)} className="w-full text-left hover:bg-grey-bg/40">
                    <div className="grid gap-2 items-center px-3 py-2 text-xs" style={{ gridTemplateColumns: 'auto repeat(12, minmax(0, 1fr))' }}>
                      <span className={`w-4 text-navy font-bold text-sm leading-none inline-block transition-transform ${aberto ? 'rotate-90' : ''}`}>▶</span>
                      <span className="col-span-3 truncate">{fmtDataHora(s.uploaded_at)}</span>
                      <span className="col-span-3 truncate">{s.uploaded_by_email || '—'}</span>
                      <span className="col-span-2 font-mono truncate" title={s.nome_arquivo}>{s.nome_arquivo || '—'}</span>
                      <span className="col-span-1 text-right tabular-nums font-semibold">{fmtNumero(s.total_processos)}</span>
                      <span className="col-span-1 text-right tabular-nums text-red">{fmtNumero(pStat['Informada'] || 0)}</span>
                      <span className="col-span-1 text-right tabular-nums" style={{ color: STATUS_COLOR['Encerrada'] }}>{fmtNumero(pStat['Encerrada'] || 0)}</span>
                      <span className="col-span-1 text-right tabular-nums text-gray-500">{fmtNumero(outros)}</span>
                    </div>
                  </button>
                  {aberto && (
                    <div className="border-t border-grey-line p-3 bg-grey-bg/30">
                      {perPerm && perPerm.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-[11px] bg-white rounded">
                            <thead className="bg-grey-bg">
                              <tr>
                                <th className="text-left p-2">Permissionária</th>
                                <th className="text-right p-2 text-red">Informada</th>
                                <th className="text-right p-2" style={{ color: STATUS_COLOR['Encerrada'] }}>Encerrada</th>
                                <th className="text-right p-2" style={{ color: STATUS_COLOR['Cancelada'] }}>Cancelada</th>
                                <th className="text-right p-2 text-gray-500">Outros</th>
                                <th className="text-right p-2 font-bold">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {perPerm.map((p) => (
                                <tr key={p.nome} className="border-t border-grey-line/50">
                                  <td className="p-2 font-medium">{p.nome}</td>
                                  <td className="p-2 text-right tabular-nums text-red">{fmtNumero(p.por_status?.['Informada'] || 0)}</td>
                                  <td className="p-2 text-right tabular-nums">{fmtNumero(p.por_status?.['Encerrada'] || 0)}</td>
                                  <td className="p-2 text-right tabular-nums">{fmtNumero(p.por_status?.['Cancelada'] || 0)}</td>
                                  <td className="p-2 text-right tabular-nums text-gray-500">{fmtNumero(somarOutros(p.por_status))}</td>
                                  <td className="p-2 text-right tabular-nums font-bold">{fmtNumero(p.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-500 italic">
                          Este snapshot foi salvo antes da atualização — não tem detalhamento por permissionária.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
