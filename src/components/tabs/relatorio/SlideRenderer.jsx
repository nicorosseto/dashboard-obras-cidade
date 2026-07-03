// Renderiza UM slide do módulo Apresentação a partir do resultado de
// resolverDadosSlide() (src/lib/relatorio.js), reproduzindo o LAYOUT da
// apresentação institucional (PDF rev. 2026.03): título navy no topo à
// esquerda, caixas de contexto "rótulo | valor", painel/faixa "TOTAIS POR
// ANO", caixas de destaque (%) à direita do gráfico, capas com faixa navy e
// mapa estilizado, e quadros nos slides institucionais. Fotos do PDF são
// substituídas por ícones genéricos. O PNG captura só o corpo do slide
// (`slideRef`) — o cabeçalho do card (nº/categoria/botões) fica fora.
import { useRef, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { toPng } from 'html-to-image'
import ChartTooltip from '../../charts/ChartTooltip.jsx'
import DonutComparativo from '../../charts/DonutComparativo.jsx'
import BotaoExportarGrafico from '../../BotaoExportarGrafico.jsx'
import { fmtNumero } from '../../../lib/aggregations.js'

const NAVY = '#1F3864'
const AZUL_CLARO = '#8FAADC'
const VERMELHO = '#C00000'
const AZUL_MEDIO = '#4472C4'

// Séries por ano (linha mensal comparativa): ordem FIXA por índice do ano —
// nunca ciclada — espelhando as cores da apresentação institucional.
const CORES_ANO = [
  '#7f1d1d', // vinho
  '#2e7d32', // verde
  '#1F3864', // navy
  '#b45309', // âmbar escuro
  '#0e7490', // ciano escuro
  '#6d28d9', // violeta
  '#111827', // quase-preto
  '#C00000', // vermelho (ano corrente)
]

// Donut de composição: fatias ordenadas por magnitude → atribuição sequencial
// (azuis claro→escuro) + separador branco; identidade nunca só pela cor
// (legenda com nome/valor/% já vem do DonutComparativo).
const CORES_DONUT = ['#1F3864', '#2E5A9E', '#4472C4', '#6E93D1', '#8FAADC', '#94a3b8', '#cbd5e1']

// Rótulos e cores por chave de série (legendas dos gráficos).
const LABEL_SERIE = {
  valor: 'Quantidade',
  total: 'Total',
  emergencia: 'Emergência',
  corretiva: 'Manut. Corretiva',
  laudos: 'Laudos Técnicos',
  nao_conformidades: 'Não Conformidades',
  em_andamento: 'Em andamento',
  encerradas: 'Total Encerradas',
  informadas: 'Total Informadas',
  pct_leg: '% Legislação Atendida',
  pct_nc: '% Não Atenderam à Legislação',
}
const COR_SERIE = {
  valor: NAVY,
  total: NAVY,
  emergencia: AZUL_CLARO,
  corretiva: AZUL_CLARO,
  laudos: NAVY,
  nao_conformidades: VERMELHO,
  em_andamento: VERMELHO,
  encerradas: NAVY,
  informadas: AZUL_CLARO,
  pct_leg: AZUL_MEDIO,
  pct_nc: VERMELHO,
}

// Chaves numéricas que viram barras/linhas (exclui rótulos e percentuais).
function chavesDeSerie(colunas, dados) {
  return (colunas || [])
    .map((c) => c.key)
    .filter(
      (k) =>
        k !== 'nome' &&
        k !== 'ano' &&
        k !== 'mes' &&
        k !== 'periodo' &&
        !k.startsWith('pct') &&
        typeof dados?.[0]?.[k] === 'number'
    )
}

const EIXO = { fontSize: 11, fill: '#475569' }

/* ── Ícones genéricos (substituem as fotos/cliparts do PDF) ─────────────── */
function IconeGenerico({ nome, className = 'w-10 h-10' }) {
  const props = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  switch (nome) {
    case 'predio':
      return (
        <svg {...props}>
          <rect x="4" y="3" width="10" height="18" rx="1" />
          <path d="M14 9h5a1 1 0 0 1 1 1v11" />
          <path d="M7 7h2M7 11h2M7 15h2M11 7h0M17 13h0M17 17h0" />
          <path d="M2 21h20" />
        </svg>
      )
    case 'usuarios':
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M15.5 14.5A5 5 0 0 1 21 19.5" />
        </svg>
      )
    case 'executante':
      return (
        <svg {...props}>
          <circle cx="12" cy="9" r="4" />
          <path d="M8.5 6.5a3.5 3.5 0 0 1 7 0" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      )
    case 'obra':
      return (
        <svg {...props}>
          <path d="M3 15h18v4H3z" />
          <path d="M5 15v-4M12 15v-4M19 15v-4" />
          <path d="M4 11l4 4M11 11l4 4M18 11l3 3" />
          <path d="M5 19v2M19 19v2" />
        </svg>
      )
    case 'calendario':
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
          <path d="M8 14h2M14 14h2M8 18h2" />
        </svg>
      )
    case 'nivelamento':
      return (
        <svg {...props}>
          <path d="M3 17h18" />
          <path d="M3 21h18" />
          <path d="M6 17v-3M10 17v-5M14 17v-3M18 17v-6" />
        </svg>
      )
    case 'geometria':
      return (
        <svg {...props}>
          <path d="M4 20L10 4h4l6 16" />
          <path d="M8 14h8" />
          <path d="M12 8v0M12 12v0M12 17v0" strokeDasharray="1 3" />
        </svg>
      )
    case 'afundamento':
      return (
        <svg {...props}>
          <path d="M3 8h5c1 4 2 6 4 6s3-2 4-6h5" />
          <path d="M3 19h18" />
          <path d="M12 14v3M10 16l2 2 2-2" />
        </svg>
      )
    case 'trincas':
      return (
        <svg {...props}>
          <path d="M4 4l4 5-3 3 6 4-2 4" />
          <path d="M14 4l2 4 4 2-3 4 2 5" />
        </svg>
      )
    default:
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 12h16M12 4v16" />
        </svg>
      )
  }
}

