// Módulo "Apresentação" (Relatório Mensal): prévia da apresentação institucional
// em slides, resolvidos em memória a partir das bases já carregadas no App
// (geo/fisc/emerg). A v1 usa o modelo-seed (MODELO_INSTITUCIONAL); a tabela
// relatorio_modelos (banco) entra na Fase C (editor de modelos).
//
// Seletor de permissionária: filtra os slides "gerais" e destaca a barra dela
// nos rankings (a lógica fica em resolverDadosSlide/`opcoes`). Os campos de
// valor (multa/custo por m²) persistem no localStorage deste navegador.
import { useMemo, useState } from 'react'
import {
  CATEGORIA,
  MODELO_INSTITUCIONAL,
  listaPermissionariasRelatorio,
  resolverDadosSlide,
} from '../../../lib/relatorio.js'
import { exportarXLSXMultiAba } from '../../../lib/exportarXLSX.js'
import SlideRenderer from './SlideRenderer.jsx'
import { LoadingInline } from '../../Loading.jsx'

const STORAGE_CAMPOS = 'obras_relatorio_campos'

function lerCamposSalvos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_CAMPOS)) || {}
  } catch {
    return {}
  }
}

export default function PaginaRelatorio({ geo, fisc, emerg, carregandoGeo }) {
  const [indiceAberto, setIndiceAberto] = useState(false)
  const [permissionaria, setPermissionaria] = useState('')
  // Campos digitados (multaM2 / custoM2) — persistem por navegador.
  const [campos, setCampos] = useState(lerCamposSalvos)

  function onCampo(nome, valor) {
    setCampos((prev) => {
      const next = { ...prev, [nome]: valor }
      try {
        localStorage.setItem(STORAGE_CAMPOS, JSON.stringify(next))
      } catch {
        // localStorage indisponível: segue só em memória
      }
      return next
    })
  }

  const permissionarias = useMemo(() => listaPermissionariasRelatorio(geo), [geo])

  const slides = useMemo(
    () =>
      MODELO_INSTITUCIONAL.slides.map((s) =>
        resolverDadosSlide(
          s,
          { geo, fisc, emerg },
          {
            permissionaria: permissionaria || null,
            multaM2: campos.multaM2,
            custoM2: campos.custoM2,
          }
        )
      ),
    [geo, fisc, emerg, permissionaria, campos]
  )

  function baixarTodos() {
    const abas = slides
      .filter((s) => s.categoria === 'dados' && s.dados && s.colunas)
      .map((s) => ({
        nome: `${String(s.n).padStart(2, '0')} ${s.titulo}`,
        rows: s.dados,
        colunas: s.colunas,
      }))
    const sufixo = permissionaria
      ? `-${permissionaria.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      : ''
    exportarXLSXMultiAba(abas, `apresentacao-obras-dados${sufixo}`)
  }

  function irParaSlide(n) {
    setIndiceAberto(false)
    document
      .getElementById(`slide-${n}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex-1 overflow-y-auto bg-grey-bg">
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Barra de contexto: seletor + legenda + ações */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-bold text-navy">
                {MODELO_INSTITUCIONAL.nome}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {MODELO_INSTITUCIONAL.descricao} Cada slide traz o número e o
                nome correspondentes ao arquivo PowerPoint.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Seletor de permissionária: ajusta a apresentação inteira */}
              <select
                value={permissionaria}
                onChange={(e) => setPermissionaria(e.target.value)}
                data-tour="relatorio-permissionaria"
                className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-400 ${permissionaria ? 'border-teal-500 bg-teal-50 text-teal-900' : 'border-gray-300 text-gray-600'}`}
                title="Ajusta a apresentação inteira para os dados desta permissionária"
              >
                <option value="">Todas as permissionárias</option>
                {permissionarias.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIndiceAberto((v) => !v)}
                data-tour="relatorio-indice"
                className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-grey-bg transition-colors"
              >
                Ir para slide…
              </button>
              <button
                onClick={baixarTodos}
                data-tour="relatorio-baixar-todos"
                className="px-3 py-1.5 rounded-md bg-teal-700 text-white text-xs font-semibold hover:bg-teal-600 transition-colors"
                title="Um arquivo .xlsx com uma aba por slide de dados (listas completas, sem janela)"
              >
                ⬇ Baixar todos os dados (XLSX)
              </button>
            </div>
          </div>

          {permissionaria && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-teal-50 border border-teal-200 px-3 py-1.5 text-xs text-teal-900">
              <strong>Apresentação ajustada para: {permissionaria}.</strong>
              <span>
                Rankings destacam a barra dela em teal; os demais slides mostram
                só os dados dela.
              </span>
              <button
                onClick={() => setPermissionaria('')}
                className="ml-auto font-bold underline underline-offset-2 hover:text-teal-700"
              >
                Limpar
              </button>
            </div>
          )}

          {/* Legenda das 3 categorias de slide */}
          <div data-tour="relatorio-legenda" className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-gray-100">
            {Object.values(CATEGORIA).map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 text-[11px] text-gray-600"
              >
                <span className={`w-3 h-3 rounded-xs border-2 ${c.borda}`} />
                {c.icone} {c.rotulo}
              </span>
            ))}
          </div>

          {indiceAberto && (
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
              {slides.map((s) => (
                <button
                  key={s.n}
                  onClick={() => irParaSlide(s.n)}
                  title={s.titulo}
                  className={`min-w-[32px] h-8 px-1 rounded-sm text-[11px] font-semibold border-2 ${s.catInfo.borda} text-gray-600 hover:bg-grey-bg transition-colors`}
                >
                  {s.n}
                </button>
              ))}
            </div>
          )}
        </div>

        {carregandoGeo && (
          <LoadingInline mensagem="Carregando as bases de dados — os slides de dados aparecem completos ao terminar…" />
        )}

        {slides.map((s) => (
          <SlideRenderer key={s.n} slide={s} campos={campos} onCampo={onCampo} />
        ))}
      </div>
    </div>
  )
}
