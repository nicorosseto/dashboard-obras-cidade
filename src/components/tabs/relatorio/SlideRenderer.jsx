// Renderiza UM slide do módulo Apresentação a partir do resultado de
// resolverDadosSlide() (src/lib/relatorio.js). O contorno do card identifica a
// categoria (dados = teal / texto = cinza / futuro = âmbar tracejado) e todo
// slide exibe "Slide {n} — {título}" para o usuário localizar no PowerPoint.
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
import { KpiCard } from '../emerg/shared.jsx'
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

// Rótulos amigáveis por chave de série (legendas dos gráficos).
const LABEL_SERIE = {
  valor: 'Quantidade',
  total: 'Total',
  emergencia: 'Emergência',
  corretiva: 'Manut. Corretiva',
  laudos: 'Laudos Técnicos',
  nao_conformidades: 'Não Conformidades',
  em_andamento: 'Em andamento',
  encerradas: 'Encerradas',
  informadas: 'Informadas',
  pct_leg: '% Legislação Atendida',
  pct_nc: '% Não Atenderam',
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

function GraficoBarras({ dados, colunas, horizontal }) {
  const chaves = chavesDeSerie(colunas, dados)
  const eixoNome = dados?.[0]?.nome !== undefined ? 'nome' : 'ano'
  return (
    <ResponsiveContainer width="100%" height={horizontal ? Math.max(220, dados.length * 34) : 260}>
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
    <ResponsiveContainer width="100%" height={280}>
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
            <DonutComparativo
              titulo={g.nome}
              dados={fatias}
              cores={[NAVY, VERMELHO]}
              total={g.total}
            />
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

function Kpis({ kpis }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {kpis.map((k) =>
        k.manual ? (
          <div
            key={k.rotulo}
            className="bg-slate-50 rounded-md border border-dashed border-slate-300 px-3 py-2.5"
            title="Este dado não existe no banco — preencher manualmente na apresentação final."
          >
            <div className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold truncate">
              {k.rotulo}
            </div>
            <div className="text-xl font-bold mt-0.5 text-gray-400">—</div>
            <div className="text-[9px] text-gray-400">preencher manualmente</div>
          </div>
        ) : (
          <KpiCard key={k.rotulo} label={k.rotulo} valor={k.valor} cor={NAVY} destaque />
        )
      )}
    </div>
  )
}

// Corpo do slide conforme o tipo resolvido.
function CorpoSlide({ slide }) {
  switch (slide.tipo) {
    case 'capa':
    case 'divisoria':
      return (
        <div className="bg-navy rounded-md py-14 px-6 text-center">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
            {slide.texto}
          </div>
        </div>
      )
    case 'texto':
      return (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-slate-50 rounded-md p-4">
          {slide.texto}
        </p>
      )
    case 'kpis':
      return <Kpis kpis={slide.kpis || []} />
    case 'pizza': {
      const total = (slide.dados || []).reduce((s, d) => s + (d.valor || 0), 0)
      return (
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
      )
    }
    case 'pizzas_viaria':
      return <PizzasViaria dados={slide.dados || []} />
    case 'barra':
    case 'barra_dupla':
      return <GraficoBarras dados={slide.dados || []} colunas={slide.colunas} />
    case 'barra_horizontal':
      return <GraficoBarras dados={slide.dados || []} colunas={slide.colunas} horizontal />
    case 'linha_anual':
      return (
        <GraficoLinhas
          dados={slide.dados || []}
          eixoX="ano"
          series={[{ key: 'valor', label: slide.titulo, cor: NAVY }]}
        />
      )
    case 'linha_mensal':
      return (
        <GraficoLinhas
          dados={slide.dados || []}
          eixoX="mes"
          series={(slide.series || []).map((ano, i) => ({
            key: ano,
            label: ano,
            cor: CORES_ANO[i % CORES_ANO.length],
          }))}
        />
      )
    case 'linha_trimestral':
      return (
        <GraficoLinhas
          dados={slide.dados || []}
          eixoX="periodo"
          dominioPct
          series={[
            { key: 'pct_leg', label: LABEL_SERIE.pct_leg, cor: AZUL_MEDIO },
            { key: 'pct_nc', label: LABEL_SERIE.pct_nc, cor: VERMELHO },
          ]}
        />
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
  const cardRef = useRef(null)
  const [baixandoImg, setBaixandoImg] = useState(false)
  const cat = slide.catInfo

  async function baixarImagem() {
    if (!cardRef.current || baixandoImg) return
    setBaixandoImg(true)
    try {
      const png = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        // Botões de ação não entram na imagem.
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
      ref={cardRef}
      className={`bg-white rounded-lg shadow-card border-2 ${cat.borda} overflow-hidden scroll-mt-4`}
    >
      <div className={`h-1.5 ${cat.faixa}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-bold text-navy">
              Slide {slide.n} — {slide.titulo}
            </h2>
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
              {cat.icone} {cat.rotulo}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0" data-no-export>
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

        {slide.aviso && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            ⚠️ {slide.aviso}
          </div>
        )}
        {slide.categoria === 'futuro' && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            🟡 Este slide depende de dados que ainda não existem no sistema —
            será ativado por um módulo futuro. Por ora, use o conteúdo da
            apresentação original.
          </div>
        )}

        <CorpoSlide slide={slide} />

        {slide.manuais && slide.categoria === 'dados' && slide.tipo !== 'kpis' && (
          <div className="mt-3 text-[11px] text-gray-500">
            ✍️ Complementos manuais deste slide (não existem no banco):{' '}
            {slide.manuais.join(' · ')}
          </div>
        )}
      </div>
    </section>
  )
}
