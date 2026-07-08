// Aba "Log de Acessos" do painel de Configurações
// (Fase M5, Frente 3, Etapa 3 — extraído de AdminPanel.jsx).
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { traduzErro } from '../../lib/mensagens.js'
import { fmtDataHora } from '../../lib/aggregations.js'
import { LoadingInline } from '../Loading.jsx'
import ThSort from '../ThSort.jsx'
import { sortArr } from './shared.jsx'

export default function AbaLogs() {
  const [logs, setLogs] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(key) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) setErro(traduzErro(error.message))
      else setLogs(data || [])
      setCarregando(false)
    }
    carregar()
  }, [])

  const logsOrdenados = useMemo(
    () => sortArr(logs, sortKey, sortDir),
    [logs, sortKey, sortDir]
  )

  if (carregando) return <LoadingInline mensagem="Carregando logs..." />
  if (erro) return <p className="text-xs text-red-600">{erro}</p>

  const thProps = { sortKey, sortDir, onSort: handleSort }

  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-gray-500 mb-3">
        {logs.length} registro(s) mais recentes
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-grey-line text-gray-500 uppercase text-[10px]">
            <ThSort colKey="email" label="Email" {...thProps} className="text-left pb-2 pr-4" />
            <ThSort colKey="evento" label="Evento" {...thProps} className="text-left pb-2 pr-4" />
            <ThSort colKey="created_at" label="Data / Hora" {...thProps} className="text-left pb-2" />
          </tr>
        </thead>
        <tbody>
          {logsOrdenados.map((l) => (
            <tr
              key={l.id}
              className="border-b border-grey-line/50 hover:bg-grey-bg/50"
            >
              <td className="py-2 pr-4 text-gray-700">{l.email}</td>
              <td className="py-2 pr-4">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    l.evento === 'login'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {l.evento}
                </span>
              </td>
              <td className="py-2 text-gray-500">
                {l.created_at ? fmtDataHora(l.created_at) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
