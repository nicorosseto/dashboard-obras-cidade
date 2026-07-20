import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase.js'
import {
  signOut,
  getProfile,
  garantirMarcaLogin,
  sessaoExpirada,
} from './lib/auth.js'
import {
  aplicarFiltros,
  listaPermissionarias,
  listaSubprefeituras,
  mapaSubprefeituras,
  listaAnos,
  calcularKPIsPBI,
  aplicarFiltrosGeo,
  maisProtocolos,
  mediaDiaria,
  pctPermissionaria,
  contagemPorSubprefeitura,
  contagemPorSubprefeituraGeo,
  contarSemData,
  ultimaAtualizacao as calcularUltimaAtualizacao,
  contarFiltrosAtivos,
  toggleSubSelecionada,
} from './lib/aggregations.js'
import Header from './components/Header.jsx'
import Rodape from './components/Rodape.jsx'
import TituloTela from './components/TituloTela.jsx'
import {
  ABAS_FISC,
  ABAS_GEO,
  ABAS_ADMIN,
  ABAS_EMERG,
  ABAS_MULTAS,
  labelDaAba,
} from './lib/abasPaginas.js'
import { ABAS_CRUZAMENTO } from './lib/abasCruzamento.js'
import { coresModulo } from './lib/coresModulo.js'
import Sidebar from './components/Sidebar.jsx'
import SidebarSistemaGeo from './components/SidebarSistemaGeo.jsx'
import SidebarCruzamento from './components/SidebarCruzamento.jsx'
import SidebarMultas from './components/tabs/multas/SidebarMultas.jsx'
import { FILTROS_GEO_VAZIOS } from './lib/filtrosGeo.js'
import { FILTROS_CRUZAMENTO_VAZIOS } from './lib/filtrosCruzamento.js'
import { carregarPermissoes, abasPermitidas } from './lib/permissoes.js'
import { ehModoDemo, DEMO_SESSION } from './lib/demo.js'
import {
  agruparMotivos,
  resolverDefs,
  contarEmgVencidas48h,
} from './lib/emergencias.js'
import {
  cruzarMultas,
  FILTROS_VAZIOS_MULTAS,
  aplicarFiltrosMultas,
  contarFiltrosAtivosMultas,
} from './lib/multas.js'
import { useCargaFiscalizacao } from './hooks/useCargaFiscalizacao.js'
import { useCargaSistemaGeo } from './hooks/useCargaSistemaGeo.js'
import { useCargaEmergencias } from './hooks/useCargaEmergencias.js'
import { useCargaMultas } from './hooks/useCargaMultas.js'
import { useAvisoAtualizacao } from './hooks/useAvisoAtualizacao.js'
import KPIStrip from './components/KPIStrip.jsx'
import KPIStripGeo from './components/KPIStripGeo.jsx'
import ExportModal from './components/ExportModal.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
// Fase M2 (modernização): as páginas de módulo são pesadas (Recharts/Leaflet/xlsx
// somados) e só uma fica visível por vez — carregadas sob demanda para reduzir o
// chunk inicial. Cada uso fica dentro de <Suspense fallback={<LoadingInline .../>}>.
const PaginaRelatorio = lazy(
  () => import('./components/tabs/relatorio/PaginaRelatorio.jsx')
)
const AdminPanel = lazy(() => import('./components/AdminPanel.jsx'))
const Pagina1Geral = lazy(() => import('./components/tabs/Pagina1Geral.jsx'))
const Pagina2Temporal = lazy(
  () => import('./components/tabs/Pagina2Temporal.jsx')
)
const Pagina3Espacial = lazy(
  () => import('./components/tabs/Pagina3Espacial.jsx')
)
const PaginaGeo1Geral = lazy(
  () => import('./components/tabs/PaginaGeo1Geral.jsx')
)
const PaginaGeo2Temporal = lazy(
  () => import('./components/tabs/PaginaGeo2Temporal.jsx')
)
const PaginaGeo3Subprefeitura = lazy(
  () => import('./components/tabs/PaginaGeo3Subprefeitura.jsx')
)
const PaginaGeo4Cruzamento = lazy(
  () => import('./components/tabs/PaginaGeo4Cruzamento.jsx')
)
const PaginaFisc5Executoras = lazy(
  () => import('./components/tabs/PaginaFisc5Executoras.jsx')
)
const PaginaBuscaProcesso = lazy(
  () => import('./components/tabs/PaginaBuscaProcesso.jsx')
)
const PaginaEmergencias = lazy(
  () => import('./components/tabs/PaginaEmergencias.jsx')
)
const PaginaMultas = lazy(
  () => import('./components/tabs/multas/PaginaMultas.jsx')
)
import { LoadingPage, LoadingInline } from './components/Loading.jsx'
import AlterarSenhaModal from './components/AlterarSenhaModal.jsx'
import ConviteTour from './components/tour/ConviteTour.jsx'
import {
  carregarToursVistos,
  marcarTourVisto,
  iniciarTour,
  TOURS,
} from './lib/tour.js'
import BarraProgresso from './components/BarraProgresso.jsx'
import AvisoAtualizacao from './components/AvisoAtualizacao.jsx'

// Ícones para módulos
function IconMap() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M9 8.5h8" />
      <path d="M9 12h5" />
      <path d="M12 16v3" />
      <path d="M8.5 21h7" />
    </svg>
  )
}

function IconTicket() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
      <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" />
    </svg>
  )
}

const FILTROS_VAZIOS = {
  dataIni: null,
  dataFim: null,
  permissionarias: new Set(),
  subprefeituras: new Set(),
  temNc: null,
}

