import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { traduzErro } from '../lib/mensagens.js'
import { Spinner } from './Loading.jsx'

export default function AlterarSenhaModal({
  obrigatorio = false,
  onConcluido,
  onFechar,
}) {
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [ok, setOk] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro(null)

    if (nova.length < 6) {
      setErro('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (nova !== confirma) {
      setErro('As senhas não coincidem.')
      return
    }

    setSalvando(true)
    try {
      // Atualiza a senha no Supabase Auth
      const { error } = await supabase.auth.updateUser({ password: nova })
      if (error) throw error

      // Desmarca o flag de primeiro acesso
      await supabase.rpc('concluir_primeiro_acesso')

      setOk(true)
    } catch (err) {
      setErro(traduzErro(err.message) || 'Erro ao salvar senha.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-7">
        <div className="text-center mb-6">
          {obrigatorio ? (
            <>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-amber-600"
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
              </div>
              <h2 className="text-base font-bold text-navy uppercase tracking-wide">
                Defina sua senha
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Por segurança, você precisa criar uma senha pessoal antes de
                continuar.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base font-bold text-navy uppercase tracking-wide">
                Alterar senha
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Digite e confirme sua nova senha.
              </p>
            </>
          )}
        </div>

        {ok ? (
          <div className="text-center py-4 space-y-4">
            <div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg
                  className="w-6 h-6 text-green-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-green-700">
                Senha alterada com sucesso!
              </p>
            </div>
            <button
              onClick={() => {
                if (onConcluido) onConcluido()
              }}
              className="w-full py-2 rounded-sm bg-navy text-white text-sm font-semibold hover:bg-navy-light transition-colors"
            >
              Ok
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <CampoSenha
              label="Nova senha"
              value={nova}
              onChange={setNova}
              mostrar={mostrar}
              setMostrar={setMostrar}
              placeholder="Mínimo 6 caracteres"
              autoFocus
            />
            <CampoSenha
              label="Confirmar nova senha"
              value={confirma}
              onChange={setConfirma}
              mostrar={mostrar}
              setMostrar={setMostrar}
              placeholder="Repita a nova senha"
            />

            {erro && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-sm p-2">
                {erro}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              {!obrigatorio && onFechar && (
                <button
                  type="button"
                  onClick={onFechar}
                  className="flex-1 py-2 rounded-sm border border-grey-line text-navy text-sm font-semibold hover:bg-grey-bg transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={salvando}
                className="flex-1 py-2 rounded-sm bg-navy text-white text-sm font-semibold hover:bg-navy-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando && <Spinner size="sm" color="#ffffff" />}
                {salvando ? 'Salvando...' : 'Salvar senha'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function CampoSenha({
  label,
  value,
  onChange,
  mostrar,
  setMostrar,
  placeholder,
  autoFocus,
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={mostrar ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={6}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full border border-grey-line rounded-sm px-3 py-2 pr-10 text-sm focus:outline-hidden focus:ring-2 focus:ring-navy"
        />
        <button
          type="button"
          onMouseDown={() => setMostrar(true)}
          onMouseUp={() => setMostrar(false)}
          onMouseLeave={() => setMostrar(false)}
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 select-none"
        >
          {mostrar ? (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
  )
}
