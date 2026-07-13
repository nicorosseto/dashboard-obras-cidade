import { useState } from 'react'
import { signIn } from '../lib/auth.js'
import { traduzErro } from '../lib/mensagens.js'
import { Spinner } from '../components/Loading.jsx'
import { RODAPE_TEXTO } from '../components/Rodape.jsx'

export default function Login({ onLogin }) {
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      const { session } = await signIn(login, senha)
      onLogin(session)
    } catch (err) {
      setErro(traduzErro(err.message))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-grey-bg flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-md w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-navy uppercase tracking-wide">
            OBRAS
          </h1>
          <p className="text-sm font-medium text-navy-light mt-1">
            Análise de Processos Sistema Geo e Fiscalização
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Departamento de Controle e Uso de Vias Públicas
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
              Usuário
            </label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              autoComplete="username"
              placeholder="seu usuário"
              className="w-full border border-grey-line rounded-sm px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-navy"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
              Senha
            </label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="w-full border border-grey-line rounded-sm px-3 py-2 pr-10 text-sm focus:outline-hidden focus:ring-2 focus:ring-navy"
              />
              <button
                type="button"
                onMouseDown={() => setMostrarSenha(true)}
                onMouseUp={() => setMostrarSenha(false)}
                onMouseLeave={() => setMostrarSenha(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 select-none"
                tabIndex={-1}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {erro && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-sm p-2">
              {erro}
            </p>
          )}
          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-navy text-white py-2 rounded-sm font-semibold text-sm hover:bg-navy-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {carregando && <Spinner size="sm" color="#ffffff" />}
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-400 mt-4">
          Esqueceu a senha? Solicite a redefinição ao administrador do sistema.
        </p>
      </div>

      <p className="text-[10px] text-gray-400 mt-6">{RODAPE_TEXTO}</p>
    </div>
  )
}
