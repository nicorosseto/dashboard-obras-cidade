import { useState } from 'react'
import { supabase } from '../../../lib/supabase.js'
import { traduzErro } from '../../../lib/mensagens.js'
import { LoadingConteudo } from '../../Loading.jsx'
import AbaMultasGeral from './AbaMultasGeral.jsx'
import AbaMultasInconsistencias from './AbaMultasInconsistencias.jsx'
import AbaMultasBusca from './AbaMultasBusca.jsx'

// Pop-up de resultado da sincronização — exige confirmação manual (regra do
// dominio.md: nenhum pop-up fecha sozinho por timer).
function ModalResultado({ titulo, mensagem, erro, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${erro ? 'bg-red/10' : 'bg-green-100'}`}>
          {erro ? (
            <svg className="w-6 h-6 text-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-1">{titulo}</h3>
        <p className="text-sm text-gray-700 mb-5 whitespace-pre-line">{mensagem}</p>
        <button onClick={onClose} className="w-full py-2 rounded-sm bg-navy text-white text-sm font-semibold hover:bg-navy-light transition-colors">
          Ok
        </button>
      </div>
    </div>
  )
}

export default function PaginaMultas({
  linhas,
  carregando,
  basesCarregando,
  abaAtiva,
  podeVerInconsistencias,
  podeVerBusca,
  podeAtualizar,
  onAtualizado,
}) {
  const [sincronizando, setSincronizando] = useState(false)
  const [resultado, setResultado] = useState(null) // { titulo, mensagem, erro }

  async function handleAtualizarAgora() {
    setSincronizando(true)
    try {
      const { data, error } = await supabase.functions.invoke('sync-multas', {
        body: { force: true },
      })
      if (error) throw error
      await onAtualizado?.()
      const total = data?.total_linhas ?? data?.totalLinhas
      const comChave = data?.com_chave ?? data?.comChave
      const semChave = data?.sem_chave ?? data?.semChave
      const partes = []
      if (total != null) partes.push(`${total.toLocaleString('pt-BR')} linhas na planilha`)
      if (comChave != null) partes.push(`${comChave.toLocaleString('pt-BR')} com AUTO DA MULTA`)
      if (semChave != null) partes.push(`${semChave.toLocaleString('pt-BR')} sem AUTO DA MULTA`)
      setResultado({
        titulo: 'Sincronização concluída',
        mensagem: partes.length ? partes.join('\n') : 'A planilha de multas foi sincronizada com sucesso.',
        erro: false,
      })
    } catch (e) {
      setResultado({
        titulo: 'Falha na sincronização',
        mensagem: traduzErro(e?.message || String(e)),
        erro: true,
      })
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {basesCarregando && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span aria-hidden className="text-sm leading-none">ℹ️</span>
          <span>
            Cruzamento parcial — as bases de Sistema Geo/Fiscalização ainda estão carregando. Os
            números de "processo inexistente" podem mudar até o carregamento terminar.
          </span>
        </div>
      )}

      {podeAtualizar && (
        <div className="flex justify-end">
          <button
            onClick={handleAtualizarAgora}
            disabled={sincronizando}
            data-tour="multas-atualizar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-sm border border-red text-red hover:bg-red hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sincronizando ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
            {sincronizando ? 'Sincronizando…' : 'Atualizar agora'}
          </button>
        </div>
      )}

      {resultado && (
        <ModalResultado
          titulo={resultado.titulo}
          mensagem={resultado.mensagem}
          erro={resultado.erro}
          onClose={() => setResultado(null)}
        />
      )}

      {carregando && linhas.length === 0 ? (
        <LoadingConteudo mensagem="Carregando multas…" />
      ) : (
        <>
          {abaAtiva === 'geral' && <AbaMultasGeral linhas={linhas} />}
          {abaAtiva === 'inconsistencias' && podeVerInconsistencias && (
            <AbaMultasInconsistencias linhas={linhas} />
          )}
          {abaAtiva === 'busca' && podeVerBusca && <AbaMultasBusca linhas={linhas} />}
        </>
      )}
    </div>
  )
}
