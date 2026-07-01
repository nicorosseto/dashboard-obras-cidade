import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase.js'
import { traduzErro } from '../lib/mensagens.js'
import { fmtDataHora } from '../lib/aggregations.js'
import { LoadingInline } from './Loading.jsx'
import {
  carregarCatalogos,
  analisarPlanilha,
  salvarClassificacoes,
  salvarClassificacoesTipoProcesso,
  executarImportacao,
} from '../lib/importarSistemaGeo.js'
import {
  analisarPlanilha as analisarFisc,
  executarImportacao as executarFisc,
  fmtDataBR,
  ABA_ESPERADA as ABA_FISC,
} from '../lib/importarFiscalizacao.js'
import AjudaUpload, { Regra } from './AjudaUpload.jsx'

// Aba "Atualizar Dados" do painel de Configurações (D1 + D2).
// Estrutura preparada para múltiplas fontes ligadas pelo nº de processo:
// Sistema Geo (D1, ativa), Fiscalização (D2, ativa) e futuras planilhas.

const FONTES = [
  { id: 'sistemaGeo', label: 'Sistema Geo', ativa: true },
  { id: 'fiscalizacoes', label: 'Fiscalização', ativa: true },
  { id: 'historico', label: 'Histórico', ativa: true },
]

export default function AtualizarDados() {
  const [fonte, setFonte] = useState('sistemaGeo')

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {FONTES.map((f) => (
          <button
            key={f.id}
            onClick={() => f.ativa && setFonte(f.id)}
            disabled={!f.ativa}
            title=""
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              fonte === f.id
                ? 'bg-navy text-white'
                : f.ativa
                  ? 'border border-grey-line text-navy hover:bg-grey-bg'
                  : 'border border-grey-line text-gray-300 cursor-not-allowed'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {fonte === 'sistemaGeo' && <UploadSistemaGeo />}
      {fonte === 'fiscalizacoes' && <UploadFiscalizacao />}
      {fonte === 'historico' && <HistoricoImportacoes />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Upload do Sistema Geo: analisar → classificar status novos → importar   */
/* ------------------------------------------------------------------ */
function UploadSistemaGeo() {
  // etapa: 'inicio' | 'analisando' | 'revisao' | 'importando' | 'concluido'
  const [etapa, setEtapa] = useState('inicio')
  const [erro, setErro] = useState(null)
  const [arquivo, setArquivo] = useState(null) // { nome, analise }
  const [catStatus, setCatStatus] = useState(null)
  const [catTipos, setCatTipos] = useState(null)
  const [grupos, setGrupos] = useState([])
  // classificações: status → { nome, grupo }; tipos → { nome }
  const [classif, setClassif] = useState({})
  const [classifTipo, setClassifTipo] = useState({})
  const [progresso, setProgresso] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  // Fechar a aba no meio da importação deixa o banco incompleto (a
  // recuperação é reenviar a planilha). Enquanto importa, o navegador
  // pede confirmação antes de fechar/recarregar.
  useEffect(() => {
    if (etapa !== 'importando') return
    function avisar(e) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [etapa])

  async function lerArquivo(file) {
    setErro(null)
    setEtapa('analisando')
    try {
      const { status, grupos: gps, tiposProcesso } = await carregarCatalogos()
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const analise = analisarPlanilha(wb, status, tiposProcesso)
      setCatStatus(status)
      setCatTipos(tiposProcesso)
      setGrupos(gps)
      setArquivo({ nome: file.name, analise })
      const iniS = {}
      for (const { status: st } of analise.statusDesconhecidos)
        iniS[st] = { nome: st, grupo: '' }
      setClassif(iniS)
      const iniT = {}
      for (const { tipo } of analise.tiposProcessoDesconhecidos)
        iniT[tipo] = { nome: tipo }
      setClassifTipo(iniT)
      setEtapa('revisao')
    } catch (e) {
      setErro(traduzErro(e.message))
      setEtapa('inicio')
    }
  }

  const statusPendentes = arquivo
    ? arquivo.analise.statusDesconhecidos.filter(
        ({ status }) => !classif[status]?.grupo || !classif[status]?.nome.trim()
      ).length
    : 0
  const tiposPendentes = arquivo
    ? arquivo.analise.tiposProcessoDesconhecidos.filter(
        ({ tipo }) => !classifTipo[tipo]?.nome.trim()
      ).length
    : 0
  const pendentes = statusPendentes + tiposPendentes

  async function confirmarImportacao() {
    setErro(null)
    setEtapa('importando')
    try {
      const novos = arquivo.analise.statusDesconhecidos.map(({ status }) => ({
        status,
        nome: classif[status].nome.trim(),
        grupo: classif[status].grupo,
      }))
      const novosTipos = arquivo.analise.tiposProcessoDesconhecidos.map(
        ({ tipo }) => ({ tipo, nome: classifTipo[tipo].nome.trim() })
      )
      if (novos.length || novosTipos.length) {
        setProgresso({ fase: 'Salvando classificações…', feito: 0, total: 1 })
        await salvarClassificacoes(novos)
        await salvarClassificacoesTipoProcesso(novosTipos)
        for (const n of novos)
          catStatus.set(n.status, { nome: n.nome, grupo: n.grupo })
        for (const t of novosTipos) catTipos.set(t.tipo, t.nome)
      }
      const { data } = await supabase.auth.getUser()
      const res = await executarImportacao({
        linhas: arquivo.analise.linhas,
        catalogoStatus: catStatus,
        catalogoTipos: catTipos,
        nomeArquivo: arquivo.nome,
        duplicadosRemovidos: arquivo.analise.duplicadosRemovidos,
        statusNovos: novos,
        tiposNovos: novosTipos,
        user: data?.user,
        onProgresso: setProgresso,
      })
      window.dispatchEvent(new CustomEvent('obras:upload-concluido'))
      setResultado(res)
      setEtapa('concluido')
    } catch (e) {
      setErro(traduzErro(e.message))
      setEtapa('revisao')
    }
  }

  if (etapa === 'concluido')
    return (
      <div className="bg-green-50 border border-green-200 rounded p-6 text-center space-y-3">
        <p className="text-sm font-bold text-green-700">
          Importação concluída! {resultado.importadas.toLocaleString('pt-BR')}{' '}
          processos no banco.
        </p>
        <p className="text-xs text-gray-600">
          Recarregue o sistema para os gráficos refletirem os dados novos.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-navy text-white px-4 py-2 rounded text-xs hover:bg-navy-light transition-colors"
        >
          Recarregar o sistema agora
        </button>
      </div>
    )

  if (etapa === 'importando')
    return (
      <div className="bg-white border border-grey-line rounded p-6 space-y-3">
        <p className="text-sm font-semibold text-navy">
          Importando — NÃO feche esta tela
        </p>
        <p className="text-[10px] text-gray-500">
          Se a janela fechar no meio, o banco fica incompleto — basta reenviar a
          mesma planilha para restaurar tudo.
        </p>
        <p className="text-xs text-gray-600">{progresso?.fase}</p>
        {progresso?.total > 1 && (
          <>
            <div className="h-2 bg-grey-bg rounded overflow-hidden">
              <div
                className="h-full bg-navy transition-all duration-300"
                style={{
                  width: `${Math.round((progresso.feito / progresso.total) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-gray-500 tabular-nums">
              {progresso.feito.toLocaleString('pt-BR')} /{' '}
              {progresso.total.toLocaleString('pt-BR')}
            </p>
          </>
        )}
      </div>
    )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-navy uppercase tracking-wide">
          Atualizar dados do Sistema Geo
        </h3>
        <AjudaUpload titulo="Como a planilha do Sistema Geo é tratada">
          <AjudaSistemaGeo />
        </AjudaUpload>
      </div>
      {etapa !== 'revisao' && (
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) lerArquivo(f)
          }}
          className={`block border-2 border-dashed rounded-md py-8 px-4 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-navy bg-navy/5'
              : 'border-grey-line hover:border-navy/50 bg-grey-bg'
          }`}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) lerArquivo(f)
              e.target.value = ''
            }}
          />
          <div className="text-xs font-semibold text-navy">
            {etapa === 'analisando'
              ? 'Analisando a planilha…'
              : 'Arraste a planilha do Sistema Geo (.xlsx) aqui ou clique para selecionar'}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            Lê a primeira aba da planilha · nada é gravado antes da sua
            confirmação
          </div>
        </label>
      )}

      {erro && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {erro}
        </p>
      )}

      {etapa === 'revisao' && arquivo && (
        <div className="space-y-4">
          {/* Resumo da análise */}
          <div className="bg-white border border-grey-line rounded p-4">
            <p className="text-xs font-bold text-navy uppercase mb-2">
              Análise de "{arquivo.nome}"
            </p>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>
                ✅ <strong>{fmt(arquivo.analise.linhas.length)}</strong>{' '}
                processos prontos para importar
              </li>
              <li>
                🔁 {fmt(arquivo.analise.duplicadosRemovidos)} linhas duplicadas
                removidas (mantida a de data mais recente por processo)
              </li>
              {arquivo.analise.semProcesso > 0 && (
                <li>
                  ⚠️ {fmt(arquivo.analise.semProcesso)} linhas sem nº de
                  processo foram descartadas
                </li>
              )}
              <li>
                {arquivo.analise.statusDesconhecidos.length === 0
                  ? '✅ Todos os status já são conhecidos do catálogo'
                  : `🆕 ${arquivo.analise.statusDesconhecidos.length} status novo(s) precisam de classificação abaixo`}
              </li>
              <li>
                {arquivo.analise.tiposProcessoDesconhecidos.length === 0
                  ? '✅ Todos os tipos de processo já são conhecidos'
                  : `🆕 ${arquivo.analise.tiposProcessoDesconhecidos.length} tipo(s) de processo novo(s) precisam de classificação abaixo`}
              </li>
            </ul>
          </div>

          {/* Classificação dos status novos */}
          {arquivo.analise.statusDesconhecidos.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-4 space-y-3">
              <p className="text-xs font-bold text-amber-800 uppercase">
                Classifique os status novos antes de importar
              </p>
              {arquivo.analise.statusDesconhecidos.map(({ status, qtd }) => (
                <div
                  key={status}
                  className="bg-white border border-grey-line rounded p-2 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center"
                >
                  <div className="text-xs">
                    <div className="font-mono font-semibold text-gray-800 truncate">
                      {status}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {fmt(qtd)} linha(s)
                    </div>
                  </div>
                  <input
                    type="text"
                    value={classif[status]?.nome ?? ''}
                    onChange={(e) =>
                      setClassif((c) => ({
                        ...c,
                        [status]: { ...c[status], nome: e.target.value },
                      }))
                    }
                    placeholder="Nome legível"
                    className="border border-grey-line rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                  <select
                    value={classif[status]?.grupo ?? ''}
                    onChange={(e) =>
                      setClassif((c) => ({
                        ...c,
                        [status]: { ...c[status], grupo: e.target.value },
                      }))
                    }
                    className="border border-grey-line rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-navy"
                  >
                    <option value="">Escolha o grupo unificado…</option>
                    {grupos.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Classificação dos tipos de processo novos */}
          {arquivo.analise.tiposProcessoDesconhecidos.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-4 space-y-3">
              <p className="text-xs font-bold text-amber-800 uppercase">
                Classifique os tipos de processo novos antes de importar
              </p>
              {arquivo.analise.tiposProcessoDesconhecidos.map(
                ({ tipo, qtd }) => (
                  <div
                    key={tipo}
                    className="bg-white border border-grey-line rounded p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 items-center"
                  >
                    <div className="text-xs">
                      <div className="font-mono font-semibold text-gray-800 truncate">
                        {tipo}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {fmt(qtd)} linha(s)
                      </div>
                    </div>
                    <input
                      type="text"
                      value={classifTipo[tipo]?.nome ?? ''}
                      onChange={(e) =>
                        setClassifTipo((c) => ({
                          ...c,
                          [tipo]: { nome: e.target.value },
                        }))
                      }
                      placeholder="Nome legível (ex.: Manutenção Corretiva)"
                      className="border border-grey-line rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
                    />
                  </div>
                )
              )}
            </div>
          )}

          {/* Confirmação */}
          <div className="bg-red-50 border border-red-200 rounded p-4 space-y-3">
            <p className="text-xs text-red-700">
              ⚠️ A importação <strong>substitui TODOS os dados</strong> do
              Sistema Geo pelos da planilha. A operação testa a permissão de
              escrita antes de apagar qualquer coisa.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setArquivo(null)
                  setEtapa('inicio')
                  setErro(null)
                }}
                className="flex-1 py-2 border border-grey-line text-navy text-xs font-semibold rounded hover:bg-grey-bg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarImportacao}
                disabled={pendentes > 0}
                title={
                  pendentes > 0
                    ? `Classifique os ${pendentes} item(ns) pendentes para liberar`
                    : ''
                }
                className="flex-1 py-2 bg-red text-white text-xs font-semibold rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {pendentes > 0
                  ? `Classifique ${pendentes} item(ns) para liberar`
                  : `Substituir os dados (${fmt(arquivo.analise.linhas.length)} processos)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Upload da Fiscalização: analisar → revisar resumo → importar (D2)    */
/* ------------------------------------------------------------------ */
function UploadFiscalizacao() {
  // etapa: 'inicio' | 'analisando' | 'revisao' | 'importando' | 'concluido'
  const [etapa, setEtapa] = useState('inicio')
  const [erro, setErro] = useState(null)
  const [arquivo, setArquivo] = useState(null) // { nome, analise }
  const [progresso, setProgresso] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (etapa !== 'importando') return
    function avisar(e) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [etapa])

  async function lerArquivo(file) {
    setErro(null)
    setEtapa('analisando')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const analise = analisarFisc(wb)
      setArquivo({ nome: file.name, analise })
      setEtapa('revisao')
    } catch (e) {
      setErro(traduzErro(e.message))
      setEtapa('inicio')
    }
  }

  async function confirmarImportacao() {
    setErro(null)
    setEtapa('importando')
    try {
      const { data } = await supabase.auth.getUser()
      const res = await executarFisc({
        linhas: arquivo.analise.linhas,
        nomeArquivo: arquivo.nome,
        duplicadosRemovidos: arquivo.analise.duplicadosRemovidos,
        porStatus: arquivo.analise.porStatus,
        dataIni: arquivo.analise.dataIni,
        dataFim: arquivo.analise.dataFim,
        comNaoConformidade: arquivo.analise.comNaoConformidade,
        user: data?.user,
        onProgresso: setProgresso,
      })
      window.dispatchEvent(new CustomEvent('obras:upload-concluido'))
      setResultado(res)
      setEtapa('concluido')
    } catch (e) {
      setErro(traduzErro(e.message))
      setEtapa('revisao')
    }
  }

  if (etapa === 'concluido')
    return (
      <div className="bg-green-50 border border-green-200 rounded p-6 text-center space-y-3">
        <p className="text-sm font-bold text-green-700">
          Importação concluída! {resultado.importadas.toLocaleString('pt-BR')}{' '}
          laudos no banco.
        </p>
        <p className="text-xs text-gray-600">
          Recarregue o sistema para os gráficos refletirem os dados novos.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-navy text-white px-4 py-2 rounded text-xs hover:bg-navy-light transition-colors"
        >
          Recarregar o sistema agora
        </button>
      </div>
    )

  if (etapa === 'importando')
    return (
      <div className="bg-white border border-grey-line rounded p-6 space-y-3">
        <p className="text-sm font-semibold text-navy">
          Importando — NÃO feche esta tela
        </p>
        <p className="text-[10px] text-gray-500">
          Se a janela fechar no meio, o banco fica incompleto — basta reenviar a
          mesma planilha para restaurar tudo.
        </p>
        <p className="text-xs text-gray-600">{progresso?.fase}</p>
        {progresso?.total > 1 && (
          <>
            <div className="h-2 bg-grey-bg rounded overflow-hidden">
              <div
                className="h-full bg-navy transition-all duration-300"
                style={{
                  width: `${Math.round((progresso.feito / progresso.total) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-gray-500 tabular-nums">
              {progresso.feito.toLocaleString('pt-BR')} /{' '}
              {progresso.total.toLocaleString('pt-BR')}
            </p>
          </>
        )}
      </div>
    )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-navy uppercase tracking-wide">
          Atualizar dados de Fiscalização
        </h3>
        <AjudaUpload titulo="Como a planilha de Fiscalização é tratada">
          <AjudaFiscalizacao />
        </AjudaUpload>
      </div>

      {etapa !== 'revisao' && (
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) lerArquivo(f)
          }}
          className={`block border-2 border-dashed rounded-md py-8 px-4 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-navy bg-navy/5'
              : 'border-grey-line hover:border-navy/50 bg-grey-bg'
          }`}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) lerArquivo(f)
              e.target.value = ''
            }}
          />
          <div className="text-xs font-semibold text-navy">
            {etapa === 'analisando'
              ? 'Analisando a planilha…'
              : `Arraste o arquivo do Consolidador de Fiscalização (.xlsx) aqui ou clique para selecionar`}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            Lê a aba "{ABA_FISC}" · nada é gravado antes da sua confirmação
          </div>
        </label>
      )}

      {erro && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {erro}
        </p>
      )}

      {etapa === 'revisao' && arquivo && (
        <div className="space-y-4">
          {/* Resumo da análise */}
          <div className="bg-white border border-grey-line rounded p-4">
            <p className="text-xs font-bold text-navy uppercase mb-2">
              Análise de "{arquivo.nome}"
            </p>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>
                ✅{' '}
                <strong>{fmt(arquivo.analise.linhas.length)}</strong> laudos
                prontos para importar
              </li>
              {arquivo.analise.duplicadosRemovidos > 0 && (
                <li>
                  🔁 {fmt(arquivo.analise.duplicadosRemovidos)} linhas
                  duplicadas removidas (mantida a de vistoria mais recente por
                  PROCESSOS/VIA)
                </li>
              )}
              {arquivo.analise.semId > 0 && (
                <li>
                  ⚠️ {fmt(arquivo.analise.semId)} linhas sem PROCESSOS/VIA
                  foram descartadas
                </li>
              )}
              {arquivo.analise.semPermissionaria > 0 && (
                <li>
                  ⚠️ {fmt(arquivo.analise.semPermissionaria)} linha(s) sem
                  permissionária — salvas como "(sem permissionária)"
                </li>
              )}
              {arquivo.analise.semData > 0 && (
                <li>
                  ⚠️ {fmt(arquivo.analise.semData)} linha(s) sem data de
                  vistoria (data em branco no banco — não bloqueia)
                </li>
              )}
            </ul>
          </div>

          {/* Período e distribuição por status */}
          <div className="bg-white border border-grey-line rounded p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
                Período coberto
              </p>
              <p className="text-xs text-gray-800">
                {fmtDataBR(arquivo.analise.dataIni)} →{' '}
                {fmtDataBR(arquivo.analise.dataFim)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
                Distribuição por status
              </p>
              <ul className="text-xs text-gray-700 space-y-0.5">
                {arquivo.analise.porStatus.solucionado > 0 && (
                  <li>
                    Solucionado:{' '}
                    <strong>
                      {fmt(arquivo.analise.porStatus.solucionado)}
                    </strong>
                  </li>
                )}
                {arquivo.analise.porStatus.legAtendida > 0 && (
                  <li>
                    Legislação Atendida:{' '}
                    <strong>
                      {fmt(arquivo.analise.porStatus.legAtendida)}
                    </strong>
                  </li>
                )}
                {arquivo.analise.porStatus.emAndamento > 0 && (
                  <li>
                    Em andamento:{' '}
                    <strong>
                      {fmt(arquivo.analise.porStatus.emAndamento)}
                    </strong>
                  </li>
                )}
                {arquivo.analise.porStatus.semStatus > 0 && (
                  <li className="text-amber-700">
                    Sem status:{' '}
                    <strong>{fmt(arquivo.analise.porStatus.semStatus)}</strong>
                  </li>
                )}
                <li className="pt-0.5 text-gray-500">
                  Com não conformidade:{' '}
                  <strong>{fmt(arquivo.analise.comNaoConformidade)}</strong>
                </li>
              </ul>
            </div>
          </div>

          {/* Prova real: cruzamento NC × status */}
          <div className="bg-white border border-grey-line rounded p-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
              Prova real (NC × Status)
            </p>
            <div className="text-xs text-gray-700 space-y-1">
              <div className="flex justify-between">
                <span>Total de laudos</span>
                <strong className="tabular-nums">{fmt(arquivo.analise.linhas.length)}</strong>
              </div>
              <div className="flex justify-between text-gray-500 pl-3">
                <span>= Com não conformidade (col. O = X)</span>
                <span className="tabular-nums">{fmt(arquivo.analise.comNaoConformidade)}</span>
              </div>
              {arquivo.analise.validacao.ncEmAndamento > 0 && (
                <div className="flex justify-between text-gray-400 pl-6">
                  <span>Em andamento</span>
                  <span className="tabular-nums">{fmt(arquivo.analise.validacao.ncEmAndamento)}</span>
                </div>
              )}
              {arquivo.analise.validacao.ncSolucionado > 0 && (
                <div className="flex justify-between text-gray-400 pl-6">
                  <span>Solucionado</span>
                  <span className="tabular-nums">{fmt(arquivo.analise.validacao.ncSolucionado)}</span>
                </div>
              )}
              {arquivo.analise.validacao.ncSemStatus > 0 && (
                <div className="flex justify-between text-amber-600 pl-6">
                  <span>NC sem status definido</span>
                  <span className="tabular-nums">{fmt(arquivo.analise.validacao.ncSemStatus)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500 pl-3">
                <span>+ Sem não conformidade</span>
                <span className="tabular-nums">
                  {fmt(arquivo.analise.linhas.length - arquivo.analise.comNaoConformidade)}
                </span>
              </div>
              {arquivo.analise.validacao.semNcLegAtendida > 0 && (
                <div className="flex justify-between text-gray-400 pl-6">
                  <span>Legislação Atendida</span>
                  <span className="tabular-nums">{fmt(arquivo.analise.validacao.semNcLegAtendida)}</span>
                </div>
              )}
              {arquivo.analise.validacao.semNcSemStatus > 0 && (
                <div className="flex justify-between text-amber-600 pl-6">
                  <span>Sem status (sem NC)</span>
                  <span className="tabular-nums">{fmt(arquivo.analise.validacao.semNcSemStatus)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Aviso: Solucionado sem data de encerramento */}
          {arquivo.analise.solucionadoSemData > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <p className="text-xs text-amber-800">
                ⚠️ <strong>{fmt(arquivo.analise.solucionadoSemData)}</strong> laudo(s) marcado(s)
                como Solucionado sem data de encerramento — corrija no Consolidador antes de
                importar, se possível. Não bloqueia a importação.
              </p>
            </div>
          )}

          {/* Confirmação */}
          <div className="bg-red-50 border border-red-200 rounded p-4 space-y-3">
            <p className="text-xs text-red-700">
              ⚠️ A importação{' '}
              <strong>substitui TODOS os dados</strong> de Fiscalização pelos
              da planilha. A operação testa a permissão de escrita antes de
              apagar qualquer coisa.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setArquivo(null)
                  setEtapa('inicio')
                  setErro(null)
                }}
                className="flex-1 py-2 border border-grey-line text-navy text-xs font-semibold rounded hover:bg-grey-bg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarImportacao}
                className="flex-1 py-2 bg-red text-white text-xs font-semibold rounded hover:opacity-90 transition-opacity"
              >
                Substituir os dados (
                {fmt(arquivo.analise.linhas.length)} laudos)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Histórico das importações pela tela (todas as fontes)                */
/* ------------------------------------------------------------------ */
function HistoricoImportacoes() {
  const [linhas, setLinhas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    supabase
      .from('importacoes_snapshots')
      .select(
        'id, fonte, nome_arquivo, total_linhas, duplicados_removidos, status_novos, uploaded_by_email, uploaded_at'
      )
      .order('uploaded_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) setErro(traduzErro(error.message))
        else setLinhas(data || [])
        setCarregando(false)
      })
  }, [])

  if (carregando) return <LoadingInline mensagem="Carregando histórico..." />
  if (erro) return <p className="text-xs text-red-600">{erro}</p>
  if (!linhas.length)
    return (
      <p className="text-xs text-gray-400 text-center py-4">
        Nenhuma importação pela tela ainda. (Os uploads de Emergências têm
        histórico próprio na aba "Histórico de Uploads".)
      </p>
    )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-grey-line text-gray-500 uppercase text-[10px]">
            <th className="text-left pb-2 pr-4">Data / Hora</th>
            <th className="text-left pb-2 pr-4">Fonte</th>
            <th className="text-left pb-2 pr-4">Usuário</th>
            <th className="text-left pb-2 pr-4">Arquivo</th>
            <th className="text-right pb-2 pr-4">Linhas</th>
            <th className="text-right pb-2 pr-4">Duplicados</th>
            <th className="text-right pb-2">Status novos</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((s) => (
            <tr
              key={s.id}
              className="border-b border-grey-line/50 hover:bg-grey-bg/50"
            >
              <td className="py-2 pr-4 text-gray-700">
                {fmtDataHora(s.uploaded_at)}
              </td>
              <td className="py-2 pr-4">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-navy/10 text-navy">
                  {s.fonte === 'sistemaGeo'
                    ? 'Sistema Geo'
                    : s.fonte === 'fiscalizacoes'
                      ? 'Fiscalização'
                      : s.fonte}
                </span>
              </td>
              <td className="py-2 pr-4 text-gray-700 max-w-[180px] truncate">
                {s.uploaded_by_email || '—'}
              </td>
              <td
                className="py-2 pr-4 text-gray-700 font-mono max-w-[220px] truncate"
                title={s.nome_arquivo}
              >
                {s.nome_arquivo || '—'}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums font-semibold">
                {fmt(s.total_linhas)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums text-gray-500">
                {fmt(s.duplicados_removidos)}
              </td>
              <td
                className="py-2 text-right tabular-nums text-amber-700"
                title={(s.status_novos || [])
                  .map((n) => `${n.status} → ${n.grupo}`)
                  .join('\n')}
              >
                {(s.status_novos || []).length || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function fmt(n) {
  return (n || 0).toLocaleString('pt-BR')
}

/* ------------------------------------------------------------------ */
/* Conteúdo do pop-up de ajuda do Sistema Geo                              */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Conteúdo do pop-up de ajuda da Fiscalização                          */
/* ------------------------------------------------------------------ */
function AjudaFiscalizacao() {
  return (
    <>
      <p className="text-gray-600">
        Ao enviar a planilha, o sistema faz uma série de tratamentos
        automáticos.{' '}
        <strong>Nada é gravado no banco antes da sua confirmação</strong> —
        primeiro você vê o resumo e confere os números.
      </p>

      <Regra titulo="1. Qual arquivo enviar">
        Envie o arquivo exportado pelo{' '}
        <strong>Consolidador de Fiscalização</strong> (ferramenta HTML externa).
        O arquivo deve conter a aba{' '}
        <strong>"DADOS_CONSOLIDADOS"</strong> com cabeçalho na linha 1 e dados
        a partir da linha 2. Se essa aba não for encontrada, o sistema
        interrompe com erro.
      </Regra>

      <Regra titulo="2. Quais colunas são lidas e por quê pela posição">
        As colunas são lidas <strong>pela posição</strong>, no formato do
        Consolidador de Fiscalização (29 colunas de dados + 9 auxiliares):
        PROCESSOS/VIA (A), permissionária (D), data da vistoria (F),
        subprefeitura (H), classificação viária (I), área m² (J),{' '}
        <strong>indicador de NC</strong> "Obras com Falhas" (O), tipos de falha
        individuais (P–X e AA), status em andamento/legislação/solucionado
        (Y, Z, AB) e data de encerramento (AC). Colunas auxiliares (AD em
        diante: FONTE, ANO, MES…) são ignoradas automaticamente.
      </Regra>

      <Regra titulo="3. Limpeza de cada célula">
        Espaços nas pontas são removidos. Células só com traços (
        <code>---</code>, <code>--</code>) ou vazias viram valor nulo.
        Permissionária <strong>NORCREST</strong> é sempre normalizada para
        maiúsculas — "Norcrest S/A" vira "NORCREST S/A" — para o agrupamento
        funcionar corretamente.
      </Regra>

      <Regra titulo="4. Datas">
        A data da vistoria e a data de encerramento são padronizadas para{' '}
        <strong>AAAA-MM-DD</strong>, aceitando data do Excel, número serial,
        texto DD/MM/AAAA ou já em ISO. Data inválida vira nulo (não bloqueia
        a importação, mas aparece no resumo).
      </Regra>

      <Regra titulo="5. Campos booleanos (falhas e status)">
        Aceita <code>X</code>, <code>SIM</code>, <code>S</code>,{' '}
        <code>1</code>, <code>TRUE</code> e <code>VERDADEIRO</code> como{' '}
        <strong>verdadeiro</strong>; qualquer outro valor (inclusive célula
        vazia) é falso. Funciona com os marcadores "X" típicos das planilhas
        e com TRUE/FALSE exportados pelo consolidador.
      </Regra>

      <Regra titulo="6. Área m²">
        Aceita número direto ou texto no formato brasileiro{' '}
        <strong>"1.234,56"</strong> (ponto de milhar, vírgula decimal).
        Valores não numéricos viram nulo.
      </Regra>

      <Regra titulo="7. Linhas sem PROCESSOS/VIA">
        São <strong>descartadas</strong> (contadas no resumo). O
        PROCESSOS/VIA é a chave de tudo — sem ele a linha não pode ser
        identificada.
      </Regra>

      <Regra titulo="8. Deduplicação por PROCESSOS/VIA">
        Se o mesmo PROCESSOS/VIA aparecer em mais de uma linha, mantém-se{' '}
        <strong>a de data de vistoria mais recente</strong>. Sem data perde;
        em empate, vence a última do arquivo. O total de duplicatas removidas
        aparece no resumo.
      </Regra>

      <Regra titulo="9. Status simultâneos">
        Se uma linha tiver mais de um status marcado (ex.: Solucionado E Em
        andamento), o banco aplica a precedência:{' '}
        <strong>Solucionado {">"} Legislação Atendida {">"} Em andamento</strong>.
        O distribuição mostrada no resumo já segue essa mesma regra.
      </Regra>

      <Regra titulo="10. Gravação com rede de segurança">
        Antes de apagar qualquer coisa, o sistema faz um{' '}
        <strong>teste de permissão de escrita</strong> (insere e remove uma
        linha de teste). Se você não tiver permissão, ele aborta{' '}
        <strong>sem apagar nada</strong>. Em seguida substitui todos os dados
        em lotes e registra a importação no histórico (quem, quando, totais).
      </Regra>

      <Regra titulo="11. E se a janela fechar no meio?">
        A importação roda no seu navegador — se a aba fechar ou a internet
        cair no meio, o banco fica <strong>incompleto</strong>. A recuperação
        é simples: <strong>reenvie a mesma planilha</strong>. O navegador pede
        confirmação se você tentar fechar durante o envio.
      </Regra>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Conteúdo do pop-up de ajuda do Sistema Geo                              */
/* ------------------------------------------------------------------ */
function AjudaSistemaGeo() {
  return (
    <>
      <p className="text-gray-600">
        Ao enviar a planilha, o sistema faz uma série de tratamentos
        automáticos.{' '}
        <strong>Nada é gravado no banco antes da sua confirmação</strong> —
        primeiro você vê o resumo e classifica o que for novo.
      </p>

      <Regra titulo="1. Qual aba e quais colunas são lidas">
        Usa a <strong>primeira aba</strong> da planilha (se existir uma aba
        chamada "DadosSistemaGeo", ela tem preferência). Cabeçalho na linha 1,
        dados a partir da linha 2. As colunas são lidas{' '}
        <strong>pela posição</strong>, nesta ordem: processo, tipo de processo,
        permissionária, executora, data de cadastro, etapa, subprefeitura,
        status e tipo de obra.
      </Regra>

      <Regra titulo="2. Limpeza de cada célula">
        Espaços em branco nas pontas são removidos. Células só com traços (
        <code>---</code>, <code>--</code>) ou vazias viram "sem valor".
      </Regra>

      <Regra titulo="3. Datas">
        A data de cadastro é padronizada para <strong>AAAA-MM-DD</strong>,
        aceitando data do Excel, número serial, texto DD/MM/AAAA ou já em ISO.
      </Regra>

      <Regra titulo="4. Rótulos legíveis">
        Tipo de processo, etapa e tipo de obra são traduzidos do código bruto
        para o nome legível (ex.: <code>MANUTENCAO_CORRETIVA</code> →
        "Manutenção Corretiva"). Códigos desconhecidos mantêm o valor original.
      </Regra>

      <Regra titulo="5. Linhas sem nº de processo">
        São <strong>descartadas</strong> (e contadas no resumo). O nº de
        processo é a chave de tudo.
      </Regra>

      <Regra titulo="6. Deduplicação por processo">
        A planilha repete o mesmo processo (uma linha por etapa). Mantém-se{' '}
        <strong>uma linha por processo</strong>: vence a de{' '}
        <strong>data de cadastro mais recente</strong>. Sem data perde; em
        empate, vence a última do arquivo.
      </Regra>

      <Regra titulo="7. Status e tipos de processo novos">
        Cada status e cada tipo de processo é comparado com o catálogo do banco.
        Os já conhecidos recebem nome e grupo automaticamente. Os{' '}
        <strong>novos</strong> aparecem para você classificar antes de importar
        — o botão de importar só libera depois. A classificação fica salva para
        as próximas vezes.
      </Regra>

      <Regra titulo="8. Gravação com rede de segurança">
        Antes de apagar qualquer coisa, o sistema faz um{' '}
        <strong>teste de permissão de escrita</strong> (insere e remove uma
        linha de teste). Se você não tiver permissão, ele aborta{' '}
        <strong>sem apagar nada</strong>. Em seguida substitui todos os dados em
        lotes e registra a importação no histórico (quem, quando, totais).
      </Regra>

      <Regra titulo="9. E se a janela fechar no meio?">
        A importação roda no seu navegador — se a aba fechar ou a internet cair
        no meio, o banco fica <strong>incompleto</strong> (só com as linhas já
        enviadas). Nada se corrompe, e a recuperação é simples:{' '}
        <strong>reenvie a mesma planilha</strong>, que o processo recomeça e
        restaura tudo. Importação interrompida não entra no histórico. Por
        garantia, o navegador pede confirmação se você tentar fechar durante o
        envio.
      </Regra>
    </>
  )
}
