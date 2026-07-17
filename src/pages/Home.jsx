import { fmtNumero, fmtDataHora, fmtDataSP } from '../lib/aggregations.js'
import { useState, useCallback } from 'react'
import { NAVY, RED } from '../lib/cores.js'
import BotaoTour from '../components/tour/BotaoTour.jsx'
import Rodape from '../components/Rodape.jsx'

function IconMap({ className = 'w-10 h-10' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <line x1="9" y1="4" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="20" />
    </svg>
  )
}

function IconClipboard({ className = 'w-10 h-10' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M9 3v2h6V3" />
      <line x1="9" y1="11" x2="15" y2="11" />
      <line x1="9" y1="15" x2="15" y2="15" />
      <line x1="9" y1="7" x2="13" y2="7" />
    </svg>
  )
}

function IconMerge({ className = 'w-10 h-10' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M6 8v8" />
      <path d="M18 8a6 6 0 01-6 6H8" />
    </svg>
  )
}

function IconSlides({ className = 'w-10 h-10' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M9 8.5h8" />
      <path d="M9 12h5" />
      <path d="M6 8.5h.01" />
      <path d="M6 12h.01" />
      <path d="M12 16v3" />
      <path d="M8.5 21h7" />
    </svg>
  )
}

function IconTicket({ className = 'w-10 h-10' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
      <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" />
    </svg>
  )
}

