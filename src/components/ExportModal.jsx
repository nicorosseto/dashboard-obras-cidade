import { useEffect, useState } from 'react'
import { exportarCSV, exportarXLSX } from '../lib/exportarXLSX'

// ── Definição de colunas disponíveis por módulo ──────────────────────────────
// Cada coluna tem: key (campo no objeto), label (cabeçalho da planilha),
// padrao (pré-selecionado na 1ª abertura).

const COLUNAS_MODULOS = {
  sistemaGeo: [
    {
      grupo: 'Identificação',
      colunas: [
        { key: 'processo', label: 'Processo', padrao: true },
        { key: 'permissionaria', label: 'Permissionária', padrao: true },
        { key: 'executora', label: 'Executora', padrao: true },
        { key: 'tipo_processo_nome', label: 'Tipo de Processo', padrao: false },
        { key: 'tipo_obra_nome', label: 'Tipo de Obra', padrao: false },
      ],
    },
    {
      grupo: 'Localização',
      colunas: [{ key: 'subprefeitura', label: 'Subprefeitura', padrao: true }],
    },
    {
      grupo: 'Status e Etapa',
      colunas: [
        { key: 'status_nome', label: 'Status', padrao: true },
        { key: 'status_unificado', label: 'Status Unificado', padrao: false },
        { key: 'etapa_nome', label: 'Etapa', padrao: false },
      ],
    },
    {
      grupo: 'Datas',
      colunas: [{ key: 'data_cadastro', label: 'Data Cadastro', padrao: true }],
    },
  ],
  fiscalizacao: [
    {
      grupo: 'Identificação',
      colunas: [
        { key: 'id_origem', label: 'Processo', padrao: true },
        { key: 'permissionaria', label: 'Permissionária', padrao: true },
        { key: 'executante', label: 'Executante', padrao: false },
        { key: 'lote', label: 'Lote', padrao: false },
      ],
    },
    {
      grupo: 'Localização',
      colunas: [
        { key: 'subprefeitura', label: 'Subprefeitura', padrao: true },
        { key: 'classificacao_viaria', label: 'Classificação Viária', padrao: false },
        { key: 'area_m2', label: 'Área (m²)', padrao: false },
      ],
    },
    {
      grupo: 'Status',
      colunas: [
        { key: 'status_simplificado', label: 'Status', padrao: true },
        { key: 'tem_nao_conformidade', label: 'Tem NC', padrao: false },
        { key: 'geo_status_nome', label: 'Status Sistema Geo', padrao: false },
      ],
    },
    {
      grupo: 'Cruzamento com Sistema Geo',
      colunas: [
        { key: 'tipo_processo_nome', label: 'Tipo de Processo', padrao: false },
        { key: 'etapa_nome', label: 'Etapa Sistema Geo', padrao: false },
        { key: 'executora', label: 'Executora (Sistema Geo)', padrao: false },
        { key: 'tem_sistemaGeo', label: 'No Sistema Geo?', padrao: false },
      ],
    },
    {
      grupo: 'Datas',
      colunas: [{ key: 'data_inicio', label: 'Data Início', padrao: true }],
    },
  ],
}

const LABEL_MODULO = {
  sistemaGeo: 'Sistema Geo',
  fiscalizacao: 'Fiscalização',
  relatorio: 'Apresentação',
  multas: 'Multas',
}

const STORAGE_KEY = (modulo) => `obras_export_cols_${modulo}`

function colsPadrao(modulo) {
  const grupos = COLUNAS_MODULOS[modulo] ?? []
  return new Set(
    grupos.flatMap((g) => g.colunas.filter((c) => c.padrao).map((c) => c.key))
  )
}

function colsSalvas(modulo) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(modulo))
    if (raw) return new Set(JSON.parse(raw))
  } catch {
    /* ignora */
  }
  return colsPadrao(modulo)
}

function salvarCols(modulo, selecionadas) {
  try {
    localStorage.setItem(STORAGE_KEY(modulo), JSON.stringify([...selecionadas]))
  } catch {
    /* ignora */
  }
}

function todasCols(modulo) {
  return (COLUNAS_MODULOS[modulo] ?? []).flatMap((g) => g.colunas)
}

