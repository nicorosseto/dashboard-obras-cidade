import PageTabs from './PageTabs.jsx'
import BotaoTour from './tour/BotaoTour.jsx'
import ModuleDropdown from './ModuleDropdown.jsx'
import { signOut, nomeExibicao } from '../lib/auth.js'
import { ABAS_CRUZAMENTO } from '../lib/abasCruzamento.js'
import { abasCruzamentoPermitidas } from '../lib/permissoes.js'
import { coresModulo } from '../lib/coresModulo.js'

function Logo({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      className="h-14 w-auto object-contain"
      onError={(e) => {
        e.currentTarget.style.display = 'none'
        const fb = e.currentTarget.nextElementSibling
        if (fb) fb.style.display = 'flex'
      }}
    />
  )
}

function LogoFallback({ texto }) {
  return (
    <div
      className="h-14 px-3 rounded-sm bg-white/15 items-center justify-center font-semibold text-xs uppercase tracking-wide"
      style={{ display: 'none' }}
    >
      {texto}
    </div>
  )
}

// Ícones dos módulos (mesmos da Home)
function IconMap() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <line x1="9" y1="4" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="20" />
    </svg>
  )
}

function IconClipboard() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M9 3v2h6V3" />
      <line x1="9" y1="11" x2="15" y2="11" />
      <line x1="9" y1="15" x2="15" y2="15" />
      <line x1="9" y1="7" x2="13" y2="7" />
    </svg>
  )
}

function IconMerge() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M6 8v8" />
      <path d="M18 8a6 6 0 01-6 6H8" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconSlides() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
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

function IconTicket() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
      <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

// Determina a configuração visual do módulo ativo
function getModuleConfig(
  secaoAtiva,
  paginaAtiva,
  mostrarEmergencias,
  mostrarRelatorio,
  mostrarMultas
) {
  const cor = coresModulo(
    secaoAtiva,
    paginaAtiva,
    mostrarEmergencias,
    mostrarRelatorio,
    mostrarMultas
  )
  if (mostrarMultas) return { label: 'Multas', icon: <IconTicket />, ...cor }
  if (mostrarRelatorio)
    return { label: 'Apresentação', icon: <IconSlides />, ...cor }
  if (mostrarEmergencias)
    return { label: 'Emergências', icon: <IconAlert />, ...cor }
  if (paginaAtiva === 5)
    return { label: 'Configurações', icon: <IconSettings />, ...cor }
  if (secaoAtiva === 'sistemaGeo' && paginaAtiva === 4)
    return { label: 'Análise Integrada', icon: <IconMerge />, ...cor }
  if (secaoAtiva === 'sistemaGeo')
    return { label: 'Sistema Geo', icon: <IconMap />, ...cor }
  return { label: 'Fiscalização', icon: <IconClipboard />, ...cor }
}