function IconAlert({ className = 'w-8 h-8' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconCalendar({ className = 'w-4 h-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconClock({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconArrow({ className = 'w-4 h-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function IconSettings({ className = 'w-4 h-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

const MSG_CARREGANDO =
  'Aguarde — os dados ainda estão sendo carregados. Em breve todos os módulos estarão disponíveis.'

// Linha de módulo — formato único para todos os módulos da Home (substitui o
// grid de cards + o card largo de Emergências que era só exceção). Uma lista
// vertical cresce sem quebrar layout a cada módulo novo: nunca mais precisa
// recalcular colunas/breakpoints (lição de 16/07/2026, pedido do usuário).
// A cor do módulo migrou do bloco inteiro para uma faixa fina + o ícone.
function ModuleRow({
  accent,
  icon,
  titulo,
  subtitulo,
  descricao,
  badges,
  ultimaAtualizacao,
  onClick,
  carregando,
  onMouseMove,
  onMouseLeave,
  dataTour,
}) {
  return (
    <button
      type="button"
      data-tour={dataTour}
      onClick={carregando ? undefined : onClick}
      onMouseMove={carregando ? onMouseMove : undefined}
      onMouseLeave={carregando ? onMouseLeave : undefined}
      className={`group w-full flex items-stretch text-left bg-white rounded-lg shadow-card overflow-hidden transition-all duration-200 ${
        carregando
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:shadow-lg hover:-translate-y-0.5'
      }`}
    >
      <span className="w-1 shrink-0" style={{ background: accent }} />
      {/* grid (não flex) para as 4 "colunas" ficarem alinhadas entre TODAS as
          linhas — largura fixa por coluna, em vez de acompanhar o conteúdo
          de cada módulo (o que fazia "Atualizado em" colidir com "Acessar"
          quando a data quebrava linha). Achado de 16/07/2026. */}
      <div className="flex-1 flex flex-col gap-3 py-4 px-5 md:grid md:grid-cols-[240px_1fr_190px_100px] md:items-center md:gap-5">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 text-white"
            style={{ background: accent }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-navy font-bold text-sm leading-tight truncate">
              {titulo}
            </h3>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">
              {subtitulo}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-gray-500 text-[13px] leading-snug">{descricao}</p>
          {badges?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.className}`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="md:justify-self-end">
          {ultimaAtualizacao && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400 whitespace-nowrap">
              <IconClock className="w-3 h-3 shrink-0" /> Atualizado em{' '}
              {ultimaAtualizacao}
            </span>
          )}
        </div>

        <div className="md:justify-self-end">
          <span className="flex items-center gap-1 text-navy/70 text-xs font-semibold whitespace-nowrap group-hover:text-navy transition-colors">
            Acessar
            <span className="transition-transform duration-200 group-hover:translate-x-1">
              <IconArrow className="w-3.5 h-3.5" />
            </span>
          </span>
        </div>
      </div>
    </button>
  )
}

function KPI({ label, valor, icon }) {
  return (
    <div className="bg-white rounded-xl shadow-card px-5 py-4 flex items-center gap-4 flex-1">
      {icon && (
        <div className="bg-navy/10 p-2.5 rounded-lg shrink-0 text-navy">
          {icon}
        </div>
      )}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
          {label}
        </div>
        <div className="text-2xl font-bold text-navy mt-0.5">{valor}</div>
      </div>
    </div>
  )
}

export default function Home({
  onNavigate,
  totalProtocolos,
  totalVistorias,
  ultimaAtualizacao,
  datasModulos = { sistemaGeo: null, fiscalizacoes: null, emergencias: null },
  onAbrirEmergencias,
  temFisc = true,
  temGeo = true,
  temCruzamento = false,
  temRelatorio = false,
  temMultas = false,
  onAbrirConfiguracoes,
  onSignOut,
  onIniciarTour,
  sistemaGeoCarregando = false,
  geoProgresso = { carregadas: 0, total: 0 },
  emgVencidas48h = 0,
}) {
  const semModulos =
    !temFisc &&
    !temGeo &&
    !onAbrirEmergencias &&
    !temCruzamento &&
    !temRelatorio &&
    !temMultas

  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0 })
  const handleMouseMove = useCallback((e) => {
    setTooltip({ visible: true, x: e.clientX, y: e.clientY })
  }, [])
  const handleMouseLeave = useCallback(() => {
    setTooltip((t) => ({ ...t, visible: false }))
  }, [])

  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const ultimaAtualizacaoFmt = ultimaAtualizacao
    ? fmtDataHora(ultimaAtualizacao)
    : null

  const dataGeo = datasModulos.sistemaGeo
    ? fmtDataSP(datasModulos.sistemaGeo)
    : null
  const dataFisc = datasModulos.fiscalizacoes
    ? fmtDataSP(datasModulos.fiscalizacoes)
    : null
  const dataEmg = datasModulos.emergencias
    ? fmtDataSP(datasModulos.emergencias)
    : null

  // KPI "Última Atualização" = o mais recente dos snapshots (com hora)
  const maxSnapshotTs =
    [
      datasModulos.sistemaGeo,
      datasModulos.fiscalizacoes,
      datasModulos.emergencias,
    ]
      .filter(Boolean)
      .sort()
      .at(-1) ?? ultimaAtualizacao

  return (
    <div className="min-h-screen bg-grey-bg flex flex-col">
      {/* Tooltip flutuante de carregamento — renderizado via fixed para seguir o cursor */}
      {sistemaGeoCarregando && tooltip.visible && (
        <div
          className="fixed z-50 pointer-events-none max-w-xs bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl leading-snug"
          style={{ left: tooltip.x + 16, top: tooltip.y + 12 }}
        >
          {MSG_CARREGANDO}
        </div>
      )}
      {/* Header */}
      <header className="bg-white border-b border-grey-line">
        <div
          className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4"
          data-tour="home-cabecalho"
        >
          <div className="w-12 h-12 rounded-xl bg-navy text-white flex items-center justify-center shrink-0">
            <IconMap className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-navy uppercase tracking-tight leading-tight">
              Dashboard Obras
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 leading-tight">
              Departamento de Controle e Uso das Vias Públicas
              <span className="hidden sm:inline">
                {' '}
                | Secretaria das Subprefeituras - SMSUB
              </span>
            </p>
          </div>
          <div className="shrink-0">
            <img
              src="/logos/obras.png"
              alt="OBRAS"
              className="h-12 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
          {onIniciarTour && (
            <BotaoTour onClick={onIniciarTour} dataTour="home-btn-tour" />
          )}
          {onSignOut && (
            <button
              onClick={onSignOut}
              data-tour="home-sair"
              className="shrink-0 text-xs text-navy/70 hover:text-navy border border-grey-line hover:border-navy px-2 py-1 rounded-sm transition-colors"
            >
              Sair
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
        {/* Saudação + data */}
        <div>
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <IconCalendar />
            <span className="text-sm capitalize">{dataAtual}</span>
          </div>
          <h2 className="text-2xl font-bold text-navy">Bem-vindo ao Sistema</h2>
          <p className="text-gray-600 text-sm mt-0.5">
            Selecione uma área para visualizar os dados e relatórios
          </p>
        </div>

        {/* Usuário sem nenhum módulo */}
        {semModulos && (
          <div className="bg-white rounded-xl shadow-card p-8 text-center max-w-md mx-auto">
            <p className="text-sm font-semibold text-navy mb-2">
              Seu acesso ainda não tem módulos liberados
            </p>
            <p className="text-xs text-gray-500">
              Procure o administrador do sistema para receber um perfil de
              acesso com os módulos do seu trabalho.
            </p>
          </div>
        )}

        {/* Lista de módulos — uma linha por módulo, cresce sem quebrar layout */}
        {(temGeo ||
          temFisc ||
          temCruzamento ||
          temRelatorio ||
          temMultas ||
          onAbrirEmergencias) && (
          <div className="flex flex-col gap-3">
            {temGeo && (
              <ModuleRow
                accent={NAVY}
                icon={<IconMap className="w-5 h-5" />}
                titulo="Dados Sistema Geo"
                subtitulo="Obras de permissionárias"
                dataTour="home-card-sistema-geo"
                descricao="Visualização e acompanhamento das obras registradas no sistema Sistema Geo por subprefeitura, permissionária e status."
                ultimaAtualizacao={dataGeo}
                onClick={() => onNavigate('sistemaGeo')}
                carregando={sistemaGeoCarregando}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            )}
            {temFisc && (
              <ModuleRow
                accent="#065f46"
                icon={<IconClipboard className="w-5 h-5" />}
                titulo="Fiscalização"
                subtitulo="Vistorias e laudos"
                dataTour="home-card-fiscalizacao"
                descricao="Acompanhamento das vistorias e laudos realizados pela fiscalização da OBRAS, com análise de não conformidades."
                ultimaAtualizacao={dataFisc}
                onClick={() => onNavigate('fiscalizacao')}
                carregando={sistemaGeoCarregando}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            )}
            {temCruzamento && (
              <ModuleRow
                accent="#6d28d9"
                icon={<IconMerge className="w-5 h-5" />}
                titulo="Análise Integrada"
                subtitulo="Fiscalização × Sistema Geo"
                dataTour="home-card-cruzamento"
                descricao="Reconcilia as bases de Fiscalização e Sistema Geo — identifica o que está nas duas, o que está só em uma delas e divergências de dados."
                ultimaAtualizacao={dataFisc ?? dataGeo}
                onClick={() => onNavigate('cruzamento')}
                carregando={sistemaGeoCarregando}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            )}
            {onAbrirEmergencias && (
              <ModuleRow
                accent="#b45309"
                icon={<IconAlert className="w-5 h-5" />}
                titulo="Emergências"
                subtitulo="Obras emergenciais"
                dataTour="home-card-emergencias"
                descricao="Monitoramento das obras de emergência em aberto. Identifique rapidamente os protocolos com maior tempo em aberto e priorize as intervenções críticas."
                badges={[
                  {
                    label: 'Alta prioridade',
                    className:
                      'bg-amber-100 text-amber-700 border border-amber-200',
                  },
                  ...(emgVencidas48h > 0
                    ? [
                        {
                          label: `${emgVencidas48h.toLocaleString('pt-BR')} vencida${emgVencidas48h !== 1 ? 's' : ''} 48h`,
                          className: 'bg-red text-white',
                        },
                      ]
                    : []),
                ]}
                ultimaAtualizacao={dataEmg}
                onClick={onAbrirEmergencias}
                carregando={sistemaGeoCarregando}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            )}
            {temRelatorio && (
              <ModuleRow
                accent="#0f766e"
                icon={<IconSlides className="w-5 h-5" />}
                titulo="Apresentação"
                subtitulo="Relatório mensal"
                dataTour="home-card-relatorio"
                descricao="Prévia do relatório mensal em slides, espelhando a apresentação institucional, com download dos dados e da imagem de cada slide."
                ultimaAtualizacao={dataGeo}
                onClick={() => onNavigate('relatorio')}
                carregando={sistemaGeoCarregando}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            )}
            {temMultas && (
              <ModuleRow
                accent={RED}
                icon={<IconTicket className="w-5 h-5" />}
                titulo="Multas"
                subtitulo="Penalidades CORBETT"
                dataTour="home-card-multas"
                descricao="Multas de processo sincronizadas da planilha de controle, já cruzadas com Sistema Geo e Fiscalização — inconsistências de preenchimento em destaque."
                ultimaAtualizacao={null}
                onClick={() => onNavigate('multas')}
                carregando={sistemaGeoCarregando}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            )}
          </div>
        )}

        {/* KPIs */}
        {(temGeo || temFisc) && (
          <div
            className="flex flex-col sm:flex-row gap-4"
            data-tour="home-kpis"
          >
            {temGeo && (
              <KPI
                label="Total de Protocolos"
                valor={(() => {
                  if (!sistemaGeoCarregando) return fmtNumero(totalProtocolos)
                  const { carregadas, total } = geoProgresso
                  const totalConfiavel = total > 0 && carregadas <= total
                  if (totalConfiavel) {
                    const pct = Math.round((carregadas / total) * 100)
                    return pct < 100 ? `${pct}% carregado` : 'Finalizando…'
                  }
                  // Count subestimado/0: mostra a contagem crescendo, nunca "0"
                  return carregadas > 0
                    ? `${carregadas.toLocaleString('pt-BR')} carregados`
                    : 'Carregando…'
                })()}
                icon={<IconMap className="w-5 h-5" />}
              />
            )}
            {temFisc && (
              <KPI
                label="Total de Vistorias"
                valor={fmtNumero(totalVistorias)}
                icon={<IconClipboard className="w-5 h-5" />}
              />
            )}
            <KPI
              label="Última Atualização"
              valor={maxSnapshotTs ? fmtDataHora(maxSnapshotTs) : '—'}
              icon={<IconClock className="w-5 h-5" />}
            />
          </div>
        )}
      </main>

      <Rodape>
        {onAbrirConfiguracoes && (
          <button
            onClick={onAbrirConfiguracoes}
            data-tour="home-configuracoes"
            className="flex items-center gap-1.5 text-xs text-navy/60 hover:text-navy transition-colors"
          >
            <IconSettings />
            Configurações
          </button>
        )}
      </Rodape>
    </div>
  )
}