// ── Ícone de download SVG ─────────────────────────────────────────────────────
function IconeDownload({ className = 'w-5 h-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
// Props:
//   rowsFisc / rowsGeo     — linhas com filtros aplicados
//   todasFisc / todasGeo   — linhas sem filtros
//   moduloAtivo            — 'sistemaGeo' | 'fiscalizacao' (seção atual)
//   mostrarFisc / mostrarGeo — controle de permissão
export default function ExportModal({
  rowsFisc = [],
  rowsGeo = [],
  todasFisc = [],
  todasGeo = [],
  moduloAtivo = 'sistemaGeo',
  mostrarFisc = true,
  mostrarGeo = true,
}) {
  const [open, setOpen] = useState(false)
  // modoGrafico = true quando aberto via ícone de gráfico
  const [modoGrafico, setModoGrafico] = useState(false)
  const [dadosGrafico, setDadosGrafico] = useState(null)
  const [colunasGrafico, setColunasGrafico] = useState(null)
  const [tituloGrafico, setTituloGrafico] = useState('')
  const [moduloGrafico, setModuloGrafico] = useState(null)

  // Módulo selecionado no seletor (dentro do modal de registros)
  const moduloInicial =
    moduloAtivo === 'fiscalizacao' && mostrarFisc
      ? 'fiscalizacao'
      : mostrarGeo
        ? 'sistemaGeo'
        : mostrarFisc
          ? 'fiscalizacao'
          : 'sistemaGeo'
  const [moduloSel, setModuloSel] = useState(moduloInicial)
  const [usarFiltros, setUsarFiltros] = useState(true)
  const [formato, setFormato] = useState('xlsx')
  const [colsSel, setColsSel] = useState(() => colsSalvas(moduloInicial))

  // Ao mudar módulo, carrega colunas salvas daquele módulo
  function trocarModulo(m) {
    setModuloSel(m)
    setColsSel(colsSalvas(m))
  }

  // Ouvir evento de gráfico
  useEffect(() => {
    function onEvento(e) {
      const { dados, colunas, titulo, modulo } = e.detail
      setDadosGrafico(dados)
      setColunasGrafico(colunas)
      setTituloGrafico(titulo)
      setModuloGrafico(modulo ?? moduloAtivo)
      setModoGrafico(true)
      setOpen(true)
    }
    window.addEventListener('obras:exportar-grafico', onEvento)
    return () => window.removeEventListener('obras:exportar-grafico', onEvento)
  }, [moduloAtivo])

  // Fechar com ESC
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') fechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function fechar() {
    setOpen(false)
    setModoGrafico(false)
    setDadosGrafico(null)
    setColunasGrafico(null)
  }

  function abrirRegistros() {
    const m = moduloGrafico ?? moduloInicial
    setModuloSel(m)
    setColsSel(colsSalvas(m))
    setModoGrafico(false)
  }

  function toggleCol(key) {
    setColsSel((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      salvarCols(moduloSel, next)
      return next
    })
  }

  function toggleGrupo(grupo) {
    const keys = grupo.colunas.map((c) => c.key)
    const todasMarcadas = keys.every((k) => colsSel.has(k))
    setColsSel((prev) => {
      const next = new Set(prev)
      if (todasMarcadas) keys.forEach((k) => next.delete(k))
      else keys.forEach((k) => next.add(k))
      salvarCols(moduloSel, next)
      return next
    })
  }

  function baixarGrafico() {
    if (!dadosGrafico || !colunasGrafico) return
    const hoje = new Date().toISOString().slice(0, 10)
    const slug = tituloGrafico.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
    const nome = `obras-grafico-${slug}-${hoje}`
    if (formato === 'xlsx') exportarXLSX(dadosGrafico, colunasGrafico, nome)
    else exportarCSV(dadosGrafico, colunasGrafico, nome)
    fechar()
  }

  function baixarRegistros() {
    const cols = todasCols(moduloSel).filter((c) => colsSel.has(c.key))
    if (cols.length === 0) return
    const hoje = new Date().toISOString().slice(0, 10)
    const filtro = usarFiltros ? '' : '-completo'
    const rows =
      moduloSel === 'sistemaGeo'
        ? usarFiltros
          ? rowsGeo
          : todasGeo
        : usarFiltros
          ? rowsFisc
          : todasFisc
    const nome = `obras-${moduloSel}${filtro}-${hoje}`
    if (formato === 'xlsx') exportarXLSX(rows, cols, nome)
    else exportarCSV(rows, cols, nome)
    fechar()
  }

  const colsSelecionadasCount = todasCols(moduloSel).filter((c) =>
    colsSel.has(c.key)
  ).length

  const rowsAtual =
    moduloSel === 'sistemaGeo'
      ? usarFiltros
        ? rowsGeo
        : todasGeo
      : usarFiltros
        ? rowsFisc
        : todasFisc

  return (
    <>
      {/* ── Botão flutuante — menor e esmaecido até hover ── */}
      <button
        onClick={() => {
          setModoGrafico(false)
          setModuloSel(moduloInicial)
          setColsSel(colsSalvas(moduloInicial))
          setOpen(true)
        }}
        title="Exportar dados"
        data-tour="exportar-flutuante"
        className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-navy text-white shadow-lg
                   opacity-40 hover:opacity-100 hover:scale-110 hover:shadow-xl
                   transition-all duration-200 flex items-center justify-center"
      >
        <IconeDownload className="w-5 h-5" />
      </button>

      {/* ── Modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={fechar}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-grey-line">
              <h2 className="text-base font-bold text-navy uppercase tracking-wide">
                {modoGrafico ? tituloGrafico || 'Dados do Gráfico' : 'Exportar Dados'}
              </h2>
              <button
                onClick={fechar}
                className="text-gray-500 hover:text-navy text-xl leading-none w-7 h-7 flex items-center justify-center rounded-sm hover:bg-grey-bg"
                title="Fechar"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* ── MODO GRÁFICO ── */}
              {modoGrafico ? (
                <>
                  <div className="bg-grey-bg rounded-md p-4 space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-navy">
                        {dadosGrafico?.length ?? 0}
                      </span>{' '}
                      linhas · {colunasGrafico?.length ?? 0} colunas
                    </p>
                    <p className="text-xs text-gray-500">
                      Exatamente os dados exibidos no gráfico, sem linhas extras.
                    </p>
                  </div>

                  {/* Formato */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Formato
                    </p>
                    <div className="flex gap-3">
                      {['xlsx', 'csv'].map((f) => (
                        <label key={f} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="fmt-g"
                            value={f}
                            checked={formato === f}
                            onChange={() => setFormato(f)}
                            className="accent-navy"
                          />
                          <span className="text-sm font-medium text-gray-700 uppercase">
                            {f}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Só oferece "registros completos" quando o módulo do gráfico
                      tem colunas configuradas (o módulo Apresentação não tem —
                      os dados do slide já SÃO o export completo). */}
                  {COLUNAS_MODULOS[moduloGrafico ?? moduloInicial] && (
                    <button
                      onClick={abrirRegistros}
                      className="text-xs text-navy underline underline-offset-2 hover:text-navy-light"
                    >
                      Exportar registros completos com seleção de colunas →
                    </button>
                  )}
                </>
              ) : (
                /* ── MODO REGISTROS ── */
                <>
                  {/* Seletor de módulo (só quando ambos disponíveis) */}
                  {mostrarFisc && mostrarGeo && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Base de dados
                      </p>
                      <div className="flex gap-2">
                        {['sistemaGeo', 'fiscalizacao'].map((m) => (
                          <button
                            key={m}
                            onClick={() => trocarModulo(m)}
                            className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                              moduloSel === m
                                ? 'bg-navy text-white border-navy'
                                : 'text-navy border-navy/30 hover:border-navy'
                            }`}
                          >
                            {LABEL_MODULO[m]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filtros */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Dados
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { val: true, label: 'Com filtros aplicados' },
                        { val: false, label: 'Todos os registros (sem filtro)' },
                      ].map(({ val, label }) => (
                        <label key={String(val)} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="filtros"
                            checked={usarFiltros === val}
                            onChange={() => setUsarFiltros(val)}
                            className="accent-navy"
                          />
                          <span className="text-sm text-gray-700">
                            {label}{' '}
                            <span className="text-gray-400 text-xs">
                              (
                              {(
                                val
                                  ? moduloSel === 'sistemaGeo'
                                    ? rowsGeo
                                    : rowsFisc
                                  : moduloSel === 'sistemaGeo'
                                    ? todasGeo
                                    : todasFisc
                              ).length.toLocaleString('pt-BR')}{' '}
                              registros)
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Seletor de colunas */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Colunas
                    </p>
                    <div className="space-y-3">
                      {(COLUNAS_MODULOS[moduloSel] ?? []).map((grupo) => {
                        const todasMarcadas = grupo.colunas.every((c) =>
                          colsSel.has(c.key)
                        )
                        return (
                          <div key={grupo.grupo}>
                            <button
                              onClick={() => toggleGrupo(grupo)}
                              className="text-xs font-semibold text-navy/70 uppercase tracking-wider mb-1.5 flex items-center gap-1 hover:text-navy"
                            >
                              <span
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] transition-colors ${
                                  todasMarcadas
                                    ? 'bg-navy border-navy text-white'
                                    : 'border-gray-400'
                                }`}
                              >
                                {todasMarcadas ? '✓' : ''}
                              </span>
                              {grupo.grupo}
                            </button>
                            <div className="flex flex-wrap gap-2 pl-4">
                              {grupo.colunas.map((col) => (
                                <label
                                  key={col.key}
                                  className="flex items-center gap-1.5 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={colsSel.has(col.key)}
                                    onChange={() => toggleCol(col.key)}
                                    className="accent-navy rounded-sm"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {col.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Formato */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Formato
                    </p>
                    <div className="flex gap-3">
                      {['xlsx', 'csv'].map((f) => (
                        <label key={f} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="fmt-r"
                            value={f}
                            checked={formato === f}
                            onChange={() => setFormato(f)}
                            className="accent-navy"
                          />
                          <span className="text-sm font-medium text-gray-700 uppercase">
                            {f}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Rodapé com botão de ação */}
            <div className="px-5 py-3 border-t border-grey-line flex items-center justify-between gap-3">
              <span className="text-xs text-gray-400">
                {modoGrafico
                  ? `${dadosGrafico?.length ?? 0} linhas`
                  : `${rowsAtual.length.toLocaleString('pt-BR')} registros · ${colsSelecionadasCount} colunas`}
              </span>
              <button
                onClick={modoGrafico ? baixarGrafico : baixarRegistros}
                disabled={!modoGrafico && colsSelecionadasCount === 0}
                className="flex items-center gap-2 px-4 py-2 rounded bg-navy text-white text-sm font-semibold
                           hover:bg-navy-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <IconeDownload className="w-4 h-4" />
                Baixar {formato.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