export default function Header({
  paginaAtiva,
  onPagina,
  user,
  onSignOut,
  showAdmin,
  secaoAtiva,
  onHome,
  onAlterarSenha,
  abasPermitidas,
  modules = [],
  onSelectModule = () => {},
  mostrarEmergencias = false,
  mostrarRelatorio = false,
  mostrarMultas = false,
  abaEmergAtiva = 'geral',
  onAbaEmerg = () => {},
  totalInformadasEmerg = 0,
  emgVencidas48h = 0,
  motivoPendentes = 0,
  abaMultasAtiva = 'geral',
  onAbaMultas = () => {},
  abaAdminAtiva = 0,
  onAbaAdmin = () => {},
  onAbrirConfiguracoes = () => {},
  onIniciarTour,
  abaCruzamentoAtiva = 'visao-geral',
  onAbaCruzamento = () => {},
  permissoes = null,
}) {
  async function handleSignOut() {
    try {
      await signOut(user)
    } catch {
      // ignora erros no logout
    }
    if (onSignOut) onSignOut()
  }

  const mod = getModuleConfig(
    secaoAtiva,
    paginaAtiva,
    mostrarEmergencias,
    mostrarRelatorio,
    mostrarMultas
  )
  const accentGradient = `linear-gradient(to right, ${mod.from}, ${mod.to})`
  const mostrarAbas =
    !mostrarEmergencias &&
    !mostrarRelatorio &&
    !mostrarMultas &&
    paginaAtiva !== 5
  const mostrarAbasAdmin = paginaAtiva === 5
  const mostrarAbasCruzamento =
    mostrarAbas && secaoAtiva === 'sistemaGeo' && paginaAtiva === 4
  const mostrarAbasNormal = mostrarAbas && !mostrarAbasCruzamento

  return (
    <header className="bg-slate-800 text-white shadow-sm">
      {/* Linha 1: Home + Logos + Título do módulo + Dropdown + Usuário */}
      <div className="w-full px-3 sm:px-4 py-4 flex items-center gap-6">
        {/* Home button */}
        {onHome && (
          <button
            onClick={onHome}
            title="Página inicial"
            className="shrink-0 w-9 h-9 rounded-sm bg-white/15 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
            </svg>
          </button>
        )}

        {/* Logo esquerda: Secretaria das Subprefeituras */}
        <div className="flex items-center shrink-0">
          <Logo
            src="/logos/secretaria-subprefeituras.png"
            alt="Secretaria das Subprefeituras"
          />
          <LogoFallback texto="SEC. SUBS." />
        </div>

        {/* Ícone + título do módulo ativo */}
        <div
          className="flex-1 min-w-0 pl-4 flex items-center gap-3"
          data-tour="header-modulo"
        >
          <div
            className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white p-1.5"
            style={{ background: accentGradient }}
          >
            {mod.icon}
          </div>
          <h1 className="text-base sm:text-lg font-bold uppercase tracking-wide leading-tight">
            {mod.label} · OBRAS
          </h1>
        </div>

        {/* Module dropdown */}
        {modules.length > 0 && (
          <div className="shrink-0" data-tour="header-modulos">
            <ModuleDropdown
              modules={modules}
              activeModuleId={
                mostrarMultas
                  ? 'multas'
                  : mostrarRelatorio
                    ? 'relatorio'
                    : mostrarEmergencias
                      ? 'emergencias'
                      : secaoAtiva
              }
              onSelect={onSelectModule}
              showAdmin={showAdmin}
              onAdmin={onAbrirConfiguracoes}
              accentFrom={mod.from}
              accentTo={mod.to}
            />
          </div>
        )}

        {/* Usuário + Senha + Sair */}
        {user && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-white/70 max-w-[140px] truncate hidden sm:block">
              {nomeExibicao(user.email)}
            </span>
            {onIniciarTour && (
              <BotaoTour
                onClick={onIniciarTour}
                variante="escuro"
                dataTour="header-btn-tour"
              />
            )}
            {onAlterarSenha && (
              <button
                onClick={onAlterarSenha}
                title="Alterar minha senha"
                data-tour="header-senha"
                className="w-8 h-8 flex items-center justify-center rounded-sm bg-white/15 hover:bg-white/30 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="text-xs text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-2 py-1 rounded-sm transition-colors"
            >
              Sair
            </button>
          </div>
        )}

        {/* Logo direita: OBRAS */}
        <div className="flex items-center shrink-0">
          <Logo src="/logos/obras.png" alt="OBRAS" />
          <LogoFallback texto="OBRAS" />
        </div>
      </div>

      {/* Linha 2: Abas (esquerda) + Departamento (direita) */}
      <div className="w-full px-3 sm:px-4 border-t border-white/10 flex items-center bg-slate-900/50">
        {mostrarAbasNormal && (
          <div className="shrink-0" data-tour="header-abas">
            <PageTabs
              ativa={paginaAtiva}
              onChange={onPagina}
              secaoAtiva={secaoAtiva}
              abasPermitidas={abasPermitidas}
              accentFrom={mod.from}
              accentTo={mod.to}
            />
          </div>
        )}
        {mostrarAbasCruzamento && (
          <nav
            className="flex items-center gap-4 overflow-x-auto"
            data-tour="header-abas"
          >
            {abasCruzamentoPermitidas(permissoes, ABAS_CRUZAMENTO).map((a) => (
              <button
                key={a.id}
                onClick={() => onAbaCruzamento(a.id)}
                title={a.label}
                aria-label={a.label}
                aria-current={abaCruzamentoAtiva === a.id ? 'page' : undefined}
                className={`flex items-center gap-1.5 text-sm py-2 transition-all relative whitespace-nowrap ${
                  abaCruzamentoAtiva === a.id
                    ? 'text-white font-bold'
                    : 'text-white/60 font-semibold hover:text-white'
                }`}
              >
                <span className="text-lg">{a.icon}</span>
                <span className="hidden sm:inline">{a.label}</span>
                {abaCruzamentoAtiva === a.id && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{
                      background: `linear-gradient(to right, ${mod.from}, ${mod.to})`,
                    }}
                  />
                )}
              </button>
            ))}
          </nav>
        )}
        {mostrarEmergencias && (
          <nav className="flex items-center gap-4" data-tour="header-abas">
            {[
              { id: 'geral', label: 'Visão Geral', icon: '👁️' },
              {
                id: 'informadas',
                label: `Informadas${totalInformadasEmerg > 0 ? ` (${totalInformadasEmerg.toLocaleString('pt-BR')})` : ''}`,
                icon: '🚨',
              },
              ...(!permissoes || permissoes.has('emerg.aba_prazo48h')
                ? [
                    {
                      id: 'prazo48h',
                      label: 'Prazo 48h',
                      icon: '⏱️',
                      badge: emgVencidas48h,
                    },
                  ]
                : []),
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'busca', label: 'Busca por Processo', icon: '🔍' },
              ...(!permissoes || permissoes.has('emerg.aba_motivo_invalido')
                ? [
                    {
                      id: 'motivo_invalido',
                      label: 'Motivo Inválido',
                      icon: '🔄',
                      alerta: motivoPendentes,
                    },
                  ]
                : []),
              { id: 'historico', label: 'Histórico', icon: '🕑' },
            ].map((a) => (
              <button
                key={a.id}
                onClick={() => onAbaEmerg(a.id)}
                title={a.label}
                aria-label={a.label}
                aria-current={abaEmergAtiva === a.id ? 'page' : undefined}
                className={`flex items-center gap-1.5 text-sm py-2 transition-all relative ${
                  abaEmergAtiva === a.id
                    ? 'text-white font-bold'
                    : 'text-white/70 font-semibold hover:text-white'
                }`}
              >
                <span className="text-lg">{a.icon}</span>
                <span className="hidden sm:inline">{a.label}</span>
                {a.badge > 0 && (
                  <span className="bg-red text-white text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {a.badge > 99 ? '99+' : a.badge}
                  </span>
                )}
                {a.alerta > 0 && (
                  <span
                    title={`${a.alerta} motivo(s) de natureza a classificar`}
                    className="bg-amber-400 text-amber-900 text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse"
                  >
                    {a.alerta > 99 ? '99+' : a.alerta}
                  </span>
                )}
                {abaEmergAtiva === a.id && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{
                      background: `linear-gradient(to right, ${mod.from}, ${mod.to})`,
                    }}
                  />
                )}
              </button>
            ))}
          </nav>
        )}
        {mostrarMultas && (
          <nav className="flex items-center gap-4" data-tour="header-abas">
            {[
              { id: 'geral', label: 'Visão Geral', icon: '👁️' },
              ...(!permissoes || permissoes.has('multas.aba_busca')
                ? [{ id: 'busca', label: 'Lista', icon: '🔍' }]
                : []),
            ].map((a) => (
              <button
                key={a.id}
                onClick={() => onAbaMultas(a.id)}
                title={a.label}
                aria-label={a.label}
                aria-current={abaMultasAtiva === a.id ? 'page' : undefined}
                className={`flex items-center gap-1.5 text-sm py-2 transition-all relative ${
                  abaMultasAtiva === a.id
                    ? 'text-white font-bold'
                    : 'text-white/70 font-semibold hover:text-white'
                }`}
              >
                <span className="text-lg">{a.icon}</span>
                <span className="hidden sm:inline">{a.label}</span>
                {abaMultasAtiva === a.id && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{
                      background: `linear-gradient(to right, ${mod.from}, ${mod.to})`,
                    }}
                  />
                )}
              </button>
            ))}
          </nav>
        )}
        {mostrarAbasAdmin && (
          <nav className="flex items-center gap-4" data-tour="header-abas">
            {[
              { id: 0, label: 'Usuários', icon: '👤' },
              { id: 1, label: 'Perfis de Acesso', icon: '🛡️' },
              { id: 2, label: 'Atualizar Dados', icon: '🔄' },
              { id: 3, label: 'Log de Acessos', icon: '📋' },
            ].map((a) => (
              <button
                key={a.id}
                onClick={() => onAbaAdmin(a.id)}
                title={a.label}
                aria-label={a.label}
                aria-current={abaAdminAtiva === a.id ? 'page' : undefined}
                className={`flex items-center gap-1.5 text-sm py-2 transition-all relative ${
                  abaAdminAtiva === a.id
                    ? 'text-white font-bold'
                    : 'text-white/70 font-semibold hover:text-white'
                }`}
              >
                <span className="text-lg">{a.icon}</span>
                <span className="hidden sm:inline">{a.label}</span>
                {abaAdminAtiva === a.id && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{
                      background: `linear-gradient(to right, ${mod.from}, ${mod.to})`,
                    }}
                  />
                )}
              </button>
            ))}
          </nav>
        )}
        <div className="flex-1" />
        <p className="text-xs text-white/50 py-2 font-medium shrink-0">
          Departamento de Controle e Uso de Vias Públicas
        </p>
      </div>

      {/* Barra colorida de rodapé — identifica visualmente o módulo ativo */}
      <div className="h-1 w-full" style={{ background: accentGradient }} />
    </header>
  )
}