// Mapa estilizado de SP (vetor genérico — substitui a arte do PDF nas capas).
function MapaGenericoSP({ className = 'w-44 h-56' }) {
  return (
    <svg className={className} viewBox="0 0 100 130" fill="none" aria-hidden>
      <path
        d="M38 6l14-4 12 8 16 2 8 10-4 12 6 10-8 10-2 12-10 6 2 14-8 10-6 16-12 8-10-6 2-14-8-10 4-12-6-10 4-12-4-12 6-10-2-12z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M42 18l10 6 12-4M34 38l14 4 16-6M30 58l16 2 18-4M38 78l14-2 12 4M42 98l10 2"
        stroke="#7dd3fc"
        strokeWidth="1.4"
        opacity="0.7"
      />
    </svg>
  )
}

const ICONE_FALHA = {
  Nivelamento: 'nivelamento',
  Geometria: 'geometria',
  Afundamento: 'afundamento',
  Trincas: 'trincas',
}

/* ── Peças do layout do PDF ─────────────────────────────────────────────── */

// Caixa "rótulo | valor" (os totais no topo esquerdo dos slides de dados).
function CaixaContexto({ rotulo, valor }) {
  return (
    <div className="flex items-stretch border border-navy shadow-[2px_2px_0_rgba(31,56,100,0.25)] max-w-xl">
      <div className="flex-1 bg-white px-2.5 py-1 text-[11px] sm:text-xs font-bold text-navy flex items-center">
        {rotulo}
      </div>
      <div className="bg-navy text-white px-3 py-1 text-sm font-extrabold tabular-nums flex items-center min-w-[84px] justify-center">
        {valor}
      </div>
    </div>
  )
}

// Caixa de destaque "NN% | frase" (coluna direita dos slides de dados).
function CaixaDestaque({ valor, texto }) {
  return (
    <div className="flex items-stretch border border-navy shadow-[2px_2px_0_rgba(31,56,100,0.25)]">
      <div className="bg-navy text-white px-3 py-2 text-2xl font-extrabold flex items-center justify-center min-w-[72px]">
        {valor}
      </div>
      <div className="bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy flex items-center leading-snug">
        {texto}
      </div>
    </div>
  )
}

