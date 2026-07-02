// Módulo "Apresentação" (Relatório Mensal): prévia da apresentação institucional
// em slides, resolvidos em memória a partir das bases já carregadas no App
// (geo/fisc/emerg). A v1 usa o modelo-seed (MODELO_INSTITUCIONAL); a tabela
// relatorio_modelos (banco) entra na Fase C (editor de modelos).
import { useMemo, useState } from 'react'
import {
  CATEGORIA,
  MODELO_INSTITUCIONAL,
  resolverDadosSlide,
} from '../../../lib/relatorio.js'
import { exportarXLSXMultiAba } from '../../../lib/exportarXLSX.js'
import SlideRenderer from './SlideRenderer.jsx'
import { LoadingInline } from '../../Loading.jsx'

export default function PaginaRelatorio({ geo, fisc, emerg, carregandoGeo }) {
  const [indiceAberto, setIndiceAberto] = useState(false)

  const slides = useMemo(
    () =>
      MODELO_INSTITUCIONAL.slides.map((s) =>
        resolverDadosSlide(s, { geo, fisc, emerg })
      ),
    [geo, fisc, emerg]
  )

  function baixarTodos() {
    const abas = slides
      .filter((s) => s.categoria === 'dados' && s.dados && s.colunas)
      .map((s) => ({
        nome: `${String(s.n).padStart(2, '0')} ${s.titulo}`,
        rows: s.dados,
        colunas: s.colunas,
      }))
    exportarXLSXMultiAba(abas, 'apresentacao-obras-dados')
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
        {/* Barra de contexto: legenda das categorias + ações */}
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIndiceAberto((v) => !v)}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-grey-bg transition-colors"
              >
                Ir para slide…
              </button>
              <button
                onClick={baixarTodos}
                className="px-3 py-1.5 rounded-md bg-teal-700 text-white text-xs font-semibold hover:bg-teal-600 transition-colors"
                title="Um arquivo .xlsx com uma aba por slide de dados"
              >
                ⬇ Baixar todos os dados (XLSX)
              </button>
            </div>
          </div>

          {/* Legenda das 3 categorias de slide */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-gray-100">
            {Object.values(CATEGORIA).map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 text-[11px] text-gray-600"
              >
                <span className={`w-3 h-3 rounded-sm border-2 ${c.borda}`} />
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
                  className={`w-8 h-8 rounded text-[11px] font-semibold border-2 ${s.catInfo.borda} text-gray-600 hover:bg-grey-bg transition-colors`}
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
          <SlideRenderer key={s.n} slide={s} />
        ))}
      </div>
    </div>
  )
}
