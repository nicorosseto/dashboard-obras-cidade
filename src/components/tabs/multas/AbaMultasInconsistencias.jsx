import { useMemo, useState } from 'react'
import { fmtNumero, fmtData } from '../../../lib/aggregations.js'
import { agruparPorVinculo, fmtValorBRL } from '../../../lib/multas.js'
import BotaoExportarGrafico from '../../BotaoExportarGrafico.jsx'
import { KpiCard, PaginacaoBusca } from '../emerg/shared.jsx'
import { NAVY, RED } from '../../../lib/cores.js'

const PAGE_SIZE = 30

const COLUNAS = [
  { key: 'linha_planilha', label: 'Linha da Planilha' },
  { key: 'num_processo', label: 'Nº Processo (cru)' },
  { key: 'permissionaria', label: 'Permissionária' },
  { key: 'logradouro', label: 'Logradouro' },
  { key: 'valor', label: 'Valor', transform: (v) => fmtValorBRL(v) },
  { key: 'data_infracao', label: 'Data da Infração', transform: (v) => fmtData(v) },
  { key: 'status', label: 'Status' },
]

function TabelaGrupo({ titulo, linhas, cor, modulo }) {
  const [pag, setPag] = useState(0)
  const pagina = linhas.slice(pag * PAGE_SIZE, (pag + 1) * PAGE_SIZE)
  const totalPag = Math.ceil(linhas.length / PAGE_SIZE)

  return (
    <div className="bg-white rounded-md shadow-card p-4 space-y-3" data-tour="multas-inconsistencias-tabela">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: cor }}>
          {titulo} ({fmtNumero(linhas.length)})
        </h3>
        <BotaoExportarGrafico dados={linhas} colunas={COLUNAS} titulo={titulo} modulo={modulo} />
      </div>
      {linhas.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Nenhuma multa nesta situação.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-sm border border-grey-line">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-navy text-white text-left">
                  {COLUNAS.map((c) => (
                    <th key={c.key} className="p-2 whitespace-nowrap">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagina.map((m, i) => (
                  <tr key={m.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-grey-bg'}>
                    <td className="p-2 whitespace-nowrap">{m.linha_planilha ?? '—'}</td>
                    <td className="p-2 font-mono text-[11px] whitespace-nowrap">{m.num_processo || '—'}</td>
                    <td className="p-2 whitespace-nowrap">{m.permissionaria || '—'}</td>
                    <td className="p-2 whitespace-nowrap">{m.logradouro || '—'}</td>
                    <td className="p-2 whitespace-nowrap tabular-nums">{fmtValorBRL(m.valor)}</td>
                    <td className="p-2 whitespace-nowrap">{fmtData(m.data_infracao)}</td>
                    <td className="p-2 whitespace-nowrap">{m.status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginacaoBusca pag={pag} total={totalPag} onChange={setPag} count={linhas.length} />
        </>
      )}
    </div>
  )
}

// Aba "Inconsistências" — o raio-x dos erros de preenchimento da planilha:
// multas sem número de processo e multas com número de processo que não bate
// em Sistema Geo nem em Fiscalização. Dashboard é read-only — a correção é
// sempre feita NA PLANILHA (Google Sheets), nunca aqui.
export default function AbaMultasInconsistencias({ linhas }) {
  const grupos = useMemo(() => agruparPorVinculo(linhas), [linhas])
  const semProcesso = grupos.sem_processo
  const processoInexistente = grupos.processo_nao_encontrado

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-grey-line bg-white px-4 py-3 text-xs text-gray-600 shadow-card">
        <span aria-hidden className="text-sm leading-none">💡</span>
        <span>
          Este dashboard é <strong>somente leitura</strong>: a correção destas linhas é feita{' '}
          <strong>na planilha "CONTROLE DE AÇÕES FISCAIS - OBRAS / CORBETT"</strong> — a próxima
          sincronização traz o dado já corrigido.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Sem Nº de Processo" valor={semProcesso.length} cor={NAVY} destaque />
        <KpiCard label="Processo Inexistente" valor={processoInexistente.length} cor={RED} destaque />
      </div>

      <TabelaGrupo titulo="Sem número de processo" linhas={semProcesso} cor={NAVY} modulo="multas-sem-processo" />
      <TabelaGrupo titulo="Processo inexistente (não bate com Sistema Geo/Fiscalização)" linhas={processoInexistente} cor={RED} modulo="multas-processo-inexistente" />
    </div>
  )
}
