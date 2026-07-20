import { Component } from 'react'

// Chave de sessionStorage: evita loop infinito de reload automático se o
// erro de chunk persistir mesmo após recarregar (nesse caso, o problema é
// outro — não adianta insistir em reload sozinho).
const CHAVE_RELOAD_TENTADO = 'obras_chunk_reload_tentado'

// "Failed to fetch dynamically imported module" (Chrome/Edge) e variantes
// por navegador para o mesmo problema: a aba carregou o site ANTES de um
// deploy novo (Vercel troca o hash dos arquivos a cada build) e tenta
// buscar um chunk lazy (React.lazy) que não existe mais no servidor. O
// botão padrão "Tentar novamente" (só re-renderiza) NÃO resolve isso — o
// mesmo import antigo falha de novo. Só um reload de verdade busca o
// `index.html` atual, com as referências certas.
export function ehErroDeChunkDesatualizado(erro) {
  const msg = String(erro?.message || erro || '').toLowerCase()
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    (msg.includes('dynamically imported module') && msg.includes('fetch'))
  )
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { erro: null }
  }

  static getDerivedStateFromError(err) {
    return { erro: err }
  }

  componentDidCatch(err, info) {
    console.error('[ErrorBoundary]', err, info?.componentStack)
  }

  handleRecarregar = () => {
    try {
      sessionStorage.setItem(CHAVE_RELOAD_TENTADO, '1')
    } catch {
      // sessionStorage indisponível (modo privado etc.) — segue sem a trava
    }
    window.location.reload()
  }

  handleTentarNovamente = () => {
    this.setState({ erro: null })
  }

  render() {
    if (this.state.erro) {
      const { fallback, modulo = 'este módulo' } = this.props
      if (fallback) return fallback(this.state.erro)

      let jaTentouReload = false
      try {
        jaTentouReload = sessionStorage.getItem(CHAVE_RELOAD_TENTADO) === '1'
      } catch {
        // sessionStorage indisponível — trata como se nunca tivesse tentado
      }
      const ehChunk = ehErroDeChunkDesatualizado(this.state.erro)
      const oferecerReload = ehChunk && !jaTentouReload

      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-xl shadow-card max-w-md w-full p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-navy uppercase tracking-wide mb-1">
              Erro em {modulo}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {oferecerReload
                ? 'O sistema foi atualizado desde que esta página foi carregada. Recarregue para buscar a versão mais recente.'
                : 'Algo deu errado ao carregar este módulo. O restante do sistema continua funcionando.'}
            </p>
            <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-sm p-2 mb-4 text-left break-all">
              {this.state.erro?.message || String(this.state.erro)}
            </p>
            <button
              onClick={
                oferecerReload ? this.handleRecarregar : this.handleTentarNovamente
              }
              className="text-xs font-semibold text-navy border border-navy rounded-sm px-3 py-1.5 hover:bg-navy hover:text-white transition-colors"
            >
              {oferecerReload ? 'Recarregar página' : 'Tentar novamente'}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