// Painel "TOTAIS POR ANO" (lateral) — cores por ano na ordem fixa.
function PainelAnosLado({ painel }) {
  return (
    <div className="border border-navy shadow-[2px_2px_0_rgba(31,56,100,0.25)]">
      <div className="bg-navy text-white text-[11px] font-extrabold uppercase text-center px-3 py-1.5 tracking-wide">
        {painel.titulo}
      </div>
      <div className="bg-white px-2 py-1.5 space-y-1">
        {painel.itens.map((it, i) => (
          <div
            key={it.ano}
            className="flex items-center justify-between gap-3 px-2 py-0.5 text-[11px] font-bold text-white rounded-sm"
            style={{ backgroundColor: CORES_ANO[i % CORES_ANO.length] }}
          >
            <span>{it.ano}:</span>
            <span className="tabular-nums">{fmtNumero(it.valor)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Faixa horizontal de totais por ano (topo dos comparativos, slides 14/15).
function FaixaAnosTopo({ painel }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {painel.itens.map((it) => (
        <div key={it.ano} className="bg-navy text-white text-center px-3 py-1 min-w-[80px]">
          <div className="text-[11px] font-bold">{it.ano}</div>
          <div className="text-sm font-extrabold tabular-nums">{fmtNumero(it.valor)}</div>
        </div>
      ))}
    </div>
  )
}

// Cabeçalho do slide no padrão do PDF: título navy à esquerda, sub-caixa,
// caixas de contexto, painel de texto à direita e régua dupla.
function CabecalhoSlide({ slide }) {
  const titulo = slide.tituloInterno || slide.titulo.toUpperCase()
  return (
    <div className="mb-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-extrabold text-navy uppercase tracking-wide leading-tight">
            {titulo}
          </h3>
          {slide.subtitulo && (
            <div className="inline-block border-2 border-navy bg-white px-3 py-0.5 text-[11px] sm:text-xs font-extrabold text-navy uppercase mt-1.5 shadow-[3px_3px_0_rgba(31,56,100,0.2)]">
              {slide.subtitulo}
            </div>
          )}
          {slide.contexto && (
            <div className="space-y-1 mt-2">
              {slide.contexto.map((c) => (
                <CaixaContexto key={c.rotulo} rotulo={c.rotulo} valor={c.valor} />
              ))}
            </div>
          )}
        </div>
        {slide.painelTexto && (
          <div className="bg-navy text-white px-4 py-2.5 text-sm font-extrabold text-center uppercase leading-snug max-w-[210px] shrink-0">
            {slide.painelTexto}
          </div>
        )}
      </div>
      <div className="mt-2 border-b-2 border-navy" />
    </div>
  )
}

// Corpo com coluna de destaques/painel à direita (posição do PDF).
function CorpoComLateral({ slide, children }) {
  const temLateral =
    (slide.destaques && slide.destaques.length > 0) ||
    (slide.painelAnos && slide.painelPos !== 'topo')
  if (!temLateral) return children
  return (
    <div className="flex flex-col md:flex-row gap-3 items-start">
      <div className="flex-1 min-w-0 w-full">{children}</div>
      <div className="w-full md:w-56 shrink-0 flex flex-col gap-2.5 md:pt-6">
        {slide.painelAnos && slide.painelPos !== 'topo' && (
          <PainelAnosLado painel={slide.painelAnos} />
        )}
        {(slide.destaques || []).map((d) => (
          <CaixaDestaque key={d.texto} valor={d.valor} texto={d.texto} />
        ))}
      </div>
    </div>
  )
}

/* ── Gráficos ───────────────────────────────────────────────────────────── */

function GraficoBarras({ dados, colunas, horizontal }) {
  const chaves = chavesDeSerie(colunas, dados)
  const eixoNome = dados?.[0]?.nome !== undefined ? 'nome' : 'ano'
  return (
    <ResponsiveContainer width="100%" height={horizontal ? Math.max(220, dados.length * 34) : 280}>
      <BarChart
        data={dados}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 16, bottom: 4, left: horizontal ? 40 : 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={EIXO} tickFormatter={fmtNumero} />
            <YAxis type="category" dataKey={eixoNome} tick={EIXO} width={150} />
          </>
        ) : (
          <>
            <XAxis dataKey={eixoNome} tick={EIXO} interval={0} angle={dados.length > 8 ? -30 : 0} textAnchor={dados.length > 8 ? 'end' : 'middle'} height={dados.length > 8 ? 60 : 30} />
            <YAxis tick={EIXO} tickFormatter={fmtNumero} />
          </>
        )}
        <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
        {chaves.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {chaves.map((k) => (
          <Bar
            key={k}
            dataKey={k}
            name={LABEL_SERIE[k] || k}
            fill={COR_SERIE[k] || NAVY}
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function GraficoLinhas({ dados, series, eixoX, dominioPct }) {
  return (
    <ResponsiveContainer width="100%" height={290}>
      <LineChart data={dados} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={eixoX} tick={EIXO} interval="preserveStartEnd" />
        <YAxis tick={EIXO} tickFormatter={dominioPct ? (v) => `${v}%` : fmtNumero} domain={dominioPct ? [0, 100] : undefined} />
        <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.cor || CORES_ANO[i % CORES_ANO.length]}
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// 3 donuts lado a lado (Local / Coletora / Arterial) — slides 34–36.
function PizzasViaria({ dados }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {dados.map((g) => {
        const fatias = [
          { nome: 'Legislação Atendida', valor: g.leg_atendida, pct: g.pct_leg },
          { nome: 'Não Atenderam', valor: g.nao_atendida, pct: g.pct_nc },
        ]
        return (
          <div key={g.nome}>
            <div className="flex items-center justify-between bg-navy text-white px-3 py-1 mb-2 shadow-[3px_3px_0_rgba(31,56,100,0.2)]">
              <span className="text-xs font-extrabold uppercase tracking-wide">{g.nome}</span>
              <span className="text-sm font-extrabold">{g.pct_nc}%</span>
            </div>
            <DonutComparativo dados={fatias} cores={[NAVY, VERMELHO]} total={g.total} />
            <div className="text-[11px] text-gray-500 text-center mt-1">
              Solucionados: <strong>{fmtNumero(g.solucionados)}</strong> · Em
              andamento: <strong>{fmtNumero(g.em_andamento)}</strong>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// KPIs com ícone (slide 7 — Visão Geral) no formato de cartões do PDF:
// ícone em cima, rótulo no meio, valor num chip navy embaixo.
function CartoesKpi({ kpis }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
      {kpis.map((k) => (
        <div
          key={k.rotulo}
          className={`relative bg-white border ${k.manual ? 'border-dashed border-slate-300' : 'border-gray-200'} shadow-[4px_4px_0_rgba(31,56,100,0.15)] px-3 pt-4 pb-7 text-center`}
          title={k.manual ? 'Este dado não existe no banco — preencher manualmente na apresentação final.' : undefined}
        >
          <div className={`mx-auto mb-2 ${k.manual ? 'text-gray-300' : 'text-navy'}`}>
            <IconeGenerico nome={k.icone} className="w-10 h-10 mx-auto" />
          </div>
          <div className={`text-xs font-semibold leading-snug ${k.manual ? 'text-gray-400' : 'text-gray-700'}`}>
            {k.rotulo}
          </div>
          {k.duplo ? (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {k.duplo.map((d) => (
                <div key={d.rotulo} className="bg-navy text-white px-2.5 py-1 text-center">
                  <div className="text-[9px] uppercase font-bold opacity-80">{d.rotulo}</div>
                  <div className="text-sm font-extrabold tabular-nums">{fmtNumero(d.valor)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 text-base font-extrabold tabular-nums ${k.manual ? 'bg-slate-200 text-gray-400' : 'bg-navy text-white'}`}>
              {k.manual ? '—' : fmtNumero(k.valor)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Cards de tipo de falha (slide 33): ícone genérico no lugar da foto.
function CardsFalha({ kpis }) {
  const principais = kpis.filter((k) => !k.resto)
  const resto = kpis.find((k) => k.resto)
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
        {principais.map((k) => (
          <div key={k.rotulo} className="border border-gray-200 shadow-[3px_3px_0_rgba(31,56,100,0.15)]">
            <div className="flex items-stretch">
              <div className="flex-1 bg-white px-2.5 py-1 text-xs font-bold text-navy flex items-center">
                {k.rotulo}
              </div>
              <div className="bg-navy text-white px-3 py-1 text-sm font-extrabold tabular-nums flex items-center">
                {fmtNumero(k.valor)}
              </div>
            </div>
            <div className="bg-slate-50 flex items-center justify-center py-5 text-navy/70">
              <IconeGenerico nome={ICONE_FALHA[k.rotulo] || 'grade'} className="w-14 h-14" />
            </div>
          </div>
        ))}
      </div>
      {resto && (
        <div className="w-full md:w-52 shrink-0 border border-navy shadow-[2px_2px_0_rgba(31,56,100,0.25)] md:mt-10">
          <div className="bg-white px-2.5 py-1 text-xs font-bold text-navy text-center">
            {resto.rotulo}
          </div>
          <div className="bg-navy text-white px-3 py-1.5 text-lg font-extrabold tabular-nums text-center">
            {fmtNumero(resto.valor)}
          </div>
        </div>
      )}
    </div>
  )
}

// Slide 18: barras por subprefeitura + painel de regiões com mapa genérico.
function CorpoRegioes({ slide }) {
  const porSub = slide.detalhe || []
  return (
    <div className="flex flex-col md:flex-row gap-3 items-start">
      <div className="flex-1 min-w-0 w-full">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={porSub} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="nome" tick={{ ...EIXO, fontSize: 9 }} interval={0} angle={-60} textAnchor="end" height={40} />
            <YAxis tick={EIXO} tickFormatter={fmtNumero} />
            <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
            <Bar dataKey="valor" name="Processos" fill={NAVY} radius={[3, 3, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full md:w-60 shrink-0 flex flex-col items-center gap-2">
        <div className="text-navy/80">
          <MapaGenericoSP className="w-28 h-36" />
        </div>
        <div className="w-full space-y-1.5">
          {(slide.dados || []).map((r) => (
            <div key={r.nome} className="flex items-stretch border border-navy shadow-[2px_2px_0_rgba(31,56,100,0.25)]">
              <div className="bg-navy text-white px-2 py-1 text-[11px] font-extrabold uppercase flex items-center min-w-[74px]">
                {r.nome}
              </div>
              <div className="flex-1 bg-white px-2 py-1 text-xs font-bold text-navy flex items-center justify-between">
                <span className="tabular-nums">{fmtNumero(r.valor)}</span>
                <span className="text-gray-500">{Math.round(r.pct)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Slides institucionais (capa, timeline, quadros) ────────────────────── */

function Capa({ slide }) {
  return (
    <div className="relative flex min-h-[300px] bg-[#f2f2f0] overflow-hidden">
      <div className="flex-1 flex flex-col justify-center py-12 z-10">
        <div className="px-8 text-5xl sm:text-6xl font-black text-gray-900 tracking-tight uppercase">
          {slide.texto}
        </div>
        {slide.sub && (
          <div className="bg-navy text-white text-base sm:text-lg font-medium px-8 py-3 mt-5 w-[85%]">
            {slide.sub}
          </div>
        )}
      </div>
      <div className="hidden sm:flex w-2/5 items-center justify-center text-navy">
        <MapaGenericoSP />
      </div>
    </div>
  )
}

function Timeline({ slide }) {
  const blocos = slide.blocos || []
  return (
    <div>
      {/* Barra 01–05 (a "linha do tempo" do PDF) */}
      <div className="flex rounded-full overflow-hidden mb-4">
        {blocos.map((b, i) => (
          <div
            key={b.num}
            className="flex-1 text-center py-1.5 text-sm font-extrabold"
            style={{
              backgroundColor: i % 2 === 0 ? NAVY : AZUL_CLARO,
              color: i % 2 === 0 ? '#fff' : NAVY,
            }}
          >
            {b.num}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {blocos.map((b) => (
          <div key={b.num} className="flex flex-col">
            <div className="bg-slate-200 text-navy text-[11px] font-bold px-2 py-1.5 text-center leading-snug">
              {b.titulo}
            </div>
            <div className="bg-navy text-white text-[10px] px-2 py-2 leading-snug flex-1">
              {b.texto}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Quadros dos slides institucionais (decretos, fluxos, economia, metragem).
function Quadros({ slide }) {
  const blocos = slide.blocos || []
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {blocos.map((b, i) => {
        const full = b.full ? 'md:col-span-2' : ''
        if (b.estilo === 'amarelo') {
          return (
            <div
              key={i}
              className={`${full} bg-yellow-200 border border-yellow-400 shadow-[3px_3px_0_rgba(0,0,0,0.15)] px-4 py-3 text-center text-base sm:text-lg font-extrabold text-red-900`}
            >
              {b.texto}
            </div>
          )
        }
        const navyish = b.estilo === 'navy' || b.estilo === 'vermelho'
        const corCab = b.estilo === 'vermelho' ? 'bg-red text-white' : 'bg-navy text-white'
        if (navyish) {
          return (
            <div key={i} className={`${full} border border-gray-300 shadow-[3px_3px_0_rgba(31,56,100,0.15)]`}>
              {b.titulo && (
                <div className={`${corCab} px-3 py-2 text-center`}>
                  <div className="text-sm font-extrabold uppercase leading-snug">{b.titulo}</div>
                  {b.sub && <div className="text-[11px] font-semibold opacity-80 mt-0.5">{b.sub}</div>}
                </div>
              )}
              {b.texto && (
                <div className="bg-white px-3 py-2.5 text-xs text-gray-700 leading-relaxed">{b.texto}</div>
              )}
              {b.linhas && (
                <div className="bg-white px-3 py-2.5 space-y-1.5">
                  {b.linhas.map((l) => (
                    <div key={l.rotulo}>
                      <div className={`${corCab} text-[11px] font-bold uppercase px-2 py-0.5 text-center`}>
                        {l.rotulo}
                      </div>
                      <div className="border border-gray-300 bg-white text-navy text-base font-extrabold text-center py-1 tabular-nums">
                        {l.valor}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }
        // estilo 'claro' (caixas cinza-azuladas dos fluxos)
        return (
          <div
            key={i}
            className={`${full} bg-slate-200/80 px-4 py-3 text-center shadow-[3px_3px_0_rgba(31,56,100,0.12)]`}
          >
            {b.titulo && (
              <div className="text-sm font-extrabold text-navy uppercase leading-snug mb-1">{b.titulo}</div>
            )}
            {b.texto && <div className="text-xs text-gray-700 leading-relaxed">{b.texto}</div>}
          </div>
        )
      })}
    </div>
  )
}

/* ── Corpo do slide conforme o tipo resolvido ───────────────────────────── */
function CorpoSlide({ slide }) {
  switch (slide.tipo) {
    case 'capa':
      return <Capa slide={slide} />
    case 'timeline':
      return <Timeline slide={slide} />
    case 'quadros':
      return <Quadros slide={slide} />
    case 'texto':
      return (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-slate-50 rounded-md p-4">
          {slide.texto}
        </p>
      )
    case 'kpis':
      return <CartoesKpi kpis={slide.kpis || []} />
    case 'cards_falha':
      return <CardsFalha kpis={slide.kpis || []} />
    case 'regioes':
      return <CorpoRegioes slide={slide} />
    case 'pizza': {
      const total = (slide.dados || []).reduce((s, d) => s + (d.valor || 0), 0)
      return (
        <CorpoComLateral slide={slide}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DonutComparativo dados={slide.dados || []} cores={CORES_DONUT} total={total} />
            {slide.detalhe && (
              <DonutComparativo
                titulo="Solucionados × Em andamento (dentro das NC)"
                dados={slide.detalhe}
                cores={[NAVY, VERMELHO]}
              />
            )}
          </div>
        </CorpoComLateral>
      )
    }
    case 'pizzas_viaria':
      return <PizzasViaria dados={slide.dados || []} />
    case 'barra':
    case 'barra_dupla':
      return (
        <CorpoComLateral slide={slide}>
          <GraficoBarras dados={slide.dados || []} colunas={slide.colunas} />
        </CorpoComLateral>
      )
    case 'barra_horizontal':
      return (
        <CorpoComLateral slide={slide}>
          <GraficoBarras dados={slide.dados || []} colunas={slide.colunas} horizontal />
        </CorpoComLateral>
      )
    case 'linha_anual':
      return (
        <CorpoComLateral slide={slide}>
          <GraficoLinhas
            dados={slide.dados || []}
            eixoX="ano"
            series={[{ key: 'valor', label: slide.titulo, cor: NAVY }]}
          />
        </CorpoComLateral>
      )
    case 'linha_mensal':
      return (
        <CorpoComLateral slide={slide}>
          {slide.painelAnos && slide.painelPos === 'topo' && (
            <FaixaAnosTopo painel={slide.painelAnos} />
          )}
          <GraficoLinhas
            dados={slide.dados || []}
            eixoX="mes"
            series={(slide.series || []).map((ano, i) => ({
              key: ano,
              label: ano,
              cor: CORES_ANO[i % CORES_ANO.length],
            }))}
          />
        </CorpoComLateral>
      )
    case 'linha_trimestral':
      return (
        <CorpoComLateral slide={slide}>
          <GraficoLinhas
            dados={slide.dados || []}
            eixoX="periodo"
            dominioPct
            series={[
              { key: 'pct_nc', label: LABEL_SERIE.pct_nc, cor: VERMELHO },
              { key: 'pct_leg', label: LABEL_SERIE.pct_leg, cor: AZUL_MEDIO },
            ]}
          />
        </CorpoComLateral>
      )
    default:
      return (
        <p className="text-sm text-gray-500 italic">
          Tipo de slide &quot;{slide.tipo}&quot; ainda não suportado.
        </p>
      )
  }
}

export default function SlideRenderer({ slide }) {
  const slideRef = useRef(null)
  const [baixandoImg, setBaixandoImg] = useState(false)
  const cat = slide.catInfo
  const ehCapa = slide.tipo === 'capa'

  async function baixarImagem() {
    if (!slideRef.current || baixandoImg) return
    setBaixandoImg(true)
    try {
      const png = await toPng(slideRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        // Elementos marcados não entram na imagem.
        filter: (node) => !(node.dataset && node.dataset.noExport !== undefined),
      })
      const a = document.createElement('a')
      const nomeKebab = slide.titulo
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      a.href = png
      a.download = `slide-${String(slide.n).padStart(2, '0')}-${nomeKebab}.png`
      a.click()
    } catch (e) {
      console.error('Falha ao gerar a imagem do slide', e)
    } finally {
      setBaixandoImg(false)
    }
  }

  return (
    <section
      id={`slide-${slide.n}`}
      className={`bg-white rounded-lg shadow-card border-2 ${cat.borda} overflow-hidden scroll-mt-4`}
    >
      <div className={`h-1.5 ${cat.faixa}`} />

      {/* Meta do card (fora da imagem exportada) */}
      <div className="flex items-center justify-between gap-2 px-4 pt-2.5 pb-1.5 border-b border-gray-100">
        <div className="min-w-0">
          <span className="text-xs font-bold text-navy">
            Slide {slide.n} — {slide.titulo}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 ml-2">
            {cat.icone} {cat.rotulo}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {slide.categoria === 'dados' && slide.dados && slide.colunas && (
            <BotaoExportarGrafico
              dados={slide.dados}
              colunas={slide.colunas}
              titulo={`Slide ${slide.n} — ${slide.titulo}`}
              modulo="relatorio"
            />
          )}
          <button
            onClick={baixarImagem}
            disabled={baixandoImg}
            title="Baixar imagem do slide (PNG)"
            className="p-1 rounded text-gray-400 hover:text-navy hover:bg-grey-bg transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
        </div>
      </div>

      {/* Corpo do slide (a "folha" 16:9 que vira o PNG) */}
      <div ref={slideRef} className={`bg-white ${ehCapa ? '' : 'p-4'}`}>
        {!ehCapa && (slide.tituloInterno || slide.subtitulo || slide.contexto || slide.painelTexto) && (
          <CabecalhoSlide slide={slide} />
        )}

        {slide.aviso && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-no-export>
            ⚠️ {slide.aviso}
          </div>
        )}
        {slide.categoria === 'futuro' && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-no-export>
            🟡 Este slide depende de dados que ainda não existem no sistema —
            os valores abaixo replicam a apresentação original e serão
            calculados por um módulo futuro.
          </div>
        )}

        <CorpoSlide slide={slide} />

        {slide.manuais && slide.categoria === 'dados' && slide.tipo !== 'kpis' && (
          <div className="mt-3 text-[11px] text-gray-500" data-no-export>
            ✍️ Complementos manuais deste slide (não existem no banco):{' '}
            {slide.manuais.join(' · ')}
          </div>
        )}
      </div>
    </section>
  )
}
