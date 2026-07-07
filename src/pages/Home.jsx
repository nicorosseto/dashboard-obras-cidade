import { fmtNumero, fmtDataHora, fmtDataSP } from '../lib/aggregations.js'
import { useState, useCallback } from 'react'

function IconMap({ className = 'w-10 h-10' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <line x1="9" y1="4" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="20" />
    </svg>
  )
}

function IconClipboard({ className = 'w-10 h-10' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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

function IconAlert({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconCalendar({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconClock({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconArrow({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function IconSettings({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

const MSG_CARREGANDO = 'Aguarde — os dados ainda estão sendo carregados. Em breve todos os módulos estarão disponíveis.'

function ModuleCard({ gradientFrom, gradientTo, icon, titulo, descricao, ultimaAtualizacao, onClick, carregando, onMouseMove, onMouseLeave }) {
  return (
    <button
      type="button"
      onClick={carregando ? undefined : onClick}
      onMouseMove={carregando ? onMouseMove : undefined}
      onMouseLeave={carregando ? onMouseLeave : undefined}
      className={`group w-full text-left rounded-xl shadow-card overflow-hidden transition-all duration-200 ${
        carregando
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]'
      }`}
      style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
    >
      <div className="relative p-7 h-full flex flex-col min-h-[260px]">
        {/* Efeito glare */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-56 h-56 bg-white rounded-full blur-3xl translate-x-24 -translate-y-24" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white rounded-full blur-3xl -translate-x-24 translate-y-24" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Ícone */}
          <div className="bg-white/20 backdrop-blur-xs p-3 rounded-2xl w-fit mb-5 text-white">
            {icon}
          </div>

          {/* Título */}
          <h3 className="text-white text-xl font-bold uppercase tracking-wide mb-2">
            {titulo}
          </h3>

          {/* Descrição */}
          <p className="text-white/80 text-sm leading-snug flex-1 mb-5">
            {descricao}
          </p>

          {/* Chip de última atualização */}
          {ultimaAtualizacao && (
            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1.5 w-fit mb-4">
              <IconClock className="w-3 h-3 text-white/70" />
              <span className="text-white/80 text-xs">Atualizado em {ultimaAtualizacao}</span>
            </div>
          )}

          {/* Link de acesso */}
          <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
            <span>Acessar Dashboard</span>
            <span className="transition-transform duration-200 group-hover:translate-x-1.5">
              <IconArrow />
            </span>
          </div>
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
  onAbrirConfiguracoes,
  onSignOut,
  sistemaGeoCarregando = false,
  geoProgresso = { carregadas: 0, total: 0 },
  emgVencidas48h = 0,
  totalEmergencias = 0,
}) {
  const semModulos = !temFisc && !temGeo && !onAbrirEmergencias && !temCruzamento && !temRelatorio
  const nModCards = [temGeo, temFisc, temCruzamento, temRelatorio].filter(Boolean).length

  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0 })
  const handleMouseMove = useCallback((e) => {
    setTooltip({ visible: true, x: e.clientX, y: e.clientY })
  }, [])
  const handleMouseLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }))
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

  const dataGeo = datasModulos.sistemaGeo ? fmtDataSP(datasModulos.sistemaGeo) : null
  const dataFisc = datasModulos.fiscalizacoes ? fmtDataSP(datasModulos.fiscalizacoes) : null
  const dataEmg = datasModulos.emergencias ? fmtDataSP(datasModulos.emergencias) : null

  // KPI "Última Atualização" = o mais recente dos snapshots (com hora)
  const maxSnapshotTs = [datasModulos.sistemaGeo, datasModulos.fiscalizacoes, datasModulos.emergencias]
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
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-navy text-white flex items-center justify-center shrink-0">
            <IconMap className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-navy uppercase tracking-tight leading-tight">
              Dashboard Obras
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 leading-tight">
              Departamento de Controle e Uso das Vias Públicas
              <span className="hidden sm:inline"> | Secretaria das Subprefeituras - SMSUB</span>
            </p>
          </div>
          <div className="shrink-0">
            <img
              src="/logos/obras.png"
              alt="OBRAS"
              className="h-12 w-auto object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
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
          <p className="text-gray-600 text-sm mt-0.5">Selecione uma área para visualizar os dados e relatórios</p>
        </div>

        {/* Usuário sem nenhum módulo */}
        {semModulos && (
          <div className="bg-white rounded-xl shadow-card p-8 text-center max-w-md mx-auto">
            <p className="text-sm font-semibold text-navy mb-2">
              Seu acesso ainda não tem módulos liberados
            </p>
            <p className="text-xs text-gray-500">
              Procure o administrador do sistema para receber um perfil de acesso com os módulos do seu trabalho.
            </p>
          </div>
        )}

        {/* Cards dos módulos principais */}
        {(temGeo || temFisc || temCruzamento || temRelatorio) && (
          <div className={`grid gap-6${nModCards >= 4 ? ' sm:grid-cols-2 lg:grid-cols-4' : nModCards === 3 ? ' sm:grid-cols-2 lg:grid-cols-3' : nModCards === 2 ? ' sm:grid-cols-2' : ''}`}>
            {temGeo && (
              <ModuleCard
                gradientFrom="#1F3864"
                gradientTo="#2E4F7F"
                icon={<IconMap />}
                titulo="Dados Sistema Geo"
                descricao="Visualização e acompanhamento das obras registradas no sistema Sistema Geo por subprefeitura, permissionária e status."
                ultimaAtualizacao={dataGeo}
                onClick={() => onNavigate('sistemaGeo')}
                carregando={sistemaGeoCarregando}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            )}
            {temFisc && (
              <ModuleCard
                gradientFrom="#064e3b"
                gradientTo="#065f46"
                icon={<IconClipboard />}
                titulo="Fiscalização"
                descricao="Acompanhamento das vistorias e laudos realizados pela fiscalização da OBRAS, com análise de não conformidades."
                ultimaAtualizacao={dataFisc}
                onClick={() => onNavigate('fiscalizacao')}
                carregando={sistemaGeoCarregando}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            )}
            {temCruzamento && (
              <ModuleCard
                gradientFrom="#4f1d96"
                gradientTo="#6d28d9"
                icon={<IconMerge />}
                titulo="Análise Integrada"
                descricao="Reconcilia as bases de Fiscalização e Sistema Geo — identifica o que está nas duas, o que está só em uma delas e divergências de dados."
                ultimaAtualizacao={dataFisc ?? dataGeo}
                onClick={() => onNavigate('cruzamento')}
                carregando={sistemaGeoCarregando}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            )}
            {temRelatorio && (
              <ModuleCard
                gradientFrom="#0f766e"
                gradientTo="#14b8a6"
                icon={<IconSlides />}
                titulo="Apresentação"
                descricao="Prévia do relatório mensal em slides, espelhando a apresentação institucional, com download dos dados e da imagem de cada slide."
                ultimaAtualizacao={dataGeo}
                onClick={() => onNavigate('relatorio')}
                carregando={sistemaGeoCarregando}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            )}
          </div>
        )}

        {/* Card de Emergências (largura total) */}
        {onAbrirEmergencias && (
          <button
            type="button"
            onClick={sistemaGeoCarregando ? undefined : onAbrirEmergencias}
            onMouseMove={sistemaGeoCarregando ? handleMouseMove : undefined}
            onMouseLeave={sistemaGeoCarregando ? handleMouseLeave : undefined}
            className={`group w-full text-left bg-white rounded-xl shadow-card overflow-hidden transition-all duration-200 ${
              sistemaGeoCarregando
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            <div className="relative flex flex-col md:flex-row md:items-center gap-5 p-6">
              {/* Barra lateral âmbar */}
              <div className="hidden md:block absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-xl" />

              {/* Ícone */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shrink-0 md:ml-3 text-amber-500">
                <IconAlert />
              </div>

              {/* Texto */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1.5">
                  <h3 className="text-navy font-bold text-lg">Emergências</h3>
                  <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-0.5 rounded-full border border-amber-200 font-medium">
                    Alta prioridade
                  </span>
                  {emgVencidas48h > 0 && (
                    <span className="bg-red text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {emgVencidas48h.toLocaleString('pt-BR')} vencida{emgVencidas48h !== 1 ? 's' : ''} 48h
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm leading-snug">
                  Monitoramento das obras de emergência em aberto. Identifique rapidamente os protocolos
                  com maior tempo em aberto e priorize as intervenções críticas.
                  {totalEmergencias > 0 && (
                    <span className="block mt-1 text-xs text-gray-400">
                      {totalEmergencias.toLocaleString('pt-BR')} registros carregados
                    </span>
                  )}
                </p>
              </div>

              {/* Lado direito */}
              <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                {dataEmg && (
                  <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-1.5">
                    <IconClock className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-500 text-xs">Atualizado em {dataEmg}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-navy/70 text-sm font-semibold group-hover:text-navy transition-colors">
                  <span>Acessar</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    <IconArrow className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </button>
        )}

        {/* KPIs */}
        {(temGeo || temFisc) && (
          <div className="flex flex-col sm:flex-row gap-4">
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

      {/* Footer */}
      <footer className="bg-white border-t border-grey-line py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            OBRAS · Subprefeituras · Prefeitura de São Paulo
          </span>
          {onAbrirConfiguracoes && (
            <button
              onClick={onAbrirConfiguracoes}
              className="flex items-center gap-1.5 text-xs text-navy/60 hover:text-navy transition-colors"
            >
              <IconSettings />
              Configurações
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
