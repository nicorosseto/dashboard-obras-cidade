import { Component } from 'react'

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

  render() {
    if (this.state.erro) {
      const { fallback, modulo = 'este módulo' } = this.props
      if (fallback) return fallback(this.state.erro)
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
              Algo deu errado ao carregar este módulo. O restante do sistema continua funcionando.
            </p>
            <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded p-2 mb-4 text-left break-all">
              {this.state.erro?.message || String(this.state.erro)}
            </p>
            <button
              onClick={() => this.setState({ erro: null })}
              className="text-xs font-semibold text-navy border border-navy rounded px-3 py-1.5 hover:bg-navy hover:text-white transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