// Faixa informativa exibida quando há filtro de período ativo e existem
// registros sem data (que, por não terem data, ficam de fora do recorte).
function AvisoSemData({ n }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <span aria-hidden className="text-sm leading-none">
        ℹ️
      </span>
      <span>
        <strong>{n.toLocaleString('pt-BR')}</strong>{' '}
        {n === 1 ? 'registro sem data' : 'registros sem data'} não{' '}
        {n === 1 ? 'aparece' : 'aparecem'} com o filtro de período ativo (não
        têm data preenchida). Limpe as datas para incluí-
        {n === 1 ? 'lo' : 'los'}.
      </span>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = ainda verificando
  const [profile, setProfile] = useState(null)
  // null = permissões ainda carregando; Set = pronto (admin recebe todas)
  const [permissoes, setPermissoes] = useState(null)

  // ── Carga de dados dos módulos (Frente 3, Etapa 5 — hooks em src/hooks/) ──
  // Precisa vir logo após `session`/`permissoes` (acima): código mais abaixo
  // (ex.: `tourBloqueado`) já lê `sistemaGeoCarregando`/`emergCarregando`.
  const {
    todasLinhas,
    carregando,
    erro,
    reset: resetFiscalizacao,
  } = useCargaFiscalizacao(session)
  const {
    sistemaGeoLinhas,
    sistemaGeoCarregando,
    geoProgresso,
    reset: resetSistemaGeo,
  } = useCargaSistemaGeo(session, permissoes)
  const {
    emergLinhas,
    setEmergLinhas,
    emergObras,
    setEmergObras,
    motivoClassif,
    setMotivoClassif,
    motivoOverrides,
    setMotivoOverrides,
    emergCarregando,
    emergProgresso,
  } = useCargaEmergencias(session, permissoes)
  const {
    multasLinhas,
    multasCarregando,
    reset: resetMultas,
    refetch: refetchMultas,
  } = useCargaMultas(session, permissoes)
  const { datasModulos, modulosAtualizados, limparModulosAtualizados } =
    useAvisoAtualizacao(session)

  // ── OBRAS data ───────────────────────────────────────────────────
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS)

  // ── Sistema Geo data ──────────────────────────────────────────────────
  const [sistemaGeoFiltros, setSistemaGeoFiltros] = useState(FILTROS_GEO_VAZIOS)
  const [cruzamentoFiltros, setCruzamentoFiltros] = useState(
    FILTROS_CRUZAMENTO_VAZIOS
  )
  const [abaAtivaCruzamento, setAbaAtivaCruzamento] = useState('visao-geral')

  // ── Navigation ────────────────────────────────────────────────────
  const [mostrarHome, setMostrarHome] = useState(true)
  const [mostrarEmergencias, setMostrarEmergencias] = useState(false)
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false)
  const [mostrarMultas, setMostrarMultas] = useState(false)
  const [secaoAtiva, setSecaoAtiva] = useState('fiscalizacao')
  const [paginaAtiva, setPaginaAtiva] = useState(1)
  const [mostrarAlterarSenha, setMostrarAlterarSenha] = useState(false)
  const [abaEmergencias, setAbaEmergencias] = useState('geral')
  const [abaMultas, setAbaMultas] = useState('geral')
  // Filtros da sidebar de Multas (item 1 da melhoria de 16/07/2026) — mesmo
  // padrão de FILTROS_VAZIOS_EMERG: estado aqui no App.jsx, aplicado sobre
  // `multasCruzadas` (o cruzamento em memória com Sistema Geo/Fiscalização).
  const [multasFiltros, setMultasFiltros] = useState(FILTROS_VAZIOS_MULTAS)
  const [multasSidebarAberta, setMultasSidebarAberta] = useState(false)
  // Tour guiado: null = indisponível/carregando (nunca oferece); Map (tour_id
  // -> status 'concluido'|'dispensado') = pronto
  const [toursVistos, setToursVistos] = useState(null)
  const [totalInformadasEmerg, setTotalInformadasEmerg] = useState(0)

  const [abaAdmin, setAbaAdmin] = useState(0)

  // ── Autenticação ──────────────────────────────────────────────────
  useEffect(() => {
    // Modo demo (portfólio público): nunca fala com o Supabase Auth — a
    // sessão do "Visitante (demo)" é fixa, sem tela de login.
    if (ehModoDemo()) {
      setSession(DEMO_SESSION)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess ?? null)
      if (!sess) setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Carrega profile quando sessão muda, detecta primeiro acesso e busca as
  // permissões do perfil de acesso (admin enxerga tudo sem consultar o banco).
  useEffect(() => {
    if (!session?.user) return
    let cancelado = false
    getProfile(session.user.id)
      .then((p) => {
        if (cancelado) return
        setProfile(p)
        if (p?.primeiro_acesso) setMostrarAlterarSenha(true)
        // Admin é admin mesmo com 1º acesso pendente: `ativo` só indica que o
        // usuário ainda não concluiu o primeiro acesso, não que está bloqueado.
        const admin = p?.role === 'admin'
        return carregarPermissoes(admin).then((perms) => {
          if (!cancelado) setPermissoes(perms)
        })
      })
      .catch(() => {
        if (!cancelado) {
          setProfile(null)
          setPermissoes(new Set())
        }
      })
    return () => {
      cancelado = true
    }
  }, [session])

  // ── Tour guiado: quais tours este usuário já viu/dispensou ────────
  // Falha fechada: se a consulta falhar (ex.: SQL 19 ainda não rodado no
  // banco), toursVistos fica null e NENHUM convite aparece — o botão "?"
  // de rever continua funcionando normalmente.
  useEffect(() => {
    if (!session?.user) {
      setToursVistos(null)
      return
    }
    carregarToursVistos()
      .then(setToursVistos)
      .catch(() => setToursVistos(null))
  }, [session])

  function registrarTourVisto(tourId, status) {
    setToursVistos((prev) => {
      const m = new Map(prev ?? [])
      m.set(tourId, status)
      return m
    })
    marcarTourVisto(session?.user?.id, tourId, status)
  }

  // ── Tour do módulo/aba atual ────────────────────────────────────────
  // Convite no 1º acesso ao módulo; mini-tour automático no 1º clique de
  // cada aba (só depois do tour de entrada resolvido). Cobre todos os
  // módulos: Sistema Geo, Fiscalização, Análise Integrada, Emergências,
  // Apresentação (linear, sem sub-abas) e Configurações. Análise Integrada
  // e Emergências usam aba ativa em string (não numérica) — daí o cálculo
  // por caso abaixo.
  const emAnaliseIntegrada = secaoAtiva === 'sistemaGeo' && paginaAtiva === 4
  const { tourModuloId, tourAbaId } = (() => {
    if (mostrarHome) return { tourModuloId: null, tourAbaId: null }
    if (mostrarRelatorio) return { tourModuloId: 'relatorio', tourAbaId: null }
    if (mostrarMultas) {
      const aba = abaMultas !== 'geral' ? `multas.${abaMultas}` : null
      return { tourModuloId: 'multas', tourAbaId: aba }
    }
    if (mostrarEmergencias) {
      const aba =
        abaEmergencias !== 'geral' ? `emergencias.${abaEmergencias}` : null
      return { tourModuloId: 'emergencias', tourAbaId: aba }
    }
    if (paginaAtiva === 5) {
      const aba = abaAdmin !== 0 ? `configuracoes.${abaAdmin}` : null
      return { tourModuloId: 'configuracoes', tourAbaId: aba }
    }
    if (emAnaliseIntegrada) {
      const aba =
        abaAtivaCruzamento !== 'visao-geral'
          ? `cruzamento.${abaAtivaCruzamento}`
          : null
      return { tourModuloId: 'cruzamento', tourAbaId: aba }
    }
    const aba = paginaAtiva !== 1 ? `${secaoAtiva}.${paginaAtiva}` : null
    return { tourModuloId: secaoAtiva, tourAbaId: aba }
  })()
  // Não disparar tour com a carga do Sistema Geo/Emergências em andamento
  // (gráficos ainda vazios).
  const tourBloqueado =
    mostrarAlterarSenha ||
    !!profile?.primeiro_acesso ||
    (secaoAtiva === 'sistemaGeo' && sistemaGeoCarregando) ||
    (mostrarEmergencias && emergCarregando) ||
    (mostrarMultas && multasCarregando)

  const oferecerTourModulo =
    !!tourModuloId &&
    !!TOURS[tourModuloId] &&
    !tourBloqueado &&
    permissoes instanceof Set &&
    toursVistos instanceof Map &&
    !toursVistos.has(tourModuloId)

  useEffect(() => {
    if (!tourAbaId || !TOURS[tourAbaId]) return
    if (tourBloqueado) return
    if (!(permissoes instanceof Set) || !(toursVistos instanceof Map)) return
    // Só auto-dispara o mini-tour da aba se o tour de entrada do módulo foi
    // CONCLUÍDO — se o usuário dispensou ("Agora não"), respeitamos a
    // recusa também nas abas, em vez de insistir aba por aba.
    if (toursVistos.get(tourModuloId) !== 'concluido') return
    if (toursVistos.has(tourAbaId)) return
    registrarTourVisto(tourAbaId, 'concluido')
    iniciarTour(tourAbaId, permissoes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourAbaId, tourBloqueado, toursVistos, permissoes])

  function handleRevisarTour() {
    const id = tourAbaId && TOURS[tourAbaId] ? tourAbaId : tourModuloId
    if (id && TOURS[id]) iniciarTour(id, permissoes)
  }

  // ── Expiração da sessão ───────────────────────────────────────────
  // Desloga sozinho após SESSAO_MAX_HORAS do login (checa ao abrir e a
  // cada minuto). O onAuthStateChange cuida de levar para a tela de login.
  useEffect(() => {
    if (!session?.user) return
    garantirMarcaLogin()
    const user = session.user
    async function checar() {
      if (!sessaoExpirada()) return
      try {
        await signOut(user)
      } catch {
        // mesmo com erro no logout remoto, a sessão local é encerrada
      }
    }
    checar()
    const id = setInterval(checar, 60 * 1000)
    return () => clearInterval(id)
  }, [session])

  // ── Derivados OBRAS ─────────────────────────────────────────────
  const anos = useMemo(() => listaAnos(todasLinhas), [todasLinhas])
  const permissionarias = useMemo(
    () => listaPermissionarias(todasLinhas),
    [todasLinhas]
  )
  const subprefeituras = useMemo(
    () => listaSubprefeituras(todasLinhas),
    [todasLinhas]
  )
  const subprefeiturasMapa = useMemo(
    () => mapaSubprefeituras(todasLinhas),
    [todasLinhas]
  )
  const filtradas = useMemo(
    () => aplicarFiltros(todasLinhas, filtros),
    [todasLinhas, filtros]
  )
  const kpis = useMemo(() => calcularKPIsPBI(filtradas), [filtradas])
  // Aviso ao filtrar por período: nº de registros sem data (ficam de fora).
  const semDataFisc = useMemo(
    () =>
      filtros.dataIni || filtros.dataFim
        ? contarSemData(todasLinhas, 'data_inicio')
        : 0,
    [todasLinhas, filtros.dataIni, filtros.dataFim]
  )

  // Contagem do mapa (Fiscalização): aplica TODOS os filtros menos a própria
  // subprefeitura, para o mapa não esvaziar ao selecionar uma região.
  const contagensMapaFisc = useMemo(() => {
    const semSub = aplicarFiltros(todasLinhas, {
      ...filtros,
      subprefeituras: new Set(),
    })
    return contagemPorSubprefeitura(semSub)
  }, [todasLinhas, filtros])

  // Clique no mapa: foca só a subprefeitura clicada; clicar de novo na mesma
  // (quando é a única selecionada) limpa o filtro.
  function selecionarSubFisc(sigla) {
    setFiltros((f) => ({
      ...f,
      subprefeituras: toggleSubSelecionada(f.subprefeituras, sigla),
    }))
  }

  // ── Derivados Sistema Geo ────────────────────────────────────────────
  const sistemaGeoFiltradas = useMemo(
    () => aplicarFiltrosGeo(sistemaGeoLinhas, sistemaGeoFiltros),
    [sistemaGeoLinhas, sistemaGeoFiltros]
  )
  const sistemaGeoKpis = useMemo(
    () => ({
      total: sistemaGeoFiltradas.length,
      maisProtocolos: maisProtocolos(sistemaGeoFiltradas),
      mediaDiaria: mediaDiaria(
        sistemaGeoFiltradas,
        sistemaGeoFiltros.dataIni,
        sistemaGeoFiltros.dataFim
      ),
      pctTotal: pctPermissionaria(
        sistemaGeoFiltradas,
        sistemaGeoLinhas,
        sistemaGeoFiltros.permissionarias
      ),
    }),
    [sistemaGeoFiltradas, sistemaGeoLinhas, sistemaGeoFiltros]
  )
  // Aviso ao filtrar por período: nº de registros sem data (ficam de fora).
  const semDataGeo = useMemo(
    () =>
      sistemaGeoFiltros.dataIni || sistemaGeoFiltros.dataFim
        ? contarSemData(sistemaGeoLinhas, 'data_cadastro')
        : 0,
    [sistemaGeoLinhas, sistemaGeoFiltros.dataIni, sistemaGeoFiltros.dataFim]
  )

  // Contagem do mapa (Sistema Geo): todos os filtros menos a subprefeitura.
  const contagensMapaGeo = useMemo(() => {
    const semSub = aplicarFiltrosGeo(sistemaGeoLinhas, {
      ...sistemaGeoFiltros,
      subprefeituras: new Set(),
    })
    return contagemPorSubprefeituraGeo(semSub)
  }, [sistemaGeoLinhas, sistemaGeoFiltros])

  // Nº de filtros ativos da barra lateral (para a aba "Busca por Processo").
  const nFiltrosFisc = useMemo(
    () =>
      contarFiltrosAtivos(filtros, {
        camposSet: ['permissionarias', 'subprefeituras'],
        extras: [(f) => f.temNc !== null],
      }),
    [filtros]
  )
  const nFiltrosGeo = useMemo(
    () =>
      contarFiltrosAtivos(sistemaGeoFiltros, {
        camposSet: [
          'permissionarias',
          'subprefeituras',
          'tiposProcesso',
          'etapas',
          'statusUnificados',
          'tiposObra',
        ],
      }),
    [sistemaGeoFiltros]
  )

  // Conta emergências com status "Informada" e prazo 48h vencido (cálculo simplificado).
  const emgVencidas48h = useMemo(
    () => contarEmgVencidas48h(emergLinhas, emergObras),
    [emergLinhas, emergObras]
  )

  // ── Motivo Inválido (v3): defs/override + grupos/pendências ──
  const motivoDefs = useMemo(() => resolverDefs(motivoClassif), [motivoClassif])
  const motivoOverrideMap = useMemo(() => {
    const m = new Map()
    for (const o of motivoOverrides) m.set(o.chave, o.termo)
    return m
  }, [motivoOverrides])
  const motivoSavedTermos = useMemo(
    () => new Set(motivoClassif.map((c) => c.termo)),
    [motivoClassif]
  )

  const motivoGrupos = useMemo(() => {
    const itens = (emergObras || [])
      .filter((o) => o.natureza_obra)
      .map((o) => ({
        codigo_aio: o.codigo_aio,
        natureza: o.natureza_obra,
        _obra: o,
      }))
    return agruparMotivos(itens, {
      overrideMap: motivoOverrideMap,
      defs: motivoDefs,
      savedTermos: motivoSavedTermos,
    })
  }, [emergObras, motivoOverrideMap, motivoDefs, motivoSavedTermos])

  const motivoPendentes = useMemo(
    () => motivoGrupos.filter((g) => !g.classificado).length,
    [motivoGrupos]
  )

  async function salvarClassifMotivos({ defs = [], overrides = [] }) {
    // Modo demo: read-only, sem gravação no banco (não há banco).
    if (ehModoDemo()) return
    const agora = new Date().toISOString()
    if (defs.length) {
      const payload = defs.map((c) => ({
        termo: c.termo,
        rotulo: c.rotulo,
        invalido: !!c.invalido,
        palavras: c.palavras || [],
        arquivado: !!c.arquivado,
        alias_de: c.alias_de || null,
        atualizado_em: agora,
      }))
      const { error } = await supabase
        .from('motivo_natureza_classificacao')
        .upsert(payload, { onConflict: 'termo' })
      if (error) throw error
      setMotivoClassif((prev) => {
        const m = new Map(prev.map((c) => [c.termo, c]))
        for (const c of payload) m.set(c.termo, c)
        return Array.from(m.values())
      })
    }
    if (overrides.length) {
      const payload = overrides.map((o) => ({
        chave: o.chave,
        termo: o.termo,
        atualizado_em: agora,
      }))
      const { error } = await supabase
        .from('motivo_natureza_override')
        .upsert(payload, { onConflict: 'chave' })
      if (error) throw error
      setMotivoOverrides((prev) => {
        const m = new Map(prev.map((o) => [o.chave, o]))
        for (const o of payload) m.set(o.chave, o)
        return Array.from(m.values())
      })
    }
  }

  function selecionarSubGeo(sigla) {
    setSistemaGeoFiltros((f) => ({
      ...f,
      subprefeituras: toggleSubSelecionada(f.subprefeituras, sigla),
    }))
  }

  // ── Multas (A4): cruzamento em memória com Sistema Geo/Fiscalização ──
  // Só é completo quando as duas bases já carregaram — enquanto isso, a UI
  // mostra um aviso de "cruzamento parcial" (o cálculo roda do mesmo jeito,
  // com os dados que já chegaram, e se atualiza sozinho quando terminarem).
  const multasCruzadas = useMemo(
    () => cruzarMultas(multasLinhas, sistemaGeoLinhas, todasLinhas),
    [multasLinhas, sistemaGeoLinhas, todasLinhas]
  )
  const basesMultasCarregando = sistemaGeoCarregando || carregando

  // Filtros da sidebar de Multas — aplicados sobre o cruzamento já pronto.
  const multasFiltradas = useMemo(
    () => aplicarFiltrosMultas(multasCruzadas, multasFiltros),
    [multasCruzadas, multasFiltros]
  )
  // Só entram no filtro nomes de permissionária que vieram do Sistema Geo
  // (`_situacao_vinculo === 'vinculado_sistemaGeo'` garante que
  // `_permissionaria_exibir` é o `geo.permissionaria`, não o texto cru da
  // planilha de multas) — decisão de 20/07/2026: como os processos sem
  // número não são analisados, o texto não tratado da própria planilha de
  // multas não deve poluir a lista de opções do filtro. Não afeta os dados
  // exibidos por padrão (sem filtro ativo, `aplicarFiltrosMultas` mostra tudo).
  const multasPermissionariasDisponiveis = useMemo(() => {
    const s = new Set()
    for (const r of multasCruzadas) {
      if (r._situacao_vinculo !== 'vinculado_sistemaGeo') continue
      const p = r._permissionaria_exibir || r.permissionaria
      if (p) s.add(p)
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'pt'))
  }, [multasCruzadas])
  const multasStatusDisponiveis = useMemo(() => {
    const m = new Map()
    for (const r of multasCruzadas) {
      const s = r.status || 'Sem status'
      m.set(s, (m.get(s) || 0) + 1)
    }
    return Array.from(m.entries())
      .map(([status, qtd]) => ({ status, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
  }, [multasCruzadas])
  const multasSubprefeiturasDisponiveis = useMemo(
    () => listaSubprefeituras(multasCruzadas),
    [multasCruzadas]
  )
  const multasDataLimites = useMemo(() => {
    let mn = null,
      mx = null
    for (const r of multasCruzadas) {
      if (!r.data_infracao) continue
      if (!mn || r.data_infracao < mn) mn = r.data_infracao
      if (!mx || r.data_infracao > mx) mx = r.data_infracao
    }
    return { min: mn, max: mx }
  }, [multasCruzadas])
  const multasFiltrosAtivos = contarFiltrosAtivosMultas(multasFiltros) > 0

  const isAdmin = profile?.role === 'admin'
  // Configurações também fica acessível ao visitante da demo pública, mas
  // SOMENTE LEITURA (AdminPanel despacha para as versões *Demo* — ver
  // demoAdminData.js). Não confundir com `isAdmin`: essa continua exigindo
  // admin de verdade, para as ações reais (RPCs, uploads, exclusões).
  const podeVerConfiguracoes = isAdmin || ehModoDemo()

  // ── Permissões derivadas (sem permissão → elemento some da interface) ──
  const abasFisc = useMemo(
    () => abasPermitidas(permissoes, 'fiscalizacao'),
    [permissoes]
  )
  const abasGeo = useMemo(
    () => abasPermitidas(permissoes, 'sistemaGeo'),
    [permissoes]
  )
  const temFisc = abasFisc.length > 0
  const temGeo = abasGeo.length > 0
  const temCruzamento = isAdmin || abasGeo.includes(4)
  const temEmerg = permissoes?.has('emerg.ver') ?? false
  const temRelatorio = permissoes?.has('relatorio.ver') ?? false
  const temMultas = permissoes?.has('multas.ver') ?? false
  const podeExportarFisc = permissoes?.has('fisc.exportar') ?? false
  const podeExportarGeo = permissoes?.has('geo.exportar') ?? false
  const podeUploadEmerg = permissoes?.has('emerg.upload') ?? false
  const podeAtualizarMultas = permissoes?.has('multas.atualizar') ?? false

  // ── Handlers ─────────────────────────────────────────────────────
  function handleLogin(sess) {
    setSession(sess)
  }

  async function handleSignOut() {
    // Modo demo: não há tela de login para "cair" — sair só volta pra Home,
    // mantendo a sessão fake do visitante (não faz sentido bloquear o
    // portfólio público atrás de um login que não existe). Por isso os
    // reset() dos hooks de carga TAMBÉM ficam de fora: eles zeram os dados
    // em memória, e no fluxo real isso é seguro porque `session` muda logo
    // em seguida (login/logout real), o que já dispara a re-busca nos hooks
    // (dependem de `session`/`permissoes`). No modo demo `session` nunca
    // muda — reset() sem re-busca deixava a Home (e os módulos) travados em
    // zero até um F5 (achado do usuário em produção — 20/07/2026).
    if (!ehModoDemo()) {
      try {
        await signOut(session?.user)
      } catch {
        // ignora erros no logout
      }
      setSession(null)
      setProfile(null)
      setPermissoes(null)
      resetFiscalizacao()
      resetSistemaGeo()
      resetMultas()
    }
    setPaginaAtiva(1)
    setMostrarHome(true)
    setMostrarEmergencias(false)
    setMostrarRelatorio(false)
    setMostrarMultas(false)
    setFiltros(FILTROS_VAZIOS)
    setSistemaGeoFiltros(FILTROS_GEO_VAZIOS)
  }

  function handleSecaoChange(secao) {
    setSecaoAtiva(secao)
    // Abre na primeira aba que o usuário pode ver (nem sempre é a 1)
    const abas = abasPermitidas(permissoes, secao)
    setPaginaAtiva(abas[0] ?? 1)
    setMostrarHome(false)
    setMostrarEmergencias(false)
    setMostrarRelatorio(false)
    setMostrarMultas(false)
    window.scrollTo(0, 0)
  }

  function handleHome() {
    setMostrarHome(true)
    setMostrarEmergencias(false)
    setMostrarRelatorio(false)
    setMostrarMultas(false)
    setPaginaAtiva(1)
    window.scrollTo(0, 0)
  }

  function handleHomeNavigate(secao) {
    if (secao === 'cruzamento') {
      setMostrarHome(false)
      setMostrarEmergencias(false)
      setMostrarRelatorio(false)
      setMostrarMultas(false)
      setSecaoAtiva('sistemaGeo')
      setPaginaAtiva(4)
      window.scrollTo(0, 0)
      return
    }
    if (secao === 'relatorio') {
      handleAbrirRelatorio()
      return
    }
    if (secao === 'multas') {
      handleAbrirMultas()
      return
    }
    handleSecaoChange(secao)
  }

  function handleAbrirConfiguracoes() {
    setMostrarHome(false)
    setMostrarEmergencias(false)
    setMostrarRelatorio(false)
    setMostrarMultas(false)
    setPaginaAtiva(5)
    window.scrollTo(0, 0)
  }

  function handleAbrirEmergencias() {
    setMostrarEmergencias(true)
    setMostrarHome(false)
    setMostrarRelatorio(false)
    setMostrarMultas(false)
    window.scrollTo(0, 0)
  }

  function handleAbrirRelatorio() {
    setMostrarRelatorio(true)
    setMostrarHome(false)
    setMostrarEmergencias(false)
    setMostrarMultas(false)
    window.scrollTo(0, 0)
  }

  function handleAbrirMultas() {
    setMostrarMultas(true)
    setMostrarHome(false)
    setMostrarEmergencias(false)
    setMostrarRelatorio(false)
    window.scrollTo(0, 0)
  }

  function handleSelectModule(moduleId) {
    if (moduleId === 'emergencias') {
      handleAbrirEmergencias()
    } else if (moduleId === 'relatorio') {
      handleAbrirRelatorio()
    } else if (moduleId === 'multas') {
      handleAbrirMultas()
    } else if (moduleId === 'cruzamento') {
      setMostrarHome(false)
      setMostrarEmergencias(false)
      setMostrarRelatorio(false)
      setMostrarMultas(false)
      setSecaoAtiva('sistemaGeo')
      setPaginaAtiva(4)
      window.scrollTo(0, 0)
    } else {
      handleSecaoChange(moduleId)
    }
  }

  // Array de módulos disponíveis para o dropdown
  const modules = useMemo(() => {
    const list = []
    if (temGeo)
      list.push({ id: 'sistemaGeo', label: 'Sistema Geo', icon: <IconMap /> })
    if (temFisc)
      list.push({
        id: 'fiscalizacao',
        label: 'Fiscalização',
        icon: <IconClipboard />,
      })
    if (temCruzamento)
      list.push({
        id: 'cruzamento',
        label: 'Análise Integrada',
        icon: <IconMerge />,
      })
    if (temEmerg)
      list.push({
        id: 'emergencias',
        label: 'Emergências',
        icon: <IconAlert />,
      })
    if (temRelatorio)
      list.push({
        id: 'relatorio',
        label: 'Apresentação',
        icon: <IconSlides />,
      })
    if (temMultas)
      list.push({ id: 'multas', label: 'Multas', icon: <IconTicket /> })
    return list
  }, [temGeo, temFisc, temCruzamento, temEmerg, temRelatorio, temMultas])

  // Última atualização = max(data_inicio fisc, data_cadastro geo)
  const ultimaAtualizacao = useMemo(() => {
    return calcularUltimaAtualizacao(todasLinhas, sistemaGeoLinhas)
  }, [todasLinhas, sistemaGeoLinhas])

  // ── Estados de carregamento inicial ──────────────────────────────
  if (session === undefined) {
    return <LoadingPage mensagem="Verificando autenticação..." />
  }

  if (!session) {
    return <Login onLogin={handleLogin} />
  }

  if (permissoes === null)
    return <LoadingPage mensagem="Carregando seu perfil de acesso..." />

  if (carregando)
    return (
      <LoadingPage
        mensagem="Carregando dados. Aguarde um momento."
        progresso={geoProgresso}
      />
    )
  if (erro) return <LoadingPage mensagem={`Erro: ${erro}`} erro />

  // ── Aviso de dados atualizados (comum a todos os layouts) ───────────
  const avisoAtualizacao = modulosAtualizados.length > 0 && (
    <AvisoAtualizacao
      modulos={modulosAtualizados}
      onRecarregar={() => window.location.reload()}
      onDescartar={limparModulosAtualizados}
    />
  )

  // ── Home (após login, antes de escolher seção) ────────────────────
  if (mostrarHome) {
    // Convite do tour: só no 1º acesso (tour_visto), nunca por cima da troca
    // de senha obrigatória e só com as permissões já resolvidas.
    const oferecerTourHome =
      !mostrarAlterarSenha &&
      !profile?.primeiro_acesso &&
      permissoes instanceof Set &&
      toursVistos instanceof Map &&
      !toursVistos.has('home')
    return (
      <>
        {sistemaGeoCarregando && <BarraProgresso {...geoProgresso} />}
        {avisoAtualizacao}
        {mostrarAlterarSenha && (
          <AlterarSenhaModal
            obrigatorio={!!profile?.primeiro_acesso}
            onConcluido={() => {
              setMostrarAlterarSenha(false)
              setProfile((p) => (p ? { ...p, primeiro_acesso: false } : p))
            }}
            onFechar={
              profile?.primeiro_acesso
                ? undefined
                : () => setMostrarAlterarSenha(false)
            }
          />
        )}
        {oferecerTourHome && (
          <ConviteTour
            titulo="Primeira vez por aqui?"
            texto="Posso te mostrar rapidinho o que cada parte desta tela faz — leva menos de um minuto. Cada módulo também terá o próprio tour na primeira visita."
            onAceitar={() => {
              registrarTourVisto('home', 'concluido')
              iniciarTour('home', permissoes)
            }}
            onRecusar={() => registrarTourVisto('home', 'dispensado')}
          />
        )}
        <Home
          onNavigate={handleHomeNavigate}
          totalProtocolos={sistemaGeoLinhas.length}
          totalVistorias={todasLinhas.length}
          ultimaAtualizacao={ultimaAtualizacao}
          datasModulos={datasModulos}
          onAbrirEmergencias={temEmerg ? handleAbrirEmergencias : undefined}
          temFisc={temFisc}
          temGeo={temGeo}
          temCruzamento={temCruzamento}
          temRelatorio={temRelatorio}
          temMultas={temMultas}
          onAbrirConfiguracoes={
            podeVerConfiguracoes ? handleAbrirConfiguracoes : undefined
          }
          onSignOut={handleSignOut}
          sistemaGeoCarregando={sistemaGeoCarregando}
          geoProgresso={geoProgresso}
          emgVencidas48h={temEmerg ? emgVencidas48h : 0}
          onIniciarTour={() => iniciarTour('home', permissoes)}
        />
      </>
    )
  }

  // ── Tela dedicada de Emergências (isolada do resto) ───────────────
  if (mostrarEmergencias) {
    return (
      <div className="min-h-screen bg-grey-bg flex flex-col">
        {sistemaGeoCarregando && <BarraProgresso {...geoProgresso} />}
        {avisoAtualizacao}
        {mostrarAlterarSenha && (
          <AlterarSenhaModal
            obrigatorio={!!profile?.primeiro_acesso}
            onConcluido={() => {
              setMostrarAlterarSenha(false)
              setProfile((p) => (p ? { ...p, primeiro_acesso: false } : p))
            }}
            onFechar={
              profile?.primeiro_acesso
                ? undefined
                : () => setMostrarAlterarSenha(false)
            }
          />
        )}
        {oferecerTourModulo && (
          <ConviteTour
            titulo="Conhecer o módulo Emergências?"
            texto="Primeira vez neste módulo — posso mostrar as abas, os filtros da barra lateral e os botões de atualização, em menos de um minuto."
            onAceitar={() => {
              registrarTourVisto(tourModuloId, 'concluido')
              iniciarTour(tourModuloId, permissoes)
            }}
            onRecusar={() => registrarTourVisto(tourModuloId, 'dispensado')}
          />
        )}
        <Header
          paginaAtiva={0}
          onPagina={() => {}}
          user={session?.user}
          onSignOut={handleSignOut}
          showAdmin={podeVerConfiguracoes}
          secaoAtiva={secaoAtiva}
          onHome={handleHome}
          onIniciarTour={
            tourModuloId && TOURS[tourModuloId] ? handleRevisarTour : undefined
          }
          onAlterarSenha={() => setMostrarAlterarSenha(true)}
          abasPermitidas={[]}
          modules={modules}
          onSelectModule={handleSelectModule}
          mostrarEmergencias={true}
          abaEmergAtiva={abaEmergencias}
          onAbaEmerg={setAbaEmergencias}
          totalInformadasEmerg={totalInformadasEmerg}
          emgVencidas48h={emgVencidas48h}
          motivoPendentes={motivoPendentes}
          permissoes={permissoes}
          abaAdminAtiva={0}
          onAbaAdmin={() => {}}
          onAbrirConfiguracoes={handleAbrirConfiguracoes}
        />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-6 pt-3 shrink-0">
            <TituloTela
              titulo={labelDaAba(ABAS_EMERG, abaEmergencias)}
              corDe="#b45309"
              corPara="#d97706"
            />
          </div>
          <div className="flex-1 flex overflow-hidden">
            <ErrorBoundary modulo="Emergências">
              <Suspense
                fallback={
                  <LoadingInline mensagem="Carregando Emergências..." />
                }
              >
                <PaginaEmergencias
                  user={session?.user}
                  fiscalizacoes={todasLinhas}
                  isAdmin={isAdmin}
                  podeUpload={podeUploadEmerg}
                  abaAtiva={abaEmergencias}
                  onTotalInformadasChange={setTotalInformadasEmerg}
                  linhas={emergLinhas}
                  setLinhas={setEmergLinhas}
                  obras={emergObras}
                  setObras={setEmergObras}
                  motivoGrupos={motivoGrupos}
                  motivoPendentes={motivoPendentes}
                  onSalvarMotivos={salvarClassifMotivos}
                  carregando={emergCarregando}
                  emgProgresso={emergProgresso}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
        <Rodape />
      </div>
    )
  }

  // ── Tela dedicada do módulo Apresentação (relatório mensal em slides) ──
  if (mostrarRelatorio) {
    return (
      <div className="min-h-screen bg-grey-bg flex flex-col">
        {sistemaGeoCarregando && <BarraProgresso {...geoProgresso} />}
        {avisoAtualizacao}
        {mostrarAlterarSenha && (
          <AlterarSenhaModal
            obrigatorio={!!profile?.primeiro_acesso}
            onConcluido={() => {
              setMostrarAlterarSenha(false)
              setProfile((p) => (p ? { ...p, primeiro_acesso: false } : p))
            }}
            onFechar={
              profile?.primeiro_acesso
                ? undefined
                : () => setMostrarAlterarSenha(false)
            }
          />
        )}
        {oferecerTourModulo && (
          <ConviteTour
            titulo="Conhecer o módulo Apresentação?"
            texto="Primeira vez neste módulo — posso mostrar o seletor de permissionária, o índice de slides e os downloads, em menos de um minuto."
            onAceitar={() => {
              registrarTourVisto(tourModuloId, 'concluido')
              iniciarTour(tourModuloId, permissoes)
            }}
            onRecusar={() => registrarTourVisto(tourModuloId, 'dispensado')}
          />
        )}
        <Header
          paginaAtiva={0}
          onPagina={() => {}}
          user={session?.user}
          onSignOut={handleSignOut}
          showAdmin={podeVerConfiguracoes}
          secaoAtiva={secaoAtiva}
          onHome={handleHome}
          onIniciarTour={
            tourModuloId && TOURS[tourModuloId] ? handleRevisarTour : undefined
          }
          onAlterarSenha={() => setMostrarAlterarSenha(true)}
          abasPermitidas={[]}
          modules={modules}
          onSelectModule={handleSelectModule}
          mostrarRelatorio={true}
          permissoes={permissoes}
          abaAdminAtiva={0}
          onAbaAdmin={() => {}}
          onAbrirConfiguracoes={handleAbrirConfiguracoes}
        />
        <main
          className="flex-1 flex overflow-hidden"
          data-tour="conteudo-modulo"
        >
          <ErrorBoundary modulo="Apresentação">
            <Suspense
              fallback={<LoadingInline mensagem="Carregando Apresentação..." />}
            >
              <PaginaRelatorio
                geo={sistemaGeoLinhas}
                fisc={todasLinhas}
                emerg={emergLinhas}
                carregandoGeo={sistemaGeoCarregando}
              />
            </Suspense>
          </ErrorBoundary>
        </main>
        <ExportModal
          rowsFisc={filtradas}
          rowsGeo={sistemaGeoFiltradas}
          todasFisc={todasLinhas}
          todasGeo={sistemaGeoLinhas}
          moduloAtivo={secaoAtiva}
          mostrarFisc={false}
          mostrarGeo={false}
        />
        <Rodape />
      </div>
    )
  }

  // ── Tela dedicada do módulo Multas (isolada do resto) ──────────────
  if (mostrarMultas) {
    return (
      <div className="min-h-screen bg-grey-bg flex flex-col">
        {sistemaGeoCarregando && <BarraProgresso {...geoProgresso} />}
        {avisoAtualizacao}
        {mostrarAlterarSenha && (
          <AlterarSenhaModal
            obrigatorio={!!profile?.primeiro_acesso}
            onConcluido={() => {
              setMostrarAlterarSenha(false)
              setProfile((p) => (p ? { ...p, primeiro_acesso: false } : p))
            }}
            onFechar={
              profile?.primeiro_acesso
                ? undefined
                : () => setMostrarAlterarSenha(false)
            }
          />
        )}
        {oferecerTourModulo && (
          <ConviteTour
            titulo="Conhecer o módulo Multas?"
            texto="Primeira vez neste módulo — posso mostrar as abas, os KPIs e o botão de atualização, em menos de um minuto."
            onAceitar={() => {
              registrarTourVisto(tourModuloId, 'concluido')
              iniciarTour(tourModuloId, permissoes)
            }}
            onRecusar={() => registrarTourVisto(tourModuloId, 'dispensado')}
          />
        )}
        <Header
          paginaAtiva={0}
          onPagina={() => {}}
          user={session?.user}
          onSignOut={handleSignOut}
          showAdmin={podeVerConfiguracoes}
          secaoAtiva={secaoAtiva}
          onHome={handleHome}
          onIniciarTour={
            tourModuloId && TOURS[tourModuloId] ? handleRevisarTour : undefined
          }
          onAlterarSenha={() => setMostrarAlterarSenha(true)}
          abasPermitidas={[]}
          modules={modules}
          onSelectModule={handleSelectModule}
          mostrarMultas={true}
          abaMultasAtiva={abaMultas}
          onAbaMultas={setAbaMultas}
          permissoes={permissoes}
          abaAdminAtiva={0}
          onAbaAdmin={() => {}}
          onAbrirConfiguracoes={handleAbrirConfiguracoes}
        />
        <div className="flex-1 flex overflow-hidden">
          {!multasCarregando && multasCruzadas.length > 0 && (
            <SidebarMultas
              aberto={multasSidebarAberta}
              onToggle={() => setMultasSidebarAberta((o) => !o)}
              filtros={multasFiltros}
              setFiltros={setMultasFiltros}
              onLimpar={() => setMultasFiltros(FILTROS_VAZIOS_MULTAS)}
              permissionarias={multasPermissionariasDisponiveis}
              statusDisponiveis={multasStatusDisponiveis}
              subprefeiturasDisponiveis={multasSubprefeiturasDisponiveis}
              dataLimites={multasDataLimites}
              totalFiltrado={multasFiltradas.length}
              totalGeral={multasCruzadas.length}
              filtrosAtivos={multasFiltrosAtivos}
            />
          )}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="px-4 sm:px-6 pt-3 shrink-0">
              <TituloTela
                titulo={labelDaAba(ABAS_MULTAS, abaMultas)}
                corDe="#C00000"
                corPara="#E23636"
              />
            </div>
            <div className="flex-1 overflow-auto" data-tour="conteudo-modulo">
              <ErrorBoundary modulo="Multas">
                <Suspense
                  fallback={<LoadingInline mensagem="Carregando Multas..." />}
                >
                  <PaginaMultas
                    linhas={multasFiltradas}
                    carregando={multasCarregando}
                    basesCarregando={basesMultasCarregando}
                    abaAtiva={abaMultas}
                    podeVerInconsistencias={
                      !permissoes ||
                      permissoes.has('multas.aba_inconsistencias')
                    }
                    podeVerBusca={
                      !permissoes || permissoes.has('multas.aba_busca')
                    }
                    podeAtualizar={podeAtualizarMultas}
                    onAtualizado={refetchMultas}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        </div>
        <ExportModal
          rowsFisc={[]}
          rowsGeo={[]}
          todasFisc={[]}
          todasGeo={[]}
          moduloAtivo="multas"
          mostrarFisc={false}
          mostrarGeo={false}
        />
        <Rodape />
      </div>
    )
  }

  // ── Condições de exibição ─────────────────────────────────────────
  const isAdminPage = paginaAtiva === 5
  const isSpecialPage = isAdminPage
  const tituloTela = isAdminPage
    ? labelDaAba(ABAS_ADMIN, abaAdmin)
    : emAnaliseIntegrada
      ? labelDaAba(ABAS_CRUZAMENTO, abaAtivaCruzamento)
      : secaoAtiva === 'sistemaGeo'
        ? labelDaAba(ABAS_GEO, paginaAtiva)
        : labelDaAba(ABAS_FISC, paginaAtiva)
  const corTituloTela = coresModulo(secaoAtiva, paginaAtiva, false, false)
  // Cinto de segurança: só renderiza a página se a aba estiver liberada
  const abaLiberada = (secaoAtiva === 'sistemaGeo' ? abasGeo : abasFisc).includes(
    paginaAtiva
  )

  return (
    <div className="min-h-screen bg-grey-bg flex flex-col">
      {sistemaGeoCarregando && <BarraProgresso {...geoProgresso} />}
      {avisoAtualizacao}
      {mostrarAlterarSenha && (
        <AlterarSenhaModal
          obrigatorio={!!profile?.primeiro_acesso}
          onConcluido={() => {
            setMostrarAlterarSenha(false)
            setProfile((p) => (p ? { ...p, primeiro_acesso: false } : p))
          }}
          onFechar={
            profile?.primeiro_acesso
              ? undefined
              : () => setMostrarAlterarSenha(false)
          }
        />
      )}
      {oferecerTourModulo && (
        <ConviteTour
          titulo={`Conhecer ${emAnaliseIntegrada ? 'a Análise Integrada' : paginaAtiva === 5 ? 'as Configurações' : `o módulo ${secaoAtiva === 'sistemaGeo' ? 'Sistema Geo' : 'Fiscalização'}`}?`}
          texto="Primeira vez neste módulo — posso mostrar as abas, os filtros da barra lateral e como usar os gráficos, em menos de um minuto."
          onAceitar={() => {
            registrarTourVisto(tourModuloId, 'concluido')
            iniciarTour(tourModuloId, permissoes)
          }}
          onRecusar={() => registrarTourVisto(tourModuloId, 'dispensado')}
        />
      )}
      <Header
        paginaAtiva={paginaAtiva}
        onPagina={setPaginaAtiva}
        profile={profile}
        user={session?.user}
        onSignOut={handleSignOut}
        showAdmin={podeVerConfiguracoes}
        secaoAtiva={secaoAtiva}
        onSecao={handleSecaoChange}
        onHome={handleHome}
        onIniciarTour={
          tourModuloId && TOURS[tourModuloId] ? handleRevisarTour : undefined
        }
        onAlterarSenha={() => setMostrarAlterarSenha(true)}
        mostrarFisc={temFisc}
        mostrarGeo={temGeo}
        abasPermitidas={secaoAtiva === 'sistemaGeo' ? abasGeo : abasFisc}
        modules={modules}
        onSelectModule={handleSelectModule}
        mostrarEmergencias={mostrarEmergencias}
        abaAdminAtiva={abaAdmin}
        onAbaAdmin={setAbaAdmin}
        onAbrirConfiguracoes={handleAbrirConfiguracoes}
        abaCruzamentoAtiva={abaAtivaCruzamento}
        onAbaCruzamento={setAbaAtivaCruzamento}
        permissoes={permissoes}
        emgVencidas48h={emgVencidas48h}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar – hidden on admin */}
        {!isSpecialPage && secaoAtiva === 'fiscalizacao' && (
          <Sidebar
            anos={anos}
            permissionarias={permissionarias}
            subprefeituras={subprefeituras}
            subprefeiturasMapa={subprefeiturasMapa}
            filtros={filtros}
            setFiltros={setFiltros}
            onLimpar={() => setFiltros(FILTROS_VAZIOS)}
          />
        )}
        {!isSpecialPage && secaoAtiva === 'sistemaGeo' && paginaAtiva !== 4 && (
          <SidebarSistemaGeo
            rows={sistemaGeoLinhas}
            filtros={sistemaGeoFiltros}
            setFiltros={setSistemaGeoFiltros}
            onLimpar={() => setSistemaGeoFiltros(FILTROS_GEO_VAZIOS)}
          />
        )}
        {!isSpecialPage && secaoAtiva === 'sistemaGeo' && paginaAtiva === 4 && (
          <SidebarCruzamento
            rowsFisc={todasLinhas}
            rowsGeo={sistemaGeoLinhas}
            filtros={cruzamentoFiltros}
            setFiltros={setCruzamentoFiltros}
            onLimpar={() => setCruzamentoFiltros(FILTROS_CRUZAMENTO_VAZIOS)}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="px-4 sm:px-6 pt-3 shrink-0">
            <TituloTela
              titulo={tituloTela}
              corDe={corTituloTela.from}
              corPara={corTituloTela.to}
            />
          </div>
          {/* KPI strip – hidden on admin */}
          {!isSpecialPage &&
            !(secaoAtiva === 'sistemaGeo' && paginaAtiva === 4) && (
              <div
                className="px-4 sm:px-6 py-3 border-b border-grey-line shrink-0"
                data-tour="kpis-modulo"
              >
                {secaoAtiva === 'fiscalizacao' ? (
                  <KPIStrip kpis={kpis} />
                ) : sistemaGeoCarregando && sistemaGeoLinhas.length === 0 ? (
                  <div className="flex items-center gap-2 py-1">
                    <LoadingInline
                      mensagem={(() => {
                        const { carregadas, total } = geoProgresso
                        const totalConfiavel = total > 0 && carregadas <= total
                        if (!totalConfiavel) {
                          return carregadas > 0
                            ? `Carregando Sistema Geo… ${carregadas.toLocaleString('pt-BR')} linhas`
                            : 'Carregando dados Sistema Geo…'
                        }
                        const pct = Math.round((carregadas / total) * 100)
                        return pct < 100
                          ? `Carregando Sistema Geo… ${pct}%`
                          : 'Finalizando…'
                      })()}
                      height="py-1"
                    />
                  </div>
                ) : (
                  <KPIStripGeo kpis={sistemaGeoKpis} />
                )}
              </div>
            )}
          <main
            className="flex-1 p-4 overflow-auto"
            data-tour="conteudo-modulo"
          >
            {/* Aviso: registros sem data ficam de fora ao filtrar por período */}
            {!isSpecialPage &&
              abaLiberada &&
              secaoAtiva === 'fiscalizacao' &&
              paginaAtiva !== 4 &&
              semDataFisc > 0 && <AvisoSemData n={semDataFisc} />}
            {!isSpecialPage &&
              abaLiberada &&
              secaoAtiva === 'sistemaGeo' &&
              paginaAtiva !== 4 &&
              semDataGeo > 0 && <AvisoSemData n={semDataGeo} />}

            {/* Admin page (Configurações) — admin de verdade ou visitante da
                demo (somente leitura, ver AdminPanel.jsx) */}
            {isAdminPage && podeVerConfiguracoes && (
              <Suspense
                fallback={
                  <LoadingInline mensagem="Carregando Configurações..." />
                }
              >
                <AdminPanel abaAtiva={abaAdmin} />
              </Suspense>
            )}

            {/* OBRAS pages */}
            {!isSpecialPage && abaLiberada && secaoAtiva === 'fiscalizacao' && (
              <ErrorBoundary modulo="Fiscalização">
                <Suspense fallback={<LoadingInline mensagem="Carregando..." />}>
                  {paginaAtiva === 1 && <Pagina1Geral rows={filtradas} />}
                  {paginaAtiva === 2 && <Pagina2Temporal rows={filtradas} />}
                  {paginaAtiva === 3 && (
                    <Pagina3Espacial
                      rows={filtradas}
                      contagensMapa={contagensMapaFisc}
                      subSelecionadas={filtros.subprefeituras}
                      onSelecionarSub={selecionarSubFisc}
                    />
                  )}
                  {paginaAtiva === 6 && (
                    <PaginaFisc5Executoras rows={filtradas} />
                  )}
                  {paginaAtiva === 7 && (
                    <PaginaBuscaProcesso
                      modo="fisc"
                      rows={filtradas}
                      nFiltrosAtivos={nFiltrosFisc}
                    />
                  )}
                </Suspense>
              </ErrorBoundary>
            )}

            {/* Sistema Geo pages */}
            {!isSpecialPage &&
              abaLiberada &&
              secaoAtiva === 'sistemaGeo' &&
              (sistemaGeoCarregando && sistemaGeoLinhas.length === 0 ? (
                <LoadingPage mensagem="Carregando dados Sistema Geo..." />
              ) : (
                <ErrorBoundary modulo="Sistema Geo">
                  <Suspense
                    fallback={<LoadingInline mensagem="Carregando..." />}
                  >
                    {paginaAtiva === 1 && (
                      <PaginaGeo1Geral
                        rows={sistemaGeoFiltradas}
                        filtros={sistemaGeoFiltros}
                        todas={sistemaGeoLinhas}
                      />
                    )}
                    {paginaAtiva === 2 && (
                      <PaginaGeo2Temporal rows={sistemaGeoFiltradas} />
                    )}
                    {paginaAtiva === 3 && (
                      <PaginaGeo3Subprefeitura
                        rows={sistemaGeoFiltradas}
                        contagensMapa={contagensMapaGeo}
                        subSelecionadas={sistemaGeoFiltros.subprefeituras}
                        onSelecionarSub={selecionarSubGeo}
                      />
                    )}
                    {paginaAtiva === 4 && (
                      <ErrorBoundary modulo="Análise Integrada">
                        <PaginaGeo4Cruzamento
                          rowsFisc={todasLinhas}
                          rowsGeo={sistemaGeoLinhas}
                          filtros={cruzamentoFiltros}
                          abaAtiva={abaAtivaCruzamento}
                          onAba={setAbaAtivaCruzamento}
                        />
                      </ErrorBoundary>
                    )}
                    {paginaAtiva === 6 && (
                      <PaginaBuscaProcesso
                        modo="geo"
                        rows={sistemaGeoFiltradas}
                        nFiltrosAtivos={nFiltrosGeo}
                      />
                    )}
                  </Suspense>
                </ErrorBoundary>
              ))}
          </main>
        </div>
      </div>

      {/* Modal de exportação — oculto na tela de admin e sem permissão */}
      {!isSpecialPage && (podeExportarFisc || podeExportarGeo) && (
        <ExportModal
          rowsFisc={filtradas}
          rowsGeo={sistemaGeoFiltradas}
          todasFisc={todasLinhas}
          todasGeo={sistemaGeoLinhas}
          moduloAtivo={secaoAtiva}
          mostrarFisc={podeExportarFisc}
          mostrarGeo={podeExportarGeo}
        />
      )}

      <Rodape />
    </div>
  )
}
