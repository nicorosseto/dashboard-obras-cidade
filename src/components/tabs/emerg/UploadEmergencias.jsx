// Componentes de upload do módulo de Emergências: zonas de drag-and-drop,
// pré-visualizações e mapeamento manual de colunas.
import { useState } from 'react'
import { fmtNumero, fmtData } from '../../../lib/aggregations.js'
import { STATUS_COLOR, COLUNAS_EMERG } from '../../../lib/emergencias.js'
import AjudaUpload, { Regra } from '../../AjudaUpload.jsx'

function AjudaEmergencias() {
  return (
    <>
      <p className="text-gray-600">
        Ao enviar a planilha de emergências, o sistema faz alguns tratamentos
        automáticos antes de gravar.
      </p>
      <Regra titulo="1. Leitura das colunas">
        Lê a primeira aba da planilha e procura as colunas por vários nomes
        possíveis: nº do processo (obrigatório), status, data de cadastro,
        etapa, permissionária e subprefeitura. Assim funciona mesmo se o
        cabeçalho variar um pouco.
      </Regra>
      <Regra titulo="2. Conferência das colunas">
        O sistema reconhece as colunas padrão (numProcesso, status, dataCadastro,
        etapa, permissionaria, subprefeitura). Se o cabeçalho vier diferente,
        aparece um <strong>passo de mapeamento</strong> para você indicar qual
        coluna corresponde a cada campo antes de continuar.
      </Regra>
      <Regra titulo="3. Linhas sem nº de processo e duplicadas">
        Linhas sem nº de processo são <strong>descartadas</strong> (o nº é a
        chave de cada emergência). Linhas repetidas pelo mesmo nº de processo são{' '}
        <strong>unificadas</strong>, mantendo a de data de cadastro mais recente.
      </Regra>
      <Regra titulo="4. Datas">
        A data de cadastro é padronizada para <strong>AAAA-MM-DD</strong>
        (aceita data do Excel, número serial ou texto DD/MM/AAAA).
      </Regra>
      <Regra titulo="5. Status">
        O status é limpo (espaços nas pontas e diferenças de
        maiúsculas/minúsculas), mas <strong>valores distintos nunca são
        agrupados</strong> — "Informada" e "Informado", por exemplo, continuam
        separados.
      </Regra>
      <Regra titulo="6. Pré-visualização antes de gravar">
        Ao enviar a planilha, primeiro aparece um <strong>resumo</strong> para você conferir.{' '}
        <strong>Nada é gravado antes da sua confirmação.</strong>
      </Regra>
      <Regra titulo="7. Substituição total">
        Ao confirmar, o upload <strong>substitui todos os dados</strong> de
        emergências pelos da planilha (apaga e reinsere em lotes).
      </Regra>
      <Regra titulo="8. Histórico">
        Cada upload fica registrado no histórico (quem, quando, arquivo e
        totais), na aba "Histórico" desta tela.
      </Regra>
    </>
  )
}

