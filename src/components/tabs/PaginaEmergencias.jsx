import { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase.js'
import { limparCache } from '../../lib/cache.js'
import { fmtNumero } from '../../lib/aggregations.js'
import { LoadingConteudo } from '../Loading.jsx'
import { traduzErro } from '../../lib/mensagens.js'
import { toIsoDate } from '../../lib/datas.js'
import {
  BATCH_SIZE,
  FILTROS_VAZIOS_EMERG,
  detectarColunas,
  mapearLinhas,
  dedupPorProcesso,
  mapearObras,
  dedupPorAio,
  agregaPorStatus,
  agregaPorPermissionaria,
  aplicarFiltrosEmerg,
  tabelaCruzada,
  buildObrasMap,
  buildPrazoRows,
  buildVistoriaMap,
  COLUNAS_OBRAS,
} from '../../lib/emergencias.js'

// Sub-componentes extraídos para src/components/tabs/emerg/
import SidebarEmergencias from './emerg/SidebarEmergencias.jsx'
import {
  UploadZone,
  UploadObrasZone,
  PreviaObras,
  PreviaEmergencias,
  MapeamentoColunas,
} from './emerg/UploadEmergencias.jsx'
import AbaGeral from './emerg/AbaGeral.jsx'
import AbaInformadas from './emerg/AbaInformadas.jsx'
import AbaDashboard from './emerg/AbaDashboard.jsx'
import AbaHistorico from './emerg/AbaHistorico.jsx'
import AbaPrazo48h from './emerg/AbaPrazo48h.jsx'
import AbaBuscaEmerg from './emerg/AbaBuscaEmerg.jsx'
import AbaMotivosInvalidos from './emerg/AbaMotivosInvalidos.jsx'
import EditorMotivos from './emerg/EditorMotivos.jsx'

// ── Modais de sucesso ────────────────────────────────────────────────
function ModalSucesso({ mensagem, titulo, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-1">{titulo}</h3>
        <p className="text-sm text-gray-700 mb-5">{mensagem}</p>
        <button onClick={onClose} className="w-full py-2 rounded bg-navy text-white text-sm font-semibold hover:bg-navy-light transition-colors">
          Ok
        </button>
      </div>
    </div>
  )
}

// Linha de progresso de uma planilha dentro do painel único de importação.
function BarraImport({ label, status, cor = 'navy' }) {
  const pct = Math.min(100, Math.max(0, status?.progresso ?? 0))
  const tema = cor === 'amber'
    ? { texto: 'text-amber-800', trilho: 'bg-amber-100', barra: 'bg-amber-500' }
    : { texto: 'text-navy', trilho: 'bg-blue-100', barra: 'bg-navy' }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${tema.texto}`}>{label}</span>
        <span className={`text-xs tabular-nums ${tema.texto}`}>{pct}%</span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${tema.trilho}`}>
        <div className={`h-full ${tema.barra} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      {status?.mensagem && (
        <p className="text-[11px] text-gray-500">{status.mensagem}</p>
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────

export default function PaginaEmergencias({
  user,
  fiscalizacoes = [],
  podeUpload = false,
  abaAtiva = 'geral',
  onTotalInformadasChange = () => {},
  linhas = [],
  setLinhas = () => {},
  obras = [],
  setObras = () => {},
  motivoGrupos = [],
  motivoPendentes = 0,
  onSalvarMotivos = async () => {},
  carregando = false,
  emgProgresso = { carregadas: 0, total: 0 },
}) {
  const [snapshots, setSnapshots] = useState([])
  const [carregandoSnap, setCarregandoSnap] = useState(false)
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS_EMERG)
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [modalUpload, setModalUpload] = useState(false)

  const [uploadStatus, setUploadStatus] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [previa, setPrevia] = useState(null)
  const [mapPendente, setMapPendente] = useState(null)
  const [sucesso, setSucesso] = useState(null)
  const [editorMotivos, setEditorMotivos] = useState(false)   // modal do editor aberto
  const [promptAjuste, setPromptAjuste] = useState(false)     // "quer ajustar motivos agora?"
  const [salvandoMotivos, setSalvandoMotivos] = useState(false)

  async function handleSalvarMotivos(lista) {
    setSalvandoMotivos(true)
    try {
      await onSalvarMotivos(lista)
      setEditorMotivos(false)
    } catch (e) {
      console.error('Erro ao salvar classificação de motivos:', e)
    } finally {
      setSalvandoMotivos(false)
    }
  }

  const [uploadObrasStatus, setUploadObrasStatus] = useState(null)
  const [dragOverObras, setDragOverObras] = useState(false)
  const [previaObras, setPreviaObras] = useState(null)
  const [mapPendenteObras, setMapPendenteObras] = useState(null)

  const emGravacao = (s) => s && !s.erro && s.progresso > 0 && s.progresso < 100
  const emLeitura = (s) => s && !s.erro && s.progresso === 0 && !!s.mensagem
  const gravando = emGravacao(uploadStatus) || emGravacao(uploadObrasStatus)
  const lendo = emLeitura(uploadStatus) || emLeitura(uploadObrasStatus)
  useEffect(() => {
    if (!gravando) return
    function avisar(e) { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [gravando])

  useEffect(() => {
    if (abaAtiva !== 'historico') return
    if (snapshots.length > 0) return
    setCarregandoSnap(true)
    supabase
      .from('emergencias_snapshots')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setSnapshots(data || [])
      })
      .then(() => setCarregandoSnap(false))
  }, [abaAtiva, snapshots.length])

  const vistoriaMap = useMemo(() => buildVistoriaMap(fiscalizacoes), [fiscalizacoes])

  // ── Upload principal: análise ──────────────────────────────────────
  async function analisarArquivo(file) {
    if (!file) return
    setUploadStatus({ progresso: 0, mensagem: 'Lendo arquivo...', erro: null })
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { defval: null })
      if (raw.length === 0) throw new Error('A planilha está vazia.')
      const headerKeys = Object.keys(raw[0])
      const { mapeamento, faltando } = detectarColunas(headerKeys)
      if (faltando.length > 0) {
        setUploadStatus(null)
        setMapPendente({ nome: file.name, raw, headerKeys, mapeamento, faltando })
        return
      }
      finalizarAnalise(file.name, raw, mapeamento)
    } catch (e) {
      setUploadStatus({ progresso: 0, mensagem: '', erro: traduzErro(e.message || String(e)) })
    }
  }

  function finalizarAnalise(nome, raw, mapeamento) {
    const mapeadas = mapearLinhas(raw, mapeamento)
    const parsed = dedupPorProcesso(mapeadas)
    if (parsed.length === 0) throw new Error('Nenhuma linha válida encontrada no arquivo.')
    const porStatus = agregaPorStatus(parsed)
    const semData = parsed.filter((p) => !p.data_cadastro).length
    let dataMin = null, dataMax = null
    for (const p of parsed) {
      if (!p.data_cadastro) continue
      if (!dataMin || p.data_cadastro < dataMin) dataMin = p.data_cadastro
      if (!dataMax || p.data_cadastro > dataMax) dataMax = p.data_cadastro
    }
    setMapPendente(null)
    setUploadStatus(null)
    setPrevia({ nome, parsed, resumo: { total: parsed.length, semProcesso: raw.length - mapeadas.length, duplicados: mapeadas.length - parsed.length, porStatus, semData, dataMin, dataMax } })
  }

  // ── Upload principal: confirmação ──────────────────────────────────
  async function confirmarUpload() {
    if (!previa) return
    const parsed = previa.parsed
    const nomeArquivo = previa.nome
    const backup = [...linhas]
    const backupObras = [...obras]
    setPrevia(null)
    setUploadStatus({ progresso: 10, mensagem: 'Substituindo dados antigos...', erro: null })
    try {
      const { error: delErr } = await supabase.from('emergencias').delete().neq('id', -1)
      if (delErr) throw delErr
      const { error: delObrasErr } = await supabase.from('emergencias_obras').delete().neq('id', -1)
      if (delObrasErr) throw delObrasErr
      setObras([])

      const total = parsed.length
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = parsed.slice(i, i + BATCH_SIZE)
        const { error: insErr } = await supabase.from('emergencias').insert(chunk)
        if (insErr) throw insErr
        const enviado = Math.min(i + BATCH_SIZE, total)
        setUploadStatus({ progresso: 10 + Math.round((enviado / total) * 80), mensagem: `Enviando ${enviado.toLocaleString('pt-BR')} / ${total.toLocaleString('pt-BR')}...`, erro: null })
      }

      setUploadStatus({ progresso: 92, mensagem: 'Salvando histórico...', erro: null })
      const porStatus = agregaPorStatus(parsed)
      const porPermSab = agregaPorPermissionaria(parsed, { consolidar: true })
      const infPerm = porPermSab.filter((p) => p.por_status['Informada']).map((p) => ({ nome: p.nome, qtd: p.por_status['Informada'] }))
      const { error: snapErr } = await supabase.from('emergencias_snapshots').insert({
        uploaded_by: user?.id || null,
        uploaded_by_email: user?.email || null,
        total_processos: parsed.length,
        por_status: porStatus,
        informadas_por_permissionaria: infPerm,
        por_permissionaria: porPermSab,
        nome_arquivo: nomeArquivo,
      })
      if (snapErr) console.warn('Snapshot não salvo:', snapErr.message)

      setLinhas(parsed)
      setSnapshots([])
      limparCache('emergencias')
      window.dispatchEvent(new CustomEvent('obras:upload-concluido'))
      setUploadStatus({ progresso: 100, mensagem: `Concluído! ${parsed.length.toLocaleString('pt-BR')} registros importados.`, erro: null })
      return { ok: true, msg: `${parsed.length.toLocaleString('pt-BR')} emergências importadas.` }
    } catch (e) {
      // Tenta restaurar o backup antes de exibir o erro
      setUploadStatus({ progresso: 0, mensagem: '', erro: null })
      try {
        await supabase.from('emergencias').delete().neq('id', -1)
        for (let i = 0; i < backup.length; i += BATCH_SIZE) {
          await supabase.from('emergencias').insert(backup.slice(i, i + BATCH_SIZE))
        }
        for (let i = 0; i < backupObras.length; i += BATCH_SIZE) {
          await supabase.from('emergencias_obras').insert(backupObras.slice(i, i + BATCH_SIZE))
        }
        setLinhas(backup)
        setObras(backupObras)
        setUploadStatus({ progresso: 0, mensagem: '', erro: `${traduzErro(e.message || String(e))} — dados anteriores restaurados.` })
      } catch {
        setUploadStatus({ progresso: 0, mensagem: '', erro: `${traduzErro(e.message || String(e))} — ATENÇÃO: restauração falhou. Reimporte a planilha.` })
      }
      return { ok: false }
    }
  }

  function onDrop(e) { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) analisarArquivo(f) }
  function onPickFile(e) { const f = e.target.files?.[0]; if (f) analisarArquivo(f); e.target.value = '' }

  // ── Upload obras: análise ──────────────────────────────────────────
  async function analisarObras(file) {
    if (!file) return
    setUploadObrasStatus({ progresso: 0, mensagem: 'Lendo arquivo...', erro: null })
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { defval: null })
      if (raw.length === 0) throw new Error('A planilha está vazia.')
      const headerKeys = Object.keys(raw[0])
      const { mapeamento, faltando } = detectarColunas(headerKeys, COLUNAS_OBRAS)
      if (faltando.length > 0) {
        setUploadObrasStatus(null)
        setMapPendenteObras({ nome: file.name, raw, headerKeys, mapeamento, faltando, colunas: COLUNAS_OBRAS })
        return
      }
      finalizarAnaliseObras(file.name, raw, mapeamento)
    } catch (e) {
      setUploadObrasStatus({ progresso: 0, mensagem: '', erro: traduzErro(e.message || String(e)) })
    }
  }

  function finalizarAnaliseObras(nome, raw, mapeamento) {
    const mapeadas = mapearObras(raw, mapeamento)
    const parsed = dedupPorAio(mapeadas)
    if (parsed.length === 0) throw new Error('Nenhuma linha válida encontrada no arquivo.')
    const comInicio = parsed.filter((p) => p.data_inicio_obra).length
    setMapPendenteObras(null)
    setUploadObrasStatus(null)
    setPreviaObras({ nome, parsed, resumo: { total: parsed.length, semAio: raw.length - mapeadas.length, duplicados: mapeadas.length - parsed.length, comInicio, semInicio: parsed.length - comInicio } })
  }

  async function confirmarUploadObras() {
    if (!previaObras) return
    const parsed = previaObras.parsed
    const backupObras = [...obras]
    setPreviaObras(null)
    setUploadObrasStatus({ progresso: 10, mensagem: 'Substituindo posicionamento antigo...', erro: null })
    try {
      const { error: delErr } = await supabase.from('emergencias_obras').delete().neq('id', -1)
      if (delErr) throw delErr
      const total = parsed.length
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = parsed.slice(i, i + BATCH_SIZE)
        const { error: insErr } = await supabase.from('emergencias_obras').insert(chunk)
        if (insErr) throw insErr
        const enviado = Math.min(i + BATCH_SIZE, total)
        setUploadObrasStatus({ progresso: 10 + Math.round((enviado / total) * 85), mensagem: `Enviando ${enviado.toLocaleString('pt-BR')} / ${total.toLocaleString('pt-BR')}...`, erro: null })
      }
      setObras(parsed)
      setUploadObrasStatus({ progresso: 100, mensagem: `Concluído! ${parsed.length.toLocaleString('pt-BR')} obras importadas.`, erro: null })
      return { ok: true, msg: `${parsed.length.toLocaleString('pt-BR')} obras (posicionamento) importadas.` }
    } catch (e) {
      // Tenta restaurar o backup antes de exibir o erro
      try {
        await supabase.from('emergencias_obras').delete().neq('id', -1)
        for (let i = 0; i < backupObras.length; i += BATCH_SIZE) {
          await supabase.from('emergencias_obras').insert(backupObras.slice(i, i + BATCH_SIZE))
        }
        setObras(backupObras)
        setUploadObrasStatus({ progresso: 0, mensagem: '', erro: `${traduzErro(e.message || String(e))} — dados anteriores restaurados.` })
      } catch {
        setUploadObrasStatus({ progresso: 0, mensagem: '', erro: `${traduzErro(e.message || String(e))} — ATENÇÃO: restauração falhou. Reimporte a planilha.` })
      }
      return { ok: false }
    }
  }

  async function confirmarAmbos() {
    const partes = []
    if (previa) {
      const r = await confirmarUpload()
      if (!r?.ok) return // erro já exibido na zona; mantém o modal aberto
      partes.push(r.msg)
    }
    if (previaObras) {
      const r = await confirmarUploadObras()
      if (!r?.ok) return
      partes.push(r.msg)
    }
    setModalUpload(false)
    if (partes.length) setSucesso(partes.join(' '))
  }

  function onDropObras(e) { e.preventDefault(); setDragOverObras(false); const f = e.dataTransfer.files?.[0]; if (f) analisarObras(f) }
  function onPickObras(e) { const f = e.target.files?.[0]; if (f) analisarObras(f); e.target.value = '' }

  // ── Derivados ──────────────────────────────────────────────────────
  const linhasFiltradas = useMemo(() => aplicarFiltrosEmerg(linhas, filtros, vistoriaMap), [linhas, filtros, vistoriaMap])
  const totalProcessos = linhasFiltradas.length
  const totalGeral = linhas.length
  const porStatus = useMemo(() => agregaPorStatus(linhasFiltradas), [linhasFiltradas])
  const cruzada = useMemo(() => tabelaCruzada(linhasFiltradas, true), [linhasFiltradas])
  const totalInformadas = useMemo(() => linhasFiltradas.filter((r) => r.status === 'Informada').length, [linhasFiltradas])
  const obrasMap = useMemo(() => buildObrasMap(obras), [obras])

  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    if (abaAtiva !== 'prazo48h') return
    setAgora(Date.now())
    const id = setInterval(() => setAgora(Date.now()), 60000)
    return () => clearInterval(id)
  }, [abaAtiva])

  const prazoRows = useMemo(
    () => abaAtiva === 'prazo48h' ? buildPrazoRows(linhasFiltradas, obrasMap, vistoriaMap, agora) : [],
    [abaAtiva, linhasFiltradas, obrasMap, vistoriaMap, agora]
  )

  useEffect(() => { onTotalInformadasChange(totalInformadas) }, [totalInformadas, onTotalInformadasChange])

  const permissionariasDisponiveis = useMemo(() => {
    const s = new Set()
    for (const r of linhas) if (r.permissionaria) s.add(r.permissionaria)
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'pt'))
  }, [linhas])

  // { status: string, qtd: number }[] ordenado por qtd desc — para o filtro de status
  const statusDisponiveis = useMemo(() => {
    const m = new Map()
    for (const r of linhas) {
      const s = r.status || '(sem status)'
      m.set(s, (m.get(s) || 0) + 1)
    }
    return Array.from(m.entries())
      .map(([status, qtd]) => ({ status, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
  }, [linhas])

  const datasDisponiveis = useMemo(() => {
    let mn = null, mx = null
    for (const r of linhas) {
      if (!r.data_cadastro) continue
      if (!mn || r.data_cadastro < mn) mn = r.data_cadastro
      if (!mx || r.data_cadastro > mx) mx = r.data_cadastro
    }
    return { min: mn, max: mx }
  }, [linhas])

  const filtrosAtivos = !!(
    filtros.dataIni || filtros.dataFim || filtros.permissionarias.size > 0 ||
    (filtros.possuiVistoria && filtros.possuiVistoria !== 'todas') || filtros.statusVistoria.size > 0 ||
    filtros.statusSistemaGeo.size > 0
  )

  const handleToggleSidebar = useCallback(() => setSidebarAberta((o) => !o), [])
  const handleSetFiltros = useCallback((f) => setFiltros(f), [])
  const handleLimpar = useCallback(() => setFiltros(FILTROS_VAZIOS_EMERG), [])

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <>
      {sucesso && (
        <ModalSucesso
          titulo="Dados atualizados"
          mensagem={sucesso}
          onClose={() => {
            setSucesso(null); setUploadStatus(null); setUploadObrasStatus(null)
            // Após o upload, se houver motivos novos sem classificar, oferecer o ajuste.
            if (podeUpload && motivoPendentes > 0) setPromptAjuste(true)
          }}
        />
      )}

      {/* Prompt pós-upload: quer ajustar os motivos de natureza agora? */}
      {promptAjuste && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">🔄</div>
            <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-1">Ajustar motivos de natureza?</h3>
            <p className="text-sm text-gray-700 mb-5">
              {motivoPendentes} motivo(s) novo(s) foram identificados na planilha. Quer classificá-los como válidos ou inválidos agora?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPromptAjuste(false)}
                className="flex-1 py-2 border border-grey-line text-navy text-xs font-semibold rounded hover:bg-grey-bg"
              >
                Depois
              </button>
              <button
                onClick={() => { setPromptAjuste(false); setEditorMotivos(true) }}
                className="flex-1 py-2 bg-navy text-white text-xs font-semibold rounded hover:bg-navy-light"
              >
                Ajustar agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor de motivos (classificação válido/inválido) */}
      {editorMotivos && (
        <EditorMotivos
          grupos={motivoGrupos}
          salvando={salvandoMotivos}
          onSalvar={handleSalvarMotivos}
          onClose={() => setEditorMotivos(false)}
        />
      )}

      <div className="flex flex-1 min-w-0">
        {!carregando && totalGeral > 0 && abaAtiva !== 'historico' && (
          <SidebarEmergencias
            aberto={sidebarAberta}
            onToggle={handleToggleSidebar}
            filtros={filtros}
            setFiltros={handleSetFiltros}
            onLimpar={handleLimpar}
            permissionarias={permissionariasDisponiveis}
            dataLimites={datasDisponiveis}
            totalFiltrado={totalProcessos}
            totalGeral={totalGeral}
            filtrosAtivos={filtrosAtivos}
            statusDisponiveis={statusDisponiveis}
          />
        )}

        <div className="flex-1 p-4 space-y-4 min-w-0 overflow-y-auto">
          {/* Barra de progresso do carregamento */}
          {carregando && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
              <svg className="w-4 h-4 animate-spin text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-700 mb-1">Carregando emergências…</p>
                <div className="h-1.5 bg-amber-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${emgProgresso.total > 0 ? Math.min(100, Math.round((emgProgresso.carregadas / emgProgresso.total) * 100)) : 0}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-amber-600 tabular-nums shrink-0">
                {emgProgresso.total > 0 ? `${Math.min(100, Math.round((emgProgresso.carregadas / emgProgresso.total) * 100))}%` : '…'}
              </span>
            </div>
          )}

          {/* Botão Atualizar dados (em todas as abas do módulo) */}
          {podeUpload && !carregando && (
            <div className="flex justify-end">
              <button
                onClick={() => setModalUpload(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded border border-navy text-navy hover:bg-navy hover:text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Atualizar dados
              </button>
            </div>
          )}

          {/* Modal de upload */}
          {podeUpload && modalUpload && (
            <div className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
              <div className="bg-grey-bg rounded-xl shadow-2xl w-full max-w-2xl my-8">
                <div className="flex items-center justify-between px-5 py-3 border-b border-grey-line bg-white rounded-t-xl">
                  <h3 className="text-sm font-bold text-navy uppercase tracking-wide">Atualizar dados de Emergências</h3>
                  <button onClick={() => setModalUpload(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none" title="Fechar">✕</button>
                </div>
                <div className="p-5 space-y-4">
                  {gravando ? (
                    /* Tela única durante a gravação — sem as zonas/prévias fragmentadas */
                    <div className="bg-white rounded-md shadow-card p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 animate-spin text-navy shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <div>
                          <p className="text-sm font-bold text-navy uppercase tracking-wide">Importando dados…</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">Não feche esta janela enquanto a importação estiver em andamento.</p>
                        </div>
                      </div>
                      {uploadStatus && !uploadStatus.erro && (
                        <BarraImport label="Emergências" status={uploadStatus} cor="navy" />
                      )}
                      {uploadObrasStatus && !uploadObrasStatus.erro && (
                        <BarraImport label="Posicionamento de obras" status={uploadObrasStatus} cor="amber" />
                      )}
                    </div>
                  ) : (
                    <>
                      {!previa && !mapPendente && (
                        <UploadZone dragOver={dragOver} setDragOver={setDragOver} onDrop={onDrop} onPickFile={onPickFile} status={uploadStatus} totalAtual={totalGeral} />
                      )}
                      {mapPendente && (
                        <MapeamentoColunas dados={mapPendente} onConfirmar={(map) => finalizarAnalise(mapPendente.nome, mapPendente.raw, map)} onCancelar={() => setMapPendente(null)} />
                      )}
                      {previa && (
                        <PreviaEmergencias previa={previa} linhasAtuais={totalGeral} onConfirmar={confirmarUpload} onCancelar={() => setPrevia(null)} hideConfirm />
                      )}
                      {!previaObras && !mapPendenteObras && (
                        <UploadObrasZone dragOver={dragOverObras} setDragOver={setDragOverObras} onDrop={onDropObras} onPickFile={onPickObras} status={uploadObrasStatus} totalAtual={obras.length} />
                      )}
                      {mapPendenteObras && (
                        <MapeamentoColunas dados={mapPendenteObras} onConfirmar={(map) => finalizarAnaliseObras(mapPendenteObras.nome, mapPendenteObras.raw, map)} onCancelar={() => setMapPendenteObras(null)} />
                      )}
                      {previaObras && (
                        <PreviaObras previa={previaObras} onConfirmar={confirmarUploadObras} onCancelar={() => setPreviaObras(null)} hideConfirm />
                      )}
                      {(previa || previaObras) && !mapPendente && !mapPendenteObras && (
                        <div className="flex gap-2 pt-1 border-t border-grey-line">
                          <button
                            onClick={() => { setPrevia(null); setPreviaObras(null) }}
                            className="flex-1 py-2 border border-grey-line text-navy text-xs font-semibold rounded hover:bg-grey-bg transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={confirmarAmbos}
                            disabled={lendo}
                            className="flex-1 py-2.5 bg-navy text-white text-xs font-semibold rounded hover:bg-navy-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {lendo ? 'Aguardando leitura…' : 'Confirmar e importar'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {carregando && linhas.length === 0 && <LoadingConteudo mensagem="Aguardando dados…" />}
          {!carregando && totalGeral === 0 && (
            <div className="bg-white rounded-md shadow-card p-6 text-center text-sm text-gray-500">
              {podeUpload
                ? 'Nenhum dado de emergências carregado ainda. Use o botão "Atualizar dados" acima para o primeiro upload.'
                : 'Nenhum dado de emergências carregado ainda.'}
            </div>
          )}

          {!carregando && totalGeral > 0 && abaAtiva === 'geral' && (
            <AbaGeral total={totalProcessos} linhas={linhasFiltradas} cruzada={cruzada} />
          )}
          {!carregando && totalGeral > 0 && abaAtiva === 'informadas' && (
            <AbaInformadas linhas={linhasFiltradas} totalInformadas={totalInformadas} vistoriaMap={vistoriaMap} />
          )}
          {!carregando && totalGeral > 0 && abaAtiva === 'dashboard' && (
            <AbaDashboard linhas={linhasFiltradas} />
          )}
          {!carregando && totalGeral > 0 && abaAtiva === 'prazo48h' && (
            <AbaPrazo48h rows={prazoRows} temPosicionamento={obras.length > 0} />
          )}
          {!carregando && totalGeral > 0 && abaAtiva === 'busca' && (
            <AbaBuscaEmerg linhas={linhasFiltradas} vistoriaMap={vistoriaMap} filtrosAtivos={filtrosAtivos} />
          )}
          {abaAtiva === 'motivo_invalido' && (
            <AbaMotivosInvalidos
              grupos={motivoGrupos}
              linhas={linhas}
              podeUpload={podeUpload}
              pendentes={motivoPendentes}
              onAbrirEditor={() => setEditorMotivos(true)}
            />
          )}
          {abaAtiva === 'historico' && (
            <AbaHistorico snapshots={snapshots} carregando={carregandoSnap} />
          )}
        </div>
      </div>
    </>
  )
}