export function UploadZone({ dragOver, setDragOver, onDrop, onPickFile, status, totalAtual }) {
  const bloqueado = !!status && !status.erro && status.progresso < 100
  return (
    <div className="bg-white rounded-md shadow-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wide">
            Atualizar Emergências
          </h3>
          <AjudaUpload titulo="Como a planilha de Emergências é tratada">
            <AjudaEmergencias />
          </AjudaUpload>
        </div>
        <p className="text-[11px] text-gray-500">
          {totalAtual > 0
            ? `Atualmente: ${fmtNumero(totalAtual)} processos no banco`
            : 'Nenhum dado carregado ainda'}
        </p>
      </div>
      <label
        onDragOver={(e) => { e.preventDefault(); if (!bloqueado) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={bloqueado ? (e) => e.preventDefault() : onDrop}
        className={`block border-2 border-dashed rounded-md py-6 px-4 text-center transition-colors ${
          bloqueado
            ? 'border-grey-line bg-grey-bg opacity-50 cursor-not-allowed pointer-events-none'
            : dragOver ? 'border-navy bg-navy/5 cursor-pointer' : 'border-grey-line hover:border-navy/50 bg-grey-bg cursor-pointer'
        }`}
      >
        <input type="file" accept=".xlsx,.xls" onChange={onPickFile} disabled={bloqueado} className="hidden" />
        <svg className="w-7 h-7 mx-auto text-navy mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="text-xs font-semibold text-navy">
          Arraste o arquivo .xlsx aqui ou clique para selecionar
        </div>
        <div className="text-[10px] text-gray-500 mt-1">Os dados anteriores serão substituídos</div>
      </label>
      {status && status.progresso < 100 && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md px-3 py-2.5">
          {status.erro ? (
            <div className="text-xs text-red-600"><strong>Erro:</strong> {status.erro}</div>
          ) : (
            <div className="space-y-1.5">
              <span className="text-xs text-navy font-medium">{status.mensagem}</span>
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-navy/60 animate-pulse rounded-full" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function UploadObrasZone({ dragOver, setDragOver, onDrop, onPickFile, status, totalAtual }) {
  const bloqueado = !!status && !status.erro && status.progresso < 100
  return (
    <div className="bg-amber-50 rounded-md shadow-card p-4 border border-amber-200">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">
            Posicionamento de Obras
          </h3>
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-200 rounded px-1.5 py-0.5">
            Opcional, mas importante
          </span>
        </div>
        <p className="text-[11px] text-amber-700">
          {totalAtual > 0
            ? `Atualmente: ${fmtNumero(totalAtual)} obras com posicionamento`
            : 'Nenhum posicionamento carregado'}
        </p>
      </div>
      <p className="text-[11px] text-amber-700/90 mb-2">
        Planilha com as <strong>datas de início e fim de obra</strong> (chave
        Código AIO). Necessária para a regra das 48h — identifica emergências
        "Informada" há mais de 48h do início (irregulares).
      </p>
      <label
        onDragOver={(e) => { e.preventDefault(); if (!bloqueado) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={bloqueado ? (e) => e.preventDefault() : onDrop}
        className={`block border-2 border-dashed rounded-md py-5 px-4 text-center transition-colors ${
          bloqueado
            ? 'border-amber-300 bg-amber-50 opacity-50 cursor-not-allowed pointer-events-none'
            : dragOver ? 'border-amber-500 bg-amber-100 cursor-pointer' : 'border-amber-300 hover:border-amber-500 bg-amber-50 cursor-pointer'
        }`}
      >
        <input type="file" accept=".xlsx,.xls" onChange={onPickFile} disabled={bloqueado} className="hidden" />
        <svg className="w-7 h-7 mx-auto text-amber-600 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="text-xs font-semibold text-amber-800">
          Arraste a planilha de posicionamento aqui ou clique para selecionar
        </div>
        <div className="text-[10px] text-amber-600 mt-1">O posicionamento anterior será substituído</div>
      </label>
      {status && status.progresso < 100 && (
        <div className="mt-3 bg-amber-50 border border-amber-300 rounded-md px-3 py-2.5">
          {status.erro ? (
            <div className="text-xs text-red-600"><strong>Erro:</strong> {status.erro}</div>
          ) : (
            <div className="space-y-1.5">
              <span className="text-xs text-amber-800 font-medium">{status.mensagem}</span>
              <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-amber-400 animate-pulse rounded-full" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CardResumoObras({ label, valor, destaque = false }) {
  return (
    <div className={`rounded-md p-2 text-center ${destaque ? 'bg-amber-100' : 'bg-grey-bg'}`}>
      <div className={`text-lg font-bold ${destaque ? 'text-amber-700' : 'text-navy'}`}>
        {fmtNumero(valor)}
      </div>
      <div className="text-[10px] text-gray-600 leading-tight">{label}</div>
    </div>
  )
}

export function PreviaObras({ previa, onConfirmar, onCancelar, hideConfirm = false }) {
  const { nome, resumo } = previa
  return (
    <div className="bg-white border border-amber-300 rounded-md shadow-card p-4 space-y-3">
      <div>
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
          Prévia do posicionamento — "{nome}"
        </p>
        <p className="text-[11px] text-gray-600 mt-1">
          Nada foi gravado ainda. Confira o resumo e confirme para substituir o posicionamento de obras.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <CardResumoObras label="Obras (Código AIO)" valor={resumo.total} />
        <CardResumoObras label="Com data de início" valor={resumo.comInicio} destaque />
        <CardResumoObras label="Sem data de início" valor={resumo.semInicio} />
        <CardResumoObras label="Duplicados unificados" valor={resumo.duplicados} />
      </div>
      {resumo.semAio > 0 && (
        <p className="text-[11px] text-gray-500">
          {fmtNumero(resumo.semAio)} linha(s) sem Código AIO foram ignoradas.
        </p>
      )}
      {!hideConfirm && (
        <div className="flex gap-2">
          <button onClick={onCancelar} className="flex-1 py-2 border border-grey-line text-navy text-xs font-semibold rounded hover:bg-grey-bg transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirmar} className="flex-1 py-2 bg-amber-600 text-white text-xs font-semibold rounded hover:opacity-90 transition-opacity">
            Substituir posicionamento ({fmtNumero(resumo.total)} obras)
          </button>
        </div>
      )}
    </div>
  )
}

export function PreviaEmergencias({ previa, linhasAtuais = 0, onConfirmar, onCancelar, hideConfirm = false }) {
  const { nome, resumo } = previa
  return (
    <div className="space-y-3">
      <div className="bg-white border border-grey-line rounded-md shadow-card p-4">
        <p className="text-xs font-bold text-navy uppercase mb-2">Análise de "{nome}"</p>
        <ul className="text-xs text-gray-700 space-y-1">
          <li>✅ <strong>{fmtNumero(resumo.total)}</strong> processos prontos para importar</li>
          {resumo.semProcesso > 0 && (
            <li>⚠️ {fmtNumero(resumo.semProcesso)} linha(s) sem nº de processo foram descartadas</li>
          )}
          {resumo.duplicados > 0 && (
            <li>🔁 {fmtNumero(resumo.duplicados)} linha(s) duplicada(s) pelo nº de processo foram unificadas (mantida a de cadastro mais recente)</li>
          )}
          {resumo.semData > 0 && (
            <li>📅 {fmtNumero(resumo.semData)} linha(s) sem data de cadastro</li>
          )}
          {resumo.dataMin && resumo.dataMax && (
            <li>🗓️ Período: {fmtData(resumo.dataMin)} a {fmtData(resumo.dataMax)}</li>
          )}
        </ul>
        <div className="mt-3 border-t border-grey-line pt-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Por status</p>
          <div className="flex flex-wrap gap-2">
            {resumo.porStatus.map((s) => (
              <span key={s.status} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-grey-bg">
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[s.status] || '#888' }} />
                {s.status}: <strong>{fmtNumero(s.qtd)}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-red-50 border-2 border-red rounded-md p-4 space-y-3">
        <div>
          <p className="text-xs font-bold text-red uppercase tracking-wide mb-1">⚠️ Atenção — substituição total</p>
          <p className="text-xs text-red-800">
            Ao confirmar, <strong>todos os {fmtNumero(linhasAtuais)} registros atuais
            serão apagados</strong> e substituídos pelos{' '}
            <strong>{fmtNumero(resumo.total)}</strong> da planilha.{' '}
            Essa ação <strong>não pode ser desfeita</strong>. Nada foi gravado ainda.
          </p>
        </div>
        {!hideConfirm && (
          <div className="flex gap-2">
            <button onClick={onCancelar} className="flex-1 py-2 border border-grey-line text-navy text-xs font-semibold rounded hover:bg-grey-bg transition-colors">
              Cancelar
            </button>
            <button onClick={onConfirmar} className="flex-1 py-2 bg-red text-white text-xs font-semibold rounded hover:opacity-90 transition-opacity">
              Sim, substituir todos os dados
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function MapeamentoColunas({ dados, onConfirmar, onCancelar }) {
  const { nome, headerKeys, mapeamento: inicial, colunas = COLUNAS_EMERG } = dados
  const [map, setMap] = useState(inicial)
  const [erro, setErro] = useState(null)

  const obrigatoriasFaltando = Object.entries(colunas).filter(
    ([campo, cfg]) => cfg.obrigatoria && !map[campo]
  )
  const faltaObrigatoria = obrigatoriasFaltando.length > 0

  function confirmar() {
    if (faltaObrigatoria) {
      const labels = obrigatoriasFaltando.map(([, cfg]) => cfg.label).join(', ')
      setErro(`Selecione a(s) coluna(s) obrigatória(s): ${labels}.`)
      return
    }
    onConfirmar(map)
  }

  return (
    <div className="bg-white border border-amber-300 rounded-md shadow-card p-4 space-y-3">
      <div>
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
          Conferir colunas de "{nome}"
        </p>
        <p className="text-[11px] text-gray-600 mt-1">
          Algumas colunas não foram reconhecidas automaticamente. Indique qual
          coluna da planilha corresponde a cada campo. Campos opcionais podem
          ficar como <em>(nenhuma)</em>.
        </p>
      </div>
      <div className="space-y-2">
        {Object.entries(colunas).map(([campo, cfg]) => (
          <div key={campo} className="flex items-center gap-2">
            <label className="text-xs font-semibold text-navy w-40 shrink-0">
              {cfg.label}
              {cfg.obrigatoria && <span className="text-red"> *</span>}
            </label>
            <select
              value={map[campo] || ''}
              onChange={(e) => setMap({ ...map, [campo]: e.target.value || null })}
              className={`flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy ${
                cfg.obrigatoria && !map[campo] ? 'border-red' : 'border-grey-line'
              }`}
            >
              <option value="">(nenhuma)</option>
              {headerKeys.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {erro && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{erro}</div>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancelar} className="flex-1 py-2 border border-grey-line text-navy text-xs font-semibold rounded hover:bg-grey-bg transition-colors">
          Cancelar
        </button>
        <button onClick={confirmar} className="flex-1 py-2 bg-navy text-white text-xs font-semibold rounded hover:bg-navy-light transition-colors">
          Continuar
        </button>
      </div>
    </div>
  )
}
